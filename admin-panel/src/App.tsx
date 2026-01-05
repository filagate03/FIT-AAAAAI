import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface User {
    subscriptionKey: string;
    telegramId?: number;
    userId?: string;
    tier: string;
    status: string;
    profile?: {
        name: string;
        weightKg: number;
        goalWeightKg: number;
    };
}

function App() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const saved = localStorage.getItem('admin_pwd');
        if (saved) {
            setPassword(saved);
            checkAuth(saved);
        } else {
            setLoading(false);
        }
    }, []);

    const checkAuth = async (pwd: string) => {
        try {
            setLoading(true);
            const res = await axios.get('/api/admin/subscriptions', {
                headers: { 'Content-Type': 'application/json' },
                params: { password: pwd }
            });
            setUsers(res.data.subscriptions);
            setIsAuthenticated(true);
            localStorage.setItem('admin_pwd', pwd);
        } catch (err) {
            setError('Неверный пароль или ошибка сервера');
            setIsAuthenticated(false);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        checkAuth(password);
    };

    const handleTierChange = async (subscriptionKey: string, newTier: string) => {
        try {
            await axios.post('/api/admin/subscriptions/set-tier', {
                subscriptionKey,
                tier: newTier,
                password
            });
            // Refresh from server instead of local state update
            const res = await axios.get('/api/admin/subscriptions', {
                headers: { 'Content-Type': 'application/json' },
                params: { password }
            });
            setUsers(res.data.subscriptions);
        } catch (err) {
            alert('Ошибка обновления тарифа');
        }
    };

    if (loading) return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Загрузка...</div>;

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900">
                <form onSubmit={handleLogin} className="bg-gray-800 p-8 rounded-lg shadow-xl border border-gray-700 w-96">
                    <h2 className="text-2xl font-bold mb-6 text-white text-center">Admin CRM</h2>
                    {error && <div className="bg-red-500/10 text-red-500 p-3 rounded mb-4 text-sm">{error}</div>}
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Admin Password"
                        className="w-full bg-gray-700 text-white border border-gray-600 rounded p-3 mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded transition">
                        Войти
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Fit AI CRM
                    </h1>
                    <button onClick={() => { localStorage.removeItem('admin_pwd'); setIsAuthenticated(false); setPassword(''); }} className="text-sm text-gray-400 hover:text-white">
                        Выйти
                    </button>
                </div>

                <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-2xl">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-750 border-b border-gray-700">
                            <tr>
                                <th className="p-4 font-semibold text-gray-400">ID / Telegram</th>
                                <th className="p-4 font-semibold text-gray-400">Имя</th>
                                <th className="p-4 font-semibold text-gray-400">Вес / Цель</th>
                                <th className="p-4 font-semibold text-gray-400">Подписка</th>
                                <th className="p-4 font-semibold text-gray-400">Действия</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {users.map((user) => (
                                <tr key={user.subscriptionKey} className="hover:bg-gray-700/50 transition">
                                    <td className="p-4">
                                        <div className="font-mono text-xs text-gray-500">{user.subscriptionKey}</div>
                                        {user.telegramId && (
                                            <div className="text-blue-400 text-sm mt-1">TG: {user.telegramId}</div>
                                        )}
                                    </td>
                                    <td className="p-4 font-medium">
                                        {user.profile?.name || user.userId || 'Аноним'}
                                    </td>
                                    <td className="p-4">
                                        {user.profile ? (
                                            <div className="text-sm">
                                                <div>{user.profile.weightKg} кг</div>
                                                <div className="text-gray-500 text-xs">Цель: {user.profile.goalWeightKg} кг</div>
                                            </div>
                                        ) : <span className="text-gray-600">-</span>}
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex px-2 py-1 rounded text-xs font-bold uppercase tracking-wide 
                        ${user.tier === 'premium' ? 'bg-purple-500/20 text-purple-400' :
                                                user.tier === 'pro' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-600/20 text-gray-400'}`}>
                                            {user.tier}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <select
                                            value={user.tier}
                                            onChange={(e) => handleTierChange(user.subscriptionKey, e.target.value)}
                                            className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="free">FREE</option>
                                            <option value="pro">PRO</option>
                                            <option value="premium">PREMIUM</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {users.length === 0 && <div className="p-8 text-center text-gray-500">Пользователей не найдено</div>}
                </div>
            </div>
        </div>
    );
}

export default App;
