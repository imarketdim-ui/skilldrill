# План 11: YClients-style schedule + client hover insights

## Цель
Превратить расписание мастера и организации в полноценную «шахматку» в стиле YClients:
- Колонки = ресурсы (мастера для бизнеса; дни недели для мастера).
- Строки = временные слоты (15/30/60 мин), фиксированная шкала слева.
- События = абсолютно позиционируемые блоки `top = (start - dayStart)/slot * rowHeight`, `height = duration/slot * rowHeight`.
- Пересечения раскладываются столбцами (interval graph coloring).
- Линия «сейчас» с пульсацией, авто-скролл к текущему часу.
- Клик по пустой ячейке → создание записи; клик по событию → существующий диалог деталей.
- При наведении на запись — `ClientHoverCard` с инсайтами клиента (VIP, no-show, LTV, последние визиты, любимые услуги, заметка CRM).

## Новые файлы
- `src/components/dashboard/schedule/ScheduleGrid.tsx` — сетка времени и колонок, шапка, линия «сейчас», обработка кликов по пустым слотам.
- `src/components/dashboard/schedule/ScheduleEventBlock.tsx` — блок события + интеграция с `ClientHoverCard` и существующими диалогами.
- `src/components/dashboard/schedule/ClientHoverCard.tsx` — карточка инсайтов на базе `@/components/ui/hover-card` (delay 300мс).
- `src/components/dashboard/schedule/scheduleUtils.ts` — нормализация bookings/lessons, расчёт координат, packing пересечений.
- `src/hooks/useClientInsights.ts` — агрегатор: profiles + client_tags (vip/note) + bookings (LTV, no-show, last visit) + favourite services.

## Изменяемые файлы
- `src/components/dashboard/business/BusinessSchedule.tsx` — Day (мастера в колонках) + Week (компактная сводка).
- `src/components/dashboard/universal/UniversalSchedule.tsx` — Day/Week через ScheduleGrid (Month остаётся как есть).
- `.lovable/plan.md` — добавить раздел 11.

## Контракты
- `ScheduleGrid` props: `columns`, `events`, `date`, `slotMinutes`, `dayStartHour`, `dayEndHour`, `onEmptyClick`, `onEventClick`, `renderEvent`.
- `ScheduleEvent` нормализованный: `{id, columnId, start, end, status, title, subtitle, clientId?, raw}`.
- `useClientInsights(clientId)` → `{vip, note, ltv, totalBookings, completed, noShowRate, lastVisit, favouriteServices[]}`.

## БД
Новых миграций не требуется. Используем существующие: `bookings`, `lessons`, `services`, `client_tags`, `profiles`.

## UX/дизайн
Соблюдаем Flat Design + Indigo. Без градиентов и blur. Status colors из существующей палитры BusinessSchedule.

## Проверка
- `bunx tsc --noEmit`.
- Ручная проверка: bizness day view с несколькими мастерами и пересекающимися записями; hover по записи → карточка появляется через ~300мс, исчезает корректно.


## 11. YClients-style schedule + client hover insights (DONE)

- Новые компоненты: ScheduleGrid, ScheduleEventBlock, ClientHoverCard, scheduleUtils.
- Новый хук: useClientInsights (VIP, LTV, no-show, любимые услуги, заметки).
- BusinessSchedule: режим Day = шахматка по мастерам с линией «сейчас», авто-скроллом, packing пересечений.
- UniversalSchedule: hover-карточка клиента подключена в renderCard.

