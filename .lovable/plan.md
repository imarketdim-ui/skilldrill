
# Расхождения между ТЗ и текущей реализацией — Статус исправлений

## ✅ Исправлено (Базовые)

| # | Расхождение | Статус |
|---|---|---|
| 1 | Технологические карты услуг | ✅ Таблица `technology_cards` + UI |
| 2 | Групповые чаты | ✅ Таблицы `chat_groups` + `chat_group_members` + UI |
| 3 | Склад и учёт материалов | ✅ `inventory_items` + `inventory_transactions` + UI |
| 4 | Автозамена раскладки и морфология поиска | ✅ `searchUtils.ts` EN↔RU + stemming |
| 5 | Проверка ЧС при приглашении | ✅ `blacklists` в `BusinessMasters.tsx` |
| 6 | Агрегированный рейтинг бизнеса | ✅ `calculate_business_rating()` |
| 7 | Бейджи «Проверено»/«Рекомендуем» | ✅ BadgeCheck + ThumbsUp |
| 8 | Read-only режим без подписки | ✅ |
| 9 | DB constraint на пересечение тайм-слотов | ✅ `check_booking_overlap` |
| 10 | Защита от удаления единственного Owner | ✅ `prevent_sole_owner_deletion` |
| 11 | Валидация ИНН | ✅ `validation.ts` |
| 12 | Маска +7 для телефона | ✅ `PhoneInput` |
| 13 | Система достижений мастера | ✅ `master_achievements` + UI |
| 14 | Edge Function пересчёт рейтинга | ✅ `recalculate-ratings` |

## ✅ Этап 1: Критическая бизнес-логика — ВЫПОЛНЕН

| # | Задача | Статус |
|---|---|---|
| 1.1 | Статус `in_progress` | ✅ |
| 1.2 | Авто-завершение 24ч | ✅ `auto-complete-bookings` |
| 1.3 | Лимит активных записей | ✅ `check_booking_limits` |
| 1.4 | ЛК Клиента — Записи | ✅ `ClientBookings.tsx` |
| 1.5 | ЛК Клиента — Отзывы | ✅ `ClientReviews.tsx` |
| 1.6 | ЛК Клиента — Статистика | ✅ |
| 1.7 | Карточка записи бизнеса | ✅ `BusinessBookingDetail.tsx` |
| 1.8 | Пересечение расписаний | ✅ `check_cross_org_schedule_overlap` |
| 1.9 | Деактивация услуг | ✅ `deactivate_master_services_on_leave` |

## ✅ Этап 2: Поиск, рейтинг и аналитика — ВЫПОЛНЕН

| # | Задача | Статус |
|---|---|---|
| 2.1 | Теневой рейтинг | ✅ `shadow_scores` + `calculate_shadow_score()` |
| 2.2 | Словарь синонимов | ✅ `search_synonyms` + 15 записей |
| 2.3 | Сортировка по удалённости | ✅ Haversine + «Ближайшие» |
| 2.4 | Поиск с синонимами | ✅ `expandWithSynonyms()` + `fuzzyMatch()` |
| 2.5 | LTV клиента | ✅ `UniversalClients.tsx` |
| 2.6 | Графики загрузки/дохода | ✅ `UniversalStats.tsx` |
| 2.7 | Часы работы мастера | ✅ `UniversalStats.tsx` |

## ✅ Этап 3: Маркетинг, роли и интеграции — ВЫПОЛНЕН

| # | Задача | Статус |
|---|---|---|
| 3.1 | UI управления акциями | ✅ `BusinessPromotions.tsx` |
| 3.2 | UI промокодов | ✅ `AdminPromoCodes.tsx` |
| 3.3 | Маркетинговые рассылки | ✅ `BusinessMarketing.tsx` (chat_type: 'marketing') |
| 3.4 | Новые роли: moderator, support, integrator | ✅ ALTER TYPE + RoleSwitcher + Dashboard routing |
| 3.5 | Импорт услуг из каталогов | ✅ `BusinessServiceImport.tsx` |

## ⏳ Требует ручной настройки / Внешние интеграции

| # | Задача | Комментарий |
|---|---|---|
| — | pg_cron для пересчёта рейтинга | Включить pg_cron + pg_net в Supabase Dashboard |
| — | Email-уведомления | Требует интеграции с Resend / SendGrid (Edge Function) |
| — | Telegram-бот уведомления | Требует Telegram Bot Token (Edge Function) |
| — | Push-уведомления | Требует Web Push API + VAPID keys |
| — | Автовывод средств | Требует интеграции с платёжной системой |
| — | Разделённые интерфейсы по подролям | Модератор/Саппорт видят ограниченный AdminDashboard (фильтрация по роли) |
| — | Система лояльности / бонусные баллы | Отдельная таблица + логика начисления |
| — | Документация API/БД | Техническая документация для разработчиков |

## Итого

Все **3 этапа плана реализованы**. Оставшиеся пункты требуют внешних интеграций (API ключи, платёжные системы) или ручной настройки в Supabase Dashboard.
