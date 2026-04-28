# OAuth setup for SkillSpot

Этот проект использует два сценария внешней авторизации:

- `Google` через встроенный `Supabase Auth OAuth`
- `VK ID` через `VITE_VK_AUTH_URL`

## 1. Callback URL, который должен быть разрешён

Приложение теперь завершает OAuth-вход на маршруте:

- `http://localhost:8080/auth/callback`
- `https://skilldrill.lovable.app/auth/callback`

Для любого будущего домена нужно добавить аналогичный URL:

- `https://<your-domain>/auth/callback`

## 2. Google через Supabase

Что нужно настроить:

1. В `Supabase Auth -> Providers -> Google` включить провайдер.
2. В Google Cloud Console указать redirect URL из Supabase provider setup.
3. В списке разрешённых redirect URLs для приложения убедиться, что используются опубликованные адреса с `/auth/callback`.

Поведение в приложении:

- пользователь нажимает кнопку `Google`
- уходит к провайдеру
- возвращается на `/auth/callback`
- после успешной сессии перенаправляется в `/dashboard`

## 3. VK ID через VITE_VK_AUTH_URL

Во frontend должен быть задан env:

```env
VITE_VK_AUTH_URL=https://fttbwjuaaltomksuslyi.supabase.co/auth/v1/authorize?provider=vk&redirect_to=__REDIRECT_TO__
```

Важно:

- вместо статического redirect URL используйте плейсхолдер `__REDIRECT_TO__`
- приложение подставит в него текущий runtime callback URL автоматически

Это позволяет одному и тому же коду корректно работать на:

- localhost
- lovable publish domain
- будущем production domain

## 4. Что проверить после настройки

1. На `/auth` открывается кнопка `Войти через Google`.
2. На `/auth` открывается кнопка `Войти через VK ID`.
3. После выбора провайдера пользователь возвращается на `/auth/callback`.
4. Callback-маршрут не падает и через несколько секунд переводит пользователя в `/dashboard`.
5. При ошибке провайдера пользователь видит понятный экран ошибки вместо пустой страницы.

## 5. Если OAuth не завершился

Обычно причина одна из этих:

- не добавлен redirect URL с `/auth/callback`
- `Google` провайдер не включён в Supabase
- не задан `VITE_VK_AUTH_URL`
- в `VITE_VK_AUTH_URL` нет плейсхолдера `__REDIRECT_TO__`
- опубликован старый frontend build без новых auth-изменений
