

# Plan: Multi-Module Improvements (Support Chat, Booking Flow, Schedule, Dashboards)

This is a large scope covering 7 areas. Below is the grouped implementation plan.

---

## Area 1: Support Chat for All Dashboards

**Goal**: Every dashboard (Client, Master, Business, Network) gets a "Техподдержка" tab. Messages go to all admins + super admin.

**Approach**:
- Create `SupportChat.tsx` component — reuses chat UI from `TeachingChats` but with `chat_type = 'support'`
- On send: insert message with `recipient_id = null` (or a special system UUID), `chat_type = 'support'`
- Admin/SuperAdmin dashboards show a "Support" tab listing all support conversations grouped by user
- Need migration: add index or filter for `chat_type = 'support'` queries

**Files**: New `src/components/dashboard/SupportChat.tsx`, modify `ClientDashboard.tsx`, `UniversalMasterDashboard.tsx`, `BusinessDashboard.tsx`, `NetworkDashboard.tsx`, `AdminDashboard.tsx`, `SuperAdminDashboard.tsx`

---

## Area 2: Timezone — Use Local Time Everywhere

**Approach**: All `new Date().toISOString()` calls already use UTC which Supabase stores. The display side already uses `toLocaleString('ru-RU')` and `date-fns format()` which renders in local timezone. The main fix needed:
- Booking creation in `MasterDetail.tsx`: when constructing `scheduled_at`, use local date+time (already done — `lesson_date` + `start_time` stored separately, not as a UTC timestamp)
- Schedule settings stored in localStorage already use local time
- **No significant changes needed** — current architecture already handles this correctly

---

## Area 3: Booking Flow from Master Card (MasterDetail.tsx)

**Current issues**: Slots show the entire day (06:00-23:00) ignoring work hours, breaks, and days off. No reminder selection. No auto-booking logic. No contact creation on booking.

**Changes to `MasterDetail.tsx`**:

1. **Slot generation**: Fetch master's schedule settings from `master_profiles` (new columns: `work_days`, `work_start`, `work_end`, `break_slots`). Filter by work hours, breaks, existing bookings, AND blocked slots. Disable past dates and non-work days.

2. **Reminder selector**: Add a `<Select>` with options: 15min / 30min / 1h / 3h / 24h / none. Store in `lesson_bookings.reminder_minutes`.

3. **Auto-booking logic**: 
   - Check `master_profiles.auto_booking_policy` (values: `all`, `known`, `high_rated`, `none`)
   - Check if client is blacklisted
   - Check client's score vs master's requirements
   - If auto-approved → status `confirmed`, else → status `pending` with message "Ожидаем подтверждения мастера"

4. **Contact creation**: On booking, auto-insert into `client_tags` for master and create chat contact

5. **Double-click protection**: Disable button during submission (already partially done with `sendingBooking` state, need to add `disabled` guard more strictly)

6. **After booking**: Navigate to `/dashboard` with bookings section on the booked date

**Migration**: Add `work_days int[]`, `work_start time`, `work_end time`, `break_slots jsonb` to `master_profiles`

---

## Area 4: Client Dashboard — Admin Request Accept/Reject Fix

**Issue**: RLS on `admin_assignments` uses `RESTRICTIVE` policy requiring super_admin for write. The assignee can't update their own record.

**Fix**: Update RLS policy on `admin_assignments` to allow assignees to UPDATE their own records (where `assignee_id = auth.uid()`). The current policy has:
```sql
USING: is_super_admin(auth.uid()) OR (assignee_id = auth.uid())
WITH CHECK: is_super_admin(auth.uid())
```
The `WITH CHECK` blocks assignee updates. Need to change to:
```sql
WITH CHECK: is_super_admin(auth.uid()) OR (assignee_id = auth.uid() AND status IN ('accepted', 'rejected'))
```

Also in `ClientRequests.tsx`: the `user_roles` insert for `platform_admin` will fail due to RLS. Need to use a DB function or update RLS on `user_roles` to allow self-insert when accepting an admin assignment.

---

## Area 5: Master Dashboard Fixes

1. **Remove "Новый заказ" button**: In `UniversalDashboardHome.tsx` line 156-158, remove the `<Button>` with `{config.newSessionLabel}`

2. **Photo upload redirect fix**: In `MasterProfileEditor.tsx`, `window.location.reload()` (lines 119, 133) causes full page reload losing dashboard context. Replace with a callback/refetch pattern.

3. **Data loss prevention**: In `MasterProfileEditor.tsx`, the form initializes from `masterProfile` on mount. If user navigates away without saving, data is lost. Add `beforeunload` warning if form is dirty. Also add `useEffect` that re-initializes only on `masterProfile.id` change (not every render).

4. **Schedule settings — Work days, hours, breaks**:
   - Add work day checkboxes (Mon-Sun) to settings dialog in `UniversalSchedule.tsx`
   - Per-day work hours (e.g., Mon 09:00-18:00, Tue 10:00-20:00)
   - Multiple break slots per day (start-end pairs, add/remove)
   - Store in `master_profiles` (DB columns) instead of localStorage
   - Migration: `work_days`, `work_hours_config jsonb`, `break_config jsonb`

---

## Area 6: Business Dashboard — Director/Contact Display + Categories

**Issue**: Director name, email, phone are saved during creation but not shown in the overview tab.

**Check**: Looking at `BusinessDashboard.tsx` lines 117-124 — the overview already shows `director_name`, `contact_email`, `contact_phone`. If they show `—`, the data may not be saving correctly during creation.

**Fix**: Verify `CreateBusinessAccount.tsx` sends `director_name`, `contact_email`, `contact_phone` — it does (line 121). The issue may be the form field names not matching. Need to verify form field `director_name` is populated correctly.

---

## Area 7: SuperAdmin — Bonus Subscription Activation

**Goal**: SuperAdmin can grant temporary bonus subscriptions to any master/business/network.

**Approach**:
- Add dialog in `SuperAdminDashboard.tsx` subscriptions tab
- Search by SkillSpot ID, select entity type, choose duration (7/14/30 days)
- Updates `subscription_status = 'active'`, sets `trial_start_date = now()`, `trial_days = chosen_duration` on the target entity
- Log action in `notifications` table

---

## Area 8: Platform Manager Role (New Dashboard)

**Goal**: New role `platform_manager` with its own dashboard for client relationship management.

**Approach**:
- Migration: Add `platform_manager` to `user_role` enum, create `manager_clients` junction table (`manager_id`, `client_id`, `assigned_by`, `assigned_at`)
- Create `ManagerDashboard.tsx`: shows assigned clients list, their data, support chat history, requests
- Cannot moderate anything — read-only on client data + support communication
- When manager is deactivated: reassign clients to super_admin, create notification for redistribution
- Add to `Dashboard.tsx` role switch and `useAuth` role type

---

## Implementation Priority & File Count

| Priority | Area | New Files | Modified Files | Migration |
|----------|------|-----------|----------------|-----------|
| 1 | Admin request fix (Area 4) | 0 | 1 | 1 (RLS) |
| 2 | Remove "Новый заказ" + photo fix (Area 5.1-2) | 0 | 2 | 0 |
| 3 | Support Chat (Area 1) | 1 | 6 | 0 |
| 4 | Schedule work days/breaks (Area 5.4) | 0 | 1 | 1 |
| 5 | Booking flow (Area 3) | 0 | 1 | 1 |
| 6 | Business director display fix (Area 6) | 0 | 1 | 0 |
| 7 | SuperAdmin bonus subscriptions (Area 7) | 0 | 1 | 0 |
| 8 | Platform Manager role (Area 8) | 1 | 3 | 1 |

**Total**: ~2 new files, ~12 modified files, ~4 migrations

This is too large for a single implementation pass. I recommend splitting into 2-3 batches.

