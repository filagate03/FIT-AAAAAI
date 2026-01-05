import { SubscriptionTier } from '../types';

const buildTelegramUrl = (token: string, method: string) => `https://api.telegram.org/bot${token}/${method}`;

const callTelegram = async (method: string, payload: Record<string, unknown>) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        throw new Error('Токен Telegram бота не задан.');
    }

    const response = await fetch(buildTelegramUrl(token, method), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Не удалось отправить сообщение в Telegram.');
    }

    return response.json();
};

export const sendSupportMessage = async (message: string, userName?: string, userId?: number) => {
    const supportChatId = process.env.TELEGRAM_SUPPORT_CHAT_ID;
    if (!supportChatId || supportChatId === '0') {
        throw new Error('Чат поддержки Telegram не настроен.');
    }

    const composedMessage = [
        `👤 Пользователь: ${userName || 'Неизвестно'}`,
        userId ? `🆔 ID: ${userId}` : null,
        '',
        message,
    ]
        .filter(Boolean)
        .join('\n');

    await callTelegram('sendMessage', {
        chat_id: supportChatId,
        text: composedMessage,
    });
};

const tierLabel: Record<SubscriptionTier, string> = {
    free: 'FREE',
    pro: 'PRO',
    premium: 'PREMIUM',
};

export const notifyPaymentSuccess = async (chatId: number, tier: SubscriptionTier, name?: string) => {
    const text = [
        `🎉 ${name || 'Пользователь'}, спасибо за доверие!`,
        `Подписка ${tierLabel[tier]} активирована.`,
        tier === 'premium'
            ? 'Телеграм-бот теперь будет напоминать о воде, взвешиваниях и входе в приложение.'
            : 'Используйте новые отчёты и расширенные подсказки сразу же.',
    ].join('\n');

    await callTelegram('sendMessage', {
        chat_id: chatId,
        text,
    });
};

export const sendMotivationMessage = async (chatId: number, message: string) => {
    await callTelegram('sendMessage', {
        chat_id: chatId,
        text: message,
    });
};
