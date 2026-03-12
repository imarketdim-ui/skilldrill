# SkillSpot — Маркетплейс услуг

## 🚀 О проекте

SkillSpot — это маркетплейс для записи к проверенным специалистам. Платформа поддерживает роли: Клиент, Мастер, Владелец Бизнеса, Менеджер, Администратор.

## 🛠 Технологии

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Edge Functions, Auth, Storage)
- **PWA**: vite-plugin-pwa (Service Workers, offline support)
- **Charts**: Recharts
- **Maps**: MapLibre GL

## 📦 Установка

```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm install
npm run dev
```

## 🔐 Настройка секретов

### Supabase Edge Function Secrets

Добавьте следующие секреты в [настройках Edge Functions](https://supabase.com/dashboard/project/fttbwjuaaltomksuslyi/settings/functions):

| Секрет | Описание | Где получить |
|--------|----------|--------------|
| `CRON_SECRET` | Ключ для защиты cron-функций | Сгенерируйте любую строку |
| `TINKOFF_TERMINAL_KEY` | Ключ терминала Тинькофф | [Личный кабинет Тинькофф](https://business.tinkoff.ru/) → Интернет-эквайринг |
| `TINKOFF_PASSWORD` | Пароль терминала Тинькофф | Там же, в настройках терминала |
| `VAPID_PUBLIC_KEY` | Публичный ключ Web Push | Сгенерируйте: `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | Приватный ключ Web Push | Сгенерируйте вместе с публичным |

### GitHub Actions Secrets

Для CI/CD в `.github/workflows/main.yml` добавьте в Settings → Secrets:

| Секрет | Описание |
|--------|----------|
| `VITE_SUPABASE_URL` | URL вашего Supabase проекта |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon ключ Supabase |
| `SUPABASE_PROJECT_REF` | Reference ID проекта (e.g. `fttbwjuaaltomksuslyi`) |
| `SUPABASE_ACCESS_TOKEN` | [Access Token](https://supabase.com/dashboard/account/tokens) |

## 🧪 Тестирование

```bash
npm test          # Запуск unit-тестов
npm run lint      # Линтинг
```

Стресс-тестирование доступно по маршруту `/admin/stress-test` (требует авторизации).

## 📱 PWA

Приложение устанавливается как PWA на мобильные устройства. Настройки манифеста — в `vite.config.ts`.

## 🏗 Структура проекта

```
src/
  components/
    dashboard/      # Компоненты личных кабинетов
    landing/        # Лендинг
    marketplace/    # Каталог и карточки
    ui/             # shadcn/ui компоненты
    onboarding/     # Онбординг тур
  hooks/            # React хуки
  pages/            # Страницы (маршруты)
  lib/              # Утилиты (поиск, SEO, storage)
  integrations/     # Supabase клиент и типы
supabase/
  functions/        # Edge Functions
  migrations/       # SQL миграции
```

## 🌍 Деплой

Через [Lovable](https://lovable.dev) → Share → Publish, или настройте CI/CD через GitHub Actions.

## 📄 Лицензия

Proprietary. All rights reserved.
