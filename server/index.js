import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createInitialPayment, getPaymentDetails, createRecurringPayment, PLAN_LABELS, cancelSubscription } from './tribute.js';
import { bot, sendBotMessage } from './bot.js';
import { readSubscriptions, writeSubscriptions, upsertSubscription } from './storage.js';
import { startMotivationJob } from './motivation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const app = express();
// TEST: Send all message types immediately
app.post('/api/test/send-all-messages', async (req, res) => {
    const { telegramId } = req.body;
    if (!telegramId) {
        return res.status(400).json({ error: 'telegramId required' });
    }

    try {
        const { generatePersonalizedAdvice } = await import('./personalizedAdvice.js');
        const { MOTIVATION_QUOTES, REMINDER_MESSAGES } = await import('./motivationMessages.js');

        const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

        const sub = (await readSubscriptions()).find(s => s.telegramId === Number(telegramId));

        // 1. Morning motivation
        const morningQuote = getRandomItem(MOTIVATION_QUOTES);
        await sendBotMessage(telegramId, `🌅 *Доброе утро!*\n\n_${morningQuote}_`);

        // 2. Personalized advice (if profile exists)
        if (sub?.profile?.weightKg && sub?.profile?.goalWeightKg) {
            const advice = await generatePersonalizedAdvice(sub.profile);
            if (advice) {
                await sendBotMessage(telegramId, advice);
            }
        } else {
            await sendBotMessage(telegramId, '💡 *Совет дня*:\n\nЗаполни свой профиль (вес и цель), чтобы получать персонализированные советы!');
        }

        // 3. Evening reminder
        const reminder = getRandomItem(REMINDER_MESSAGES);
        await sendBotMessage(telegramId, `🌙 ${reminder}`);

        // 4. Evening motivation
        const eveningQuote = getRandomItem(MOTIVATION_QUOTES);
        await sendBotMessage(telegramId, `💫 *Вечерняя мотивация*:\n\n_${eveningQuote}_`);

        res.json({ ok: true, message: 'All messages sent!' });
    } catch (error) {
        console.error('Test send error:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.SERVER_PORT || 4000;

app.use(cors());
app.use(bodyParser.json());

const PLAN_TIERS = ['pro', 'premium'];

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
        const { tier, returnUrl, userId, telegramId } = req.body;
        if (!PLAN_TIERS.includes(tier)) {
            return res.status(400).json({ error: 'Недопустимый тариф' });
        }
        const payment = await createInitialPayment({
            tier,
            returnUrl,
            metadata: {
                tier,
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
            tributeSubscriptionId: null,
            pendingPaymentId: payment.id,
            nextChargeAt: null,
            history: [],
        });

        res.json({
            paymentId: payment.id,
            confirmationUrl: payment.payment_url || payment.confirmation_url,
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
        const { event, data } = req.body;

        if (event === 'payment.succeeded' || event === 'subscription.created') {
            const metadata = typeof data.metadata === 'string'
                ? JSON.parse(data.metadata)
                : data.metadata || {};

            const tier = metadata?.tier || 'pro';
            const period = metadata?.period || '1m';
            const userId = metadata?.userId || null;
            const telegramId = metadata?.telegramId ? Number(metadata.telegramId) : null;
            const paymentId = data.id || data.payment_id;
            const subscriptionId = data.subscription_id;
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
                tributeSubscriptionId: subscriptionId || null,
                pendingPaymentId: null,
                lastPaymentId: paymentId,
                lastPaymentStatus: 'succeeded',
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

        if (event === 'payment.failed') {
            const metadata = typeof data.metadata === 'string'
                ? JSON.parse(data.metadata)
                : data.metadata || {};

            const telegramId = metadata?.telegramId ? Number(metadata.telegramId) : null;
            const tier = metadata?.tier || 'pro';

            if (telegramId) {
                await notifyPayment(
                    { telegramId },
                    `⚠️ Ошибка оплаты ${PLAN_LABELS[tier]}. Попробуйте снова или обновите данные карты.`,
                );
            }
        }

        if (event === 'subscription.cancelled') {
            const subscriptionId = data.subscription_id;
            const subscriptions = await readSubscriptions();
            const sub = subscriptions.find(s => s.tributeSubscriptionId === subscriptionId);

            if (sub) {
                await upsertSubscription({
                    subscriptionKey: sub.subscriptionKey,
                    status: 'cancelled',
                    nextChargeAt: null,
                });

                if (sub.telegramId) {
                    await notifyPayment(
                        { telegramId: sub.telegramId },
                        `📋 Подписка отменена. Доступ сохраняется до конца оплаченного периода.`,
                    );
                }
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
                !subscription.tributeSubscriptionId ||
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
                    subscriptionId: subscription.tributeSubscriptionId,
                    metadata: {
                        tier: subscription.tier,
                        period: subscription.period || '1m',
                        userId: subscription.userId || '',
                        telegramId: subscription.telegramId || '',
                        recurring: 'true',
                    },
                });

                subscription.lastPaymentId = charge.id;
                subscription.nextChargeAt = new Date(Date.now() + periodMonths * 30 * 24 * 60 * 60 * 1000).toISOString();
                subscription.history = [
                    ...(subscription.history || []),
                    {
                        paymentId: charge.id,
                        chargedAt: new Date().toISOString(),
                        amount: charge.amount,
                    },
                ];

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
        // Note: resolveKey logic prioritizes userId/tgId over paymentId, so the 3rd arg is fallback if neither matches, which is prevented by the check above.
        // Actually resolveKey(userId, tgId, paymentId) returns `user-${userId}` or `tg-${tgId}`.
        // But if I pass `null` for paymentId, it works.

        // We need to be careful not to create a NEW key if one exists.
        // resolveKey logic:
        // if (userId) return `user-${userId}`;
        // if (telegramId) return `tg-${telegramId}`;
        // return `payment-${paymentId}`;

        // So passing userId/tgId correctly resolves to the user's key.

        await upsertSubscription({
            subscriptionKey,
            userId: userId || null,
            telegramId: telegramId ? Number(telegramId) : null,
            profile,
            // We want to preserve existing status/tier if record exists.
            // upsertSubscription merges into existing record.
            // But if record implies specific fields...
            // upsertSubscription in storage.js relies on finding by subscriptionKey.
            // If found, it merges { ...existing, ...record }.
            // So we only need to pass what we want to update.
        });

        res.json({ ok: true });
    } catch (error) {
        console.error('Profile update error', error);
        res.status(500).json({ error: 'Не удалось сохранить профиль' });
    }
});

/**
 * Admin endpoints
 */
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

        // Fetch existing subscription to preserve fields
        const existing = (await readSubscriptions()).find(s => s.subscriptionKey === key);

        const record = {
            subscriptionKey: key,
            tier,
            status,
            lastPaymentId: `manual-${Date.now()}`,
            lastPaymentStatus: 'succeeded',
            // Preserve existing fields if record exists
            ...(existing && {
                telegramId: existing.telegramId,
                userId: existing.userId,
                profile: existing.profile,
                isTrial: existing.isTrial,
                trialEndsAt: existing.trialEndsAt,
                history: existing.history || [],
                tributeSubscriptionId: existing.tributeSubscriptionId,
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

        if (subscription.tributeSubscriptionId) {
            try {
                await cancelSubscription(subscription.tributeSubscriptionId);
            } catch (error) {
                console.warn('Failed to cancel Tribute subscription:', error);
            }
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

app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
