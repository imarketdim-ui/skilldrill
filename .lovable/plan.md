
# Восстановление логики тарифов «Мастер / Про / Сеть»

## Принцип

Согласно ТЗ (`TZ_Lichnye_Kabinety_v1.0`, разд. 3.1–3.5):

| Параметр | Мастер | Про | Сеть |
|---|---|---|---|
| Точек | 1 (сам мастер) | 1 | ∞ |
| Сотрудников | 0 | до 10 | ∞ |
| Создание точки | — | 1 | ∞ |
| Приглашения | — | да | ∞ |
| Адрес + фото интерьера | **да** (через профиль мастера) | да | да |
| Инвентарь / Касса / Сертификаты | — | да | да |

**Ключевое:** Мастер указывает адрес и фото интерьера/экстерьера прямо в `master_profiles` (поля `address`, `city`, `latitude`, `longitude`, `work_photos`, `interior_photos` уже существуют — миграция БД НЕ нужна). Мастер НЕ создаёт `business_locations` и НЕ приглашает сотрудников.

## Фаза 1 — Расширение хука и матрица разделов

**`src/hooks/useSubscriptionTier.ts`:**
Добавить поля:
- `tierLabel`: «Мастер» / «Про» / «Сеть» (внутренний ключ `business` остаётся, label меняется на «Про»).
- `locationLimit: 0 | 1 | Infinity` — для Мастера = 0 (не создаёт точку).
- `employeeLimit: 0 | 10 | Infinity`.
- `canCreateLocation: boolean` — Мастер: false.
- `canInviteEmployees: boolean` — Мастер: false.
- `canSetWorkAddress: boolean` — true для всех тарифов (включая Мастер) — адрес и фото интерьера в профиле.
- `canAccessSection(key: string): boolean` — централизованный gating через константу.

**Новый файл `src/lib/tierSections.ts`:** карта разделов по тарифам (по табл. 3.3 / 3.4 / 3.5 ТЗ).

## Фаза 2 — Лимиты создания и приглашений

**`CreateBusinessAccount.tsx`:**
- Тариф «Мастер»: ШАГ 1 показывает 3 карточки (Мастер / Про / Сеть). При выборе «Мастер» → флоу заводит только `master_profiles` (с адресом и фото), без `business_locations`. Шаг 3 (приоритеты) пропускается.
- Тариф «Про»: лимит 1 активной точки (как сейчас).
- Тариф «Сеть»: без лимита, шаг 3 — выбор приоритетного мастера и приоритетной точки.

**`BusinessInviteForm.tsx` + `BusinessMasters.tsx`:**
- Перед отправкой приглашения считать активных сотрудников (`business_masters` + `business_managers` со статусом `accepted/active`). Лимит 10 для тарифа Про, безлимит для Сети.
- Если ≥ 10 → блок с CTA «Перейти на Сеть» (paywall).
- В шапке списка мастеров бейдж «X / 10» или «X / ∞».

## Фаза 3 — Гейтинг разделов в дашбордах

**`BusinessDashboard.tsx`:** меню формируется через `getMenuForTier(tier)` из `tierSections.ts`. Разделы недоступного тарифа показываются с иконкой замка → клик открывает `SubscriptionPaywall` с указанием нужного тарифа. Существующие компоненты не удаляются — только soft-gate.

**`UniversalMasterDashboard.tsx` (тариф Мастер):**
- Меню по разд. 3.3 ТЗ: Главная, Расписание, Клиенты, Финансы, Услуги, Статистика, Маркетинг (базовый), Профиль+КУС, Достижения, Технологии, Портфолио, Общение, Уведомления, Подписка, Настройки.
- Никаких пунктов «Сотрудники», «Касса», «Инвентарь», «Сертификаты», «Закупки» — они зарезервированы для Про/Сети.

**`isReadOnly` (подписка истекла):** заменять кнопки сохранения на `Badge "Истекла подписка"`, оставлять просмотр.

## Фаза 4 — Адрес и фото интерьера для Мастера

**`MasterProfileEditor.tsx`** (уже содержит нужные поля — расширить UX-секцию):
- Секция «Место работы» (выделить визуально):
  - Тип: На дому / Своя студия / Выезд / У клиента (radio).
  - `MapPicker` для адреса (уже подключён).
  - Чекбокс «Показывать точный адрес публично» (если выкл. — показывать только город).
  - `PhotoUploader` для `interior_photos` (до 10 шт.) — отдельная галерея от `work_photos` (примеры работ).
- Подсказка снизу: «Хотите принимать сотрудников и вести кассу? Перейдите на тариф Про» → ссылка на `/subscription`.

**`MasterDetail.tsx` + `Catalog.tsx`:** карточка мастера показывает адрес/город из `master_profiles` (если нет привязки к `business_locations`) и галерею `interior_photos`.

## Фаза 5 — Дашборд «Сеть»

**`NetworkDashboard.tsx`** — восстановить по разд. 3.5:
- Список точек с переходом в полный `BusinessDashboard` каждой.
- Агрегированная аналитика (sum по `network_id`: выручка, клиенты, мастера, записи).
- Сетевые мастера cross-location.
- Полный `RolePermissionsEditor`.
- Единый `BusinessMarketing` для всех точек.
- Кнопка «Добавить точку» → `/create-account?type=business&network=<id>` без лимита.

## Фаза 6 — UI индикаторы

- Бейдж тарифа в Header `BusinessDashboard` / `UniversalMasterDashboard`: «Мастер» / «Про» / «Сеть» + срок до окончания.
- В `SubscriptionManager` — карточки сравнения 3 тарифов с галочками по матрице из `tierSections.ts`.
- В `SubscriptionPaywall` — точное указание раздела и требуемого тарифа.

## Технические детали

**Файлы (без миграции БД):**

Создать:
- `src/lib/tierSections.ts` — константа `TIER_SECTIONS` + `getMenuForTier(tier)`.

Изменить:
- `src/hooks/useSubscriptionTier.ts` — расширить `SubscriptionState`.
- `src/components/dashboard/BusinessDashboard.tsx` — gating меню.
- `src/components/dashboard/NetworkDashboard.tsx` — восстановить разделы 3.5.
- `src/components/dashboard/universal/UniversalMasterDashboard.tsx` — меню по 3.3.
- `src/components/dashboard/universal/MasterProfileEditor.tsx` — секция «Место работы» с подсказкой про Про-тариф.
- `src/components/dashboard/SubscriptionManager.tsx` — карточки сравнения.
- `src/components/dashboard/SubscriptionPaywall.tsx` — указание нужного тарифа.
- `src/components/dashboard/business/BusinessInviteForm.tsx` — лимит 10.
- `src/components/dashboard/business/BusinessMasters.tsx` — бейдж лимита.
- `src/pages/CreateBusinessAccount.tsx` — корректное разделение Мастер / Про / Сеть, шаг 3 только для Сети, paywall для Мастера при попытке создать точку.
- `src/pages/MasterDetail.tsx` — галерея интерьера.
- `src/pages/Catalog.tsx` — fallback на city/address мастера.

**Структура `useSubscriptionTier`:**
```ts
interface SubscriptionState {
  tier: 'none' | 'master' | 'business' | 'network';
  tierLabel: 'Мастер' | 'Про' | 'Сеть' | 'Нет подписки';
  status: 'active' | 'trial' | 'grace' | 'expired';
  locationLimit: number;        // 0 | 1 | Infinity
  employeeLimit: number;        // 0 | 10 | Infinity
  canCreateLocation: boolean;   // master=false
  canInviteEmployees: boolean;  // master=false
  canSetWorkAddress: boolean;   // все тарифы=true
  canAccessSection: (key: string) => boolean;
  isReadOnly: boolean;
  primaryEntityId: string | null;
  refetch: () => void;
}
```

**Принцип безопасности:**
- БД не трогается (поля `address`, `interior_photos` в `master_profiles` уже есть).
- Внутренний ключ tier остаётся `business`, меняется только UI-label на «Про».
- Gating soft (визуальная блокировка + paywall), компоненты не удаляются.
- Каждая фаза — отдельный коммит, проверка TypeScript между фазами.
