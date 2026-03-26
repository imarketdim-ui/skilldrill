

# Plan: Cabinet Isolation, Chat Scoping, Booking Auto-Archive, Admin Tickets, Wallet Rework

## Summary

This plan addresses full cabinet isolation (chats, notifications, balances), booking lifecycle improvements, admin ticket system, SuperAdmin interactive blocks, and wallet UX changes. It also captures unrealized items from the last 5 requests.

---

## Phase 1: Chat Isolation by Cabinet Role

**Problem:** `TeachingChats.tsx` shows ALL direct messages regardless of which cabinet the user is in. Chats from client context bleed into master/business context and vice versa.

**Solution:**
- Add a `cabinetContext` prop to `TeachingChats`: `'client' | 'master' | 'business' | 'platform'`
- In `fetchContacts()`, filter contacts by their roles:
  - **Client cabinet** → only show contacts who are masters, business staff, or platform admins
  - **Master/Business cabinet** → only show clients and platform admins
  - **Platform cabinet** → show clients and business users
- Use `user_roles` table join to determine each contact's role category
- Pass `cabinetContext` from `ClientDashboard` ('client'), `UniversalMasterDashboard` ('master'), `BusinessDashboard` ('business'), `AdminDashboard`/`SuperAdminDashboard` ('platform')
- When sending messages, stamp `cabinet_type_scope` with the sender's current cabinet context

**Files:** `TeachingChats.tsx`, `ClientDashboard.tsx`, `UniversalMasterDashboard.tsx`, `BusinessDashboard.tsx`, `AdminDashboard.tsx`, `SuperAdminDashboard.tsx`

---

## Phase 2: Notification Isolation by Cabinet

**Problem:** `BusinessNotifications` and `MasterNotifications` fetch notifications without strict cabinet filtering, causing cross-cabinet leaks.

**Solution:**
- `BusinessNotifications`: filter by `cabinet_type = 'business'` AND `cabinet_id = selectedBusiness.id` (or null for backward compat)
- `MasterNotifications`: filter by `cabinet_type = 'master'` (already partially done, enforce strictly)
- `ClientDashboard` notifications: already filtered by `cabinet_type = 'client'` — verify
- When inserting notifications from triggers/functions, always set `cabinet_type` and `cabinet_id`

**Files:** `BusinessDashboard.tsx` (BusinessNotifications), `UniversalMasterDashboard.tsx` (MasterNotifications)

---

## Phase 3: Admin — Unread Indicators + Ticket System

**Problem:** Admin doesn't see unread counts for support requests. No ticket lifecycle management.

**Solution:**
- **AdminDashboard**: Add unread badge on "Поддержка" tab by counting unread `chat_messages` where `chat_type = 'support'` and `is_read = false`
- **SuperAdminDashboard**: Same unread indicator on support tab
- **Ticket system (DB migration):**
  - Create `support_tickets` table: `id, user_id, admin_id, subject, status (open/in_progress/resolved/closed), category (support/dispute/general), created_at, resolved_at, chat_message_id`
  - RLS: admins/super_admins can read all; users can read own
- **SupportChat modifications:** When user sends first support message, auto-create a ticket. Admin can close tickets. SuperAdmin sees "Задачи" tab with tickets grouped by admin.
- **Dispute → Ticket:** When a dispute is created, also create a `support_ticket` with category 'dispute'

**Files:** Migration SQL, `SupportChat.tsx`, `AdminDashboard.tsx`, `SuperAdminDashboard.tsx`

---

## Phase 4: SuperAdmin — Interactive Dashboard & Subscription Blocks

**Problem:** Dashboard stats and subscription blocks are static text, not clickable.

**Solution:**
- **Dashboard tab:** Wrap each stat card (Регистрации, Активные, Доход) in clickable cards that navigate to a detail view showing:
  - Регистрации → list of recent users (last 30 days)
  - Активные → users with recent bookings
  - Доход → subscription payment log
- **Subscriptions tab:** Make `BonusSubscriptionPanel` blocks clickable → navigate to filtered lists (active subs, expired subs, masters by plan)
- Implement as sub-views within SuperAdminDashboard using `activeSection` state pattern

**Files:** `SuperAdminDashboard.tsx`, `BonusSubscriptionPanel.tsx`

---

## Phase 5: Client Wallet — Balance Detail Views

**Problem:** Wallet shows "История рублей" / "История баллов" tabs. User wants clickable balance cards that expand to show history.

**Solution:**
- Remove the `<Tabs>` for "История рублей"/"История баллов"
- Make each balance card (Клиентский баланс, Реферальный, Бонусный) clickable
- On click → set `activeBalanceView` state → show history for that specific balance type below the cards
- Each detail view: full transaction list + action buttons (deposit, withdraw, transfer)

**Files:** `ClientWallet.tsx`

---

## Phase 6: Booking Auto-Archive + Status Actions

**Problem:** Completed bookings stay in "Active" tab. No ability to mark as "состоялась"/"не состоялась".

**Solution:**
- **Client `ClientBookings.tsx`:** Change active/archive filter:
  - Active = `status IN (pending, confirmed, in_progress)` AND `scheduled_at + duration + 60min > now()`
  - Archive = everything else (completed, cancelled, no_show, dispute, or time expired)
  - Auto-classify: if `status = 'confirmed'` and `scheduled_at + duration + 60min < now()` → treat as archive, show as "Ожидает подтверждения итога"
- **Status actions for completed/expired bookings:**
  - "Создать спор" → opens dispute dialog (already exists), also creates support ticket
  - "Состоялась" → update status to 'completed' (if not already)
  - "Не состоялась" → dialog with reason select: неявка, отмена мастером, иное (free text). Updates status to 'no_show' or 'cancelled' accordingly
- **Master bookings (`UniversalSchedule` or equivalent):** Same auto-archive logic + same status action buttons

**Files:** `ClientBookings.tsx`, `UniversalSchedule.tsx` (or create `MasterBookings.tsx`)

---

## Phase 7: ERP Restructure — Move Procurement/WriteOffs to Склад

**Problem:** "Закупки" and "Списания" are under ERP root. Should be sub-items of "Склад".

**Solution:**
- In `BusinessDashboard.tsx` and `UniversalMasterDashboard.tsx`:
  - Remove `procurement` and `writeoffs` from `erpItems`
  - Update `BusinessInventory.tsx` to include tabs: "Остатки", "Закупки", "Списания"
  - Render `BusinessProcurement` and `BusinessWriteOffs` as tab content inside `BusinessInventory`

**Files:** `BusinessDashboard.tsx`, `UniversalMasterDashboard.tsx`, `BusinessInventory.tsx`

---

## Phase 8: Unrealized Items from Previous Requests

| Item | Action |
|---|---|
| Photo crop for business/service cards | Add universal crop component (reuse master avatar crop dialog) for all photo uploads in `PhotoUploader.tsx` |
| Requests Archive — search by client/ID/date | Add search/filter inputs to `MasterRequests` and `BusinessBookingDetail` archive tab |
| Geolocation slow determination | Already cached 6h in MapPicker — verify working |
| Client privacy settings (добавление в группы) | `privacy_settings` column may be missing — add migration if needed, wire to `ClientSettingsSection` |
| Telegram field save bug | Verify fix is deployed — check `ClientSettingsSection` |
| Support chat persistence | Ensure messages persist across sessions (already using DB — verify) |

---

## Technical Details

### Database Migration
```sql
-- Support tickets table
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  admin_id uuid REFERENCES auth.users(id),
  subject text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  category text NOT NULL DEFAULT 'support' CHECK (category IN ('support','dispute','general')),
  chat_message_id uuid,
  dispute_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
-- Policies for admin and user access
```

### Estimated File Changes
- **Modified:** ~12 files (dashboards, chats, wallet, bookings, inventory)
- **Created:** 1 migration, possibly 1 new component (TicketManager)
- **No breaking changes** to existing data — all additive

