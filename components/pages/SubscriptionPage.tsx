import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { SubscriptionTier, Page, SubscriptionPeriod } from '../../types';

interface Plan {
    tier: SubscriptionTier;
    name: string;
    description: string;
    features: string[];
    badge?: string;
}

const PLAN_CONFIG: Plan[] = [
    {
        tier: 'pro',
        name: 'Pro',
        description: 'Для тех, кто хочет системности и подробной аналитики.',
        features: [
            'Безлимитные сканы и записи',
            'Расширенные отчёты и цели',
            'Приоритетные подсказки от ИИ-коуча',
            'Поддержка нутрициолога в чате',
        ],
        badge: 'ТОП выбор',
    },
    {
        tier: 'premium',
        name: 'Premium',
        description: 'Максимум пользы + телеграм-бот, который мотивирует без навязчивости.',
        features: [
            'Все возможности PRO',
            'Персональные мотивации и напоминания в Telegram',
            'Дополнительные метрики: гликемический отклик, тренды по неделям',
            'Приоритет в разработке фич и ранний доступ',
        ],
        badge: 'Новый уровень',
    },
];

const REVIEWS = [
    {
        name: 'Анна, 28 лет',
        text: 'Премиум реально двигает вперёд: бот пишет в нужный момент, и я не выпадаю из режима.',
    },
    {
        name: 'Игорь, 33 года',
        text: 'Pro закрыл вопрос с питанием. Видно, где провалы по нутриентам, и не надо гадать.',
    },
];

const FAQ = [
    {
        q: 'Можно ли отменить подписку?',
        a: 'Да, в любой момент. Доступ сохраняется до конца оплаченного периода.',
    },
    {
        q: 'Как работает бот в Telegram?',
        a: 'После активации Premium бот шлёт мягкие напоминания только когда видит, что вы выпали из ритма.',
    },
    {
        q: 'Какие периоды подписки доступны?',
        a: 'Доступны подписки на 1, 3 и 6 месяцев. Чем длиннее период, тем выгоднее.',
    },
];

const tierDisplay: Record<SubscriptionTier, string> = {
    free: 'Free',
    pro: 'Pro',
    premium: 'Premium',
};

const periodDisplay: Record<SubscriptionPeriod, string> = {
    '1m': '1 месяц',
    '3m': '3 месяца',
    '6m': '6 месяцев',
};

const SubscriptionPage: React.FC = () => {
    const {
        appState,
        setCurrentPage,
        startSubscriptionPayment,
        isPaymentProcessing,
    } = useAppContext();

    const [selectedPeriod, setSelectedPeriod] = useState<SubscriptionPeriod>('1m');

    const currentTier = appState.subscription.tier;

    const handlePayment = async (tier: SubscriptionTier) => {
        await startSubscriptionPayment(tier, selectedPeriod);
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="bg-primary/10 rounded-2xl p-4 border border-primary/30">
                <p className="text-sm text-primary mb-2">Fit AI рекомендует</p>
                <h2 className="text-2xl font-bold text-foreground">Выберите тариф и период подписки</h2>
                <p className="text-muted-foreground text-sm mt-2">
                    Мы изучили топовые wellness-приложения и собрали подход без давления: напоминания только когда они действительно нужны,
                    никакого навязчивого upsell, максимум пользы.
                </p>
            </div>

            <div className="bg-secondary rounded-2xl p-4">
                <h3 className="text-lg font-bold text-foreground mb-3">Выберите период подписки</h3>
                <div className="grid grid-cols-3 gap-3">
                    {(Object.keys(periodDisplay) as SubscriptionPeriod[]).map((period) => (
                        <button
                            key={period}
                            onClick={() => setSelectedPeriod(period)}
                            className={`py-3 px-4 rounded-xl font-semibold transition-all ${selectedPeriod === period
                                ? 'bg-primary text-primary-foreground shadow-lg scale-105'
                                : 'bg-background text-foreground hover:bg-primary/10'
                                }`}
                        >
                            {periodDisplay[period]}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary">verified</span>
                    <div>
                        <p className="font-semibold text-foreground">Максимум пользы без риска</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Отменить можно в любой момент — доступ сохранится до конца оплаченного периода.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid gap-4">
                {PLAN_CONFIG.map(plan => {
                    const isCurrent = currentTier === plan.tier;

                    return (
                        <div
                            key={plan.tier}
                            className={`rounded-2xl p-5 border ${plan.tier === 'premium' ? 'border-primary bg-primary/5' : 'border-border bg-card'} shadow-sm`}
                        >
                            {plan.badge && !isCurrent && (
                                <div className="text-xs uppercase font-semibold text-primary mb-2">{plan.badge}</div>
                            )}
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
                                    <p className="text-muted-foreground text-sm mt-1">{plan.description}</p>
                                </div>
                            </div>
                            <ul className="mt-4 space-y-2">
                                {plan.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                                        <span className="material-symbols-outlined text-green-500 text-base">check_circle</span>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={() => handlePayment(plan.tier)}
                                disabled={isPaymentProcessing}
                                className={`mt-5 w-full py-3 rounded-xl font-semibold flex items-center justify-center transition-colors ${plan.tier === 'premium'
                                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                    : 'bg-foreground text-background hover:bg-foreground/80'
                                    } ${isPaymentProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                <span className="material-symbols-outlined mr-2">payment</span>
                                {isPaymentProcessing ? 'Создаём платёж...' : 'Оплатить через YooKassa'}
                            </button>
                        </div>
                    );
                })}
            </div>

            <div className="rounded-2xl border border-border p-4">
                <h3 className="text-lg font-bold text-foreground mb-3">Отзывы пользователей</h3>
                <div className="grid gap-3">
                    {REVIEWS.map(review => (
                        <div key={review.name} className="bg-secondary rounded-xl p-3">
                            <p className="text-sm text-muted-foreground">"{review.text}"</p>
                            <p className="text-xs text-right mt-2 text-foreground">{review.name}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="rounded-2xl border border-border p-4">
                <h3 className="text-lg font-bold text-foreground mb-3">FAQ</h3>
                <div className="space-y-3">
                    {FAQ.map(item => (
                        <div key={item.q}>
                            <p className="font-semibold text-foreground">{item.q}</p>
                            <p className="text-sm text-muted-foreground">{item.a}</p>
                        </div>
                    ))}
                </div>
            </div>

            <button
                onClick={() => setCurrentPage(Page.Profile)}
                className="w-full py-3 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary"
            >
                Вернуться в профиль
            </button>
        </div>
    );
};

export default SubscriptionPage;
