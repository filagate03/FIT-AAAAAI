
import React from 'react';
import { useAppContext } from '../context/AppContext';

const Loader: React.FC = () => {
    const { loadingMessage } = useAppContext();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center z-50">
            <div className="w-16 h-16 border-4 border-t-primary border-border rounded-full animate-spin"></div>
            <p className="text-white mt-4 text-lg">{loadingMessage}</p>
        </div>
    );
};

export default Loader;
