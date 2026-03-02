

# Plan: Remaining Fixes from Previous Plans

## Analysis

After reviewing the last 5 requests and all plans, the business creation form **already has no service creation step** -- it was removed correctly. The user keeps seeing it likely due to caching or confusion with `ProfileCompletionCheck` which has a "add service" dialog for profile completion after creation.

Here's what remains unimplemented:

| # | Item | Status | Fix |
|---|------|--------|-----|
| 1 | `type="number"` inputs still in 3 files | `TeachingSchedule.tsx` (2 inputs), `UniversalSchedule.tsx` (2 inputs), `ClientWallet.tsx` (3 inputs) | Change to `type="text" inputMode="numeric"` |
| 2 | `ProfileCompletionCheck` has a service creation dialog that opens for businesses too | The "add service" checklist item appears when `entityType === 'business'` during onboarding | Remove service creation from ProfileCompletionCheck for business entities (services should only be added in the Business Dashboard) |
| 3 | `short_description` field for masters | Never added -- column missing in DB, no UI field | Add column + field in MasterProfileEditor |
| 4 | Business categories management | Business should be able to add categories from master categories or independently | Add category picker in BusinessSettings |

## Implementation Steps

### Step 1: Remove service creation from ProfileCompletionCheck for businesses
- In `ProfileCompletionCheck.tsx`: when `entityType === 'business'`, remove the "services" completion item from the checklist
- This is what the user sees as "the service field that shouldn't be there during business creation"

### Step 2: Fix remaining `type="number"` inputs
- `TeachingSchedule.tsx` lines 347-349: price + max_participants
- `UniversalSchedule.tsx` lines 723-724: price + max_participants
- `ClientWallet.tsx` lines 139, 167, 196: deposit, withdraw, transfer amounts

### Step 3: Add `short_description` column and field
- Migration: `ALTER TABLE master_profiles ADD COLUMN IF NOT EXISTS short_description TEXT`
- Add field in `MasterProfileEditor.tsx`

### Step 4: Business category management
- In `BusinessSettings.tsx`: add a "Categories" section
- Fetch `service_categories`, allow selecting multiple categories for the business
- Store in a new `business_categories` junction table or use `category_id` array on `business_locations`

## Files to Create/Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/ProfileCompletionCheck.tsx` | Hide service item when entityType is 'business' |
| `src/components/dashboard/teaching/TeachingSchedule.tsx` | Fix number inputs |
| `src/components/dashboard/universal/UniversalSchedule.tsx` | Fix number inputs |
| `src/components/dashboard/client/ClientWallet.tsx` | Fix number inputs |
| `supabase/migrations/...` | Add `short_description` to master_profiles |
| `src/components/dashboard/universal/MasterProfileEditor.tsx` | Add short_description field |
| `src/components/dashboard/business/BusinessSettings.tsx` | Add category management section |

Total: 6 modified files, 1 migration.

