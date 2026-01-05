import { SubscriptionTier } from '../types';

interface PaymentSession {
    paymentId: string;
    confirmationUrl: string;
}

const getServerBaseUrl = () => {
    const base = process.env.SERVER_BASE_URL;
    if (!base) {
        throw new Error('SERVER_BASE_URL не настроен. Укажите адрес backend-сервера в .env.local');
    }
    return base.replace(/\/$/, '');
};

const request = async (path: string, options?: RequestInit) => {
    const base = getServerBaseUrl();
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

export const createPayment = async (
    tier: SubscriptionTier,
    returnUrl: string,
    telegramId?: number | null,
    userId?: string | number | null,
): Promise<PaymentSession> => {
    const payload = {
        tier,
        returnUrl,
        telegramId,
        userId,
    };
    return request('/api/payments/create', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
};

export const cancelSubscription = async (
    telegramId?: number | null,
    userId?: string | number | null,
): Promise<{ ok: boolean }> => {
    const payload = {
        telegramId,
        userId,
    };
    return request('/api/payments/cancel', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
};

export const getPaymentStatus = async (paymentId: string) => {
    const data = await request(`/api/payments/status/${paymentId}`, { method: 'GET' });
    return data?.status as string | null;
};
