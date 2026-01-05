import { Telegraf, Markup } from 'telegraf';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSubscriptionByTelegramId, upsertSubscription } from './storage.js';
import { createInitialPayment } from './tribute.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBAPP_URL = process.env.TELEGRAM_WEBAPP_URL || process.env.PUBLIC_WEBAPP_URL || '';
const SUPPORT_URL = process.env.TELEGRAM_SUPPORT_URL || process.env.TELEGRAM_SUPPORT_CHAT_LINK || 'https://t.me/hunt_tg';

let botInstance = null;

if (BOT_TOKEN) {
    botInstance = new Telegraf(BOT_TOKEN);

    // Debug Middleware
    botInstance.use(async (ctx, next) => {
        console.log(`[BOT] Incoming update: ${ctx.updateType}`, JSON.stringify(ctx.message || ctx.callbackQuery || {}));
        try {
            await next();
        } catch (e) {
            console.error('[BOT] Error in middleware:', e);
        }
    });

    const getMainKeyboard = () => {
        const buttons = [];

        // Telegram WebApp requires HTTPS.
        // Большая зелёная кнопка Запустить сверху
        if (WEBAPP_URL.startsWith('https://')) {
            buttons.push([Markup.button.webApp('🟢 🚀 ЗАПУСТИТЬ 🚀 🟢', WEBAPP_URL)]);
        } else {
            console.warn('[BOT] WebApp button skipped: WEBAPP_URL is not HTTPS', WEBAPP_URL);
        }

        // Маленькие кнопки снизу в одном ряду
        buttons.push(['💰 Оплатить', '👤 Профиль']);

        return Markup.keyboard(buttons).resize();


    };

    botInstance.start(async (ctx) => {
        console.log('[BOT] Start command received from', ctx.from.id);
        const name = ctx.from?.first_name ?? 'спортсмен';
        const fullName = [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(' ') || ctx.from?.username || 'Аноним';
        const telegramId = ctx.from.id;

        // Check if user exists
        const existing = await getSubscriptionByTelegramId(telegramId);

        if (!existing) {
            // New user! Grant 3 days premium trial
            const trialEndsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

            await upsertSubscription({
                subscriptionKey: `tg-${telegramId}`,
                telegramId,
                userId: null,
                tier: 'premium',
                status: 'active',
                isTrial: true,
                trialEndsAt,
                profile: { name: fullName },
                history: []
            });

            await ctx.reply(`🎉 *Подарок для тебя!* \n\nПривет, ${name}! Я активировал тебе *Premium на 3 дня* бесплатно, чтобы ты мог оценить все возможности Fit AI.\n\n👇 Используй меню внизу для старта.`, getMainKeyboard());
        } else {
            await ctx.reply(`С возвращением, ${name}! 👋\n\nЯ твой персональный ИИ-диетолог Fit AI. Я помогу тебе прийти к форме мечты.\n\n👇 Используй меню внизу для управления.`, getMainKeyboard());
        }
    });

    // Profile Handler
    botInstance.hears('👤 Профиль', async (ctx) => {
        const telegramId = ctx.from.id;
        const fullName = [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(' ') || ctx.from?.username || 'Аноним';

        // Always refresh subscription data from DB to get latest tier
        const sub = await getSubscriptionByTelegramId(telegramId);

        // Update name if not set
        if (sub && (!sub.profile || !sub.profile.name)) {
            await upsertSubscription({
                subscriptionKey: sub.subscriptionKey,
                profile: { ...sub.profile, name: fullName }
            });
        }

        let msg = `👤 *Профиль пользователя*`;
        msg += `\n🆔 ID: \`${telegramId}\``;
        msg += `\n🏷 Подписка: *${(sub?.tier || 'free').toUpperCase()}*`;

        if (sub?.profile) {
            msg += `\n\n🎯 Цель: ${sub.profile.goalWeightKg} кг`;
            msg += `\n⚖️ Текущий вес: ${sub.profile.weightKg} кг`;
        } else {
            msg += `\n\n⚠️ Данные о весе не найдены. Заполни профиль в приложении.`;
        }

        ctx.replyWithMarkdown(msg);
    });

    // Payment Handler
    botInstance.hears('💰 Оплатить', (ctx) => {
        ctx.reply('Выберите тариф для активации:', Markup.inlineKeyboard([
            [Markup.button.callback('PRO', 'pay_pro')],
            [Markup.button.callback('PREMIUM', 'pay_premium')]
        ]));
    });

    botInstance.action(/pay_(.+)/, async (ctx) => {
        const tier = ctx.match[1];
        const telegramId = ctx.from.id;
        const name = ctx.from.first_name;

        try {
            await ctx.answerCbQuery('Открываем оплату...');
            
            const tributeLinks = {
                pro: 'https://t.me/tribute/app?startapp=sKuR',
                premium: 'https://t.me/tribute/app?startapp=sKuA'
            };

            const link = tributeLinks[tier];
            
            await ctx.reply(`Для оплаты ${tier.toUpperCase()} перейдите по ссылке:`, Markup.inlineKeyboard([
                [Markup.button.url('Оплатить через Telegram', link)]
            ]));
        } catch (e) {
            console.error(e);
            ctx.reply('Не удалось создать платеж. Попробуйте позже.');
        }
    });

    const maskedToken = BOT_TOKEN.substring(0, 10) + '...';
    console.log(`Starting bot with token: ${maskedToken}`);

    // Explicitly delete webhook before polling
    botInstance.telegram.deleteWebhook({ drop_pending_updates: true })
        .then(() => botInstance.launch({ dropPendingUpdates: true }))
        .then(() => console.log('Telegram bot запущен successfully!'))
        .catch(err => console.error('Ошибка запуска бота:', err));

    // Enable graceful stop
    process.once('SIGINT', () => botInstance.stop('SIGINT'));
    process.once('SIGTERM', () => botInstance.stop('SIGTERM'));
} else {
    console.warn('BOT_TOKEN is missing in environment variables!');
}

export const sendBotMessage = async (chatId, message) => {
    if (!botInstance || !chatId) return;
    try {
        await botInstance.telegram.sendMessage(chatId, message);
    } catch (error) {
        console.warn('Не удалось отправить сообщение в Telegram:', error.message);
    }
};

export const bot = botInstance;
