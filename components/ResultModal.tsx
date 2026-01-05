import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { AnalysisResult } from '../types';

const ResultModal: React.FC = () => {
    const { analysisResult, setAnalysisResult, addEntryToDiary } = useAppContext();
    const [portionPercentage, setPortionPercentage] = useState(100);

    if (!analysisResult) return null;
    
    const adjustedValues = useMemo(() => {
       if (!analysisResult) return null;
       const multiplier = portionPercentage / 100;
       return {
           food: analysisResult.food,
           portion_grams: Math.round(analysisResult.portion_grams * multiplier),
           calories: Math.round(analysisResult.calories * multiplier),
           protein: parseFloat((analysisResult.protein * multiplier).toFixed(1)),
           fat: parseFloat((analysisResult.fat * multiplier).toFixed(1)),
           carbs: parseFloat((analysisResult.carbs * multiplier).toFixed(1)),
           tip: analysisResult.tip,
           image: analysisResult.image,
       };
    }, [analysisResult, portionPercentage]);

    const handleConfirm = () => {
        if (adjustedValues) {
            // Pass true for the 'isScan' parameter
            addEntryToDiary(adjustedValues as AnalysisResult, true);
        }
    };

    const handleClose = () => {
        setAnalysisResult(null);
    };

    if (!adjustedValues) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-end justify-center z-40" onClick={handleClose}>
            <div className="bg-card w-full max-w-lg rounded-t-2xl p-4 animate-slide-up" onClick={e => e.stopPropagation()}>
                <div className="w-full max-h-[40dvh] bg-secondary rounded-lg mb-4 flex items-center justify-center">
                    <img src={analysisResult.image} alt={analysisResult.food} className="max-w-full max-h-[40dvh] h-auto object-contain rounded-lg" />
                </div>
                
                <h2 className="text-2xl font-bold text-foreground mb-1">{analysisResult.food}</h2>
                <p className="text-sm text-muted-foreground mb-4">{adjustedValues.portion_grams} грамм (примерно)</p>

                <div className="bg-secondary p-3 rounded-lg mb-4">
                    <label htmlFor="portion-slider" className="flex justify-between items-center text-sm font-medium text-foreground mb-2">
                        <span>Сколько съедено?</span>
                        <span className="font-bold text-primary">{portionPercentage}%</span>
                    </label>
                    <input
                        id="portion-slider"
                        type="range"
                        min="10"
                        max="150"
                        step="5"
                        value={portionPercentage}
                        onChange={(e) => setPortionPercentage(Number(e.target.value))}
                        className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-secondary p-3 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Калории</p>
                        <p className="text-xl font-bold text-primary">{adjustedValues.calories} ккал</p>
                    </div>
                     <div className="bg-secondary p-3 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Белки</p>
                        <p className="text-xl font-bold text-foreground">{adjustedValues.protein} г</p>
                    </div>
                     <div className="bg-secondary p-3 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Жиры</p>
                        <p className="text-xl font-bold text-foreground">{adjustedValues.fat} г</p>
                    </div>
                     <div className="bg-secondary p-3 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Углеводы</p>
                        <p className="text-xl font-bold text-foreground">{adjustedValues.carbs} г</p>
                    </div>
                </div>

                <div className="bg-primary/10 border-l-4 border-primary p-3 rounded-r-lg mb-6">
                    <p className="text-sm text-primary-dark font-medium">{analysisResult.tip}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={handleClose}
                        className="py-3 px-4 bg-secondary text-secondary-foreground font-semibold rounded-lg hover:bg-secondary/80 transition-colors"
                    >
                        Закрыть
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="py-3 px-4 bg-primary text-primary-foreground font-semibold rounded-lg shadow-md hover:bg-primary/90 transition-colors"
                    >
                        Добавить в дневник
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ResultModal;
