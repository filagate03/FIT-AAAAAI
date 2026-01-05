import { AppState, Achievement, Profile } from './types';

export const DEFAULT_PROFILE: Profile = {
    name: 'Пользователь',
    age: 30,
    weightKg: 75,
    heightCm: 180,
    gender: 'male',
    activityLevel: 'moderate',
    goalWeightKg: 70,
    dailyIntake: { calories: 2200, protein: 165, fat: 73, carbs: 220 }
};

export const DEFAULT_APP_STATE: AppState = {
    profile: DEFAULT_PROFILE,
    diary: {
        entries: [],
        initialWeight: DEFAULT_PROFILE.weightKg,
        weightHistory: [],
    },
    achievements: {
        unlocked: [],
    },
    coachHistory: [
        {
            role: 'model',
            text: 'Привет! Я ваш ИИ-коуч по питанию. Я могу помочь вам с планом питания, дать советы по достижению цели или ответить на вопросы о еде. Что вас интересует сегодня?'
        }
    ],
    subscription: {
        tier: 'free',
        scansToday: 0,
        entriesThisMonth: 0,
        lastScanDate: '',
        monthStartDate: new Date().toISOString(),
    },
    settings: {
        notificationsEnabled: false,
        supportName: 'Команда Fit AI',
    }
};

export const ACHIEVEMENTS_LIST: Achievement[] = [
    { 
        id: 'first_scan', 
        title: 'Первый шаг', 
        description: 'Сделайте свой первый скан еды.', 
        icon: 'camera',
        checker: (state) => state.diary.entries.length > 0,
    },
    { 
        id: 'healthy_choice', 
        title: 'Здоровый выбор', 
        description: 'Отсканируйте фрукт или овощ.', 
        icon: 'nutrition',
        checker: (state) => state.diary.entries.some(e => e.food.toLowerCase().includes('яблоко') || e.food.toLowerCase().includes('банан') || e.food.toLowerCase().includes('салат') || e.food.toLowerCase().includes('овощи') || e.food.toLowerCase().includes('брокколи'))
    },
    { 
        id: 'full_day', 
        title: 'Полный день', 
        description: 'Запишите 3 приёма пищи за день.', 
        icon: 'fact_check',
        checker: (state) => state.diary.entries.length >= 3,
        progress: (state) => ({ current: state.diary.entries.length, target: 3 }),
    },
    { 
        id: 'protein_pro', 
        title: 'Протеиновый профи', 
        description: 'Запишите блюдо с более чем 30г белка.', 
        icon: 'fitness_center',
        checker: (state) => state.diary.entries.some(e => e.protein > 30)
    },
    {
        id: 'weekly_streak',
        title: 'Недельная серия',
        description: 'Запишите 7 приёмов пищи.',
        icon: 'calendar_month',
        checker: (state) => state.diary.entries.length >= 7,
        progress: (state) => ({ current: state.diary.entries.length, target: 7 }),
    },
    { 
        id: 'hydration_hero', 
        title: 'Герой гидратации', 
        description: 'Запишите 8 стаканов воды.', 
        icon: 'water_drop',
        checker: (state) => state.diary.entries.filter(e => e.food.toLowerCase().includes('вода')).length >= 8,
        progress: (state) => ({ current: state.diary.entries.filter(e => e.food.toLowerCase().includes('вода')).length, target: 8 }),
    },
    {
        id: 'weekend_warrior',
        title: '������� �����',
        description: '���찣 ������ ��� ���������� �� ��������.',
        icon: 'celebration',
        checker: (state) => {
            const latestEntries = state.diary.entries.slice(0, 14);
            let weekendCount = 0;
            latestEntries.forEach(entry => {
                const day = new Date(entry.timestamp).getDay();
                if (day === 0 || day === 6) {
                    weekendCount++;
                }
            });
            return weekendCount >= 2;
        }
    },
    {
        id: 'macro_balancer',
        title: '������ ��������',
        description: '��ࠢ��� ����������� ������� 3 ���� �������.',
        icon: 'balance',
        checker: (state) => state.coachHistory.length >= 3,
        progress: (state) => ({ current: Math.min(3, state.coachHistory.length), target: 3 }),
    },
    {
        id: 'night_mode',
        title: '������ �����',
        description: '�������� ��� ����� 22:00 � �������� ���.',
        icon: 'bedtime',
        checker: (state) => state.diary.entries.some(entry => {
            const hour = new Date(entry.timestamp).getHours();
            return hour >= 22;
        })
    }
];

