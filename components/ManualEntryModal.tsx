import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

const ManualEntryModal: React.FC = () => {
    const { closeManualEntryModal, addManualEntryToDiary, addToast } = useAppContext();
    const [food, setFood] = useState('');
    const [calories, setCalories] = useState('');
    const [protein, setProtein] = useState('');
    const [fat, setFat] = useState('');
    const [carbs, setCarbs] = useState('');
    const [portion, setPortion] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!food || !calories || !protein || !fat || !carbs || !portion) {
            addToast('Пожалуйста, заполните все поля', 'error');
            return;
        }

        const entryData = {
            food,
            calories: Number(calories),
            protein: Number(protein),
            fat: Number(fat),
            carbs: Number(carbs),
            portion_grams: Number(portion),
        };

        if (Object.values(entryData).some(val => typeof val === 'number' && (isNaN(val) || val < 0))) {
            addToast('Пожалуйста, введите корректные числовые значения', 'error');
            return;
        }

        addManualEntryToDiary(entryData);
    };
    
    const InputField: React.FC<{ label: string; value: string; onChange: (val: string) => void; type?: string; placeholder?: string }> = 
    ({ label, value, onChange, type = 'text', placeholder }) => (
        <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full p-2 bg-secondary border border-border rounded-md focus:ring-2 focus:ring-primary focus:outline-none text-foreground"
                inputMode={type === 'number' ? 'decimal' : 'text'}
                min="0"
            />
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-end justify-center z-40" onClick={closeManualEntryModal}>
            <div className="bg-card w-full max-w-lg rounded-t-2xl p-4 animate-slide-up" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <h2 className="text-xl font-bold text-foreground">Добавить запись вручную</h2>
                    
                    <InputField label="Название блюда" value={food} onChange={setFood} placeholder="Например, Яблоко" />
                    
                    <div className="grid grid-cols-2 gap-3">
                        <InputField label="Порция, г" value={portion} onChange={setPortion} type="number" placeholder="100" />
                        <InputField label="Калории, ккал" value={calories} onChange={setCalories} type="number" placeholder="52" />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <InputField label="Белки, г" value={protein} onChange={setProtein} type="number" placeholder="0.3" />
                        <InputField label="Жиры, г" value={fat} onChange={setFat} type="number" placeholder="0.2" />
                        <InputField label="Углеводы, г" value={carbs} onChange={setCarbs} type="number" placeholder="14" />
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-2">
                        <button
                            type="button"
                            onClick={closeManualEntryModal}
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

export default ManualEntryModal;
