import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

const SupportModal: React.FC = () => {
    const { isSupportModalOpen, closeSupportModal, sendSupportRequest, appState } = useAppContext();
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'sent'>('idle');
    const [error, setError] = useState('');

    if (!isSupportModalOpen) {
        return null;
    }

    const handleClose = () => {
        setMessage('');
        setStatus('idle');
        setError('');
        closeSupportModal();
    };

    const handleSend = async () => {
        setStatus('loading');
        setError('');
        try {
            await sendSupportRequest(message);
            setStatus('sent');
            setTimeout(handleClose, 1200);
        } catch (err: any) {
            setError(err.message || 'Не удалось отправить сообщение.');
            setStatus('idle');
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4" onClick={handleClose}>
            <div className="bg-card w-full max-w-lg rounded-2xl p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-foreground mb-2">Связь с поддержкой</h2>
                <p className="text-sm text-muted-foreground mb-4">
                    {appState.settings.supportName} помогут с вопросами по подписке и оплате.
                    По вашей просьбе мы можем связаться через Telegram и ответить в ближайшее время.
                </p>
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    className="w-full bg-secondary text-foreground rounded-xl border border-border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Опишите ваш вопрос или проблему..."
                />
                <p className="text-xs text-muted-foreground mt-3">
                    Нажимая «Отправить», вы соглашаетесь на обработку данных (ID Telegram, имя, параметры профиля) для обратной связи.
                </p>
                {error && <p className="text-sm text-destructive mt-2">{error}</p>}
                <div className="mt-6 flex gap-3">
                    <button
                        onClick={handleSend}
                        disabled={status === 'loading' || message.trim().length === 0}
                        className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-70 transition"
                    >
                        {status === 'loading' ? 'Отправляем...' : status === 'sent' ? 'Отправлено' : 'Отправить'}
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

export default SupportModal;
