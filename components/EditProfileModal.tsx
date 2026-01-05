import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Profile } from '../types';

const InputField: React.FC<{ label: string; value: string | number; onChange: (val: string) => void; type?: string; placeholder?: string }> = 
({ label, value, onChange, type = 'text', placeholder }) => (
    <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1">{label}</label>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full p-2 bg-secondary border border-border rounded-md focus:ring-2 focus:ring-primary focus:outline-none text-foreground"
            min="0"
        />
    </div>
);

const SelectField: React.FC<{ label: string; value: string; onChange: (val: string) => void; children: React.ReactNode }> =
({ label, value, onChange, children }) => (
    <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1">{label}</label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full p-2 bg-secondary border border-border rounded-md focus:ring-2 focus:ring-primary focus:outline-none text-foreground appearance-none"
        >
            {children}
        </select>
    </div>
);


const EditProfileModal: React.FC = () => {
    const { closeEditProfileModal, appState, updateProfile, addToast } = useAppContext();
    const [formData, setFormData] = useState<Profile>(appState.profile);

    useEffect(() => {
        setFormData(appState.profile);
    }, [appState.profile]);

    const handleChange = (field: keyof Profile, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleNumericChange = (field: keyof Profile, value: string) => {
         // Allow empty string for user input, but treat as 0 for state unless it's invalid
        if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
            handleChange(field, value);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numericFields: (keyof Profile)[] = ['age', 'weightKg', 'heightCm', 'goalWeightKg'];
        const processedData = { ...formData };
        let isValid = true;

        for (const field of numericFields) {
            const value = Number(processedData[field]);
            if (isNaN(value) || value <= 0) {
                isValid = false;
                break;
            }
            (processedData[field] as number) = value;
        }

        if (!isValid) {
            addToast('Пожалуйста, введите корректные числовые значения.', 'error');
            return;
        }
        
        updateProfile(processedData);
        closeEditProfileModal();
    };

    return (
         <div className="fixed inset-0 bg-black bg-opacity-70 flex items-end justify-center z-40" onClick={closeEditProfileModal}>
            <div className="bg-card w-full max-w-lg h-[90dvh] rounded-t-2xl p-4 animate-slide-up overflow-y-auto" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <h2 className="text-xl font-bold text-foreground">Редактировать профиль</h2>
                    
                    <InputField label="Имя" value={formData.name} onChange={(val) => handleChange('name', val)} />
                    
                    <div className="grid grid-cols-2 gap-3">
                        <InputField label="Возраст" value={String(formData.age)} onChange={(val) => handleNumericChange('age', val)} type="number" />
                        <InputField label="Вес, кг" value={String(formData.weightKg)} onChange={(val) => handleNumericChange('weightKg', val)} type="number" />
                    </div>
                     <div className="grid grid-cols-2 gap-3">
                        <InputField label="Рост, см" value={String(formData.heightCm)} onChange={(val) => handleNumericChange('heightCm', val)} type="number" />
                        <InputField label="Целевой вес, кг" value={String(formData.goalWeightKg)} onChange={(val) => handleNumericChange('goalWeightKg', val)} type="number" />
                    </div>

                    <SelectField label="Пол" value={formData.gender} onChange={(val) => handleChange('gender', val)}>
                        <option value="male">Мужской</option>
                        <option value="female">Женский</option>
                        <option value="other">Другой</option>
                    </SelectField>

                     <SelectField label="Уровень активности" value={formData.activityLevel} onChange={(val) => handleChange('activityLevel', val)}>
                        <option value="sedentary">Сидячий образ жизни</option>
                        <option value="light">Легкая активность (1-3 раза в неделю)</option>
                        <option value="moderate">Умеренная активность (3-5 раз в неделю)</option>
                        <option value="active">Высокая активность (6-7 раз в неделю)</option>
                        <option value="very_active">Очень высокая активность (физ. работа/спорт 2р в день)</option>
                    </SelectField>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <button
                            type="button"
                            onClick={closeEditProfileModal}
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

export default EditProfileModal;