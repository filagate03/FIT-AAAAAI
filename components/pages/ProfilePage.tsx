import React, { useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Page, SubscriptionTier } from '../../types';

const ProfileInfoRow: React.FC<{
    label: string;
    value?: string | number;
    icon: string;
    children?: React.ReactNode;
}> = ({ label, value, icon, children }) => (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
        <div className="flex items-center">
            <span className="material-symbols-outlined text-primary mr-4 w-6 text-center">{icon}</span>
            <span className="text-muted-foreground">{label}</span>
        </div>
        {value && <span className="font-semibold text-foreground">{value}</span>}
        {children}
    </div>
);

const tierDisplay: Record<SubscriptionTier, string> = {
    free: 'Free',
    pro: 'Pro',
    premium: 'Premium',
};

const ProfilePage: React.FC = () => {
    const {
        appState,
        theme,
        toggleTheme,
        openEditProfileModal,
        updateProfile,
        addToast,
        setCurrentPage,
        toggleNotifications,
    } = useAppContext();
    
    const { profile, subscription, settings } = appState;
    const { name, age, weightKg, heightCm, goalWeightKg, dailyIntake } = profile;
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const isPremiumUser = subscription.tier === 'premium';

    const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            addToast('Файл слишком большой. Максимум 2 МБ.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = e => {
            const base64 = e.target?.result as string;
            updateProfile({ ...profile, avatar: base64 });
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    const planHighlights: Record<SubscriptionTier, string> = {
        free: 'Базовые сканы и дневник для старта привычки.',
        pro: 'Расширенные отчёты, неограниченные сканы и приоритетные советы.',
        premium: 'Всё из PRO + telegram-напоминания и персональная поддержка.',
    };

    return (
        <div className="flex flex-col gap-6">
            <input
                type="file"
                ref={avatarInputRef}
                onChange={handleAvatarChange}
                accept="image/png, image/jpeg"
                className="hidden"
            />

            <div className="flex flex-col items-center text-center">
                <div className="relative w-28 h-28">
                    <button
                        className="w-full h-full rounded-full bg-primary/20 flex items-center justify-center group overflow-hidden"
                        onClick={() => avatarInputRef.current?.click()}
                    >
                        {profile.avatar ? (
                            <img src={profile.avatar} alt="avatar" className="w-full h-full object-cover rounded-full" />
                        ) : (
                            <span className="material-symbols-outlined text-primary !text-6xl">person</span>
                        )}
                        <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <span className="material-symbols-outlined text-white">photo_camera</span>
                        </div>
                    </button>
                </div>
                <h2 className="text-2xl font-bold text-foreground mt-4">{name}</h2>
                <p className="text-muted-foreground">{age} лет</p>
            </div>

            <div className="bg-secondary rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-lg text-foreground">Подписка</h3>
                    <button
                        onClick={() => setCurrentPage(Page.Subscription)}
                        className="text-sm font-semibold text-primary hover:underline"
                    >
                        Управлять
                    </button>
                </div>
                <ProfileInfoRow label="Текущий тариф" value={tierDisplay[subscription.tier]} icon="workspace_premium" />
                <p className="text-xs text-muted-foreground mt-2 px-1">{planHighlights[subscription.tier]}</p>
            </div>

            {isPremiumUser ? (
                <div className="bg-secondary rounded-lg p-4">
                    <h3 className="font-bold text-lg mb-2 text-foreground">Уведомления</h3>
                    <ProfileInfoRow label="Напоминания по делу" icon="notifications">
                        <div className="flex items-center">
                            <span className="text-sm mr-3">{settings.notificationsEnabled ? 'Вкл.' : 'Выкл.'}</span>
                            <button
                                onClick={toggleNotifications}
                                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
                                    settings.notificationsEnabled ? 'bg-primary' : 'bg-muted'
                                }`}
                            >
                                <span
                                    className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                                        settings.notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>
                    </ProfileInfoRow>
                    <p className="text-xs text-muted-foreground mt-2 px-1">
                        Бот напомнит о воде и взвешиваниях только когда видит, что вы выпали из ритма.
                    </p>
                </div>
            ) : (
                <div className="bg-secondary rounded-lg p-4">
                    <h3 className="font-bold text-lg mb-2 text-foreground">Уведомления</h3>
                    <p className="text-sm text-muted-foreground">
                        Персональные напоминания включаются на тарифе Premium — так мы не отвлекаем пользователей Free/Pro.
                    </p>
                </div>
            )}

            <div className="bg-secondary rounded-lg p-4">
                <h3 className="font-bold text-lg mb-2 text-foreground">Антропометрия</h3>
                <ProfileInfoRow label="Вес" value={`${weightKg} кг`} icon="monitor_weight" />
                <ProfileInfoRow label="Рост" value={`${heightCm} см`} icon="height" />
                <ProfileInfoRow label="Цель" value={`${goalWeightKg} кг`} icon="flag" />
                <ProfileInfoRow label="Отчёты" icon="description">
                    <button
                        onClick={() => setCurrentPage(Page.Reports)}
                        className="text-sm font-semibold text-primary hover:underline"
                    >
                        Открыть
                    </button>
                </ProfileInfoRow>
            </div>

            {subscription.tier === 'premium' && (
                <div className="bg-secondary rounded-lg p-4">
                    <h3 className="font-bold text-lg mb-2 text-foreground">Эксклюзив</h3>
                    <ProfileInfoRow label="Напоминания в Telegram" icon="smartphone">
                        <span className="text-sm text-foreground">Активны</span>
                    </ProfileInfoRow>
                    <p className="text-xs text-muted-foreground mt-2 px-1">
                        Получаете доступ к ранним фичам и персональным предложениям от команды Fit AI.
                    </p>
                </div>
            )}

            <div className="bg-secondary rounded-lg p-4">
                <h3 className="font-bold text-lg mb-2 text-foreground">Рекомендуемое КБЖУ</h3>
                <ProfileInfoRow label="Калории" value={`${dailyIntake.calories.toFixed(0)} ккал`} icon="local_fire_department" />
                <ProfileInfoRow label="Белки" value={`${dailyIntake.protein.toFixed(0)} г`} icon="egg" />
                <ProfileInfoRow label="Жиры" value={`${dailyIntake.fat.toFixed(0)} г`} icon="restaurant_menu" />
                <ProfileInfoRow label="Углеводы" value={`${dailyIntake.carbs.toFixed(0)} г`} icon="cookie" />
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={openEditProfileModal}
                    className="flex-1 py-3 px-6 bg-primary text-primary-foreground font-semibold rounded-lg shadow-md hover:bg-primary/90 transition-colors"
                >
                    Редактировать
                </button>
                <button
                    onClick={toggleTheme}
                    className="p-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-accent transition-colors"
                    aria-label="Сменить тему"
                >
                    <span className="material-symbols-outlined">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
                </button>
            </div>
        </div>
    );
};

export default ProfilePage;
