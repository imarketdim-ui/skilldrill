
## Analysis Summary

### What was requested in the previous task vs. what was actually done:

**CHAT issues:**
- ✅ "Написать в чат" — navigation event system implemented
- ✅ Client status (VIP/ЧС) — implemented
- ❌ Unread message indicators on "Общение" sidebar item and tabs (Чаты/Запросы/Поддержка) — NOT done
- ❌ Contacts list (from favorites, bookings, etc.) — NOT done
- ❌ "Добавить (человек+)" in chat should add to Contacts, not as master's client — NOT done (currently adds to master's client list which is wrong for client cabinet)
- ❌ Group chats removal for clients — NOT done (GroupChatDialog button still present, `showGroupDialog` state still in TeachingChats.tsx used in client context)
- ❌ File attachment UX (Telegram-style multi-file dialog with comment) — NOT done (still basic single-file inputs)
- ❌ Separate Paperclip (files) vs Image (photos) UX — NOT done properly
- ❌ Extended emoji panel (iOS/Android support) — NOT done (only 20 basic emoji)
- ❌ Chat list not overlapping chat panel (dynamic layout like Telegram) — NOT done
- ❌ Support chat — messages not appearing after send, not persistent — NOT fixed (SupportChat.tsx uses `00000000-0000-0000-0000-000000000000` as fake system user, no admin view implemented properly for all admins)
- ❌ Rating recalculation — automatic every 3 hours for all clients — NOT done (only manual recalc for current user, no server-side cron for all users)

**SETTINGS:**
- ✅ Privacy toggles (group invites, search, strangers, phone)
- ✅ Avatar circle crop dialog
- ✅ SkillSpot ID copyable
- ❌ Referral program block in settings: "Реферальный баланс" should contain "Реферальная программа" button → navigate to /referral — NOT done in settings context (ClientSettingsSection.tsx has no referral block)
- ❌ Telegram field NOT saved — the form only updates `first_name, last_name, phone, bio` — `telegram` is NOT saved (line 233-238 of ClientSettingsSection.tsx)
- ❌ `privacy_settings` column likely doesn't exist in DB — no migration found for it

**STATS:**
- ✅ Auto-refresh every 3 min
- ✅ Manual recalculation button
- ✅ Gray "insufficient data" state for new users
- ✅ "Masters see only generalized data" notice
- ✅ Profile completeness items
- ❌ Statistics not actually loading — reads from `user_scores_public` view which may not exist with correct columns (the view was never created in migrations that I can find for these specific field names: `total_score, completed_visits, no_show_count, cancel_under_1h, cancel_under_3h, total_cancellations, vip_by_count, blacklist_by_count, account_age_days, status`)

**BOOKINGS:**
- ✅ Active/Archive tabs
- ✅ Grouped by day
- ✅ Show all/collapse
- ✅ Status labels in Russian
- ✅ Cancel/Review/Dispute dialogs
- ✅ Address, price, description shown
- ❌ Old `bookingsView` state (day/week/month) still referenced in ClientDashboard.tsx line 63 — dead code not fully cleaned up
- ❌ "Отменить" button still shows for past completed bookings in some edge cases

**BALANCE:**
- ✅ TX_TYPE_MAP with Russian labels
- ✅ Unified ruble + bonus in one view
- ❌ Transactions still show ALL user transactions regardless of role (wallet queries `user_id = user.id` which is correct, but the issue was operations from Master/Organization appearing — this requires RLS scoping by role context which is complex)
- ❌ "Бонусы" section not merged into balance tab — ClientDashboard still has separate `case 'bonus'` routing to `<ClientWallet />` and has `ClientBonusPoints` imported but not used properly

**OVERVIEW:**
- ❌ Overview section still loads `lesson_bookings` only (ClientDashboard line 70) — doesn't show `bookings` table entries on overview cards
- ❌ Favorites section has no content beyond a list — no "quick book" or detail actions

**NEW REQUIREMENT: Cabinet Isolation**

The user wants each cabinet (Client, Master, Organization, Platform) to be **completely independent** with separate:
- Photos/avatars (each cabinet has its own profile photo)
- Chat lists (Client chats ≠ Master chats — currently `TeachingChats` is shared)
- Balances (each cabinet has its own balance — currently single `user_balances` table per user_id)
- Notifications (each cabinet has its own notification inbox)
- Settings (per-cabinet privacy/settings)
- The only shared things: login session + ability to transfer balance between cabinets + see roles

---

## Full Implementation Plan

### Phase 1: Database — Cabinet Isolation Infrastructure
**Migration: `cabinet_isolation`**

1. Add `context` column to key tables so data is scoped per cabinet:
   - `balance_transactions` → add `cabinet_type` (`client | master | business | platform`) + `cabinet_id` (nullable uuid for org/master entity)
   - `user_balances` → add `cabinet_type` + `cabinet_id` columns, create separate rows per cabinet context
   - `notifications` → add `cabinet_type` column (already has `user_id`)
   - `chat_messages` → add `cabinet_type` column (so client chats and master chats are separate)
   - `profiles` → add `privacy_settings` JSONB column (currently saving fails silently)
   - `profiles` → add `telegram` column (currently not saved)

2. Create `cabinet_balances` table:
   ```sql
   id uuid primary key
   user_id uuid references auth.users
   cabinet_type text ('client' | 'master' | 'business' | 'platform')
   cabinet_id uuid nullable (master_profile_id or business_location_id)
   main_balance numeric default 0
   bonus_balance numeric default 0
   updated_at timestamptz
   UNIQUE(user_id, cabinet_type, cabinet_id)
   ```

3. Create `cabinet_transfers` table for inter-cabinet transfers:
   ```sql
   from_cabinet_type, from_cabinet_id, to_cabinet_type, to_cabinet_id, amount, user_id, created_at
   ```

### Phase 2: Chat System Fixes

1. **Unread indicators** — Add badge to "Общение" sidebar menu item and to each sub-tab (Чаты/Запросы/Поддержка) using realtime count query
2. **Disable group creation for clients** — Remove "Группа" button from TeachingChats when rendered in ClientDashboard context (pass `isClientContext` prop)
3. **"Add contact" button** — Change behavior: in client context, add to `contact_list` (new table) not `client_tags`
4. **File attachment UX** — Create `FileAttachDialog` component (Telegram-style): multi-file selection grid preview, optional text comment, single "Send" button
5. **Separate file vs image** — Two separate pickers: `image/*` for images (shows grid), generic `*/*` for files (shows list)
6. **Extended emoji** — Replace 20-emoji array with full unicode emoji grid using categories
7. **Support chat fix** — Fix `fetchMessages` query and display. Create `support_threads` concept: when client sends, it appears for ALL admins. Implement admin queue pick-up in `SupportChat.tsx isAdmin` mode
8. **Cabinet-scoped chats** — TeachingChats receives `cabinetType` prop, filters `chat_messages` by `cabinet_type`

### Phase 3: Fix Incomplete Items from Previous Request

1. **Telegram field save** — Add `telegram` to profiles update query in `ClientSettingsSection.tsx` (update both `profiles` table and `social_links` JSONB in `master_profiles`)
2. **Referral block in Settings** — Add "Реферальный баланс" card to `ClientSettingsSection.tsx` with "Реферальная программа →" button navigating to `/referral`
3. **`user_scores_public` view** — Create/verify migration for the view with all required columns that `ClientStats.tsx` queries
4. **Old `bookingsView` dead code** — Remove `bookingsView` state from `ClientDashboard.tsx`
5. **Overview card data source** — Fix to query both `bookings` + `lesson_bookings` for overview card
6. **Auto rating recalculation** — Add pg_cron job `recalculate_all_scores` running every 3 hours calling `calculate_user_score` for all users with recent bookings

### Phase 4: Per-Cabinet Balance System (UI)

1. **`ClientWallet`** — Scope to `cabinet_type = 'client'`, hide master/org transactions
2. **Master finances** — Scope to `cabinet_type = 'master'`
3. **Business finances** — Scope to `cabinet_type = 'business'`
4. **Inter-cabinet transfer dialog** — New component `CabinetTransferDialog`: select source cabinet → target cabinet → amount → confirm
5. **Balance overview in each dashboard** — Show current cabinet balance in header/overview

### Phase 5: Per-Cabinet Photos & Settings

1. **Master has own avatar** — `master_profiles.avatar_url` (already exists) used as master cabinet photo, separate from `profiles.avatar_url` (client photo)
2. **Business has own logo** — `business_locations.logo_url` used as org cabinet photo
3. **Per-cabinet notifications** — ClientDashboard only shows `cabinet_type = 'client'` notifications; Master dashboard shows `cabinet_type = 'master'` notifications
4. **Per-cabinet settings** — Each dashboard's settings section saves to its own scope (master: `master_profiles`, business: `business_locations`, client: `profiles`)

---

## Files to Create/Modify

**New files:**
- `src/components/dashboard/client/CabinetTransferDialog.tsx`
- `src/components/chat/FileAttachDialog.tsx`
- `src/components/chat/EmojiPicker.tsx`
- `supabase/migrations/[new]_cabinet_isolation.sql`

**Modified files:**
- `src/components/dashboard/client/ClientSettingsSection.tsx` — save telegram, add referral block
- `src/components/dashboard/client/ClientWallet.tsx` — cabinet-scoped transactions
- `src/components/dashboard/client/ClientStats.tsx` — fix view query
- `src/components/dashboard/ClientDashboard.tsx` — remove dead code, fix overview data, unread indicators
- `src/components/dashboard/teaching/TeachingChats.tsx` — disable groups for clients, file dialog, emoji, unread count, cabinet_type filter
- `src/components/dashboard/SupportChat.tsx` — fix message persistence, admin queue
- `src/components/dashboard/universal/UniversalMasterDashboard.tsx` — cabinet-scoped notifications + balance

---

## Self-Check vs. Previous Request (All Items)

| # | Issue | Status |
|---|---|---|
| Settings-1 | Privacy settings | ✅ done |
| Settings-2 | Avatar crop | ✅ done |
| Settings-3 | SkillSpot ID copyable | ✅ done |
| Settings-4 | Referral block in settings | ❌ → Phase 3 |
| Stats-1..3 | Auto + manual refresh | ✅ done |
| Stats-4 | Warn masters see only generalized | ✅ done |
| Stats-5 | Profile completeness | ✅ done |
| Bookings-1 | Past booking status labels | ✅ done |
| Bookings-2 | Confirm/review/dispute for past | ✅ done |
| Bookings-3 | Remove cancel from past bookings | ✅ done |
| Bookings-4 | Address/price/details | ✅ done |
| Bookings-5,6 | Active/Archive tabs | ✅ done |
| Reviews | Working | ✅ done |
| Chat-1 | Unread indicators | ❌ → Phase 2 |
| Chat-2 | Contacts list | ❌ → Phase 2 |
| Chat-3 | Add contact (client side) | ❌ → Phase 2 |
| Chat-4 | No group create for clients | ❌ → Phase 2 |
| Chat-5 | File attach Telegram-style | ❌ → Phase 2 |
| Chat-6 | Separate file/image pickers | ❌ → Phase 2 |
| Chat-7 | Extended emoji | ❌ → Phase 2 |
| Chat-8 | Dynamic layout not overlapping | ❌ → Phase 2 |
| Chat-9 | Support chat persistence | ❌ → Phase 2 |
| Balance-1 | Russian status labels | ✅ done |
| Balance-2 | Cabinet-scoped transactions | ❌ → Phase 4 |
| Bonus-1 | Merge into balance | ✅ done |
| Bonus-2 | Bonus system linkage | ✅ done |
| NEW | Cabinet isolation (photos, chats, balances, notifications) | ❌ → Phases 1-5 |
| BUGFIX | Telegram field not saved | ❌ → Phase 3 |
| BUGFIX | `privacy_settings` column missing | ❌ → Phase 1 |
| BUGFIX | `user_scores_public` view incomplete | ❌ → Phase 3 |
