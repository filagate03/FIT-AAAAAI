import React, { useEffect, useState } from 'react';
import { useAppContext } from './context/AppContext';
import { Page, SubscriptionTier } from './types';


// Page Components
import CameraPage from './components/pages/CameraPage';
import DiaryPage from './components/pages/DiaryPage';
import CoachPage from './components/pages/CoachPage';
import ProfilePage from './components/pages/ProfilePage';
import SubscriptionPage from './components/pages/SubscriptionPage';
import ReportsPage from './components/pages/ReportsPage';

// UI Components
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import Loader from './components/Loader';
import ResultModal from './components/ResultModal';
import ToastContainer from './components/ToastContainer';
import ConfirmModal from './components/ConfirmModal';
import ManualEntryModal from './components/ManualEntryModal';
import EditProfileModal from './components/EditProfileModal';
import UpdateWeightModal from './components/UpdateWeightModal';





const App: React.FC = () => {
    const { currentPage, theme, isLoading, analysisResult, confirmModalState, isManualEntryModalOpen, isEditProfileModalOpen, isUpdateWeightModalOpen } = useAppContext();

    useEffect(() => {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(theme);

        const tg = window.Telegram?.WebApp;
        if (tg) {
            const bgColor = theme === 'dark' ? '#182230' : '#f9fafb';
            const headerColor = theme === 'dark' ? '#1f2937' : '#ffffff';
            tg.setBackgroundColor(bgColor);
            tg.setHeaderColor(headerColor);
        }
    }, [theme]);

    const renderPage = () => {
        switch (currentPage) {
            case Page.Diary:
                return <DiaryPage />;
            case Page.Coach:
                return <CoachPage />;
            case Page.Profile:
                return <ProfilePage />;
            case Page.Subscription:
                return <SubscriptionPage />;
            case Page.Reports:
                return <ReportsPage />;
            case Page.Camera:
            default:
                return <CameraPage />;
        }
    };

    return (
        <div className="flex justify-center items-start min-h-screen w-full bg-background">
            <div className="relative flex flex-col w-full max-w-lg h-[100dvh] bg-card overflow-hidden">
                <Header />
                <main className={`flex-1 overflow-y-auto ${currentPage === Page.Coach ? 'p-0' : 'p-4'} pb-24`}>
                    {renderPage()}
                </main>
                <BottomNav />
            </div>

            {/* Overlays */}
            {isLoading && <Loader />}
            {analysisResult && <ResultModal />}
            {confirmModalState.isOpen && <ConfirmModal />}
            {isManualEntryModalOpen && <ManualEntryModal />}
            {isEditProfileModalOpen && <EditProfileModal />}
            {isUpdateWeightModalOpen && <UpdateWeightModal />}
            <ToastContainer />
        </div>
    );
};

export default App;

