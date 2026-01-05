# Deploy script for Beget (Windows PowerShell)

Write-Host "🚀 Начинаем деплой Fit AI на Beget..." -ForegroundColor Green

# Проверка наличия необходимых переменных окружения
if (-not (Test-Path .env.production)) {
    Write-Host "❌ Файл .env.production не найден. Создайте его на основе .env.production.example" -ForegroundColor Red
    exit 1
}

# Установка зависимостей
Write-Host "📦 Установка зависимостей..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Ошибка установки зависимостей" -ForegroundColor Red
    exit 1
}

# Сборка фронтенда
Write-Host "🔨 Сборка фронтенда..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Ошибка сборки фронтенда" -ForegroundColor Red
    exit 1
}

# Проверка сборки
if (-not (Test-Path dist)) {
    Write-Host "❌ Директория dist не создана. Сборка не удалась." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Фронтенд собран успешно!" -ForegroundColor Green

# Инструкции для деплоя на Beget
Write-Host ""
Write-Host "📋 Инструкции для деплоя на Beget:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Загрузите содержимое папки 'dist' в папку 'public_html' на Beget через FTP или файловый менеджер"
Write-Host "2. Загрузите папку 'server' в корневую директорию вашего сайта"
Write-Host "3. Загрузите файлы 'package.json', 'package-lock.json' и '.env.production' в корневую директорию"
Write-Host "4. На Beget установите Node.js версии 18 или выше"
Write-Host "5. В настройках сайта на Beget:"
Write-Host "   - Установите 'Тип приложения' как 'Node.js'"
Write-Host "   - Укажите 'Файл запуска' как 'server/index.prod.js'"
Write-Host "   - Укажите порт из переменной SERVER_PORT (по умолчанию 4000)"
Write-Host "6. Запустите приложение через панель управления Beget"
Write-Host ""
Write-Host "🔗 После деплоя:" -ForegroundColor Cyan
Write-Host "   - Обновите TELEGRAM_WEBAPP_URL и PUBLIC_WEBAPP_URL в .env.production на ваш домен"
Write-Host "   - Настройте вебхук Tribute на https://your-domain.com/api/payments/webhook"
Write-Host "   - Установите Telegram Web App через @BotFather"
Write-Host ""
Write-Host "✅ Подготовка к деплою завершена!" -ForegroundColor Green