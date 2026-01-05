import { sendBotMessage } from './bot.js';
import { readSubscriptions } from './storage.js';
import { generatePersonalizedAdvice } from './personalizedAdvice.js';
import { MOTIVATION_QUOTES, REMINDER_MESSAGES } from './motivationMessages.js';

const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

const telegramId = 742200799;

async function sendTestMessages() {
    const sub = (await readSubscriptions()).find(s => s.telegramId === telegramId);

    console.log('Sending test messages...');

    // 1. Morning motivation
    const morningQuote = getRandomItem(MOTIVATION_QUOTES);
    await sendBotMessage(telegramId, `🌅 Доброе утро!\n\n${morningQuote}`);
    console.log('✓ Morning motivation sent');

    // 2. Personalized advice
    if (sub?.profile?.weightKg && sub?.profile?.goalWeightKg) {
        const advice = await generatePersonalizedAdvice(sub.profile);
        if (advice) {
            await sendBotMessage(telegramId, advice);
            console.log('✓ Personalized advice sent');
        }
    } else {
        await sendBotMessage(telegramId, '💡 Совет дня:\n\nЗаполни свой профиль (вес и цель), чтобы получать персонализированные советы!');
        console.log('✓ Generic advice sent (no profile)');
    }

    // 3. Evening reminder
    const reminder = getRandomItem(REMINDER_MESSAGES);
    await sendBotMessage(telegramId, `🌙 ${reminder}`);
    console.log('✓ Evening reminder sent');

    // 4. Evening motivation
    const eveningQuote = getRandomItem(MOTIVATION_QUOTES);
    await sendBotMessage(telegramId, `💫 Вечерняя мотивация:\n\n${eveningQuote}`);
    console.log('✓ Evening motivation sent');

    console.log('\n✅ All test messages sent successfully!');
    process.exit(0);
}

sendTestMessages().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
