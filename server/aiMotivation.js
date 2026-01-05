import { generatePersonalizedAdvice } from './personalizedAdvice.js';

// Генератор общих мотивационных сообщений через AI
export const generateMotivationQuotes = async (count = 30) => {
    const prompt = `Ты мотивационный коуч по фитнесу и питанию. 

Сгенерируй ${count} коротких мотивационных цитат (40-60 слов каждая) для людей, которые худеют или работают над своей формой.

Требования:
- Каждая цитата должна быть УНИКАЛЬНОЙ и разной
- Мотивирующий, позитивный тон
- Фокус на здоровье, питании, дисциплине, прогрессе
- НЕ используй избитые фразы типа "просто начни"
- Будь конкретным и практичным
- Используй разные подходы: психология, наука, практика

Формат ответа: Каждую цитату с новой строки, БЕЗ нумерации, БЕЗ кавычек.`;

    try {
        const response = await fetch(`${process.env.GEMINI_API_BASE_URL}/v1beta/models/${process.env.GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error('No content generated');
        }

        // Разбить на отдельные цитаты
        const quotes = text
            .split('\n')
            .map(q => q.trim())
            .filter(q => q.length > 20 && !q.match(/^\d+[\.\)]/)) // Убрать нумерацию и пустые
            .slice(0, count);

        return quotes;
    } catch (error) {
        console.error('Failed to generate motivation quotes:', error);
        return null;
    }
};

// Генератор общих напоминаний
export const generateReminderMessages = async (count = 20) => {
    const prompt = `Ты тренер по здоровью и питанию.

Сгенерируй ${count} коротких напоминаний (30-50 слов) для пользователей фитнес-приложения.

Темы:
- Водный баланс
- Заполнение дневника питания
- Сон и восстановление
- Физическая активность
- Отслеживание прогресса
- Подготовка к следующему дню

Требования:
- Разные и уникальные
- Дружелюбный тон
- Практичные действия
- Без назиданий

Формат: Каждое напоминание с новой строки, БЕЗ нумерации, БЕЗ кавычек, БЕЗ эмодзи в начале.`;

    try {
        const response = await fetch(`${process.env.GEMINI_API_BASE_URL}/v1beta/models/${process.env.GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error('No content generated');
        }

        const reminders = text
            .split('\n')
            .map(r => r.trim())
            .filter(r => r.length > 20 && !r.match(/^\d+[\.\)]/))
            .slice(0, count);

        return reminders;
    } catch (error) {
        console.error('Failed to generate reminders:', error);
        return null;
    }
};

// Генератор AI-мотивации для конкретного пользователя
export const generatePersonalMotivation = async (profile) => {
    const { name, weightKg, goalWeightKg, gender } = profile || {};

    const context = name ? `для ${name}` : 'для пользователя';
    const weightInfo = weightKg && goalWeightKg
        ? `Текущий вес: ${weightKg}кг, цель: ${goalWeightKg}кг.`
        : '';

    const prompt = `Ты персональный тренер. Напиши короткое мотивационное сообщение (50-80 слов) ${context}.

${weightInfo}
${gender ? `Пол: ${gender === 'male' ? 'мужчина' : 'женщина'}` : ''}

Сделай сообщение:
- Персональным и тёплым
- Мотивирующим
- С конкретным призывом к действию
- Учитывай контекст (если есть)

Начни сразу с сообщения, без обращения "Привет".`;

    try {
        const response = await fetch(`${process.env.GEMINI_API_BASE_URL}/v1beta/models/${process.env.GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        const motivation = data.candidates?.[0]?.content?.parts?.[0]?.text;

        return motivation || null;
    } catch (error) {
        console.error('Failed to generate personal motivation:', error);
        return null;
    }
};
