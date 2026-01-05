import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

const UpdateWeightModal: React.FC = () => {
    const { closeUpdateWeightModal, appState, updateProfile, addToast } = useAppContext();
    const [weight, setWeight] = useState(String(appState.profile.weightKg));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const weightValue = parseFloat(weight);
        if (isNaN(weightValue) || weightValue <= 0) {
            addToast('Пожалуйста, введите корректный вес', 'error');
            return;
        }
        
        updateProfile({ ...appState.profile, weightKg: weightValue });
        closeUpdateWeightModal();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-40 p-4" onClick={closeUpdateWeightModal}>
            <div className="bg-card w-full max-w-sm rounded-lg p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <h2 className="text-xl font-bold text-foreground">Обновить текущий вес</h2>
                    
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1" htmlFor="currentWeight">Ваш вес, кг</label>
                        <input
                            id="currentWeight"
                            type="number"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            placeholder="Например, 75.5"
                            className="w-full p-2 bg-secondary border border-border rounded-md focus:ring-2 focus:ring-primary focus:outline-none text-foreground"
                            inputMode="decimal"
                            step="0.1"
                            min="0"
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-2">
                        <button
                            type="button"
                            onClick={closeUpdateWeightModal}
                            className="py-3 px-4 bg-secondary text-secondary-foreground font-semibold rounded-lg hover:bg-secondary/80 transition-colors"
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            className="py-3 px-4 bg-primary text-primary-foreground font-semibold rounded-lg shadow-md hover:bg-primary/90 transition-colors"
                        >
                            Сохранить
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UpdateWeightModal;