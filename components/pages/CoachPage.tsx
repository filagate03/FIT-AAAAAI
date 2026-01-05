import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ChatMessage, Page } from '../../types';

const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
    const isUser = message.role === 'user';
    return (
        <div className={`flex items-end gap-2 my-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl ${isUser ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-secondary text-secondary-foreground rounded-bl-md'}`}>
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
            </div>
        </div>
    );
};

const SubscriptionPrompt = () => {
    const { setCurrentPage } = useAppContext();
    return (
        <div className="flex flex-col items-center justify-center text-center h-full p-4">
            <span className="material-symbols-outlined text-7xl text-primary mb-4">
                workspace_premium
            </span>
            <h2 className="text-2xl font-bold text-foreground">Это Pro-функция</h2>
            <p className="text-muted-foreground max-w-sm mb-6">
                Получите персональные рекомендации от ИИ-коуча, безлимитные записи и планы питания, обновив вашу подписку.
            </p>
            <button
                onClick={() => setCurrentPage(Page.Subscription)}
                className="w-full max-w-xs py-3 px-6 bg-primary text-primary-foreground font-semibold rounded-lg shadow-md hover:bg-primary/90 transition-colors"
            >
                Улучшить до Pro
            </button>
        </div>
    );
};

const CoachPage: React.FC = () => {
    const { appState, sendCoachMessage, isCoachLoading } = useAppContext();
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const proactiveMessageTimer = useRef<number | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [appState.coachHistory, isCoachLoading]);

    // Proactive message simulation
    useEffect(() => {
        if (appState.subscription.tier === 'free' || isCoachLoading) {
            return;
        }

        const sendProactiveMessage = () => {
             const lastMessage = appState.coachHistory[appState.coachHistory.length - 1];
             // Send a proactive message if the last one was from the user, or if it's a new day
             if (lastMessage && lastMessage.role === 'user') {
                 sendCoachMessage("Прояви инициативу: коротко поинтересуйся как дела или дай небольшой совет.");
             }
        };
        
        // Clear any existing timer
        if (proactiveMessageTimer.current) {
            clearTimeout(proactiveMessageTimer.current);
        }

        // Set a new timer to send a message after 30 seconds of inactivity
        proactiveMessageTimer.current = window.setTimeout(sendProactiveMessage, 30000);

        // Cleanup timer on component unmount
        return () => {
            if (proactiveMessageTimer.current) {
                clearTimeout(proactiveMessageTimer.current);
            }
        };
    }, [appState.coachHistory, isCoachLoading, appState.subscription.tier, sendCoachMessage]);


    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isCoachLoading) {
            sendCoachMessage(input.trim());
            setInput('');
        }
    };

    if (appState.subscription.tier === 'free') {
        return <SubscriptionPrompt />;
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto px-4 pt-4">
                {appState.coachHistory.map((msg, index) => (
                    <MessageBubble key={index} message={msg} />
                ))}
                {isCoachLoading && (
                     <div className="flex items-end gap-2 my-2 justify-start">
                        <div className="max-w-[80%] p-3 rounded-2xl bg-secondary text-secondary-foreground rounded-bl-md">
                            <div className="flex items-center justify-center gap-1.5">
                                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-2 border-t border-border bg-card">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Спросите что-нибудь..."
                        className="flex-1 w-full p-3 bg-secondary border border-transparent rounded-full focus:ring-2 focus:ring-primary focus:outline-none text-foreground placeholder-muted-foreground"
                        disabled={isCoachLoading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isCoachLoading}
                        className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-md hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed transition-all"
                        aria-label="Отправить сообщение"
                    >
                        <span className="material-symbols-outlined">send</span>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CoachPage;