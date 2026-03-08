

# Plan: CRM/ERP Completion and Missing Features

## Analysis of Gaps

After reviewing all dashboard components, database schema, and the plan.md, here are the concrete gaps where CRM and ERP functionality is incomplete or non-functional:

### What was NOT actually done (declared as done but incomplete):

1. **Bonus points system has NO earning logic** -- tables exist, UI exists, but there is NO trigger/function that actually awards points when a booking completes, a review is left, or a referral converts. The system is a shell.

2. **UniversalStats/UniversalPayments/UniversalExpenses use `lessons`/`teaching_*` tables** -- these are teaching-specific tables, not the universal `bookings`/`services` system. For non-teaching categories (beauty, fitness, auto, etc.), stats/payments/expenses show NOTHING.

3. **UniversalClients queries `lesson_bookings`** -- same problem. CRM client list is empty for any master not using the teaching flow.

4. **UniversalDashboardHome queries `lessons`** -- dashboard home metrics are blank for non-teaching masters.

5. **BusinessBookingDetail uses `bookings` table but master dashboard uses `lessons`** -- two parallel booking systems that don't talk to each other.

6. **ClientBookings queries `lesson_bookings`** -- clients who book via the marketplace `bookings` flow see nothing in their bookings tab.

7. **No actual bonus accrual on booking completion** -- neither the `auto-complete-bookings` Edge Function nor any DB trigger credits bonus points.

8. **Admin RBAC for `integrator` role** -- routed to AdminDashboard but has no tab access defined in `TAB_ACCESS`.

---

## Implementation Plan (3 Stages)

### Stage 1: Unify Booking Data Layer (Critical -- everything depends on this)

The core problem: master dashboards read from `lessons`/`lesson_bookings`/`teaching_*` tables while the marketplace writes to `bookings`. All universal components must read from BOTH systems.

**Tasks:**
- **Create `useUnifiedBookings` hook** that queries both `bookings` and `lesson_bookings` and normalizes them to a common shape `{ id, clientId, clientName, date, startTime, endTime, price, status, serviceName, source }`.
- **Refactor `UniversalDashboardHome`** to use unified hook instead of raw `lessons` queries.
- **Refactor `UniversalStats`** to aggregate from both booking sources. Keep existing chart logic but swap data source.
- **Refactor `UniversalClients`** to build client list from both `lesson_bookings.student_id` and `bookings.client_id`.
- **Refactor `UniversalPayments`** to show payments from `teaching_payments` AND income records from `business_finances` (for bookings-based flow).
- **Refactor `UniversalExpenses`** to also query `business_finances` where applicable (master in org).
- **Refactor `ClientBookings`** to query both `lesson_bookings` and `bookings` for the client.

### Stage 2: Activate Bonus Points & Referral Earning Logic

**Tasks:**
- **Create DB trigger `award_bonus_on_booking_complete`** -- when `bookings.status` or `lesson_bookings.status` changes to `completed`, insert a `bonus_transactions` record (type: `earn`, source: `booking_complete`, amount: configurable, e.g. 10 points) and update `bonus_points.balance` + `total_earned`.
- **Create DB trigger `award_bonus_on_review`** -- when a new `reviews` row is inserted, award points (e.g. 5 points).
- **Add bonus spending logic** -- in the booking flow, allow partial payment with bonus points. Add a `bonus_discount` column to `bookings` if needed.
- **Wire referral bonuses** -- when a referred user's first booking completes, award the referrer via `bonus_transactions` (source: `referral`).
- **Add `integrator` to AdminDashboard TAB_ACCESS** -- grant access to relevant tabs (e.g. `support`, `promo_codes`).

### Stage 3: ERP Cross-Module Integrity

**Tasks:**
- **Link TechnologyCards to expense tracking** -- when a booking completes for a service with a tech card, auto-deduct inventory quantities from `inventory_items` and create `inventory_transactions`.
- **Link commission calculation to unified bookings** -- ensure `business_commission_rules` are applied when computing master payouts from `bookings` (not just `business_finances` manual entries).
- **Add master payout summary in UniversalFinances** -- show calculated earnings after commission deduction for masters working in organizations.
- **NetworkDashboard aggregate stats** -- pull combined stats from all child `business_locations` (total revenue, total bookings, total masters) to make the network dashboard functional beyond just listing locations.

---

## Technical Approach

- New file: `src/hooks/useUnifiedBookings.ts` -- shared data normalization hook
- Edit 6 universal components to use the hook
- 2 new DB migration files (bonus triggers, inventory auto-deduct trigger)
- No breaking changes to existing tables -- additive only

