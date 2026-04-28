# Telegram Setup

## Что уже реализовано

- `create-telegram-link-token` — создаёт одноразовый токен привязки для текущего пользователя
- `telegram-webhook` — принимает webhook от Telegram и привязывает `telegram_chat_id`
- `send-telegram-notification` — внутренняя отправка уведомлений в Telegram
- `send-my-telegram-test` — отправка тестового сообщения в Telegram текущему пользователю

## Какие secrets нужны в Supabase

Добавьте в `Project Settings -> Edge Functions -> Secrets`:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`

## Как зарегистрировать webhook у Telegram

Подставьте свои значения:

- `<BOT_TOKEN>` — токен Telegram-бота
- `<PROJECT_REF>` — ref проекта Supabase
- `<WEBHOOK_SECRET>` — то же значение, что в `TELEGRAM_WEBHOOK_SECRET`

Webhook URL:

```text
https://<PROJECT_REF>.supabase.co/functions/v1/telegram-webhook
```

Команда регистрации:

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://<PROJECT_REF>.supabase.co/functions/v1/telegram-webhook",
    "secret_token": "<WEBHOOK_SECRET>"
  }'
```

Проверка webhook:

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

## Как проверить end-to-end

1. Откройте клиентские настройки.
2. Нажмите `Открыть бота и привязать`.
3. В Telegram откройте бота по ссылке и отправьте `/start ...`, если бот не сделал это автоматически.
4. Вернитесь в клиентские настройки и убедитесь, что отображается `Telegram привязан`.
5. Нажмите `Проверить доставку`.
6. Убедитесь, что в Telegram пришло тестовое сообщение `SkillSpot test message`.

## Что проверить, если не работает

### Кнопка привязки открывает бота, но привязка не происходит

- Проверьте `TELEGRAM_WEBHOOK_SECRET`
- Проверьте `getWebhookInfo`
- Убедитесь, что webhook указывает на `.../functions/v1/telegram-webhook`

### Бот отвечает, но уведомления не приходят

- Проверьте `TELEGRAM_BOT_TOKEN`
- Убедитесь, что `profiles.telegram_chat_id` заполнен у пользователя
- Запустите `Проверить доставку` из клиентских настроек

### Тестовая отправка возвращает ошибку

- `409 Telegram is not linked for this user` — сначала выполните привязку
- `502 Telegram API request failed` — проверьте валидность токена бота и ограничения у Telegram
