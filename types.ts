export enum Page {
    Camera = 'Camera',
    Diary = 'Diary',
    Coach = 'Coach',
    Profile = 'Profile',
    Subscription = 'Subscription',
    Reports = 'Reports',
    Admin = 'Admin',
}

export type Theme = 'light' | 'dark';

export interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code: string;
}

export interface Profile {
    name: string;
    age: number;
    weightKg: number;
    heightCm: number;
    gender: 'male' | 'female' | 'other';
    activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
    goalWeightKg: number;
    avatar?: string; // base64 data URI
    dailyIntake: {
        calories: number;
        protein: number;
        fat: number;
        carbs: number;
    };
}

export interface AnalysisResult {
    food: string;
    portion_grams: number;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    tip: string;
    image: string; // base64 image string with data URI
}

export interface DiaryEntry {
    id: string;
    timestamp: string;
    food: string;
    portion_grams: number;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    tip?: string;
}

export interface WeightEntry {
    timestamp: string;
    weightKg: number;
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    checker: (appState: AppState) => boolean;
    progress?: (appState: AppState) => { current: number; target: number };
}

export type SubscriptionTier = 'free' | 'pro' | 'premium';

export interface SubscriptionState {
    tier: SubscriptionTier;
    scansToday: number;
    entriesThisMonth: number;
    lastScanDate: string; // ISO string
    monthStartDate: string; // ISO string
    lastPaymentDate?: string;
}

export interface AppSettings {
    notificationsEnabled: boolean;
    supportName: string;
    lastMotivationAt?: string;
}

export interface BillingState {
    pendingPaymentId: string | null;
    pendingTier: SubscriptionTier | null;
    lastPaymentId?: string | null;
    lastPaymentStatus?: 'pending' | 'succeeded' | 'canceled';
    lastPaymentDate?: string;
}

export interface AppState {
    profile: Profile;
    diary: {
        entries: DiaryEntry[];
        initialWeight?: number;
        weightHistory: WeightEntry[];
    };
    achievements: {
        unlocked: string[];
    };
    coachHistory: ChatMessage[];
    subscription: SubscriptionState;
    settings: AppSettings;
    billing: BillingState;
}

export interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info' | 'achievement';
}

export interface ConfirmModalState {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
}

// Telegram Web App global declaration
declare global {
    interface Window {
        Telegram: {
            WebApp: {
                initData: string;
                initDataUnsafe: {
                    user?: TelegramUser;
                    [key: string]: any;
                };
                isClosingConfirmationEnabled: boolean;
                MainButton: {
                    show: () => void;
                    hide: () => void;
                    setText: (text: string) => void;
                    onClick: (callback: () => void) => void;
                };
                BackButton: {
                    show: () => void;
                    hide: () => void;
                    onClick: (callback: () => void) => void;
                };
                themeParams: {
                    bg_color: string;
                    text_color: string;
                    hint_color: string;
                    link_color: string;
                    button_color: string;
                    button_text_color: string;
                };
                colorScheme: 'light' | 'dark';
                expand: () => void;
                ready: () => void;
                onEvent: (event: 'themeChanged', callback: () => void) => void;
                offEvent?: (event: 'themeChanged', callback: () => void) => void;
                setHeaderColor: (color: string) => void;
                setBackgroundColor: (color: string) => void;
            };
        };
    }
}
