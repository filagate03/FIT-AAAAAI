#!/bin/bash

# Fit AI - One-Command Deploy Script for Beget
# Этот скрипт автоматически собирает и подготавливает проект к деплою

set -e

echo "🚀 Fit AI - Деплой на Beget"
echo "=================================="
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js не установлен${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Node.js: $(node -v)"
echo -e "${GREEN}✓${NC} npm: $(npm -v)"
echo ""

# Проверка .env.production
if [ ! -f .env.production ]; then
    echo -e "${RED}❌ Файл .env.production не найден${NC}"
    echo "Создайте .env.production на основе .env.local"
    exit 1
fi

echo -e "${GREEN}✓${NC} .env.production найден"
echo ""

# Шаг 1: Установка зависимостей
echo -e "${YELLOW}📦 Шаг 1: Установка зависимостей...${NC}"
npm install
echo -e "${GREEN}✓${NC} Зависимости установлены"
echo ""

# Шаг 2: Сборка фронтенда
echo -e "${YELLOW}🔨 Шаг 2: Сборка фронтенда...${NC}"
npm run build:prod
echo -e "${GREEN}✓${NC} Фронтенд собран в dist/"
echo ""

# Шаг 3: Подготовка структуры для деплоя
echo -e "${YELLOW}📁 Шаг 3: Подготовка структуры для деплоя...${NC}"

# Создаём временную директорию для деплоя
DEPLOY_DIR="deploy-temp"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# Копируем фронтенд
cp -r dist $DEPLOY_DIR/public_html

# Копируем сервер
cp -r server $DEPLOY_DIR/

# Копируем конфигурационные файлы
cp package.json $DEPLOY_DIR/
cp package-lock.json $DEPLOY_DIR/
cp .env.production $DEPLOY_DIR/

# Копируем скрипты деплоя
cp deploy.sh $DEPLOY_DIR/
cp deploy.ps1 $DEPLOY_DIR/

echo -e "${GREEN}✓${NC} Структура подготовлена в $DEPLOY_DIR/"
echo ""

# Шаг 4: Создание архива
echo -e "${YELLOW}📦 Шаг 4: Создание архива...${NC}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARCHIVE_NAME="fit-ai-deploy-${TIMESTAMP}.tar.gz"
tar -czf $ARCHIVE_NAME -C $DEPLOY_DIR .
echo -e "${GREEN}✓${NC} Архив создан: $ARCHIVE_NAME"
echo ""

# Шаг 5: Инструкции по деплою
echo -e "${YELLOW}📋 Шаг 5: Инструкции по деплою на Beget${NC}"
echo ""
echo "=================================="
echo "Файлы готовы к деплою!"
echo ""
echo "📁 Структура для загрузки:"
echo "  - public_html/ → загрузить в public_html/"
echo "  - server/ → загрузить в корень сайта"
echo "  - package.json → загрузить в корень"
echo "  - .env.production → загрузить в корень"
echo ""
echo "📦 Архив: $ARCHIVE_NAME"
echo ""
echo "🚀 Следующие шаги:"
echo "  1. Войдите в панель Beget"
echo "  2. Перейдите в Файловый менеджер"
echo "  3. Загрузите содержимое $DEPLOY_DIR или архив $ARCHIVE_NAME"
echo "  4. Настройте Node.js приложение:"
echo "     - Тип: Node.js"
echo "     - Файл запуска: server/index.prod.js"
echo "     - Порт: 4000"
echo "  5. Запустите приложение"
echo ""
echo "=================================="
echo ""

# Шаг 6: Проверка здоровья
echo -e "${YELLOW}🔍 Шаг 6: Проверка конфигурации...${NC}"

# Проверка переменных окружения
source .env.production

REQUIRED_VARS=("TRIBUTE_API_KEY" "TRIBUTE_SECRET_KEY" "TELEGRAM_BOT_TOKEN" "SERVER_BASE_URL")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ] || [[ "${!var}" == *"your_"* ]]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo -e "${RED}⚠️  Внимание! Следующие переменные не настроены:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo -e "${YELLOW}Отредактируйте .env.production перед деплоем!${NC}"
else
    echo -e "${GREEN}✓${NC} Все необходимые переменные настроены"
fi

echo ""
echo "=================================="
echo -e "${GREEN}✅ Подготовка к деплою завершена!${NC}"
echo "=================================="
echo ""
echo "Для автоматической загрузки на Beget используйте:"
echo "  - FTP клиент (FileZilla, WinSCP)"
echo "  - Beget API (требуется настройка)"
echo ""