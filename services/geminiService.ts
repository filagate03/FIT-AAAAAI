import { GoogleGenAI } from "@google/genai";
import { Profile, AnalysisResult, ChatMessage, DiaryEntry, SubscriptionTier } from "../types";

const trimTrailingSlash = (url: string) => url.replace(/\/+$/, "");

const resolveBaseUrl = () => {
    const useProxy = process.env.GEMINI_USE_PROXY === "true";
    const rawProxyPath = process.env.GEMINI_PROXY_PATH || "/artemox";
    const proxyPath = rawProxyPath.startsWith("/") ? rawProxyPath : `/${rawProxyPath}`;

    if (useProxy && typeof window !== "undefined") {
        const origin = trimTrailingSlash(window.location.origin);
        return `${origin}${proxyPath}`;
    }

    return process.env.GEMINI_API_BASE_URL || "https://api.artemox.com";
};

const getApiKey = () => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
        throw new Error("Gemini API key is not configured.");
    }
    return apiKey;
};

const getModelId = () => process.env.GEMINI_MODEL || "gemini-2.5-flash";

const getApiVersion = () => process.env.GEMINI_API_VERSION || "v1beta";

const getAiClient = () => {
    return new GoogleGenAI({
        apiKey: getApiKey(),
        httpOptions: {
            baseUrl: resolveBaseUrl(),
            apiVersion: getApiVersion(),
        },
    });
};

const parseJsonText = (rawText?: string) => {
    if (!rawText) return null;
    const variants: string[] = [];
    const trimmed = rawText.trim();
    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fencedMatch?.[1]) variants.push(fencedMatch[1]);

    if (trimmed.includes("{") && trimmed.includes("}")) {
        const start = trimmed.indexOf("{");
        const end = trimmed.lastIndexOf("}");
        if (start !== -1 && end > start) {
            variants.push(trimmed.slice(start, end + 1));
        }
    }

    variants.push(trimmed);

    for (const candidate of variants) {
        try {
            return JSON.parse(candidate);
        } catch {
            continue;
        }
    }
    return null;
};

const extractTextFromPayload = (payload: any): string | null => {
    if (!payload) return null;

    const candidates = payload.candidates;
    if (Array.isArray(candidates)) {
        for (const candidate of candidates) {
            const parts = candidate.content?.parts ?? candidate.content ?? [];
            for (const part of parts) {
                if (typeof part?.text === "string") return part.text;
                if (typeof part?.data === "string" && (!part?.mime_type || part?.mime_type === "text/plain")) {
                    return part.data;
                }
            }
        }
    }

    if (typeof payload.text === "string") return payload.text;
    return null;
};

const buildNutritionPrompt = (profile: Profile) => `
Ты — Fit AI диетолог. Проанализируй фото блюда и СТРОГО верни JSON со следующими полями:
- food (строка, название блюда на русском),
- portion_grams, calories, protein, fat, carbs (числа без единиц, десятичный разделитель — точка),
- tip (строка с кратким советом, учитывающим возраст ${profile.age} лет и вес ${profile.weightKg} кг пользователя).
Не добавляй комментариев вне JSON.
`;

const sanitizeString = (value: unknown, fallback: string) => {
    if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
    }
    return fallback;
};

const sanitizeNumber = (value: unknown, fallback = 0) => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string") {
        const normalized = value.replace(",", ".").match(/-?\d+(?:\.\d+)?/);
        if (normalized?.[0]) {
            const parsed = Number(normalized[0]);
            if (!Number.isNaN(parsed)) return parsed;
        }
    }
    return fallback;
};

const normalizeAnalysisResult = (raw: any): Omit<AnalysisResult, "image"> => {
    const portion = Math.max(0, sanitizeNumber(raw?.portion_grams, 0));
    const caloriesFallback = portion > 0 ? Math.round(portion * 2) : 0;

    return {
        food: sanitizeString(raw?.food, "Блюдо"),
        portion_grams: portion || 120,
        calories: sanitizeNumber(raw?.calories, caloriesFallback),
        protein: sanitizeNumber(raw?.protein),
        fat: sanitizeNumber(raw?.fat),
        carbs: sanitizeNumber(raw?.carbs),
        tip: sanitizeString(
            raw?.tip,
            "Контролируйте размер порции и добавляйте свежие овощи для поддержания баланса."
        ),
    };
};

const callImageAnalysisApi = async (base64Image: string, prompt: string) => {
    const apiKey = getApiKey();
    const baseUrl = trimTrailingSlash(resolveBaseUrl());
    const apiVersion = getApiVersion();
    const model = getModelId();
    const url = `${baseUrl}/${apiVersion}/models/${model}:generateContent`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            contents: [
                { mime_type: "image/jpeg", data: base64Image },
                { mime_type: "text/plain", data: prompt },
            ],
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${response.statusText} — ${errorText}`);
    }

    return response.json();
};

const callSdkImageAnalysis = async (base64Image: string, profile: Profile) => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: getModelId(),
        contents: [
            {
                role: "user",
                parts: [
                    { inlineData: { mimeType: "image/jpeg", data: base64Image } },
                    { text: buildNutritionPrompt(profile) },
                ],
            },
        ],
        config: {
            temperature: 0,
        },
    });

    return response;
};

export const analyzeFoodImage = async (base64Image: string, profile: Profile): Promise<AnalysisResult> => {
    let jsonResponse: any = null;
    let lastError: unknown = null;

    try {
        const payload = await callImageAnalysisApi(base64Image, buildNutritionPrompt(profile));
        const text = extractTextFromPayload(payload);
        jsonResponse = parseJsonText(text || "");
    } catch (error) {
        lastError = error;
        console.warn("Direct generateContent call failed, falling back to SDK client", error);
    }

    if (!jsonResponse) {
        try {
            const sdkResponse = await callSdkImageAnalysis(base64Image, profile);
            const text = extractTextFromPayload(sdkResponse);
            jsonResponse = parseJsonText(text || "");
        } catch (error) {
            lastError = error;
        }
    }

    if (!jsonResponse) {
        const message =
            lastError instanceof Error ? lastError.message : "Не удалось получить корректный ответ от API.";
        throw new Error(message);
    }

    const normalized = normalizeAnalysisResult(jsonResponse);
    return { ...normalized, image: `data:image/jpeg;base64,${base64Image}` };
};

export const getCoachResponse = async (
    history: ChatMessage[],
    profile: Profile,
    diaryEntries: DiaryEntry[],
    tier: SubscriptionTier
): Promise<string> => {
    try {
        const ai = getAiClient();

        const diarySummary =
            diaryEntries.length > 0
                ? `Вот что пользователь съел сегодня: ${diaryEntries.map((e) => `${e.food} (${e.calories} ккал)`).join(", ")}.`
                : "Пользователь пока ничего не ел сегодня.";

        const isProUser = tier === "pro" || tier === "premium";

        const baseInstruction = `Ты — "Fit AI Коуч", дружелюбный ИИ-диетолог. Твоя цель — помогать пользователю придерживаться здоровых привычек и двигаться к цели.
Учитывай данные профиля (возраст: ${profile.age}, вес: ${profile.weightKg} кг, цель: ${profile.goalWeightKg} кг).
${diarySummary}
Пиши на русском языке и структурируй ответ короткими абзацами или списками.`;

        const proInstruction = `Пользователь имеет подписку Pro/Premium. Добавляй больше глубины: точки роста, нюансы по нутриентам, идеи для привычек и тренировок.`;

        const systemInstruction = isProUser ? `${baseInstruction}\n${proInstruction}` : baseInstruction;

        const contents = history.map((msg) => ({
            role: msg.role,
            parts: [{ text: msg.text }],
        }));

        const response = await ai.models.generateContent({
            model: getModelId(),
            contents,
            config: {
                systemInstruction,
                temperature: 0.7,
            },
        });

        return response.text;
    } catch (error) {
        console.error("Error getting coach response from Gemini:", error);
        return "Произошла ошибка при получении ответа от ИИ. Попробуйте написать ещё раз.";
    }
};
