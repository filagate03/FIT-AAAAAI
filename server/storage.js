import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, 'data');
const subscriptionsFile = path.join(dataDir, 'subscriptions.json');

const ensureStorage = async () => {
    await fs.mkdir(dataDir, { recursive: true });
    try {
        await fs.access(subscriptionsFile);
    } catch {
        await fs.writeFile(subscriptionsFile, '[]', 'utf-8');
    }
};

export const readSubscriptions = async () => {
    await ensureStorage();
    const raw = await fs.readFile(subscriptionsFile, 'utf-8');
    try {
        return JSON.parse(raw);
    } catch {
        return [];
    }
};

export const writeSubscriptions = async data => {
    await ensureStorage();
    await fs.writeFile(subscriptionsFile, JSON.stringify(data, null, 2), 'utf-8');
};

export const upsertSubscription = async record => {
    const data = await readSubscriptions();
    const idx = data.findIndex(item => item.subscriptionKey === record.subscriptionKey);
    if (idx === -1) {
        data.push(record);
    } else {
        data[idx] = { ...data[idx], ...record };
    }
    await writeSubscriptions(data);
    return record;

};

export const getSubscriptionByTelegramId = async (telegramId) => {
    const data = await readSubscriptions();
    return data.find(sub => sub.telegramId === Number(telegramId));
};

