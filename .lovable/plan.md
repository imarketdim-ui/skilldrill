

# Plan: Rating System with Integrated Anti-Fraud and Anti-Abuse

## Current State Analysis

The platform already has a solid foundation:
- **`user_scores` table** with all needed columns (total_score, profile_score, activity_score, risk_score, reputation_score, completed_visits, no_show_count, cancel_under_1h, cancel_under_3h, disputes_*, vip_by_count, blacklist_by_count, unique_partners, top_partner_pct, etc.)
- **`calculate_user_score` RPC function** implementing the 4-block model (Profile, Activity, Risk, Reputation) with base score 60
- **`UserScoreCard` component** with master/client view modes
- **`ClientStats` component** with color-coded metric cards
- Supporting tables: `bookings`, `disputes`, `ratings`, `blacklists`, `client_tags`

**What's missing from the spec:**
1. `fraud_flags` table does not exist
2. `profiles` table lacks `kyc_verified` column
3. No anti-fraud logic (concentration check, VIP spike detection, clone detection, cluster filtering)
4. No verification filtering in the scoring function (events between non-verified users still count)
5. No automatic triggers on booking/VIP/blacklist changes
6. Threshold is 10 visits in current code, spec says 20
7. No `restricted` status handling (40-50 range)
8. No automatic moderation actions (blocking bookings for <40 scores)
9. Frontend `ClientStats` uses `isNewUser = account_age_days < 90 && completed_visits < 10` instead of `< 20`
10. `UserScoreCard` master view lacks KYC status display

---

## Implementation Plan

### Phase 1: Database Schema Changes (Migration)

**1.1 Add `kyc_verified` to `profiles`**
```sql
ALTER TABLE profiles ADD COLUMN kyc_verified boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN kyc_verified_at timestamptz;
```

**1.2 Create `fraud_flags` table**
```text
fraud_flags
├── id (uuid PK)
├── user_id (uuid, FK -> profiles)
├── flag_type (text): 'vip_spike' | 'concentration' | 'clone_suspect' | 'cluster' | 'low_score_moderation'
├── description (text)
├── severity (text): 'info' | 'warning' | 'critical'
├── is_resolved (boolean, default false)
├── resolved_by (uuid, nullable)
├── resolved_at (timestamptz, nullable)
├── metadata (jsonb, default '{}')
├── created_at (timestamptz)
```

RLS: admins SELECT/ALL; user SELECT own flags (read-only).

**1.3 Add `is_verified` helper column to `user_scores`**
```sql
ALTER TABLE user_scores ADD COLUMN kyc_verified boolean NOT NULL DEFAULT false;
```

### Phase 2: Rewrite `calculate_user_score` Function

The existing function will be replaced with the full spec logic:

**Profile Block (max +20):**
- FIO + real photo: +5
- KYC verified: +15

**Activity Block (max +15):**
- >=50 completed visits: +5
- >=100 completed visits: +10
- Registration >3 months: +5

**Risk Block (min -80, only when >=20 visits):**
- No-show rate: 0 / -3 / -7 / -15 / -30 (thresholds: 2%, 5%, 10%, 20%)
- Cancel <1h rate: 0 / -3 / -8 / -15 (thresholds: 3%, 7%, 15%)
- Lost disputes rate: -5 / -15 / -30 (thresholds: 10%, 20%)
- Blacklist: -5 per unique, cap -25

**Reputation Block (min -25, max +40):**
- VIP 20-39%: +5, >=40%: +10 (only if top_partner_pct < 70%)
- No disputes: +10; WinRate >90%: +5; LoseRate >90%: -10
- Blacklist penalty: cap -25

**Anti-fraud checks integrated into calculation:**
1. **Verification filter**: Only count bookings/ratings/blacklists between verified users (kyc_verified = true)
2. **Concentration check**: If top_partner_pct >= 70%, VIP and reputation bonuses are suppressed
3. **VIP spike detection**: Count VIP additions in last 7 days; if >30% of total VIP count, insert fraud_flag with type `vip_spike`
4. **Blacklist anti-abuse**: Ignore blacklists from users with score <50; ignore blacklists where blocker has 0 completed visits with blocked user
5. **Cluster detection**: If >70% of interactions are within a closed set of <5 users, those interactions are excluded from reputation

**Status determination:**
- <20 visits OR <90 days: `insufficient_data`
- score <40: `blocked`
- score 40-50: `flagged` (auto-flag for moderation)
- score <=50: `restricted`
- score >50: `active`

### Phase 3: Database Triggers

**3.1 Trigger on `bookings` status change:**
```sql
CREATE TRIGGER trg_recalc_score_on_booking
AFTER UPDATE OF status ON bookings
FOR EACH ROW
WHEN (NEW.status IN ('completed', 'cancelled', 'no_show'))
EXECUTE FUNCTION recalc_user_score_async();
```
The trigger function will call `calculate_user_score(NEW.client_id)`.

**3.2 Trigger on `blacklists` INSERT/DELETE:**
Recalculate score for `blocked_id`.

**3.3 Trigger on `ratings` INSERT (VIP detection):**
Recalculate score for `rated_id`.

**3.4 Trigger on `disputes` status change:**
Recalculate scores for both `initiator_id` and `respondent_id`.

### Phase 4: Frontend Updates

**4.1 Update `ClientStats.tsx`**
- Change threshold from `completed_visits < 10` to `< 20`
- Add "disputes" metric card with color coding
- Add monthly trend mini-chart (sparkline) using existing recharts
- Update tooltip text per spec (soft, non-judgmental language)

**4.2 Update `UserScoreCard.tsx` (Master View)**
- Add KYC verification badge in profile block
- Show `restricted` status (40-50 range) with appropriate styling
- Add tooltip: "Баллы начисляются по внутренним алгоритмам, не являются оценкой личности"
- Show anti-fraud flags count if any exist (for admin visibility)

**4.3 Admin Dashboard: Fraud Flags Panel**
- New component `FraudFlagsPanel.tsx` in admin dashboard
- Lists unresolved fraud flags with user info, flag type, severity
- Admin can resolve flags with comment
- Filter by severity, type, date range

**4.4 Automatic Restrictions UI**
- In booking flow: check client score before allowing booking
- If score <40: show "Бронирование временно недоступно" message
- If score 40-50: require prepayment, disable auto-booking

### Phase 5: Migration with Anti-Fraud Seed Data

Create a migration that:
1. Creates `fraud_flags` table with RLS
2. Adds `kyc_verified` to profiles
3. Replaces `calculate_user_score` function with the full spec version
4. Creates all 4 triggers
5. Creates helper function `check_fraud_indicators(user_id)` that runs anti-fraud checks separately

---

## Technical Details

### Anti-Fraud Implementation in SQL

The `calculate_user_score` function will include inline anti-fraud checks:

```text
-- Verification filter
SELECT COUNT(*) INTO _completed
FROM bookings b
JOIN profiles p_client ON p_client.id = b.client_id
JOIN profiles p_exec ON p_exec.id = b.executor_id
WHERE b.client_id = _user_id
  AND b.status = 'completed'
  AND p_client.kyc_verified = true
  AND p_exec.kyc_verified = true;

-- Concentration check (already exists, will enforce 70% cap)
-- VIP spike: compare last-7-day VIP count to total
-- Blacklist abuse: filter by blocker score >= 50 AND blocker has >=1 completed visit with user
-- Cluster: identify groups of <5 users sharing >70% interactions
```

### Fraud Flag Types

| Type | Trigger | Severity |
|------|---------|----------|
| `vip_spike` | >30% VIP growth in 7 days | warning |
| `concentration` | >70% visits with 1 partner | info |
| `clone_suspect` | Same IP/device for multiple accounts | critical |
| `cluster` | >70% interactions within closed group of <5 | warning |
| `low_score_moderation` | Score drops <=50 | warning |
| `auto_blocked` | Score drops <40 | critical |

### Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/migrations/XXXXXX_rating_antifraud.sql` | Create: fraud_flags table, update profiles, rewrite calculate_user_score, create triggers |
| `src/components/dashboard/client/ClientStats.tsx` | Modify: threshold 20, disputes card, trend chart, updated language |
| `src/components/dashboard/UserScoreCard.tsx` | Modify: KYC badge, restricted status, tooltip, fraud flag indicator |
| `src/components/dashboard/admin/FraudFlagsPanel.tsx` | Create: admin panel for fraud flag management |
| `src/components/dashboard/AdminDashboard.tsx` | Modify: add fraud flags menu item |
| `src/integrations/supabase/types.ts` | Modify: add fraud_flags type, kyc_verified to profiles |

### Estimated Scope
- 1 large migration (schema + function + triggers)
- 4 frontend files modified
- 1 new component created
- No new dependencies needed (recharts already installed for sparklines)

