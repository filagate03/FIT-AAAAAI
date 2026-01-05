import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Page } from '../types';

interface NavItemProps {
    page: Page;
    icon: string;
    label: string;
}

const NavButton: React.FC<NavItemProps> = ({ page, icon, label }) => {
    const { currentPage, setCurrentPage } = useAppContext();
    const isActive = currentPage === page;

    return (
        <button
            onClick={() => setCurrentPage(page)}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors duration-200 ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            aria-label={label}
        >
            <span className={`material-symbols-outlined ${isActive ? 'filled' : ''}`}>{icon}</span>
            <span className="text-xs mt-1">{label}</span>
        </button>
    );
};

const BottomNav: React.FC = () => {

    const navItems: NavItemProps[] = [
        { page: Page.Camera, icon: 'photo_camera', label: 'Скан' },
        { page: Page.Diary, icon: 'book', label: 'Дневник' },
        { page: Page.Coach, icon: 'smart_toy', label: 'Коуч' },
        { page: Page.Reports, icon: 'analytics', label: 'Отчёты' },
        { page: Page.Profile, icon: 'person', label: 'Профиль' },
    ];

    return (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-16 bg-card border-t border-border z-20">
            <div className="grid grid-cols-5 items-center justify-around h-full">
                {navItems.map(item => <NavButton key={item.page} {...item} />)}
            </div>
        </nav>
    );
};

export default BottomNav;