

# План: оставшиеся доработки + контроль занятости мастеров

## Что сделано (отчёт)

✅ Фаза 1 — миграция БД (поля profiles/bookings/chat_messages, новые таблицы, ENUM `business_admin`, bucket `chat-media`).
✅ Фаза 2 — тарифы 199/2490/5490 ₽.
✅ Фаза 3 (частично) — `ClientSettingsSection`, `CreateBusinessAccount`, `AdminOrganizations`.
✅ Фаза 5 (частично) — `BusinessLoyaltyPrograms.tsx`.
✅ Фаза 6 — `BusinessSalaries.tsx`.
✅ Фаза 4 (частично) — `VoiceRecorder`, `MediaUploader`, `ChatEmojiPicker`, обновлён `SupportChat`.
✅ Фаза 7 (частично) — vite-plugin-pwa.
✅ Фаза 8 — `business_admin` в `useAuth`, `RolePermissionsEditor`, `BusinessInviteForm`.

---

## Что НЕ сделано

### 🆕 Фаза 9 — Контроль занятости мастеров (приоритет)

**Цель:** В поиске выводить только мастеров со свободными слотами на выбранную дату; при записи показывать только реально доступное время с учётом записей, перерывов, выходных, отпусков.

**Backend (RPC-функции в Supabase):**

1. **`get_master_available_slots(_master_id uuid, _date date, _service_duration int)`** — возвращает массив свободных интервалов (`{start, end}[]`) на указанную дату с учётом:
   - рабочих часов мастера на этот день недели (`master_schedules` или `working_hours` JSON в профиле);
   - выходных / отпусков (новая таблица `master_time_off` или флаги в schedule);
   - перерывов (поля `break_start`, `break_end` или `breaks JSONB`);
   - существующих `bookings` со статусами `pending/confirmed/in_progress`;
   - пересекающихся `lessons`;
   - занятости ресурса (если требуется);
   - буфера между записями (`buffer_minutes` из настроек бизнеса).

2. **`has_master_availability_on_date(_master_id uuid, _date date)`** — `boolean`, есть ли у мастера хотя бы один слот на дату с минимальной длительностью (по самой короткой услуге мастера).

3. **`search_masters_with_availability(_filters jsonb, _date_from date, _date_to date)`** — расширение текущей выборки каталога: возвращает только мастеров, у которых `has_master_availability_on_date` = true хотя бы на один день в диапазоне. Опционально — поле `available_dates date[]`.

**Миграция БД (если ещё нет):**
- Таблица `master_time_off` (id, master_id, start_date, end_date, reason, created_at) для отпусков/больничных.
- Поля `break_start`, `break_end` или `breaks JSONB` в `master_profiles`/`master_schedules`, если их нет.
- Поле `buffer_minutes int default 0` в `business_locations` (буфер между записями).

**Фронтенд:**

1. **`Catalog.tsx` (поиск):**
   - Добавить `DateRangePicker` (shadcn `Calendar` с `mode="range"`) — фильтр «Свободно с–по», как в Booking.com / Airbnb.
   - При выбранной дате/диапазоне — RPC `search_masters_with_availability`, скрывать карточки полностью занятых мастеров.
   - Бейдж «Свободно сегодня / завтра / N слотов» на карточке `MasterCardItem` / `BusinessCardItem`.
   - Сортировка по умолчанию: сначала с доступностью на ближайшую дату.

2. **Popup-Dialog записи (запись через popup, как просили — не трогаем структуру):**
   - При выборе даты вызывать `get_master_available_slots(master_id, date, service.duration_minutes)`.
   - Слот-пикер: рендерить ТОЛЬКО возвращённые интервалы (нарезка по `service.duration_minutes` + `buffer_minutes`).
   - Подсветка прошедшего времени — disabled.
   - Если день полностью занят — показывать «Нет свободных слотов» + кнопка «Следующая свободная дата» (вызов `get_next_available_date`).
   - Реалтайм-обновление: подписка на `bookings` channel — при появлении новой записи на ту же дату пересчитывать слоты (исключаем гонки).

3. **`MasterDetail.tsx` / `BusinessDetail.tsx`:**
   - Виджет «Календарь занятости» (месяц): дни без слотов помечены серым, частично занятые — жёлтым, свободные — зелёным.
   - Клик по дню → открывает popup записи с предзаполненной датой.

4. **`UniversalSchedule.tsx` (журнал мастера):**
   - Кнопки «Перерыв» и «Выходной/отпуск» — пишут в `master_time_off` / breaks; сразу попадает в `get_master_available_slots`.

**Изменяемые файлы:**
- `src/pages/Catalog.tsx` — DateRangePicker + фильтр доступности.
- `src/components/marketplace/MasterCardItem.tsx`, `BusinessCardItem.tsx` — бейдж «Свободно».
- `src/pages/MasterDetail.tsx`, `BusinessDetail.tsx` — календарь занятости.
- Текущий popup записи (Dialog в `MasterDetail`/`BusinessDetail`/`ServiceDetailDialog`) — слот-пикер на основе RPC.
- `src/components/dashboard/universal/UniversalSchedule.tsx` — управление перерывами/отпусками.
- `src/lib/searchUtils.ts` — параметры availability в поиске.

**Что НЕ трогаем:** структура popup-Dialog (как просили, без BookingWizard).

---

### Доделать Фазу 3 (ЛК по ТЗ)
- `ClientReferral.tsx` — отображение `referred_by` и приглашённых.
- `BusinessSettings.tsx` — виджет прогресса онбординга (`onboarding_status`).
- `BusinessServices.tsx` — селект `technology_card_id` с автоподстановкой себестоимости.
- `IntegratorSetup.tsx` — чек-лист `in_progress → pending_review → active`.
- `CreateBusinessAccount.tsx` (Сеть) — выбор приоритетной точки/мастера → `priority_for_user_id`.

### Доделать Фазу 4 (чат)
- Typing-indicator через Supabase Realtime Presence + `typing_indicators` (TTL 5 сек).
- Применить расширенный чат к `TeachingChats.tsx`, `GroupChatDialog.tsx` (вынести общую логику в `EnhancedChat.tsx`).

### Доделать Фазу 5 (CRM-рассылки)
- `BusinessBroadcasts.tsx` — UI: «Своя база» (free) / «Платформенная база» (7 ₽/клиент), сегменты, переменные `{{имя}} {{мастер}} {{дата}} {{услуга}}`, канал Push.
- Edge Function `send-push-notification` (Web Push, VAPID).
- Edge Function `send-broadcast` (обходит сегмент, списывает кошелёк, заполняет `broadcast_deliveries`).
- В `UniversalClients.tsx` — кнопка «Создать рассылку по сегменту».

### Доделать Фазу 7 (виртуализация)
- `npm i @tanstack/react-virtual`.
- Виртуализация: `Catalog.tsx`, `UniversalClients.tsx`.
- Оффлайн-страница `/offline.html`, цель Lighthouse PWA ≥ 90.

### Доделать Фазу 8 (business_admin)
- `BusinessRoleHub.tsx` — отображать `business_admin`.
- RLS-миграция: политики `business_locations`, `services`, `bookings`, `business_finances` пропускают `business_admin` в скоупе своей точки.
- `BusinessDashboard.tsx` — для роли `business_admin` показывать тот же набор разделов, что и владельцу.

---

## Технические детали

**Новые RPC (5):** `get_master_available_slots`, `has_master_availability_on_date`, `search_masters_with_availability`, `get_next_available_date`, опц. `get_business_calendar_view`.

**Новые таблицы / поля:** `master_time_off`, поля `breaks JSONB` / `buffer_minutes` если ещё нет.

**Новые Edge Functions:** `send-push-notification`, `send-broadcast`.

**Новые/изменяемые компоненты:** `BusinessBroadcasts`, `EnhancedChat`, дополнительно — `MasterAvailabilityCalendar`, `AvailableSlotPicker` (переиспользуемый внутри текущих Dialog-ов).

**Секреты для push:** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.

**Порядок:**
1. **Фаза 9** — контроль занятости (RPC + DateRangePicker + слот-пикер) — критичный UX.
2. Фаза 5 — рассылки + push.
3. Доделка Фазы 3.
4. Доделка Фазы 4 (typing + чаты).
5. Фаза 7 — виртуализация.
6. Фаза 8 — RLS для `business_admin`.

