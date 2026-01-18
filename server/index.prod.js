import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';
import { createInitialPayment, getPaymentDetails, createRecurringPayment, PLAN_LABELS } from './yookassa.js';
import { bot, sendBotMessage } from './bot.js';
import { readSubscriptions, writeSubscriptions, upsertSubscription } from './storage.js';
import { startMotivationJob } from './motivation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(process.cwd(), '.env.production') });

const app = express();
const distPath = path.resolve(process.cwd(), 'dist');

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
}));
app.use(bodyParser.json({ limit: '10mb' }));

if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
} else {
    console.warn('[STATIC] dist folder not found. Frontend will not be served.');
}

const PLAN_TIERS = ['pro', 'premium'];
const PLAN_PERIODS = ['1m', '3m', '6m'];

const resolveKey = (userId, telegramId, paymentId) => {
    if (userId) return `user-${userId}`;
    if (telegramId) return `tg-${telegramId}`;
    return `payment-${paymentId}`;
};

const requireAdmin = (req, res) => {
    const provided = req.body?.password || req.query?.password;
    const adminPassword = process.env.ADMIN_PASSWORD || 'alex-alex-fitai3';
    if (!provided || provided !== adminPassword) {
        res.status(401).json({ error: 'Админ-доступ запрещен' });
        return false;
    }
    return true;
};

const computeNextCharge = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

const notifyPayment = async (subscription, text) => {
    if (subscription.telegramId) {
        await sendBotMessage(subscription.telegramId, text);
    }
};

app.post('/api/payments/create', async (req, res) => {
    try {
        const { tier, returnUrl, userId, telegramId, period } = req.body;
        if (!PLAN_TIERS.includes(tier)) {
            return res.status(400).json({ error: 'Недопустимый тариф' });
        }
        if (!process.env.YOOKASSA_SHOP_ID || !process.env.YOOKASSA_SECRET_KEY) {
            return res.status(400).json({
                error: 'YooKassa не настроена. Заполните YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY в .env.production.',
            });
        }
        const resolvedPeriod = PLAN_PERIODS.includes(period) ? period : '1m';
        const payment = await createInitialPayment({
            tier,
            returnUrl,
            metadata: {
                tier,
                period: resolvedPeriod,
                userId: userId || '',
                telegramId: telegramId || '',
            },
        });

        await upsertSubscription({
            subscriptionKey: resolveKey(userId, telegramId, payment.id),
            tier,
            userId: userId || null,
            telegramId: telegramId || null,
            status: 'pending',
            yookassaPaymentMethodId: null,
            pendingPaymentId: payment.id,
            nextChargeAt: null,
            history: [],
        });

        res.json({
            paymentId: payment.id,
            confirmationUrl: payment.confirmation?.confirmation_url || payment.confirmation_url || payment.payment_url,
        });
    } catch (error) {
        console.error('Ошибка создания платежа', error);
        res.status(500).json({ error: error.message || 'Не удалось создать платёж' });
    }
});

app.get('/api/payments/status/:paymentId', async (req, res) => {
    try {
        const payment = await getPaymentDetails(req.params.paymentId);
        res.json({ status: payment.status });
    } catch (error) {
        res.status(500).json({ error: error.message || 'Ошибка проверки статуса' });
    }
});

app.post('/api/payments/webhook', async (req, res) => {
    try {
        const payload = req.body || {};
        const event = payload.event || payload.type;
        const data = payload.object || payload.data;

        if (!event || !data) {
            return res.status(400).json({ error: 'Invalid webhook payload' });
        }

        if (event === 'payment.succeeded') {
            const metadata = typeof data.metadata === 'string'
                ? JSON.parse(data.metadata)
                : data.metadata || {};

            const tier = metadata?.tier || 'pro';
            const period = metadata?.period || '1m';
            const userId = metadata?.userId || null;
            const telegramId = metadata?.telegramId ? Number(metadata.telegramId) : null;
            const paymentId = data.id || data.payment_id;
            const paymentMethodId = data.payment_method?.id || null;
            const paymentMethodSaved = Boolean(data.payment_method?.saved);
            const subscriptionKey = resolveKey(userId, telegramId, paymentId);

            const periodMonths = {
                '1m': 1,
                '3m': 3,
                '6m': 6,
            }[period] || 1;

            const nextChargeDate = new Date(Date.now() + periodMonths * 30 * 24 * 60 * 60 * 1000).toISOString();

            await upsertSubscription({
                subscriptionKey,
                tier,
                userId,
                telegramId,
                status: 'active',
                yookassaPaymentMethodId: paymentMethodSaved ? paymentMethodId : null,
                pendingPaymentId: null,
                lastPaymentId: paymentId,
                lastPaymentStatus: data.status || 'succeeded',
                period,
                nextChargeAt: nextChargeDate,
            });

            const periodText = {
                '1m': '1 месяц',
                '3m': '3 месяца',
                '6m': '6 месяцев',
            }[period] || '1 месяц';

            await notifyPayment(
                { telegramId },
                `✅ Подписка ${PLAN_LABELS[tier]} на ${periodText} активирована! Доступ до ${new Date(nextChargeDate).toLocaleDateString('ru-RU')}.`,
            );
        }

        if (event === 'payment.canceled') {
            const metadata = typeof data.metadata === 'string'
                ? JSON.parse(data.metadata)
                : data.metadata || {};

            const telegramId = metadata?.telegramId ? Number(metadata.telegramId) : null;
            const tier = metadata?.tier || 'pro';

            if (telegramId) {
                await notifyPayment(
                    { telegramId },
                    `⚠️ Оплата ${PLAN_LABELS[tier]} была отменена. Попробуйте снова или используйте другую карту.`,
                );
            }
        }

        res.json({ ok: true });
    } catch (error) {
        console.error('Ошибка обработки вебхука', error);
        res.status(500).json({ error: 'Webhook error' });
    }
});

const processRecurringCharges = async () => {
    const subscriptions = await readSubscriptions();
    const now = new Date();
    const updated = await Promise.all(
        subscriptions.map(async subscription => {
            if (
                subscription.status !== 'active' ||
                !subscription.yookassaPaymentMethodId ||
                !subscription.nextChargeAt ||
                new Date(subscription.nextChargeAt) > now
            ) {
                return subscription;
            }

            try {
                const periodMonths = {
                    '1m': 1,
                    '3m': 3,
                    '6m': 6,
                }[subscription.period] || 1;

                const charge = await createRecurringPayment({
                    tier: subscription.tier,
                    paymentMethodId: subscription.yookassaPaymentMethodId,
                    metadata: {
                        tier: subscription.tier,
                        period: subscription.period || '1m',
                        userId: subscription.userId || '',
                        telegramId: subscription.telegramId || '',
                        recurring: 'true',
                    },
                });

                subscription.lastPaymentId = charge.id;
                subscription.lastPaymentStatus = charge.status || 'pending';
                if (charge.status === 'succeeded' || charge.status === 'waiting_for_capture') {
                    subscription.nextChargeAt = new Date(Date.now() + periodMonths * 30 * 24 * 60 * 60 * 1000).toISOString();
                }
                subscription.history = [
                    ...(subscription.history || []),
                    {
                        paymentId: charge.id,
                        chargedAt: new Date().toISOString(),
                        amount: charge.amount,
                    },
                ];

                if (charge.status === 'succeeded') {
                    const periodText = {
                        '1m': '1 месяц',
                        '3m': '3 месяца',
                        '6m': '6 месяцев',
                    }[subscription.period] || '1 месяц';

                    await notifyPayment(
                        subscription,
                        `🔁 Автопродление ${PLAN_LABELS[subscription.tier]} на ${periodText} прошло успешно. Следующее списание: ${new Date(
                            subscription.nextChargeAt,
                        ).toLocaleDateString('ru-RU')}.`,
                    );
                }
            } catch (error) {
                subscription.lastPaymentStatus = 'failed';
                console.error('Ошибка автосписания', error);
                await notifyPayment(subscription, `⚠️ Не удалось продлить подписку ${PLAN_LABELS[subscription.tier]}. Обновите данные карты.`);
            }

            return subscription;
        }),
    );

    await writeSubscriptions(updated);
};

app.post('/api/payments/recurring/run', async (_req, res) => {
    await processRecurringCharges();
    res.json({ ok: true });
});

cron.schedule('0 */6 * * *', () => {
    processRecurringCharges().catch(err => console.error('Recurring job error', err));
});

app.get('/health', (_req, res) => res.json({ ok: true, bot: Boolean(bot) }));

app.post('/api/user/profile', async (req, res) => {
    try {
        const { userId, telegramId, profile } = req.body;
        if (!userId && !telegramId) {
            return res.status(400).json({ error: 'userId или telegramId обязателен' });
        }

        const subscriptionKey = resolveKey(userId, telegramId, `profile-${Date.now()}`);

        await upsertSubscription({
            subscriptionKey,
            userId: userId || null,
            telegramId: telegramId ? Number(telegramId) : null,
            profile,
        });

        res.json({ ok: true });
    } catch (error) {
        console.error('Profile update error', error);
        res.status(500).json({ error: 'Не удалось сохранить профиль' });
    }
});

app.get('/api/admin/subscriptions', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
        const subscriptions = await readSubscriptions();
        res.json({ subscriptions });
    } catch (error) {
        console.error('Admin list error', error);
        res.status(500).json({ error: 'Не удалось получить подписки' });
    }
});

app.post('/api/admin/subscriptions/set-tier', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
        const { tier, userId, telegramId, subscriptionKey, status = 'active' } = req.body || {};
        if (!tier) {
            return res.status(400).json({ error: 'tier обязателен' });
        }
        const key = subscriptionKey || resolveKey(userId, telegramId, `manual-${Date.now()}`);

        const existing = (await readSubscriptions()).find(s => s.subscriptionKey === key);

        const record = {
            subscriptionKey: key,
            tier,
            status,
            lastPaymentId: `manual-${Date.now()}`,
            lastPaymentStatus: 'succeeded',
            ...(existing && {
                telegramId: existing.telegramId,
                userId: existing.userId,
                profile: existing.profile,
                isTrial: existing.isTrial,
                trialEndsAt: existing.trialEndsAt,
                history: existing.history || [],
                yookassaPaymentMethodId: existing.yookassaPaymentMethodId,
                pendingPaymentId: existing.pendingPaymentId,
                nextChargeAt: existing.nextChargeAt
            })
        };

        await upsertSubscription(record);
        console.log(`[ADMIN] Updated tier for ${key} to ${tier}`);
        if (record.telegramId) {
            await notifyPayment({ telegramId: record.telegramId }, `✅ Доступ ${PLAN_LABELS[tier] || tier} выдан администратором.`);
        }
        res.json({ ok: true, subscriptionKey: key });
    } catch (error) {
        console.error('Admin set tier error', error);
        res.status(500).json({ error: 'Не удалось обновить подписку' });
    }
});

app.post('/api/admin/notify', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
        const { message, mode = 'all', telegramId, userId } = req.body || {};
        if (!message) {
            return res.status(400).json({ error: 'message обязателен' });
        }

        const subscriptions = await readSubscriptions();
        let targets = [];

        if (mode === 'single' && (telegramId || userId)) {
            targets = subscriptions.filter(sub => {
                if (telegramId) return sub.telegramId === Number(telegramId);
                if (userId) return sub.userId === String(userId) || sub.userId === userId;
                return false;
            });
        } else {
            targets = subscriptions.filter(sub => sub.telegramId);
        }

        const uniqueChatIds = [...new Set(targets.map(sub => sub.telegramId).filter(Boolean))];

        let sent = 0;
        for (const chatId of uniqueChatIds) {
            try {
                await sendBotMessage(chatId, message);
                sent += 1;
            } catch (err) {
                console.warn('Failed to send message to', chatId, err);
            }
        }

        res.json({ ok: true, sent, total: uniqueChatIds.length });
    } catch (error) {
        console.error('Admin notify error', error);
        res.status(500).json({ error: 'Не удалось отправить сообщения' });
    }
});

app.post('/api/payments/cancel', async (req, res) => {
    try {
        const { userId, telegramId } = req.body;
        if (!userId && !telegramId) {
            return res.status(400).json({ error: 'userId или telegramId обязателен' });
        }

        const subscriptionKey = resolveKey(userId, telegramId, `cancel-${Date.now()}`);
        const subscriptions = await readSubscriptions();
        const subscription = subscriptions.find(s => s.subscriptionKey === subscriptionKey);

        if (!subscription) {
            return res.status(404).json({ error: 'Подписка не найдена' });
        }

        await upsertSubscription({
            subscriptionKey,
            status: 'cancelled',
            nextChargeAt: null,
        });

        if (subscription.telegramId) {
            await notifyPayment(
                { telegramId: subscription.telegramId },
                `📋 Подписка отменена. Доступ сохраняется до конца оплаченного периода.`,
            );
        }

        res.json({ ok: true });
    } catch (error) {
        console.error('Cancel subscription error', error);
        res.status(500).json({ error: 'Не удалось отменить подписку' });
    }
});

startMotivationJob();

const PORT = process.env.PORT || process.env.SERVER_PORT || 4000;

app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Not found' });
    }
    if (!fs.existsSync(distPath)) {
        return res.status(404).json({ error: 'Frontend build not found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
