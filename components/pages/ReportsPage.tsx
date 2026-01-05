import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { Page, Achievement } from '../../types';
import { ACHIEVEMENTS_LIST } from '../../constants';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';

const UpgradePrompt: React.FC<{ message: string }> = ({ message }) => {
    const { setCurrentPage } = useAppContext();
    return (
        <div className="flex flex-col items-center justify-center text-center h-full -mt-8 p-4">
            <span className="material-symbols-outlined text-7xl text-primary mb-4">
                workspace_premium
            </span>
            <h2 className="text-2xl font-bold text-foreground">Это Pro-функция</h2>
            <p className="text-muted-foreground max-w-sm mb-6">{message}</p>
            <button
                onClick={() => setCurrentPage(Page.Subscription)}
                className="w-full max-w-xs py-3 px-6 bg-primary text-primary-foreground font-semibold rounded-lg shadow-md hover:bg-primary/90 transition-colors"
            >
                Улучшить до Pro
            </button>
        </div>
    );
};

const AchievementCard: React.FC<{ achievement: Achievement; isUnlocked: boolean }> = ({ achievement, isUnlocked }) => {
    const { appState } = useAppContext();
    
    const progressData = !isUnlocked && achievement.progress ? achievement.progress(appState) : null;
    const progressPercentage = progressData ? (progressData.current / progressData.target) * 100 : 0;

    return (
        <div className={`flex flex-col items-center justify-start p-4 border-2 rounded-lg text-center transition-all duration-300 h-full ${isUnlocked ? 'border-primary bg-primary/10' : 'border-border bg-secondary'}`}>
            <div className={`relative w-full flex flex-col items-center flex-grow ${isUnlocked ? '' : 'opacity-75'}`}>
                <span className={`material-symbols-outlined !text-5xl mb-2 ${isUnlocked ? 'text-primary' : 'text-muted-foreground'}`}>
                    {achievement.icon}
                </span>
                <h3 className={`font-bold ${isUnlocked ? 'text-primary' : 'text-foreground'}`}>{achievement.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 flex-grow mb-2">{achievement.description}</p>
            </div>
            
            {progressData && (
                <div className="w-full mt-auto pt-2">
                    <p className="text-xs font-semibold text-primary mb-1">{progressData.current} / {progressData.target}</p>
                    <div className="w-full bg-background rounded-full h-1.5">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${Math.min(progressPercentage, 100)}%` }}></div>
                    </div>
                </div>
            )}
        </div>
    );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/80 backdrop-blur-sm p-2 border border-border rounded-lg shadow-lg">
        <p className="label text-sm text-muted-foreground">{`${label}`}</p>
        {payload.map((pld: any, index: number) => (
             <p key={index} style={{ color: pld.color || pld.fill }} className="font-semibold">{`${pld.name} : ${Number(pld.value).toFixed(1)} ${pld.unit || ''}`}</p>
        ))}
      </div>
    );
  }
  return null;
};


const ReportsPage: React.FC = () => {
    const { appState, openUpdateWeightModal } = useAppContext();
    const { subscription, diary, profile, achievements } = appState;
    const unlockedIds = new Set(achievements.unlocked);

    if (subscription.tier === 'free') {
        return <UpgradePrompt message="Получайте подробные отчёты, отслеживайте цели и открывайте достижения, чтобы достигать результатов ещё эффективнее." />;
    }

    // --- Data Preparation ---
    const weightHistoryData = (diary.weightHistory || []).map(entry => ({
        date: new Date(entry.timestamp).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit'}),
        'Вес': entry.weightKg,
    }));

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const last7DaysData = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        
        const entriesForDay = diary.entries.filter(e => new Date(e.timestamp).toDateString() === d.toDateString());
        const totals = entriesForDay.reduce((acc, entry) => {
            acc.calories += entry.calories;
            acc.protein += entry.protein;
            acc.fat += entry.fat;
            acc.carbs += entry.carbs;
            return acc;
        }, { calories: 0, protein: 0, fat: 0, carbs: 0 });
        
        return { name: dateStr, 'Калории': totals.calories, ...totals };
    }).reverse();

    const totalMacros = last7DaysData.reduce((acc, day) => {
        acc.protein += day.protein;
        acc.fat += day.fat;
        acc.carbs += day.carbs;
        return acc;
    }, { protein: 0, fat: 0, carbs: 0 });
    
    const totalMacroSum = totalMacros.protein + totalMacros.fat + totalMacros.carbs;
    const macroPieData = totalMacroSum > 0 ? [
        { name: 'Белки', value: totalMacros.protein },
        { name: 'Жиры', value: totalMacros.fat },
        { name: 'Углеводы', value: totalMacros.carbs },
    ] : [];
    
    const MACRO_COLORS = ['#3b82f6', '#f59e0b', '#ef4444'];
    
    // Weight Goal Progress Bar Data
    const initialWeight = diary.initialWeight ?? profile.weightKg;
    const currentWeight = profile.weightKg;
    const goalWeight = profile.goalWeightKg;
    const totalWeightChange = Math.abs(initialWeight - goalWeight);
    const currentWeightChange = initialWeight - currentWeight;
    let progress = 0;
    if (totalWeightChange > 0) {
        progress = Math.max(0, Math.min(100, (currentWeightChange / (initialWeight - goalWeight)) * 100));
    } else if (currentWeight === goalWeight) {
        progress = 100;
    }
    const weightDiff = (goalWeight - currentWeight).toFixed(1);
    const getGoalStatusText = () => {
        if (parseFloat(weightDiff) === 0) return "Цель достигнута!";
        if (parseFloat(weightDiff) < 0) return `Осталось сбросить ${Math.abs(parseFloat(weightDiff))} кг`;
        return `Осталось набрать ${weightDiff} кг`;
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Weight Goal Section */}
            <div>
                 <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xl font-bold text-foreground">Цель по весу</h2>
                    <button onClick={openUpdateWeightModal} className="text-sm font-semibold text-primary hover:underline">Изменить вес</button>
                 </div>
                <div className="bg-secondary rounded-lg p-4">
                    <div className="flex justify-between items-baseline mb-1">
                        <span className="text-sm font-medium text-muted-foreground">Прогресс</span>
                        <span className="text-sm font-bold text-primary">{getGoalStatusText()}</span>
                    </div>
                    <div className="w-full bg-background rounded-full h-2.5 mb-2"><div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div></div>
                    <div className="flex justify-between text-xs text-muted-foreground"><span>{initialWeight} кг</span><span className="font-bold text-foreground">{currentWeight} кг</span><span>{goalWeight} кг</span></div>
                </div>
                <div className="bg-secondary rounded-lg p-4 mt-4">
                    <h3 className="font-bold text-foreground mb-4">Динамика веса</h3>
                    {weightHistoryData.length > 1 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={weightHistoryData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))' }} fontSize={12} />
                                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} fontSize={12} domain={['dataMin - 2', 'dataMax + 2']} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Line type="monotone" dataKey="Вес" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} unit=" кг" />
                                <ReferenceLine y={profile.goalWeightKg} label={{ value: 'Цель', position: 'insideTopLeft', fill: 'hsl(var(--primary))' }} stroke="hsl(var(--primary))" strokeDasharray="4 4" />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-muted-foreground text-center py-10">Обновляйте вес, чтобы увидеть график прогресса.</p>
                    )}
                </div>
            </div>

            {/* Analytics Section */}
            <div>
                <h2 className="text-xl font-bold text-foreground mb-3">Аналитика за неделю</h2>
                <div className="bg-secondary rounded-lg p-4">
                    <h3 className="font-bold text-foreground mb-4">Потребление калорий</h3>
                    {last7DaysData.some(d => d['Калории'] > 0) ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={last7DaysData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} fontSize={12} />
                                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} fontSize={12} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Bar dataKey="Калории" fill="hsl(var(--primary))" unit=" ккал" />
                                <ReferenceLine y={profile.dailyIntake.calories} label={{ value: 'Цель', position: 'insideTopLeft', fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-muted-foreground text-center py-10">Нет данных о калориях за последнюю неделю.</p>
                    )}
                </div>
                 <div className="bg-secondary rounded-lg p-4 mt-4">
                    <h3 className="font-bold text-foreground mb-3">Распределение макронутриентов</h3>
                    {macroPieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie data={macroPieData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value"
                                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                        const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                                        const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                                        return (<text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central">{`${(percent * 100).toFixed(0)}%`}</text>);
                                    }}>
                                    {macroPieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={MACRO_COLORS[index % MACRO_COLORS.length]} />))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} unit=" г" />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (<p className="text-muted-foreground text-center py-10">Нет данных о макронутриентах.</p>)}
                </div>
            </div>
            
            {subscription.tier === 'premium' && (
                <div>
                     <h2 className="text-xl font-bold text-foreground mb-3">Расширенная аналитика (Premium)</h2>
                      <div className="bg-secondary rounded-lg p-4">
                         <h3 className="font-bold text-foreground mb-2">Частота приемов пищи</h3>
                         <p className="text-muted-foreground">Анализ времени ваших приемов пищи для выявления паттернов и оптимизации режима питания.</p>
                         <div className="mt-4 text-center text-primary font-semibold">График распределения по времени будет здесь.</div>
                     </div>
                      <div className="bg-secondary rounded-lg p-4 mt-4">
                         <h3 className="font-bold text-foreground mb-2">Еженедельный отчет</h3>
                         <p className="text-muted-foreground mb-4">Получите подробный отчет о вашем питании за неделю в формате PDF.</p>
                         <button className="w-full py-2 px-4 bg-primary text-primary-foreground font-semibold rounded-lg">Скачать отчет</button>
                     </div>
                </div>
            )}

            {/* Achievements Section */}
            <div>
                <h2 className="text-xl font-bold text-foreground mb-3">Достижения</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {ACHIEVEMENTS_LIST.map(ach => (
                        <AchievementCard key={ach.id} achievement={ach} isUnlocked={unlockedIds.has(ach.id)} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ReportsPage;