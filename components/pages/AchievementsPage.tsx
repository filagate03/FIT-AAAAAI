import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { ACHIEVEMENTS_LIST } from '../../constants';
import { Achievement } from '../../types';

const AchievementCard: React.FC<{ achievement: Achievement; isUnlocked: boolean }> = ({ achievement, isUnlocked }) => {
    return (
        <div className={`flex flex-col items-center justify-start p-4 border-2 rounded-lg text-center transition-all duration-300 h-full ${isUnlocked ? 'border-primary bg-primary/10' : 'border-border bg-secondary opacity-70'}`}>
            <span className={`material-symbols-outlined !text-5xl mb-2 ${isUnlocked ? 'text-primary' : 'text-muted-foreground'}`}>
                {achievement.icon}
            </span>
            <h3 className={`font-bold ${isUnlocked ? 'text-primary' : 'text-foreground'}`}>{achievement.title}</h3>
            <p className="text-xs text-muted-foreground mt-1 flex-grow">{achievement.description}</p>
        </div>
    );
};

const GoalsPage: React.FC = () => {
    const { appState } = useAppContext();
    const { profile, diary, achievements } = appState;
    const unlockedIds = new Set(achievements.unlocked);

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
            <div>
                <h2 className="text-xl font-bold text-foreground mb-3">Цель по весу</h2>
                <div className="bg-secondary rounded-lg p-4">
                    <div className="flex justify-between items-baseline mb-1">
                        <span className="text-sm font-medium text-muted-foreground">Прогресс</span>
                        <span className="text-sm font-bold text-primary">{getGoalStatusText()}</span>
                    </div>
                    <div className="w-full bg-background rounded-full h-2.5 mb-2">
                        <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{initialWeight} кг</span>
                        <span>{currentWeight} кг</span>
                        <span>{goalWeight} кг</span>
                    </div>
                </div>
            </div>
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

export default GoalsPage;
