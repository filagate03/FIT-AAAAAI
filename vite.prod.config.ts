import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const resolvedBaseUrl = env.GEMINI_API_BASE_URL || 'https://api.artemox.com';
    const resolvedApiVersion = env.GEMINI_API_VERSION || 'v1beta';
    const resolvedModel = env.GEMINI_MODEL || 'gemini-2.5-flash';
    const useProxy = env.GEMINI_USE_PROXY === 'true';
    const proxyPath = (env.GEMINI_PROXY_PATH || '/artemox').startsWith('/')
        ? env.GEMINI_PROXY_PATH || '/artemox'
        : `/${env.GEMINI_PROXY_PATH}`;
    const proxyTarget = env.GEMINI_PROXY_TARGET || resolvedBaseUrl;
    const yooProxyPath = (env.YOOKASSA_PROXY_PATH || '/yookassa').startsWith('/')
        ? env.YOOKASSA_PROXY_PATH || '/yookassa'
        : `/${env.YOOKASSA_PROXY_PATH}`;
    const yooTarget = env.YOOKASSA_BASE_URL || 'https://api.yookassa.ru';

    const proxyConfig: Record<string, any> = {};
    if (useProxy) {
        proxyConfig[proxyPath] = {
            target: proxyTarget,
            changeOrigin: true,
            secure: true,
            rewrite: (path: string) => path.replace(proxyPath, '')
        };
    }
    proxyConfig[yooProxyPath] = {
        target: yooTarget,
        changeOrigin: true,
        secure: true,
        rewrite: (path: string) => path.replace(yooProxyPath, '')
    };

    return {
        base: '/',
        build: {
            outDir: 'dist',
            assetsDir: 'assets',
            sourcemap: false,
            rollupOptions: {
                output: {
                    manualChunks: {
                        'react-vendor': ['react', 'react-dom'],
                        'recharts': ['recharts'],
                    },
                },
            },
            chunkSizeWarningLimit: 1000,
        },
        server: {
            port: 3000,
            host: '0.0.0.0',
            proxy: Object.keys(proxyConfig).length ? proxyConfig : undefined
        },
        plugins: [react()],
        define: {
            'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
            'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
            'process.env.GEMINI_API_BASE_URL': JSON.stringify(resolvedBaseUrl),
            'process.env.GEMINI_API_VERSION': JSON.stringify(resolvedApiVersion),
            'process.env.GEMINI_MODEL': JSON.stringify(resolvedModel),
            'process.env.PAYMENT_API_KEY': JSON.stringify(env.PAYMENT_API_KEY || ''),
            'process.env.GEMINI_USE_PROXY': JSON.stringify(useProxy ? 'true' : 'false'),
            'process.env.GEMINI_PROXY_PATH': JSON.stringify(proxyPath),
            'process.env.ADMIN_PASSWORD': JSON.stringify(env.ADMIN_PASSWORD || 'alex-alex-fitai3'),
            'process.env.TELEGRAM_BOT_TOKEN': JSON.stringify(env.TELEGRAM_BOT_TOKEN || ''),
            'process.env.TELEGRAM_SUPPORT_CHAT_ID': JSON.stringify(env.TELEGRAM_SUPPORT_CHAT_ID || ''),
            'process.env.SERVER_BASE_URL': JSON.stringify(env.SERVER_BASE_URL || 'http://localhost:4000'),
            'process.env.TELEGRAM_WEBAPP_URL': JSON.stringify(env.TELEGRAM_WEBAPP_URL || env.PUBLIC_WEBAPP_URL || ''),
            'process.env.TELEGRAM_SUPPORT_URL': JSON.stringify(
                env.TELEGRAM_SUPPORT_URL || env.TELEGRAM_SUPPORT_CHAT_LINK || 'https://t.me/hunt_tg'
            ),
            'process.env.PUBLIC_WEBAPP_URL': JSON.stringify(env.PUBLIC_WEBAPP_URL || ''),
            'process.env.SUPPORT_DISPLAY_NAME': JSON.stringify(env.SUPPORT_DISPLAY_NAME || 'Команда Fit AI')
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
            }
        }
    };
});
