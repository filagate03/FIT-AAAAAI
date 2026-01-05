import crypto from 'crypto';

const API_BASE = process.env.TRIBUTE_BASE_URL || 'https://api.tributepay.com';

const prices = {
    pro: 990,
    premium: 1890,
};

export const PLAN_LABELS = {
    pro: 'Fit AI PRO',
    premium: 'Fit AI PREMIUM',
};

const encodeBasic = () => {
    const apiKey = process.env.TRIBUTE_API_KEY;
    const secretKey = process.env.TRIBUTE_SECRET_KEY;
    if (!apiKey || !secretKey) {
        throw new Error('TRIBUTE_API_KEY или TRIBUTE_SECRET_KEY не заданы');
    }
    return Buffer.from(`${apiKey}:${secretKey}`).toString('base64');
};

const apiRequest = async (path, options = {}) => {
    const headers = {
        'Content-Type': 'application/json',
        Authorization: `Basic ${encodeBasic()}`,
        ...options.headers,
    };

    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Tribute request failed: ${response.status}`);
    }
    return response.json();
};

export const createInitialPayment = async ({ tier, returnUrl, metadata }) => {
    if (!prices[tier]) throw new Error('Неизвестный тариф');
    
    const payload = {
        amount: prices[tier],
        currency: 'RUB',
        description: PLAN_LABELS[tier],
        return_url: returnUrl,
        metadata: JSON.stringify(metadata),
        recurring: {
            enabled: true,
            interval: 'month',
            period: 1,
        },
    };

    return apiRequest('/v1/payments', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Idempotence-Key': crypto.randomUUID() },
    });
};

export const getPaymentDetails = paymentId => apiRequest(`/v1/payments/${paymentId}`, { method: 'GET' });

export const createRecurringPayment = async ({ tier, subscriptionId, metadata }) => {
    if (!prices[tier]) throw new Error('Неизвестный тариф');
    if (!subscriptionId) {
        throw new Error('Нет ID подписки для автопродления');
    }
    
    const payload = {
        subscription_id: subscriptionId,
        amount: prices[tier],
        currency: 'RUB',
        description: `${PLAN_LABELS[tier]} (автопродление)`,
        metadata: JSON.stringify(metadata),
    };
    
    return apiRequest('/v1/payments', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
            'Idempotence-Key': crypto.randomUUID(),
        },
    });
};

export const cancelSubscription = async (subscriptionId) => {
    return apiRequest(`/v1/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
    });
};

export const getSubscriptionDetails = async (subscriptionId) => {
    return apiRequest(`/v1/subscriptions/${subscriptionId}`, { method: 'GET' });
};