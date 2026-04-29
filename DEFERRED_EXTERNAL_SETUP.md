# Deferred External Setup

Эти интеграционные шаги отложены и сейчас не блокируют обычную работу приложения.

## Hidden For Now

- Визуальные кнопки входа через `Google` и `VK ID`
- Видимый flow подтверждения телефона по SMS

## What Still Exists In Code

- OAuth callback flow и backend-совместимость для `Google` и `VK ID`
- Логика phone verification и подготовленная миграция
- Telegram edge functions, привязка через бота и отправка уведомлений в привязанные чаты

## To Resume Later

### OAuth

- Добавить frontend env `VITE_VK_AUTH_URL`
- Включить и настроить auth providers в Supabase
- Добавить redirect URLs для `/auth/callback`

### Phone Verification

- Включить phone auth и SMS provider в Supabase
- Вернуть видимый OTP-flow в клиентские настройки

### Telegram

- Зарегистрировать `telegram-webhook` в Telegram Bot API

## Later Migration Path

- Clone the project away from Lovable into самостоятельный production contour.
- Deploy on a personal domain.
- Bind the app to a new Supabase project.
- Recreate the database / auth / secrets / edge functions in the new environment.
- Re-enable deferred integrations there:
  - OAuth providers
  - phone verification provider
  - Telegram webhook
