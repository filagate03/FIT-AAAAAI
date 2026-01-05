import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

const AdminPasswordModal: React.FC = () => {
    const { isAdminPasswordModalOpen, closeAdminPasswordModal, verifyAdminPassword } = useAppContext();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    if (!isAdminPasswordModalOpen) {
        return null;
    }

    const handleSubmit = () => {
        const success = verifyAdminPassword(password);
        if (!success) {
            setError('Неверный пароль. Попробуйте ещё раз.');
        } else {
            setPassword('');
            setError('');
        }
    };

    const handleClose = () => {
        setPassword('');
        setError('');
        closeAdminPasswordModal();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4" onClick={handleClose}>
            <div className="bg-card w-full max-w-md rounded-2xl p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-foreground mb-2">Доступ в админку</h2>
                <p className="text-sm text-muted-foreground mb-4">
                    Введите пароль, чтобы открыть панель администратора.
                </p>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-secondary text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Пароль администратора"
                />
                {error && <p className="text-sm text-destructive mt-2">{error}</p>}
                <div className="mt-6 flex gap-3">
                    <button
                        onClick={handleSubmit}
                        className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition"
                    >
                        Подтвердить
                    </button>
                    <button
                        onClick={handleClose}
                        className="py-2 px-4 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition"
                    >
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminPasswordModal;
