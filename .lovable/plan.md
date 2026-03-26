

# Plan: Client Notifications, Business Restructuring, Admin Dashboard, and Fixes

## Summary
Multi-area fixes: restore client notifications to sidebar, auto-refresh stats, restructure business dashboard (transfer/manager, commissions, team, subscription), add admin dashboard blocks, improve moderation UI, rename admin tabs.

---

## 1. Client Dashboard — Notifications in Sidebar

**Problem:** Notifications section exists (`case 'notifications'`) but is missing from `desktopMenuItems` and `mobileMenuItems`.

**Fix in `ClientDashboard.tsx`:**
- Add `{ key: 'notifications', label: 'Уведомления', icon: Bell }` to `desktopMenuItems` (after "Общение")
- Remove `bookings` and `favorites` from sidebar menus (keep as clickable blocks in overview)
- Notification click → navigate to correct section based on `n.type` (already implemented in the `notifications` case)

## 2. Client Dashboard — Remove Bookings & Favorites from Sidebar

**Fix:** Remove `bookings` and `favorites` entries from `desktopMenuItems` and `mobileMenuItems`. They remain as active blocks in the overview grid (already clickable cards there).

## 3. Client Stats — Auto-refresh on Entry

**Problem:** `loadScore()` runs on mount + interval, but the `calculate_user_score` RPC is only called manually.

**Fix in `ClientStats.tsx`:**
- Call `recalculate()` automatically on mount (first render), not just `loadScore()`
- Keep manual refresh button as well
- Remove the interval-based `loadScore` (replace with single auto-recalc on mount)

## 4. Client Stats — Active Blocks with Drill-down

**Fix in `ClientStats.tsx`:**
- Make metric cards clickable → set `activeMetric` state
- When a metric is selected, show a detail panel below with breakdown (e.g., clicking "Неявки" shows list of no-show bookings, clicking "VIP" shows which masters added to VIP)
- Add a back button to return to overview

## 5. KYC Verification — "Temporarily Unavailable"

**Fix in `ClientStats.tsx`:**
- For the `kyc_verified` profile item, always show status "Временно недоступна" instead of "Пусто"
- Disable any KYC-related actions

## 6. Business Dashboard — Transfer Management → Profile

**Problem:** "Передать управление" and "Назначить менеджера" buttons in overview don't work.

**Fix:**
- Move both buttons from overview (`case 'overview'`) to `case 'profile'` (BusinessSettings)
- **Transfer ownership:** Add dialog → search user by SkillSpot ID → update `business_locations.owner_id`
- **Assign manager:** Add dialog → search user → insert into `business_managers` table
- Move "Команда" from ERP to profile section
- Move "Подписка" from ERP to profile section

## 7. Business Dashboard — Back Button Fix

**Problem:** Back button in `DashboardLayout` calls `onBackToHub` which resets to business selector.

**Fix in `BusinessDashboard.tsx`:**
- Track navigation history with a `previousSection` state
- When navigating into a sub-section (e.g., CRM → Clients), store the parent section
- Back button returns to parent section, not to business selector

## 8. Business Dashboard — Commissions to ERP

**Fix:** Move `BusinessSettings` commission section to ERP sidebar items. Add `{ key: 'commissions', label: 'Комиссии', icon: DollarSign }` to `erpItems`.

## 9. Business Dashboard — Directories: Positions Add Button

**Problem:** `PositionsDirectory` renders `RolePermissionsEditor` which only shows system roles (master/manager/admin) without an "add" button.

**Fix in `RolePermissionsEditor.tsx`:**
- Add "Добавить должность" button
- New custom roles stored in `business_locations.role_permissions` JSON under custom key
- Each custom role gets same checkbox permission matrix as system roles

## 10. Business Dashboard — Promotions Archive & Templates

**Fix in `BusinessPromotions.tsx`:**
- Add archive tab showing expired/completed promotions
- Add "Типовые акции" section with template promotions (e.g., "Скидка новым клиентам", "Счастливые часы")
- Creating from template pre-fills form fields (discount %, duration, target audience)

## 11. Business Dashboard — Client Chat Button

**Problem:** "Чат" button in BusinessClients is inactive.

**Fix in `BusinessClients` (inside `BusinessDashboard.tsx`):**
- Add a `MessageSquare` button per client row
- On click → `setActiveSection('messages')` and pass the client ID to open chat with that specific contact
- Or navigate to messages section with pre-selected contact

## 12. Admin Dashboard — Add Dashboard Tab with Active Blocks

**Fix in `AdminDashboard.tsx`:**
- Add `dashboard` to `TAB_ACCESS` and `visibleTabs`
- Create dashboard view with stat cards: Pending Moderation, Open Disputes, Unread Support, Role Requests
- Each card clickable → switches to corresponding tab
- Set `dashboard` as default tab

## 13. SuperAdmin — Make All Blocks Active

**Current state:** Dashboard blocks already navigate via `loadDetailView`. Stat cards at top (line 182-186) are NOT clickable.

**Fix:**
- Wrap the 4 top stat cards in clickable elements → navigate to detail views (users list, masters list, businesses list, networks list)

## 14. Admin/SuperAdmin — Moderation: Full Business Card

**Fix in `AdminDashboard.tsx` moderation section:**
- Show complete business info: name, INN, address, director, photos, master count, service count
- Highlight missing items with warning badges: "Нет мастера", "Нет адреса", "Нет фото"
- Consolidate role requests + business creation requests + category requests into single "Модерация" tab as sub-sections

## 15. SuperAdmin — Rename "Администраторы" to "Команда"

**Fix:** Change tab label from "Администраторы" to "Команда". Show all platform-role users (moderator, platform_admin, super_admin, integrator) with role badges.

## 16. Business Creation — Skip Steps Validation

**Problem:** Allows submitting for moderation without adding a master.

**Fix in `CreateBusinessAccount.tsx`:**
- Already partially handled. Enforce that step validation doesn't allow skipping required steps before "Submit to moderation"

---

## Technical Details

### Files to modify:
1. `src/components/dashboard/ClientDashboard.tsx` — sidebar items, remove bookings/favorites from menu, add notifications
2. `src/components/dashboard/client/ClientStats.tsx` — auto-recalc on mount, clickable metric blocks, KYC "unavailable"
3. `src/components/dashboard/BusinessDashboard.tsx` — move transfer/manager to profile, move team+subscription to profile, back button fix, client chat button, commissions to ERP
4. `src/components/dashboard/business/RolePermissionsEditor.tsx` — add custom positions with checkbox permissions
5. `src/components/dashboard/business/BusinessPromotions.tsx` — archive tab, template promotions
6. `src/components/dashboard/AdminDashboard.tsx` — add dashboard tab, enhance moderation card, merge request types into moderation
7. `src/components/dashboard/SuperAdminDashboard.tsx` — clickable top stat cards, rename "Администраторы" → "Команда"

### No database migrations needed — all changes are UI/frontend only.

