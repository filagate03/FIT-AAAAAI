import { SubscriptionTier } from '../types';

const ensureBaseUrl = () => {
    const base = process.env.SERVER_BASE_URL;
    if (!base) {
        throw new Error('SERVER_BASE_URL не настроен. Укажите адрес backend-сервера в .env.local');
    }
    return base.replace(/\/$/, '');
};

const request = async (path: string, options?: RequestInit) => {
    const base = ensureBaseUrl();
    const response = await fetch(`${base}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(options?.headers || {}),
        },
        ...options,
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Ошибка обращения к серверу');
    }
    if (response.status === 204) return null;
    return response.json();
};

export interface AdminSubscription {
    subscriptionKey: string;
    tier: SubscriptionTier;
    userId?: string | number | null;
    telegramId?: number | null;
    status?: string;
    lastPaymentStatus?: string | null;
}

export const fetchSubscriptions = async (password: string) => {
    return request(`/api/admin/subscriptions?password=${encodeURIComponent(password)}`, {
        method: 'GET',
    }) as Promise<{ subscriptions: AdminSubscription[] }>;
};

export const setTier = async (params: {
    password: string;
    tier: SubscriptionTier;
    userId?: string | number | null;
    telegramId?: number | null;
    subscriptionKey?: string;
}) => {
    const { password, ...payload } = params;
    return request('/api/admin/subscriptions/set-tier', {
        method: 'POST',
        body: JSON.stringify({ password, ...payload }),
    });
};

export const sendBroadcast = async (password: string, message: string) => {
    return request('/api/admin/notify', {
        method: 'POST',
        body: JSON.stringify({ password, message, mode: 'all' }),
    });
};

export const sendDirect = async (password: string, message: string, target: { telegramId?: number; userId?: string | number }) => {
    return request('/api/admin/notify', {
        method: 'POST',
        body: JSON.stringify({ password, message, mode: 'single', ...target }),
    });
};
