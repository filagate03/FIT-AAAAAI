import crypto from 'crypto';

const API_BASE = process.env.YOOKASSA_BASE_URL || 'https://api.yookassa.ru';

const prices = {
    pro: 990,
    premium: 1890,
};

export const PLAN_LABELS = {
    pro: 'Fit AI PRO',
    premium: 'Fit AI PREMIUM',
};

const encodeBasic = () => {
    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_SECRET_KEY;
    if (!shopId || !secretKey) {
        throw new Error('YOOKASSA_SHOP_ID или YOOKASSA_SECRET_KEY не заданы');
    }
    return Buffer.from(`${shopId}:${secretKey}`).toString('base64');
};

const apiRequest = async (path, options = {}) => {
    const headers = {
        'Content-Type': 'application/json',
        Authorization: `Basic ${encodeBasic()}`,
        ...options.headers,
    };

    const response = await fetch(`${API_BASE}/v3${path}`, { ...options, headers });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `YooKassa request failed: ${response.status}`);
    }
    return response.json();
};

const sendPaymentRequest = payload =>
    apiRequest('/payments', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Idempotence-Key': crypto.randomUUID() },
    });

const isRecurringForbidden = error => {
    const message = String(error?.message || '');
    if (message.includes('recurring payments')) return true;
    try {
        const parsed = JSON.parse(message);
        return parsed?.code === 'forbidden';
    } catch {
        return false;
    }
};

export const createInitialPayment = async ({ tier, returnUrl, metadata }) => {
    if (!prices[tier]) throw new Error('Неизвестный тариф');
    const basePayload = {
        amount: { value: prices[tier].toFixed(2), currency: 'RUB' },
        capture: true,
        description: PLAN_LABELS[tier],
        confirmation: {
            type: 'redirect',
            return_url: returnUrl,
        },
        metadata,
    };

    const recurringPayload = {
        ...basePayload,
        save_payment_method: true,
        payment_method_data: { type: 'bank_card' },
    };

    try {
        return await sendPaymentRequest(recurringPayload);
    } catch (err) {
        if (isRecurringForbidden(err)) {
            console.warn('YooKassa store is not allowed to save cards. Falling back to one-time payment.');
            return sendPaymentRequest(basePayload);
        }
        throw err;
    }
};

export const getPaymentDetails = paymentId => apiRequest(`/payments/${paymentId}`, { method: 'GET' });

export const createRecurringPayment = async ({ tier, paymentMethodId, metadata }) => {
    if (!prices[tier]) throw new Error('Неизвестный тариф');
    if (!paymentMethodId) {
        throw new Error('Нет сохранённого метода оплаты для автопродления');
    }
    const payload = {
        amount: { value: prices[tier].toFixed(2), currency: 'RUB' },
        capture: true,
        description: `${PLAN_LABELS[tier]} (автопродление)`,
        payment_method_id: paymentMethodId,
        metadata,
    };
    return apiRequest('/payments', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
            'Idempotence-Key': crypto.randomUUID(),
        },
    });
};
