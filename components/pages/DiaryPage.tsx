import React, { useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { DiaryEntry, Page } from '../../types';

const formatTime = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

const SummaryCard: React.FC<{ title: string; value: number; target?: number; accent?: boolean }> = ({
    title,
    value,
    target,
    accent = false,
}) => {
    const ratio = target ? Math.min(100, Math.round((value / target) * 100)) : null;
    return (
        <div className={`flex flex-col gap-1 rounded-2xl p-4 ${accent ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
            <p className={`text-sm font-medium ${accent ? 'text-white/90' : 'text-muted-foreground'}`}>{title}</p>
            <p className="text-2xl font-bold">
                {Math.round(value)}
                {title === 'Калории' ? ' ккал' : ' г'}
            </p>
            {ratio !== null && (
                <div className="flex items-center gap-2 text-xs">
                    <div className="flex-1 h-1.5 rounded-full bg-background/60 overflow-hidden">
                        <div className="h-full bg-white/80" style={{ width: `${ratio}%` }} />
                    </div>
                    <span>{ratio}%</span>
                </div>
            )}
        </div>
    );
};

const DiaryCard: React.FC<{ entry: DiaryEntry }> = ({ entry }) => (
    <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/60">
        <div className="flex justify-between items-start gap-4">
            <div>
                <p className="text-sm text-muted-foreground">{formatTime(entry.timestamp)}</p>
                <h3 className="font-semibold text-foreground text-lg">{entry.food}</h3>
                <p className="text-sm text-muted-foreground">{entry.portion_grams} г • {entry.calories} ккал</p>
            </div>
            <span className="px-3 py-1 bg-secondary rounded-full text-sm font-medium text-foreground">
                {entry.calories} ккал
            </span>
        </div>

        {entry.tip && (
            <div className="mt-3 text-sm text-muted-foreground bg-secondary/60 rounded-xl px-3 py-2">
                {entry.tip}
            </div>
        )}

        <div className="grid grid-cols-3 gap-2 mt-3 text-center text-sm">
            <div className="bg-secondary rounded-xl p-2">
                <p className="font-semibold text-foreground">{entry.protein.toFixed(1)} г</p>
                <p className="text-muted-foreground text-xs">Белки</p>
            </div>
            <div className="bg-secondary rounded-xl p-2">
                <p className="font-semibold text-foreground">{entry.fat.toFixed(1)} г</p>
                <p className="text-muted-foreground text-xs">Жиры</p>
            </div>
            <div className="bg-secondary rounded-xl p-2">
                <p className="font-semibold text-foreground">{entry.carbs.toFixed(1)} г</p>
                <p className="text-muted-foreground text-xs">Углеводы</p>
            </div>
        </div>
    </div>
);

const QuickActionButton: React.FC<{ label: string; icon: string; onClick: () => void }> = ({ label, icon, onClick }) => (
    <button
        onClick={onClick}
        className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card px-4 py-3 w-full hover:-translate-y-0.5 transition-transform"
    >
        <span className="material-symbols-outlined !text-3xl text-primary">{icon}</span>
        <span className="text-sm font-semibold text-foreground">{label}</span>
    </button>
);

const DiaryPage: React.FC = () => {
    const { appState, setCurrentPage, openManualEntryModal, addWaterEntry } = useAppContext();
    const { entries } = appState.diary;
    const [fabOpen, setFabOpen] = useState(false);

    const totals = useMemo(() => {
        return entries.reduce(
            (acc, entry) => {
                acc.calories += entry.calories;
                acc.protein += entry.protein;
                acc.fat += entry.fat;
                acc.carbs += entry.carbs;
                return acc;
            },
            { calories: 0, protein: 0, fat: 0, carbs: 0 }
        );
    }, [entries]);

    const targets = appState.profile.dailyIntake;

    const Fab = () => (
        <div className="fixed bottom-24 right-6 z-30">
            <div className="relative flex flex-col items-center gap-3">
                {fabOpen && (
                    <>
                        <button
                            onClick={() => {
                                addWaterEntry();
                                setFabOpen(false);
                            }}
                            className="flex items-center gap-2 bg-blue-500 text-white px-3 py-2 rounded-full shadow-lg hover:bg-blue-600 transition"
                        >
                            <span className="material-symbols-outlined !text-base">water_drop</span>
                            Стакан воды
                        </button>
                        <button
                            onClick={() => {
                                openManualEntryModal();
                                setFabOpen(false);
                            }}
                            className="flex items-center gap-2 bg-green-500 text-white px-3 py-2 rounded-full shadow-lg hover:bg-green-600 transition"
                        >
                            <span className="material-symbols-outlined !text-base">edit_note</span>
                            Ручной ввод
                        </button>
                    </>
                )}
                <button
                    onClick={() => setFabOpen((prev) => !prev)}
                    className={`w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-xl transition-transform ${fabOpen ? 'rotate-45' : ''}`}
                >
                    <span className="material-symbols-outlined !text-3xl">{fabOpen ? 'close' : 'add'}</span>
                </button>
            </div>
        </div>
    );

    const summarySection = (
        <div className="flex flex-col gap-4">
            <div className="bg-card border border-border/70 rounded-3xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <p className="text-sm text-muted-foreground">Сегодня потреблено</p>
                        <p className="text-3xl font-bold text-foreground">{Math.round(totals.calories)} ккал</p>
                    </div>
                    <button
                        onClick={() => setCurrentPage(Page.Camera)}
                        className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow hover:bg-primary/90"
                    >
                        К сканеру
                    </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <SummaryCard title="Калории" value={totals.calories} target={targets.calories} accent />
                    <SummaryCard title="Белки" value={totals.protein} target={targets.protein} />
                    <SummaryCard title="Жиры" value={totals.fat} target={targets.fat} />
                    <SummaryCard title="Углеводы" value={totals.carbs} target={targets.carbs} />
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <QuickActionButton label="Сканировать" icon="qr_code_scanner" onClick={() => setCurrentPage(Page.Camera)} />
                <QuickActionButton label="Добавить вручную" icon="stylus_note" onClick={openManualEntryModal} />
                <QuickActionButton label="Стакан воды" icon="water_drop" onClick={addWaterEntry} />
            </div>
        </div>
    );

    if (entries.length === 0) {
        return (
            <div className="relative flex-1 px-4 py-6">
                {summarySection}
                <div className="mt-8 flex flex-col items-center text-center gap-4 bg-secondary/60 rounded-3xl p-8 border border-dashed border-border/70">
                    <span className="material-symbols-outlined text-6xl text-muted-foreground">menu_book</span>
                    <div>
                        <h2 className="text-2xl font-bold text-foreground mb-2">Ваш дневник пуст</h2>
                        <p className="text-muted-foreground max-w-md">
                            Отсканируйте блюдо, добавьте прокушенный перекус вручную или отметьте стакан воды — и дневник начнёт фиксировать ваш прогресс.
                        </p>
                    </div>
                    <button
                        onClick={() => setCurrentPage(Page.Camera)}
                        className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-full shadow hover:bg-primary/90"
                    >
                        Перейти к сканеру
                    </button>
                </div>
                <Fab />
            </div>
        );
    }

    return (
        <div className="relative flex-1 px-4 py-6 space-y-6">
            {summarySection}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Сегодняшние записи</h3>
                <div className="flex flex-col gap-4">
                    {entries.map((entry) => (
                        <DiaryCard key={entry.id} entry={entry} />
                    ))}
                </div>
            </div>
            <Fab />
        </div>
    );
};

export default DiaryPage;
