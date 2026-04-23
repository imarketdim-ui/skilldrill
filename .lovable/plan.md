

# План: 10 точечных доработок

## Что делаем

### 1. Экспорт/импорт CSV в `UniversalClients`
**Файл:** `src/components/dashboard/universal/UniversalClients.tsx`
- Кнопки `Экспорт CSV` и `Импорт CSV` рядом с поиском.
- Экспорт: выгружает уже отфильтрованный массив `filtered` со столбцами «Имя | Фамилия | SkillSpot ID | Email | Телефон | Статус | LTV | Сессий | Завершено». Имя файла: `clients_<YYYY-MM-DD>.csv`, разделитель `;`, BOM UTF-8 (для Excel).
- Импорт: парсит CSV (`papaparse` уже не подключаем — пишем мини-парсер на 30 строк). Сопоставление по `skillspot_id`. Создаёт/обновляет только `client_tags` с тегом `note` (импорт заметок) и тегом `vip` (если статус = VIP). Никакого создания profiles — это не разрешено.
- Toast с числом обработанных строк.

### 2. Быстрый поиск с подсветкой совпадений
**Файл:** `src/components/dashboard/universal/UniversalClients.tsx`
- Поле поиска уже есть. Добавляем дебаунс 200 мс и подсветку: helper `highlight(text, query)` оборачивает совпадение в `<mark className="bg-yellow-200 text-foreground rounded px-0.5">…</mark>`.
- Подсветка применяется в `renderRow` к имени, фамилии, email и `skillspot_id`.

### 3. Авто-сброс «печатает…» в `SupportChat`
**Файлы:** `src/hooks/useTypingIndicator.ts`, `src/components/dashboard/SupportChat.tsx`
- В `useTypingIndicator` добавляем интервал-чистильщик: каждые 1500 мс пересчитываем `typingUsers`, отбрасывая записи старше 4000 мс (TTL уже учтён в `refresh`, но он вызывается только на presence-событиях). Доп. `setInterval` гарантирует, что индикатор исчезает без новых событий.
- В `SupportChat` дебаунсим вызов `notifyTyping()` на 400 мс, чтобы не спамить presence.

### 4. Адаптивная высота строк виртуализации
**Файл:** `src/components/dashboard/universal/UniversalClients.tsx`
- Заменяем фиксированный `ROW_HEIGHT = 92` на `useVirtualizer` с `measureElement` + `data-index` на враппере строки. `estimateSize` оставляем 92 как стартовое. Гарантирует, что VIP-бейдж/длинный email/импортированная заметка не «наезжают».

### 5. «Добавить себя как мастера» при создании организации
**Файл:** `src/pages/CreateOrganization.tsx` + новый блок логики после успешного создания.
- В форме появляется чекбокс «Я сам буду оказывать услуги в этой организации». По умолчанию выключен.
- При сабмите, если чекбокс активен и заявка успешно создана:
  - Если у пользователя ещё нет роли `master` — вызываем RPC `assign_role_on_account_creation(_user_id, 'master')` (она уже есть в БД).
  - Если нет `master_profiles` — `insert` базовый профиль (`user_id`, `display_name = profile.first_name + last_name`, `category_slug = 'beauty'` по умолчанию, `is_active = true`).
  - Запоминаем намерение в `organization_requests.metadata.add_self_as_master = true`, чтобы при одобрении админ автоматически добавил пользователя в `business_masters`.
- Уведомление: «Заявка отправлена. После одобрения вы будете добавлены как мастер».

### 6. Закрытие диалога записи на услугу
**Файлы:** `src/pages/MasterDetail.tsx`, `src/pages/BusinessDetail.tsx`
- В `<DialogContent>` диалога записи добавляем `<DialogFooter>` с двумя кнопками: «Отменить» (`variant="outline"`, закрывает диалог и сбрасывает `bookingData`) и «Подтвердить запись».
- Проверяем, что у `DialogContent` не переопределён `onPointerDownOutside`/`onEscapeKeyDown` (сейчас не переопределён — крестик должен работать). Если перекрыт sticky-сайдбаром, поднимаем `z-50` явно. Дополнительно ставим явный `<DialogClose asChild>` крестик в шапке.

### 7. Починка кнопки «Установить на рабочий стол»
**Файл:** `src/components/PWAInstallPrompt.tsx`
- На Desktop `beforeinstallprompt` иногда не срабатывает в Lovable preview (iframe), и `deferredPrompt` остаётся `null` — клик ничего не делает (не открывает инструкцию, потому что dismissedHandler обнуляет prompt).
- Чинение:
  - Если `deferredPrompt === null` — всегда открываем `setShowInstructions(true)` (текущий код это уже делает, но баннер скрыт по `localStorage('pwa-dismissed')` после первого клика «Понятно»). Перенесём сохранение dismiss на явный клик «Позже» / крестик. Кнопка «Понятно» в инструкции — только закрывает диалог, не дисмиссит баннер.
  - Дополнительно: вешаем `appinstalled` event listener → `setIsInstalled(true)` + сбрасываем баннер.
  - Если `display-mode: standalone` уже активен, баннер не показываем (есть). 
  - Добавляем fallback-кнопку «Открыть инструкцию» в десктоп-варианте, если prompt не появился через 5 сек.

### 8. Индикатор уведомлений в шапке
**Файл:** `src/components/dashboard/DashboardLayout.tsx` + новый компонент `src/components/dashboard/HeaderNotifications.tsx`
- В шапке (рядом с `LogOut`) — кнопка-колокольчик с красным бейджем `unread`.
- Источник `unread`: 
  - `notifications` (where `is_read = false`),
  - `chat_messages` (where `recipient_id = user.id AND is_read = false AND chat_type != 'support'`),
  - `support` сообщения от админа (where `recipient_id = user.id AND is_read = false AND chat_type = 'support'`),
  - приглашения (`invitations` по `email = user.email`, `accepted_at IS NULL`).
- Realtime-подписка на `notifications` и `chat_messages` для live-обновления счётчика.
- Popover при клике — список последних 10 уведомлений с навигацией в нужный раздел.

### 9. Авторизация перед «Написать мастеру/организации»
**Файлы:** `src/pages/MasterDetail.tsx`, `src/pages/BusinessDetail.tsx`
- В `handleMessage` (есть) и аналоге для бизнеса: если `!user` — НЕ открываем диалог сразу, а показываем `Dialog` с текстом «Войдите, чтобы написать мастеру» и кнопками «Войти» / «Зарегистрироваться» (ведут на `/auth?redirect=...`).
- Текущая кнопка «Написать» → если `!user`, переключаем `setMessageOpen` на `setLoginPromptOpen`.
- Для авторизованных: после успешной отправки сообщения дополнительно `upsert` в `favorites` (`favorite_type = 'contact'`) — чтобы контакт точно появился в чатах клиента.

### 10. Контакты в чатах клиента: избранные + история записей
**Файл:** `src/components/dashboard/teaching/TeachingChats.tsx`
- В `fetchContacts` дополнительно собираем источники контактов (для cabinet `client`):
  - `favorites` где `user_id = me AND favorite_type IN ('master','business')` — берём `target_id` (для бизнеса резолвим в `owner_id`).
  - `bookings` где `client_id = me` — берём уникальные `executor_id`.
  - `lesson_bookings` где `student_id = me` → `lessons.teacher_id`.
  - Уже существующие из `chat_messages`.
- Делаем `Set<string>` объединением, тянем профили одним запросом, фильтруем через `isAllowedContact`.
- Контакты без переписки получают `lastMessage = null`, сортируются после активных диалогов (по алфавиту).

---

## Технические детали

**Новые файлы:** `src/components/dashboard/HeaderNotifications.tsx`.

**Изменяемые файлы:** 10 шт. (см. выше). БД-миграции не требуются — все RPC и таблицы уже есть.

**Зависимости:** ничего нового, всё на текущем стеке.

**Порядок выполнения:** 1 → 2 → 4 (UniversalClients цельным заходом) → 3 (typing) → 6 → 9 → 10 (детальные/чаты) → 5 → 7 → 8.

