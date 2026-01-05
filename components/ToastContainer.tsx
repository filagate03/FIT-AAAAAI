import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Toast as ToastType } from '../types';

const Toast: React.FC<{ toast: ToastType }> = ({ toast }) => {
    const typeClasses = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        achievement: 'bg-purple-500',
    };

    return (
        <div className={`flex items-center text-white p-3 rounded-lg shadow-lg mb-2 animate-toast-in ${typeClasses[toast.type]}`}>
            <span className="material-symbols-outlined mr-2">
                {toast.type === 'success' && 'check_circle'}
                {toast.type === 'error' && 'error'}
                {toast.type === 'info' && 'info'}
                {toast.type === 'achievement' && 'star'}
            </span>
            <span>{toast.message}</span>
        </div>
    );
};

const ToastContainer: React.FC = () => {
    const { toasts } = useAppContext();

    return (
        <div className="fixed top-4 right-4 z-50 w-full max-w-xs">
            {toasts.map(toast => <Toast key={toast.id} toast={toast} />)}
        </div>
    );
};

export default ToastContainer;