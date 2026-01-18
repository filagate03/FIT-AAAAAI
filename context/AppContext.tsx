import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
    useRef,
} from 'react';
import {
    Page,
    Theme,
    AnalysisResult,
    AppState,
    Toast,
    ConfirmModalState,
    TelegramUser,
    DiaryEntry,
    Profile,
    ChatMessage,
    SubscriptionTier,
    SubscriptionPeriod,
} from '../types';
import { loadState, saveState } from '../services/storageService';
import { DEFAULT_APP_STATE, ACHIEVEMENTS_LIST, TERMS_VERSION } from '../constants';
import { calculateTDEE, calculateMacros, calculateBMR, calculateCalorieGoal } from '../utils/nutritionCalculations';
import { getCoachResponse, analyzeFoodImage } from '../services/geminiService';
import { createPayment, getPaymentStatus, cancelSubscription } from '../services/paymentService';
import { notifyPaymentSuccess, sendMotivationMessage, sendSupportMessage } from '../services/telegramService';
import { getInitDataFromWindow, isTelegramWebApp, validateInitData, getUserFromInitData } from '../services/telegramValidationService';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'alex-alex-fitai3';
const MOTIVATION_INTERVAL_MS = 1000 * 60 * 60 * 6;
const MOTIVATION_MESSAGES = {
    break: [
        'Сегодня идеальный день, чтобы обновить дневник. Один скан ближе к цели!',
        'Напомню: стабильность создаёт форму. Загляни в Fit AI и отметь последний приём пищи.',
        'Ты уже так близко к прогрессу. Добавь запись и дай мне больше данных для рекомендаций.',
    ],
    routine: [
        'Fit AI готов подсказать свежие идеи для меню. Зайди и попробуй новый рецепт!',
        'Маленький шаг прямо сейчас лучше, чем идеальный план завтра. Жду тебя в приложении.',
        'Дыхание, вода и дневник – три простых привычки. Обнови Fit AI, чтобы держать курс.',
    ],
};

type PaidTier = Extract<SubscriptionTier, 'pro' | 'premium'>;

const PAYMENT_PLANS: Record<PaidTier, { price: number; label: string; description: string }> = {
    pro: {
        price: 990,
        label: 'PRO',
        description: 'Расширенные подсказки, углублённые отчёты и поддержка нутрициолога.',
    },
    premium: {
        price: 1890,
        label: 'PREMIUM',
        description: 'Персональные мотивации в Telegram, приоритет в очереди и детальная аналитика.',
    },
};

const buildInitialState = (): AppState => {
    const stored = loadState();
    const merged: AppState = {
        ...DEFAULT_APP_STATE,
        ...stored,
        profile: {
            ...DEFAULT_APP_STATE.profile,
            ...stored?.profile,
        },
        diary: {
            ...DEFAULT_APP_STATE.diary,
            ...stored?.diary,
            entries: stored?.diary?.entries || [],
            weightHistory:
                stored?.diary?.weightHistory && stored.diary.weightHistory.length > 0
                    ? stored.diary.weightHistory
                    : [
                        {
                            timestamp: new Date().toISOString(),
                            weightKg: (stored?.profile?.weightKg ?? DEFAULT_APP_STATE.profile.weightKg) || 0,
                        },
                    ],
        },
        achievements: {
            unlocked: stored?.achievements?.unlocked || [],
        },
        coachHistory: stored?.coachHistory || DEFAULT_APP_STATE.coachHistory,
        subscription: {
            ...DEFAULT_APP_STATE.subscription,
            ...stored?.subscription,
        },
        settings: {
            ...DEFAULT_APP_STATE.settings,
            ...stored?.settings,
        },
        billing: {
            ...DEFAULT_APP_STATE.billing,
            ...stored?.billing,
        },
    };

    if (!merged.diary.initialWeight) {
        merged.diary.initialWeight = merged.profile.weightKg;
    }

    return merged;
};

interface AppContextType {
    theme: Theme;
    toggleTheme: () => void;
    currentPage: Page;
    setCurrentPage: (page: Page) => void;
    isLoading: boolean;
    loadingMessage: string;
    setLoading: (value: boolean, message?: string) => void;
    toasts: Toast[];
    addToast: (message: string, type: Toast['type']) => void;
    analysisResult: AnalysisResult | null;
    setAnalysisResult: (result: AnalysisResult | null) => void;
    confirmModalState: ConfirmModalState;
    showConfirmation: (title: string, message: string, onConfirm: () => void) => void;
    hideConfirmation: () => void;
    appState: AppState;
    addEntryToDiary: (
        entryData: Omit<DiaryEntry, 'id' | 'timestamp' | 'tip'> & { tip?: string },
        isScan?: boolean,
    ) => void;
    updateProfile: (updatedProfile: Profile) => void;
    telegramUser: TelegramUser | null;
    isManualEntryModalOpen: boolean;
    openManualEntryModal: () => void;
    closeManualEntryModal: () => void;
    addManualEntryToDiary: (entry: Omit<DiaryEntry, 'id' | 'timestamp'>) => void;
    addWaterEntry: () => void;
    isEditProfileModalOpen: boolean;
    openEditProfileModal: () => void;
    closeEditProfileModal: () => void;
    isUpdateWeightModalOpen: boolean;
    openUpdateWeightModal: () => void;
    closeUpdateWeightModal: () => void;
    sendCoachMessage: (message: string) => Promise<void>;
    isCoachLoading: boolean;
    requestImageAnalysis: (base64Data: string, fullDataUri: string) => Promise<void>;
    upgradeSubscription: (tier: SubscriptionTier) => void;
    startSubscriptionPayment: (tier: SubscriptionTier, period: SubscriptionPeriod) => Promise<void>;
    refreshPaymentStatus: (options?: { silent?: boolean }) => Promise<string | null>;
    isPaymentProcessing: boolean;
    isPaymentVerifying: boolean;
    cancelCurrentSubscription: () => Promise<void>;
    isCancellingSubscription: boolean;
    toggleNotifications: () => void;
    acceptTerms: () => void;
    handleAdminNav: () => void;
    isAdminPasswordModalOpen: boolean;
    closeAdminPasswordModal: () => void;
    verifyAdminPassword: (password: string) => boolean;
    adminPassword: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>('light');
    const [currentPage, setCurrentPage] = useState<Page>(Page.Camera);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [confirmModalState, setConfirmModalState] = useState<ConfirmModalState>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
    });
    const [appState, setAppState] = useState<AppState>(buildInitialState);
    const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
    const [isManualEntryModalOpen, setIsManualEntryModalOpen] = useState(false);
    const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
    const [isUpdateWeightModalOpen, setIsUpdateWeightModalOpen] = useState(false);
    const [isCoachLoading, setCoachLoading] = useState(false);
    const [adminTapCount, setAdminTapCount] = useState(0);
    const [isAdminPasswordModalOpen, setAdminPasswordModalOpen] = useState(false);
    const [hasAdminAccess, setHasAdminAccess] = useState(false);
    const [adminPassword, setAdminPassword] = useState<string | null>(null);
    const [isPaymentProcessing, setPaymentProcessing] = useState(false);
    const [isPaymentVerifying, setPaymentVerifying] = useState(false);
    const [isCancellingSubscription, setCancellingSubscription] = useState(false);
    const motivationLock = useRef(false);

    const addToast = useCallback((message: string, type: Toast['type']) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const setLoading = (value: boolean, message: string = 'Загрузка...') => {
        setIsLoading(value);
        setLoadingMessage(message);
    };

    const checkAndResetUsage = useCallback(() => {
        setAppState(prev => {
            const now = new Date();
            const subscription = { ...prev.subscription };
            let changed = false;

            if (!subscription.lastScanDate || new Date(subscription.lastScanDate).toDateString() !== now.toDateString()) {
                subscription.scansToday = 0;
                subscription.lastScanDate = now.toISOString();
                changed = true;
            }

            const monthStart = subscription.monthStartDate ? new Date(subscription.monthStartDate) : null;
            if (
                !monthStart ||
                monthStart.getMonth() !== now.getMonth() ||
                monthStart.getFullYear() !== now.getFullYear()
            ) {
                subscription.entriesThisMonth = 0;
                subscription.monthStartDate = now.toISOString();
                changed = true;
            }

            return changed ? { ...prev, subscription } : prev;
        });
    }, []);

    useEffect(() => {
        checkAndResetUsage();
        const interval = setInterval(checkAndResetUsage, 60 * 60 * 1000);
        return () => clearInterval(interval);
    }, [checkAndResetUsage]);

    useEffect(() => {
        saveState(appState);

        const unlocked = new Set(appState.achievements.unlocked);
        const newlyUnlocked = ACHIEVEMENTS_LIST.filter(ach => !unlocked.has(ach.id) && ach.checker(appState));

        if (newlyUnlocked.length > 0) {
            setAppState(prev => ({
                ...prev,
                achievements: {
                    unlocked: [...prev.achievements.unlocked, ...newlyUnlocked.map(ach => ach.id)],
                },
            }));
            newlyUnlocked.forEach(ach => addToast(`Новое достижение: ${ach.title}!`, 'achievement'));
        }
    }, [appState, addToast]);

    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        if (!tg) {
            return;
        }

        try {
            tg.ready();
        } catch (error) {
            console.warn('Telegram WebApp ready error', error);
        }

        if (tg.colorScheme) {
            setTheme(tg.colorScheme === 'dark' ? 'dark' : 'light');
        }

        const initData = getInitDataFromWindow();
        const botToken = process.env.TELEGRAM_BOT_TOKEN || '';

        if (initData && botToken && validateInitData(initData, botToken)) {
            const user = getUserFromInitData(initData);
            if (user) {
                setTelegramUser(user);
                setAppState(prev => {
                    if (prev.profile.name !== DEFAULT_APP_STATE.profile.name) {
                        return prev;
                    }
                    return {
                        ...prev,
                        profile: {
                            ...prev.profile,
                            name: user.first_name || prev.profile.name,
                        },
                    };
                });
            }
        } else {
            const initUser = tg.initDataUnsafe?.user;
            if (initUser) {
                setTelegramUser(initUser);
                setAppState(prev => {
                    if (prev.profile.name !== DEFAULT_APP_STATE.profile.name) {
                        return prev;
                    }
                    return {
                        ...prev,
                        profile: {
                            ...prev.profile,
                            name: initUser.first_name || prev.profile.name,
                        },
                    };
                });
            }
        }

        const onThemeChange = () => {
            setTheme(tg.colorScheme === 'dark' ? 'dark' : 'light');
        };

        tg.onEvent?.('themeChanged', onThemeChange);
        return () => tg.offEvent?.('themeChanged', onThemeChange);
    }, []);

    const requestImageAnalysis = async (base64Data: string, fullDataUri: string) => {
        const { tier, scansToday, entriesThisMonth } = appState.subscription;
        if (tier === 'free') {
            if (scansToday >= 3) {
                addToast('Вы использовали дневной лимит сканирований (3).', 'error');
                setCurrentPage(Page.Subscription);
                return;
            }
            if (entriesThisMonth >= 100) {
                addToast('Вы достигли месячного лимита добавлений (100).', 'error');
                setCurrentPage(Page.Subscription);
                return;
            }
        }

        setLoading(true, 'Анализирую блюдо...');
        try {
            const resultJson = await analyzeFoodImage(base64Data, appState.profile);
            setAnalysisResult({ ...resultJson, image: fullDataUri });

            setAppState(prev => ({
                ...prev,
                subscription: {
                    ...prev.subscription,
                    scansToday: prev.subscription.scansToday + 1,
                    lastScanDate: new Date().toISOString(),
                },
            }));

            addToast('Анализ готов!', 'info');
        } catch (error: any) {
            addToast(error.message || 'Что-то пошло не так. Попробуйте снова.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const addEntryToDiary = (
        entryData: Omit<DiaryEntry, 'id' | 'timestamp' | 'tip'> & { tip?: string },
        isScan: boolean = false,
    ) => {
        const newEntry: DiaryEntry = {
            id: `entry-${Date.now()}`,
            timestamp: new Date().toISOString(),
            ...entryData,
        };

        setAppState(prev => ({
            ...prev,
            diary: {
                ...prev.diary,
                entries: [newEntry, ...prev.diary.entries],
            },
            subscription: {
                ...prev.subscription,
                entriesThisMonth: prev.subscription.entriesThisMonth + 1,
            },
        }));

        if (isScan) {
            setAnalysisResult(null);
        }
        addToast('Блюдо добавлено в дневник!', 'success');
        setCurrentPage(Page.Diary);
    };

    const updateProfile = (updatedProfile: Profile) => {
        const bmr = calculateBMR(updatedProfile);
        const tdee = calculateTDEE(bmr, updatedProfile.activityLevel);
        const goalCalories = calculateCalorieGoal(
            tdee,
            updatedProfile.weightKg,
            updatedProfile.goalWeightKg,
            updatedProfile.gender,
        );
        const macros = calculateMacros(goalCalories);
        const profileWithIntake = {
            ...updatedProfile,
            dailyIntake: { calories: goalCalories, ...macros },
        };

        setAppState(prev => {
            const weightHistory = [...prev.diary.weightHistory];
            const lastEntry = weightHistory[weightHistory.length - 1];
            if (!lastEntry || lastEntry.weightKg !== updatedProfile.weightKg) {
                weightHistory.push({
                    timestamp: new Date().toISOString(),
                    weightKg: updatedProfile.weightKg,
                });
            }

            return {
                ...prev,
                profile: profileWithIntake,
                diary: {
                    ...prev.diary,
                    initialWeight: prev.diary.initialWeight ?? updatedProfile.weightKg,
                    weightHistory,
                },
            };
        });


        if (telegramUser) {
            fetch('/api/user/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    telegramId: telegramUser.id,
                    profile: profileWithIntake
                })
            }).catch(err => console.error('Failed to sync profile', err));
        }

        addToast('Профиль обновлён!', 'success');
    };

    const showConfirmation = (title: string, message: string, onConfirm: () => void) => {
        setConfirmModalState({
            isOpen: true,
            title,
            message,
            onConfirm,
        });
    };

    const hideConfirmation = () => {
        setConfirmModalState({
            isOpen: false,
            title: '',
            message: '',
            onConfirm: () => { },
        });
    };

    const openManualEntryModal = () => setIsManualEntryModalOpen(true);
    const closeManualEntryModal = () => setIsManualEntryModalOpen(false);

    const addManualEntryToDiary = (entry: Omit<DiaryEntry, 'id' | 'timestamp'>) => {
        addEntryToDiary(entry);
        closeManualEntryModal();
    };

    const addWaterEntry = () => {
        addEntryToDiary({
            food: 'Вода',
            portion_grams: 250,
            calories: 0,
            protein: 0,
            fat: 0,
            carbs: 0,
            tip: 'Отличная работа! Поддержание гидратации ускоряет прогресс.',
        });
    };

    const openEditProfileModal = () => setIsEditProfileModalOpen(true);
    const closeEditProfileModal = () => setIsEditProfileModalOpen(false);
    const openUpdateWeightModal = () => setIsUpdateWeightModalOpen(true);
    const closeUpdateWeightModal = () => setIsUpdateWeightModalOpen(false);

    const sendCoachMessage = async (message: string) => {
        const userMessage: ChatMessage = { role: 'user', text: message };
        const history = [...appState.coachHistory, userMessage];
        setAppState(prev => ({ ...prev, coachHistory: history }));
        setCoachLoading(true);
        try {
            const reply = await getCoachResponse(history, appState.profile, appState.diary.entries, appState.subscription.tier);
            const coachMessage: ChatMessage = { role: 'model', text: reply || 'Произошла ошибка. Попробуйте ещё раз.' };
            setAppState(prev => ({
                ...prev,
                coachHistory: [...history, coachMessage],
            }));
        } catch (error) {
            console.error(error);
            const fallback: ChatMessage = { role: 'model', text: 'Произошла ошибка. Попробуйте позже.' };
            setAppState(prev => ({ ...prev, coachHistory: [...history, fallback] }));
        } finally {
            setCoachLoading(false);
        }
    };

    const upgradeSubscription = (tier: SubscriptionTier) => {
        setAppState(prev => ({
            ...prev,
            subscription: {
                ...prev.subscription,
                tier,
            },
            billing: tier === 'free'
                ? { ...prev.billing, pendingPaymentId: null, pendingTier: null }
                : prev.billing,
        }));
        addToast(`Тариф ${tier.toUpperCase()} активен.`, 'success');
    };

    const toggleNotifications = () => {
        if (appState.subscription.tier !== 'premium') {
            addToast('Телеграм-уведомления доступны только на премиум-тарифе.', 'info');
            return;
        }
        setAppState(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                notificationsEnabled: !prev.settings.notificationsEnabled,
            },
        }));
    };

    const acceptTerms = () => {
        setAppState(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                termsAcceptedAt: new Date().toISOString(),
                termsAcceptedVersion: TERMS_VERSION,
            },
        }));
        addToast('Спасибо за согласие с условиями.', 'success');
    };

    const handleAdminNav = () => {
        const count = adminTapCount + 1;
        setAdminTapCount(count);
        if (count >= 5) {
            if (hasAdminAccess) {
                setCurrentPage(Page.Admin);
            } else {
                setAdminPasswordModalOpen(true);
            }
            setAdminTapCount(0);
        } else if (count > 2) {
            addToast(`До входа в админ-панель осталось ${5 - count} нажатий`, 'info');
        }
        setTimeout(() => setAdminTapCount(0), 2000);
    };

    const closeAdminPasswordModal = () => setAdminPasswordModalOpen(false);

    const verifyAdminPassword = (password: string) => {
        const isValid = password.trim() === ADMIN_PASSWORD;
        if (isValid) {
            setHasAdminAccess(true);
            setAdminPassword(password.trim());
            setAdminPasswordModalOpen(false);
            setCurrentPage(Page.Admin);
            addToast('Добро пожаловать в админ-панель.', 'success');
        }
        return isValid;
    };

    const finalizePayment = useCallback(
        (tier: SubscriptionTier, paymentId: string) => {
            setAppState(prev => ({
                ...prev,
                subscription: {
                    ...prev.subscription,
                    tier,
                },
                billing: {
                    ...prev.billing,
                    pendingPaymentId: null,
                    pendingTier: null,
                    lastPaymentId: paymentId,
                    lastPaymentStatus: 'succeeded',
                    lastPaymentDate: new Date().toISOString(),
                },
            }));
            addToast('Оплата подтверждена. Приятного пользования!', 'success');
            if (telegramUser) {
                notifyPaymentSuccess(telegramUser.id, tier, appState.profile.name).catch(() => undefined);
            }
            sendSupportMessage(
                `💳 Оплата тарифа ${tier.toUpperCase()} успешно завершена. ID: ${paymentId}.`,
                appState.profile.name,
                telegramUser?.id,
            ).catch(() => undefined);
        },
        [addToast, telegramUser, appState.profile.name],
    );

    const startSubscriptionPayment = async (tier: SubscriptionTier, period: SubscriptionPeriod) => {
        if (tier === 'free') {
            upgradeSubscription('free');
            return;
        }

        if (!['pro', 'premium'].includes(tier)) {
            return;
        }

        if (isPaymentProcessing) {
            return;
        }

        const paidTier = tier as PaidTier;
        setPaymentProcessing(true);
        try {
            const returnUrl = `${typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''}`;
            const session = await createPayment(
                paidTier,
                period,
                returnUrl,
                telegramUser?.id ?? null,
                appState.profile.name,
            );
            setAppState(prev => ({
                ...prev,
                billing: {
                    ...prev.billing,
                    pendingPaymentId: session.paymentId,
                    pendingTier: paidTier,
                    lastPaymentStatus: 'pending',
                },
            }));
            addToast('Перенаправляем на YooKassa для оплаты.', 'info');
            if (session.confirmationUrl) {
                window.location.href = session.confirmationUrl;
            }
        } catch (error: any) {
            addToast(error.message || 'Не удалось создать платёж. Попробуйте ещё раз.', 'error');
        } finally {
            setPaymentProcessing(false);
        }
    };

    const refreshPaymentStatus = useCallback(async (options?: { silent?: boolean }) => {
        const silent = options?.silent ?? false;
        const paymentId = appState.billing.pendingPaymentId;
        const targetTier = appState.billing.pendingTier;
        if (!paymentId || !targetTier) {
            return null;
        }
        if (isPaymentVerifying) {
            return null;
        }
        setPaymentVerifying(true);
        try {
            const status = await getPaymentStatus(paymentId);
            if (status === 'succeeded' || status === 'waiting_for_capture') {
                finalizePayment(targetTier, paymentId);
            } else if (status === 'canceled') {
                setAppState(prev => ({
                    ...prev,
                    billing: {
                        ...prev.billing,
                        pendingPaymentId: null,
                        pendingTier: null,
                        lastPaymentStatus: 'canceled',
                    },
                }));
                if (!silent) addToast('Оплата была отменена.', 'error');
            } else {
                if (!silent) addToast('Платёж ещё обрабатывается в YooKassa. Попробуйте позже.', 'info');
            }
            return status as string;
        } catch (error: any) {
            if (!silent) addToast(error.message || 'Не удалось проверить платёж.', 'error');
            return null;
        } finally {
            setPaymentVerifying(false);
        }
    }, [appState.billing.pendingPaymentId, appState.billing.pendingTier, finalizePayment, addToast, isPaymentVerifying]);

    const cancelCurrentSubscription = async () => {
        if (isCancellingSubscription) return;

        setCancellingSubscription(true);
        try {
            await cancelSubscription(telegramUser?.id ?? null, appState.profile.name);

            setAppState(prev => ({
                ...prev,
                subscription: {
                    ...prev.subscription,
                    status: 'cancelled',
                    nextChargeAt: null,
                },
            }));

            addToast('Подписка успешно отменена.', 'success');
        } catch (error: any) {
            addToast(error.message || 'Не удалось отменить подписку.', 'error');
        } finally {
            setCancellingSubscription(false);
        }
    };

    useEffect(() => {
        if (appState.billing.pendingPaymentId) {
            refreshPaymentStatus({ silent: true });
        }
    }, [appState.billing.pendingPaymentId, refreshPaymentStatus]);

    useEffect(() => {
        if (
            !telegramUser ||
            appState.subscription.tier !== 'premium' ||
            !appState.settings.notificationsEnabled
        ) {
            return;
        }

        const lastEntry = appState.diary.entries[0];
        const hoursSinceEntry = lastEntry ? (Date.now() - new Date(lastEntry.timestamp).getTime()) / (1000 * 60 * 60) : Infinity;
        const hoursSinceMotivation = appState.settings.lastMotivationAt
            ? (Date.now() - new Date(appState.settings.lastMotivationAt).getTime()) / (1000 * 60 * 60)
            : Infinity;

        const sendMotivation = async (type: keyof typeof MOTIVATION_MESSAGES) => {
            if (motivationLock.current) {
                return;
            }
            motivationLock.current = true;
            const pool = MOTIVATION_MESSAGES[type];
            const message = pool[Math.floor(Math.random() * pool.length)];
            try {
                await sendMotivationMessage(telegramUser.id, message);
                setAppState(prev => ({
                    ...prev,
                    settings: {
                        ...prev.settings,
                        lastMotivationAt: new Date().toISOString(),
                    },
                }));
            } catch (error) {
                console.warn('Motivation send failed', error);
            } finally {
                motivationLock.current = false;
            }
        };

        if (hoursSinceEntry > 18 && hoursSinceMotivation > 6) {
            sendMotivation('break');
        }

        const interval = window.setInterval(() => sendMotivation('routine'), MOTIVATION_INTERVAL_MS);
        return () => window.clearInterval(interval);
    }, [telegramUser, appState.subscription.tier, appState.settings.notificationsEnabled, appState.diary.entries, appState.settings.lastMotivationAt]);

    const contextValue: AppContextType = {
        theme,
        toggleTheme: () => setTheme(prev => (prev === 'light' ? 'dark' : 'light')),
        currentPage,
        setCurrentPage,
        isLoading,
        loadingMessage,
        setLoading,
        toasts,
        addToast,
        analysisResult,
        setAnalysisResult,
        confirmModalState,
        showConfirmation,
        hideConfirmation,
        appState,
        addEntryToDiary,
        updateProfile,
        telegramUser,
        isManualEntryModalOpen,
        openManualEntryModal,
        closeManualEntryModal,
        addManualEntryToDiary,
        addWaterEntry,
        isEditProfileModalOpen,
        openEditProfileModal,
        closeEditProfileModal,
        isUpdateWeightModalOpen,
        openUpdateWeightModal,
        closeUpdateWeightModal,
        sendCoachMessage,
        isCoachLoading,
        requestImageAnalysis,
        upgradeSubscription,
        startSubscriptionPayment,
        refreshPaymentStatus,
        isPaymentProcessing,
        isPaymentVerifying,
        cancelCurrentSubscription,
        isCancellingSubscription,
        toggleNotifications,
        acceptTerms,
        handleAdminNav,
        isAdminPasswordModalOpen,
        closeAdminPasswordModal,
        verifyAdminPassword,
        adminPassword,
    };

    return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};

