import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Page } from '../types';

const Header: React.FC = () => {
    const { currentPage, handleAdminNav } = useAppContext();

    const getTitle = () => {
        switch (currentPage) {
            case Page.Diary: return "Дневник Питания";
            case Page.Coach: return "ИИ-Коуч";
            case Page.Profile: return "Профиль";
            case Page.Subscription: return "Подписка";
            case Page.Reports: return "Отчёты и цели";
            case Page.Admin: return "Админ-панель";
            case Page.Camera:
            default: return "Fit AI";
        }
    };
    
    const title = getTitle();
    const isMainPage = currentPage === Page.Camera;

    return (
        <header className="flex items-center justify-start p-4 bg-card border-b border-border shadow-sm sticky top-0 z-10 h-16">
            <h1 
                className={`text-xl font-bold text-foreground ${isMainPage ? 'cursor-pointer' : ''}`}
                onClick={isMainPage ? handleAdminNav : undefined}
            >
                {title}
            </h1>
        </header>
    );
};

export default Header;