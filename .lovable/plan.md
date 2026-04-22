

# План доработок: соответствие SkillSpot ТЗ v2.0 (исправленная версия)

## Изменения по запросу
- ❌ Убрана Фаза 3 (BookingWizard) — запись остаётся через текущий popup-Dialog.
- ❌ Убраны SMS-интеграция и оповещения (`send-sms`, `send-booking-reminders`, `send-birthday-greetings`) — не реализуем.
- ✅ Тарифы 199 / 2 490 / 5 490 ₽ обновляются ВЕЗДЕ: `platform_settings`, `usePlatformPricing`, `TierComparison`, `SubscriptionManager`, `SubscriptionPaywall`, лендинги (`ForBusiness`, `Index`, `Hero`, `CTA`).
- ✅ Логика ЛК реализуется строго по ТЗ (разд. 13–15).

## Сводка соответствия

| Раздел ТЗ | Статус | Действие |
|---|---|---|
| 2.2 PWA (SW + Workbox) | ⚠️ | Доделать в Фазе 7 |
| 2.4 Виртуализация | ⚠️ | Доделать в Фазе 7 |
| 4. Роль `business_admin` | ❌ | Фаза 8 |
| 5. Тарифы 199/2490/5490 + 45-дн триал интегратора | ❌ | **Фаза 2 (приоритет)** |
| 7. Поля bookings (deposit, payment_status) | ⚠️ | Фаза 1 (без reminder-флагов — SMS не делаем) |
| 9. CRM (broadcasts, loyalty_programs) | ❌ | Фаза 5 |
| 10. ERP (salary_schemes, salary_records) | ❌ | Фаза 6 |
| 11. Чат (голос/медиа/эмодзи/typing/reply/поиск) | ❌ | Фаза 4 |
| 13–15. Доработки ЛК (Клиент / Бизнес / Платформа) | ⚠️ | Фаза 3 |
| 17.1 Поля БД (birthday, gender, telegram_chat_id, priority_for_user_id, onboarding_status, technology_card_id) | ❌ | Фаза 1 |
| 17.2 Новые таблицы | ❌ | Фаза 1 |

## Фазы

### Фаза 1 — Миграция БД
Одна миграция:
- ALTER `profiles`: `birthday DATE`, `gender TEXT`, `telegram_chat_id TEXT`, `referred_by UUID`.
- ALTER `business_locations`: `priority_for_user_id UUID`, `onboarding_status TEXT DEFAULT 'in_progress'`.
- ALTER `networks`: `onboarding_status TEXT DEFAULT 'in_progress'`.
- ALTER `master_profiles`: `priority_for_user_id UUID`.
- ALTER `services`: `technology_card_id UUID REFERENCES technology_cards(id)`.
- ALTER `bookings`: `payment_status TEXT`, `deposit_amount NUMERIC` (без reminder-флагов).
- ALTER `chat_messages`: `message_type TEXT DEFAULT 'text'`, `audio_url TEXT`, `media_urls TEXT[]`, `reply_to_id UUID`.
- CREATE: `salary_schemes`, `salary_records`, `broadcasts`, `broadcast_deliveries`, `loyalty_programs`, `loyalty_memberships`, `typing_indicators`, `user_report_flags`.
- RLS для всех новых таблиц.
- ENUM `app_role` += `business_admin`.
- Storage bucket `chat-media` (публичный с подписанными URL).

### Фаза 2 — Тарифы 199 / 2 490 / 5 490 ₽
- Миграция: UPDATE `platform_settings` SET value = `{master:199, business:2490, network:5490}`.
- `usePlatformPricing.ts` — defaults 199/2490/5490.
- `TierComparison.tsx`, `SubscriptionManager.tsx` — обновить отображение, скидки 0/5/10/20 % за периоды 1/3/6/12 мес.
- `SubscriptionPaywall.tsx` — обновить упомянутые цифры.
- Лендинги (поиск по `690`, `2490`, `6490`): `Index.tsx`, `ForBusiness.tsx`, `Hero.tsx`, `CTA.tsx`, `About.tsx`, `Offer.tsx` — заменить на актуальные.
- `AdminPromoCodes.tsx` — добавить тип «Триал 45 дней» (флаг `trial_days` в промокоде, при активации ставит `trial_until = now + 45 days`).

### Фаза 3 — Доработки ЛК по ТЗ (разд. 13–15)
**Клиент (разд. 13):**
- `ClientSettingsSection.tsx`: поля `birthday`, `gender`, привязка Telegram (deep-link `t.me/skillspot_bot?start=<token>`, сохранение `telegram_chat_id`).
- Подтянуть `referred_by` в `ClientReferral`.

**Бизнес (разд. 14):**
- `CreateBusinessAccount.tsx`: при создании сохранять `priority_for_user_id` (Сеть — выбор приоритетной точки и мастера) и `onboarding_status='in_progress'`.
- `BusinessSettings.tsx`: показывать прогресс онбординга (`onboarding_status`).
- В `services` добавить связь `technology_card_id` → автозаполнение себестоимости из `TechCards`.

**Платформа (разд. 15):**
- `IntegratorSetup.tsx`: чек-лист онбординга по `onboarding_status`, переключение `in_progress → pending_review → active`.
- `AdminOrganizations.tsx`: фильтр по `onboarding_status`.

### Фаза 4 — Расширенный чат (разд. 11)
- Создать `src/components/chat/EnhancedChat.tsx` (рефактор `SupportChat`).
- `VoiceRecorder.tsx`: MediaRecorder → Storage `chat-media/audio/` → `audio_url`.
- `MediaUploader.tsx`: фото/видео в `media_urls[]`.
- `EmojiPicker.tsx`: пакет `emoji-mart`.
- Reply-to: UI цитаты + поле `reply_to_id`.
- Typing-indicator: Supabase Realtime Presence + таблица `typing_indicators` (TTL 5 сек).
- Поиск по истории: full-text по `chat_messages.text` (ilike).
- Удаление сообщения: своих — для всех, у всех — для owner/admin.
- Применить `EnhancedChat` в `SupportChat.tsx`, `TeachingChats.tsx`, `GroupChatDialog.tsx`.

### Фаза 5 — CRM: рассылки + лояльность (разд. 9)
- `src/components/dashboard/business/BusinessBroadcasts.tsx`:
  - 2 режима: «Своя база» (бесплатно) / «Платформенная база» (7 ₽/клиент, списание из кошелька).
  - Сегментация (новые/постоянные/VIP/спящие), переменные `{{имя}} {{мастер}} {{дата}} {{услуга}}`.
  - Канал: только Push (без SMS).
- `src/components/dashboard/business/BusinessLoyaltyPrograms.tsx`:
  - Типы: cashback / points / discount / subscription.
  - Привязка `loyalty_programs` ↔ `loyalty_memberships`.
- Edge Function `send-broadcast` (только Push через VAPID) + `send-push-notification`.
- В `UniversalClients.tsx` действие «Создать рассылку по сегменту».

### Фаза 6 — ERP: зарплаты (разд. 10)
- `src/components/dashboard/business/BusinessSalaries.tsx`:
  - Таблица сотрудников + активная схема (`salary_schemes`).
  - Создание/редактирование: fixed / percent / mixed / piecework, % с услуги (с/без расходников).
  - Расчёт периода по completed bookings + вычеты из `BusinessPenalties`.
  - История выплат (`salary_records`), экспорт XLSX.
- Доступ только при `tier === 'business' || 'network'` через `canAccessSection('salaries')`.
- Добавить `salaries` в `tierSections.ts` (Pro+).

### Фаза 7 — PWA + виртуализация
- `vite-plugin-pwa` + Workbox: SW (StaleWhileRevalidate API, CacheFirst статика, NetworkFirst критичное), `/offline.html`.
- `npm i @tanstack/react-virtual` — виртуализация в `Catalog.tsx` и `UniversalClients.tsx`.
- Цель: Lighthouse PWA ≥ 90.

### Фаза 8 — Роль `business_admin` и мелочи
- ENUM (Фаза 1) уже добавляет роль.
- `useAuth.tsx`, `RolePermissionsEditor.tsx`, `BusinessRoleHub.tsx` — поддержка `business_admin` (полный RW в одной точке).
- `BusinessInviteForm.tsx` — пункт «Администратор точки» в выборе роли.

## Что НЕ делаем
- ❌ BookingWizard — запись остаётся через popup-Dialog.
- ❌ SMS (`send-sms`, SMSru).
- ❌ Cron-напоминания (`send-booking-reminders`, `send-birthday-greetings`).
- ❌ Telegram Bot для напоминаний (только привязка chat_id для будущего).
- ❌ Drag-and-drop в журнале — текущая логика остаётся.
- ❌ Поля `reminder_sent_24h`/`reminder_sent_1h` в bookings.

## Порядок выполнения
1. Фаза 2 (тарифы) — быстро, исправляет видимое несоответствие.
2. Фаза 1 (миграция БД).
3. Фаза 3 (ЛК по ТЗ).
4. Фаза 6 (зарплаты — закрывает Pro/Network).
5. Фаза 5 (рассылки + лояльность).
6. Фаза 4 (расширенный чат).
7. Фаза 7 (PWA + виртуализация).
8. Фаза 8 (`business_admin` + полировка).

## Технические детали
**Edge Functions (только 2 новые):** `send-push-notification`, `send-broadcast`.
**Новые компоненты:** `BusinessSalaries`, `BusinessBroadcasts`, `BusinessLoyaltyPrograms`, `EnhancedChat`, `VoiceRecorder`, `MediaUploader`, `EmojiPicker`.
**Изменяемые:** `usePlatformPricing`, `TierComparison`, `SubscriptionManager`, `SubscriptionPaywall`, `Index`, `ForBusiness`, `Hero`, `CTA`, `About`, `Offer`, `ClientSettingsSection`, `CreateBusinessAccount`, `BusinessSettings`, `IntegratorSetup`, `AdminOrganizations`, `AdminPromoCodes`, `useAuth`, `RolePermissionsEditor`, `BusinessRoleHub`, `BusinessInviteForm`, `Catalog`, `UniversalClients`, `tierSections`, `vite.config.ts`.
**БД-миграция:** одна, без слома существующих RLS.

