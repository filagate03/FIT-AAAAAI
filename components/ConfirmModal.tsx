
import React from 'react';
import { useAppContext } from '../context/AppContext';

const ConfirmModal: React.FC = () => {
    const { confirmModalState, hideConfirmation } = useAppContext();

    if (!confirmModalState.isOpen) return null;

    const handleConfirm = () => {
        confirmModalState.onConfirm();
        hideConfirmation();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={hideConfirmation}>
            <div className="bg-card rounded-lg shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-foreground mb-2">{confirmModalState.title}</h2>
                <p className="text-muted-foreground mb-6">{confirmModalState.message}</p>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={hideConfirmation}
                        className="py-2 px-4 bg-secondary text-secondary-foreground font-semibold rounded-lg hover:bg-secondary/80 transition-colors"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="py-2 px-4 bg-primary text-primary-foreground font-semibold rounded-lg shadow-md hover:bg-primary/90 transition-colors"
                    >
                        Подтвердить
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
