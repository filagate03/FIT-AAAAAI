import crypto from 'crypto';

interface TelegramInitData {
    query_id?: string;
    user?: string;
    auth_date?: string;
    hash?: string;
}

interface TelegramUser {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
}

export const parseInitData = (initData: string): Record<string, string> => {
    const params = new URLSearchParams(initData);
    const result: Record<string, string> = {};

    for (const [key, value] of params.entries()) {
        result[key] = value;
    }

    return result;
};

export const validateInitData = (initData: string, botToken: string): boolean => {
    const data = parseInitData(initData);
    const hash = data.hash;

    if (!hash) {
        return false;
    }

    delete data.hash;

    const authDate = data.auth_date;
    const now = Math.floor(Date.now() / 1000);

    if (authDate && (now - parseInt(authDate)) > 86400) {
        return false;
    }

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();

    const checkString = Object.keys(data)
        .sort()
        .map(key => `${key}=${data[key]}`)
        .join('\n');

    const computedHash = crypto
        .createHmac('sha256', secretKey)
        .update(checkString)
        .digest('hex');

    return computedHash === hash;
};

export const getUserFromInitData = (initData: string): TelegramUser | null => {
    try {
        const data = parseInitData(initData);
        const userStr = data.user;

        if (!userStr) {
            return null;
        }

        return JSON.parse(decodeURIComponent(userStr)) as TelegramUser;
    } catch (error) {
        console.error('Error parsing user from initData:', error);
        return null;
    }
};

export const getInitDataFromWindow = (): string | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    const tg = window.Telegram?.WebApp;
    if (!tg) {
        return null;
    }

    return tg.initData || null;
};

export const isTelegramWebApp = (): boolean => {
    if (typeof window === 'undefined') {
        return false;
    }

    return !!window.Telegram?.WebApp;
};