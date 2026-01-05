import cron from 'node-cron';
import { readSubscriptions, upsertSubscription, writeSubscriptions } from './storage.js';
import { sendBotMessage } from './bot.js';
import { MOTIVATION_QUOTES, REMINDER_MESSAGES } from './motivationMessages.js';
import { generatePersonalizedAdvice } from './personalizedAdvice.js';
import { generatePersonalMotivation, generateMotivationQuotes, generateReminderMessages } from './aiMotivation.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cacheDir = path.join(__dirname, 'data');
const motivationCacheFile = path.join(cacheDir, 'ai_motivation_cache.json');

const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Загрузить или сгенерировать кэш мотиваций
let motivationCache = null;

async function loadOrGenerateMotivationCache() {
    try {
        const data = await fs.readFile(motivationCacheFile, 'utf-8');
        motivationCache = JSON.parse(data);

        // Проверяем свежесть (обновляем раз в неделю)
        const cacheAge = Date.now() - new Date(motivationCache.generatedAt).getTime();
        const oneWeek = 7 * 24 * 60 * 60 * 1000;

        if (cacheAge > oneWeek) {
            console.log('[MOTIVATION] Cache expired, regenerating...');
            return await regenerateMotivationCache();
        }

        console.log('[MOTIVATION] Loaded motivation cache from file');
        return motivationCache;
    } catch (error) {
        console.log('[MOTIVATION] No cache found, generating new...');
        return await regenerateMotivationCache();
    }
}

async function regenerateMotivationCache() {
    console.log('[MOTIVATION] Generating AI quotes...');
    const quotes = await generateMotivationQuotes(30);
    const reminders = await generateReminderMessages(20);

    motivationCache = {
        quotes: quotes || MOTIVATION_QUOTES,
        reminders: reminders || REMINDER_MESSAGES,
        generatedAt: new Date().toISOString()
    };

    await fs.writeFile(motivationCacheFile, JSON.stringify(motivationCache, null, 2));
    console.log('[MOTIVATION] AI cache generated and saved');

    return motivationCache;
}

export const startMotivationJob = async () => {
    // Загружаем кэш при старте
    await loadOrGenerateMotivationCache();

    // 09:00 - AI персональная мотивация (для каждого Premium отдельно)
    cron.schedule('0 9 * * *', async () => {
        const subscriptions = await readSubscriptions();
        const premiums = subscriptions.filter(sub =>
            sub.status === 'active' &&
            sub.tier === 'premium' &&
            sub.telegramId
        );

        console.log(`[MOTIVATION 09:00] Sending personal AI motivation to ${premiums.length} users`);

        for (const sub of premiums) {
            try {
                const motivation = await generatePersonalMotivation(sub.profile);
                if (motivation) {
                    await sendBotMessage(sub.telegramId, `🌅 Доброе утро!\n\n${motivation}`);
                } else {
                    // Fallback на кэш
                    const quote = getRandomItem(motivationCache.quotes);
                    await sendBotMessage(sub.telegramId, `🌅 Доброе утро!\n\n${quote}`);
                }
            } catch (error) {
                console.warn(`Failed to send morning motivation to ${sub.telegramId}:`, error.message);
            }
        }
    });

    // 14:00 - Персональный совет (AI на основе профиля)
    cron.schedule('0 14 * * *', async () => {
        const subscriptions = await readSubscriptions();
        const premiumsWithProfile = subscriptions.filter(sub =>
            sub.status === 'active' &&
            sub.tier === 'premium' &&
            sub.telegramId &&
            sub.profile?.weightKg &&
            sub.profile?.goalWeightKg
        );

        console.log(`[MOTIVATION 14:00] Sending personalized advice to ${premiumsWithProfile.length} users`);

        for (const sub of premiumsWithProfile) {
            try {
                const advice = await generatePersonalizedAdvice(sub.profile);
                if (advice) {
                    await sendBotMessage(sub.telegramId, advice);
                }
            } catch (error) {
                console.warn(`Failed to send personalized advice to ${sub.telegramId}:`, error.message);
            }
        }
    });

    // 20:00 - Массовое напоминание (из AI-сгенерированного списка, ВСЕМ ОДНО СООБЩЕНИЕ)
    cron.schedule('0 20 * * *', async () => {
        const subscriptions = await readSubscriptions();
        const premiums = subscriptions.filter(sub =>
            sub.status === 'active' &&
            (sub.tier === 'premium' || sub.tier === 'pro') &&
            sub.telegramId
        );

        console.log(`[MOTIVATION 20:00] Sending mass reminder to ${premiums.length} users`);

        // Одно сообщение для всех
        const reminder = getRandomItem(motivationCache.reminders);

        for (const sub of premiums) {
            try {
                await sendBotMessage(sub.telegramId, `🌙 ${reminder}`);
            } catch (error) {
                console.warn(`Failed to send reminder to ${sub.telegramId}:`, error.message);
            }
        }
    });

    // 21:00 - AI персональная вечерняя мотивация (для каждого Premium отдельно)
    cron.schedule('0 21 * * *', async () => {
        const subscriptions = await readSubscriptions();
        const premiums = subscriptions.filter(sub =>
            sub.status === 'active' &&
            sub.tier === 'premium' &&
            sub.telegramId
        );

        console.log(`[MOTIVATION 21:00] Sending personal AI evening motivation to ${premiums.length} users`);

        for (const sub of premiums) {
            try {
                const motivation = await generatePersonalMotivation(sub.profile);
                if (motivation) {
                    await sendBotMessage(sub.telegramId, `💫 Вечерняя мотивация:\n\n${motivation}`);
                } else {
                    // Fallback на кэш
                    const quote = getRandomItem(motivationCache.quotes);
                    await sendBotMessage(sub.telegramId, `💫 Вечерняя мотивация:\n\n${quote}`);
                }
            } catch (error) {
                console.warn(`Failed to send evening motivation to ${sub.telegramId}:`, error.message);
            }
        }
    });

    // Обновление кэша AI мотиваций - каждое воскресенье в 03:00
    cron.schedule('0 3 * * 0', async () => {
        console.log('[MOTIVATION] Weekly cache regeneration...');
        await regenerateMotivationCache();
    });

    // Проверка истёкших триалов - каждый час
    cron.schedule('0 * * * *', async () => {
        const subscriptions = await readSubscriptions();
        const now = new Date();
        const expiredTrials = subscriptions.filter(sub =>
            sub.isTrial &&
            sub.trialEndsAt &&
            new Date(sub.trialEndsAt) <= now &&
            sub.tier !== 'free'
        );

        for (const sub of expiredTrials) {
            sub.tier = 'free';
            sub.isTrial = false;
            sub.status = 'active';
            await upsertSubscription(sub);

            if (sub.telegramId) {
                await sendBotMessage(sub.telegramId, `⏳ Пробный период завершен.\n\nТвой тариф изменен на Free. Чтобы вернуть доступ к расширенным функциям, оформи подписку в меню "💰 Оплатить подписку".`);
            }
        }
    });

    console.log('Motivation & Reminder jobs scheduled.');
};
