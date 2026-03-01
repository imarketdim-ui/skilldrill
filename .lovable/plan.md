

# Plan: Implement All Missing Items from Previous Plans

## Analysis of Unrealized Items

After reviewing all approved plans and the current codebase, the following items were planned but **not implemented**:

| # | Planned Item | Status | Source Plan |
|---|-------------|--------|-------------|
| 1 | **`MasterProfileEditor` component** | Missing — causes build error. Referenced in `UniversalMasterDashboard.tsx` line 177 but never created | Plan 2, Plan 3 |
| 2 | **`type="number"` undeletable-0 fix** | Not done — 8 files still use `type="number"` with `Number(e.target.value)` pattern | Plan 2 |
| 3 | **Hashtag UX in CreateBusinessAccount** | Not done — no hashtag input exists in master creation form | Plan 2 |
| 4 | **Address manual edit in CreateBusinessAccount** | Not done — MapPicker still the only input, no manual text override | Plan 2 |
| 5 | **`short_description` field for masters** | Not done — no column, no field anywhere | Plan 2 |
| 6 | **Remove service creation from master creation** | Already absent — no action needed | Plan 2 |
| 7 | **Clickable services in MasterDetail** | Not done — services render as plain cards, no `ServiceDetailDialog` integration | Plan 3 |
| 8 | **Centralized pricing in `ForBusiness.tsx` and `Subscription.tsx`** | Prices hardcoded as strings `'690'`, `'от 2 490'` — not using `usePlatformPricing()` hook | Plan 3 |
| 9 | **Centralized pricing in `CreateBusinessAccount.tsx`** | Same — hardcoded strings in `typeCards` | Plan 3 |
| 10 | **Map init fix in MasterDetail** | Map container has `style={{ height: 320 }}` but no `setTimeout`/`map.on('load')` guard — may still fail | Plan 3 |
| 11 | **Service count guard for master activation** | Not done — master can go active with 0 services | Plan 2 |
| 12 | **City field in CreateBusinessAccount** | Not done — no `city` input in master/business creation forms | Plan 3 |
| 13 | **Test data completeness (Step 9)** | Partially done — migration ran but needs verification of schedules/breaks | Plan 2 |

---

## Implementation Steps

### Step 1: Create `MasterProfileEditor` component (fixes build error)
- Create `src/components/dashboard/universal/MasterProfileEditor.tsx`
- Loads `master_profiles` data for current user
- Editable fields: description (short + full), address (text input + optional MapPicker), city, hashtags (add button + badges), work_photos, interior_photos, social links
- Save button updates `master_profiles` via Supabase
- Import in `UniversalMasterDashboard.tsx`

### Step 2: Fix `type="number"` undeletable-0 across all files
Files to fix (change `type="number"` to `type="text" inputMode="numeric"` with string state):
- `UniversalExpenses.tsx` (amount field)
- `UniversalSchedule.tsx` (price, max_participants, recurrence_interval)
- `FitnessSchedule.tsx` (price, max_participants)
- `FitnessExpenses.tsx` (amount)
- `TeachingExpenses.tsx` (amount)
- `ProfileCompletionCheck.tsx` (price, duration)

### Step 3: Clickable services in MasterDetail
- Import `ServiceDetailDialog`
- Add `selectedServiceForDetail` state
- Make each service card clickable (onClick opens dialog)
- Keep "Записаться" button functional separately

### Step 4: Centralized pricing via `usePlatformPricing()` hook
- `ForBusiness.tsx`: replace hardcoded `plans` array prices with hook values
- `CreateBusinessAccount.tsx`: replace `typeCards` desc strings with hook values
- Hook already exists and works

### Step 5: Add city + hashtag fields to CreateBusinessAccount
- Master creation: add text input for `city`, hashtag input (text + "Добавить" button + badges)
- Business/Network creation: add text input for `city`
- Save `city` to `master_profiles` / `business_locations` on submit

### Step 6: Address manual edit in CreateBusinessAccount
- Add an editable `Input` for address below MapPicker
- After map pick, populate the Input; user can override text
- Store manually edited text as the address

### Step 7: Map init fix in MasterDetail
- Wrap map initialization in `setTimeout(() => {...}, 100)` after dialog opens
- Add `map.on('load', () => { marker... })` guard

### Step 8: Service count guard for master activation
- In `UniversalDashboardHome.tsx`: fetch service count
- If 0 services, show warning badge and disable/hide "activate" toggle

---

## Files to Create/Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/universal/MasterProfileEditor.tsx` | **Create**: full profile editor component |
| `src/components/dashboard/universal/UniversalMasterDashboard.tsx` | Add import for MasterProfileEditor |
| `src/components/dashboard/universal/UniversalExpenses.tsx` | Fix number inputs |
| `src/components/dashboard/universal/UniversalSchedule.tsx` | Fix number inputs |
| `src/components/dashboard/fitness/FitnessSchedule.tsx` | Fix number inputs |
| `src/components/dashboard/fitness/FitnessExpenses.tsx` | Fix number inputs |
| `src/components/dashboard/teaching/TeachingExpenses.tsx` | Fix number inputs |
| `src/components/dashboard/ProfileCompletionCheck.tsx` | Fix number inputs |
| `src/pages/MasterDetail.tsx` | Clickable services + map init fix |
| `src/pages/ForBusiness.tsx` | Use `usePlatformPricing()` |
| `src/pages/CreateBusinessAccount.tsx` | Use pricing hook; add city, hashtags, address manual edit |
| `src/components/dashboard/universal/UniversalDashboardHome.tsx` | Service count guard |

Total: 1 new file, 11 modified. No new dependencies or migrations.

