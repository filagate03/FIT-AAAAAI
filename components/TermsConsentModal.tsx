import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { TERMS_VERSION } from '../constants';

const TermsConsentModal: React.FC = () => {
    const { appState, acceptTerms } = useAppContext();
    const [isChecked, setIsChecked] = useState(false);

    const needsConsent = useMemo(() => {
        const acceptedAt = appState.settings.termsAcceptedAt;
        const acceptedVersion = appState.settings.termsAcceptedVersion;
        return !acceptedAt || acceptedVersion !== TERMS_VERSION;
    }, [appState.settings.termsAcceptedAt, appState.settings.termsAcceptedVersion]);

    const privacyUrl = '/privacy.html';
    const termsUrl = '/terms.html';

    if (!needsConsent) {
        return null;
    }

    const handleAccept = () => {
        if (!isChecked) {
            return;
        }
        acceptTerms();
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
            <div className="bg-card w-full max-w-lg rounded-2xl p-6 shadow-lg">
                <h2 className="text-xl font-bold text-foreground">Согласие с условиями</h2>
                <p className="text-sm text-muted-foreground mt-2">
                    Перед использованием Fit AI необходимо принять условия обработки данных и пользовательское соглашение.
                </p>

                <div className="mt-4 space-y-2 text-sm">
                    <a
                        href={privacyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline hover:text-primary/80"
                    >
                        Политика конфиденциальности
                    </a>
                    <a
                        href={termsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-primary underline hover:text-primary/80"
                    >
                        Пользовательское соглашение
                    </a>
                </div>

                <label className="mt-4 flex items-start gap-3 text-sm text-foreground">
                    <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => setIsChecked(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-border"
                    />
                    <span>
                        Я прочитал(а) и принимаю Политику конфиденциальности и Пользовательское соглашение.
                    </span>
                </label>

                <button
                    type="button"
                    onClick={handleAccept}
                    disabled={!isChecked}
                    className={`mt-5 w-full py-3 rounded-xl font-semibold transition-colors ${
                        isChecked ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-secondary text-muted-foreground cursor-not-allowed'
                    }`}
                >
                    Согласиться и продолжить
                </button>
            </div>
        </div>
    );
};

export default TermsConsentModal;
