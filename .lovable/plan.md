

# Plan: Map Clustering, Centralized Pricing, Photo Carousels, and Multiple Fixes

## Issues Identified

| # | Issue | Root Cause | Fix |
|---|-------|-----------|-----|
| **Map** | | | |
| 1 | No clustering when markers overlap | CatalogMap uses individual markers, no clustering logic | Implement MapLibre cluster layer using GeoJSON source with `cluster: true` |
| **Pricing** | | | |
| 2 | Prices hardcoded in ~8 files | Each file has its own price constants | Create `platform_settings` DB table; create shared `usePlatformPricing()` hook; replace all hardcoded prices |
| **Search Cards** | | | |
| 3 | Photos don't scroll in cards | ServiceCardItem/MasterCardItem/BusinessCardItem show single static image | Add Embla carousel to card cover images |
| 4 | Services not clickable in master card detail page | Services listed as plain cards without click handler | Make each service card open ServiceDetailDialog |
| 5 | Address shown in chat sidebar block of MasterDetail | Address `<div>` is inside the chat Card (lines 580-585) | Move address block outside/above the chat card or remove from sidebar |
| 6 | Map doesn't load in MasterDetail address click | Map dialog uses `mapRef` but `requestAnimationFrame` may fire before dialog DOM is ready | Add `map.on('load')` guard + ensure container has explicit height |
| 7 | Organizations only show when "Все" category selected | `filteredBusinesses` logic at line 387-390: when category selected AND `b.category_id` is null, it returns false. Barbershop has no linked masters → no category_id | Also add `category_id` to `business_locations` directly (new column), OR fix filter to match via ANY master's category |
| 8 | City list has junk values (numbers, indices) | `extractCity` regex is too broad — `parts[parts.length-2]` catches postal codes, region names | Add `city` column to `master_profiles` and `business_locations`; populate from addresses; use that for location filter |
| 9 | Booking dialog has no scroll | DialogContent in MasterDetail booking dialog (line 472) missing `max-h-[85vh] overflow-y-auto` | Add scroll classes |
| **Master Dashboard** | | | |
| 10 | "Редактировать профиль" doesn't work | Line 159: dispatches custom event `navigate-dashboard` with detail `'profile'` but UniversalMasterDashboard doesn't listen for this event or have a 'profile' section | Add event listener in UniversalMasterDashboard + add 'profile' section rendering (a profile edit form) |
| **Referrals** | | | |
| 11 | Referral count always 0 | `totalReferrals` counts unique `referred_id` from `referral_earnings`, but no one has earnings yet. Also Auth.tsx doesn't save which referral code was used during signup — no `referred_by` column in profiles | Add `referred_by` to profiles; save ref code during signup; count referrals from profiles table |
| **Client avatar** | | | |
| 12 | Avatar crops badly, no area selector | Direct upload → full image stretched into circle | Out of scope for this iteration (requires a crop library like react-easy-crop). Note in plan. |
| **Business roles** | | | |
| 13 | No master/manager/leader/owner sub-roles inside business dashboard | BusinessDashboard exists but doesn't differentiate internal roles | Complex feature — note for future. Already has `organization_users` + `roles` tables. |

---

## Implementation Steps

### Step 1: DB Migration — `platform_settings` table + `city` column
```sql
CREATE TABLE platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO platform_settings VALUES
  ('pricing', '{"master": 690, "business": 2490, "network": 6490}'),
  ('trial_days', '{"master": 14, "business": 14, "network": 14}');

ALTER TABLE master_profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE business_locations ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE business_locations ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES service_categories(id);

-- Populate city from existing addresses
UPDATE master_profiles SET city = ... extracted from address;
UPDATE business_locations SET city = ... extracted from address;
```

### Step 2: Map Clustering (CatalogMap.tsx)
- Replace individual markers with a GeoJSON source + cluster layers
- Use MapLibre's built-in `cluster: true, clusterMaxZoom: 14, clusterRadius: 50`
- Render cluster circles with count labels
- On cluster click: `map.getSource('items').getClusterExpansionZoom(clusterId)` → zoom in
- Individual markers still show popups on click

### Step 3: Centralized Pricing Hook
- Create `src/hooks/usePlatformPricing.ts` — fetches from `platform_settings` table, caches in React Query
- Replace all hardcoded prices in: `Subscription.tsx`, `ForBusiness.tsx`, `CreateBusinessAccount.tsx`, `UniversalFinances.tsx`, `UniversalMasterDashboard.tsx` (line 156: "650 ₽"), `TeachingMasterDashboard.tsx`, `FitnessMasterDashboard.tsx`

### Step 4: Photo Carousel in Cards
- Update `ServiceCardItem.tsx`: replace single `<img>` with Embla mini-carousel (dot indicators, swipe)
- Update `MasterCardItem.tsx`: if work_photos available, add carousel
- Update `BusinessCardItem.tsx`: carousel for interior/exterior photos
- Use existing `embla-carousel-react` dependency

### Step 5: Clickable Services in MasterDetail
- In `MasterDetail.tsx` services tab (line 456): wrap each service card in a click handler
- On click: open `ServiceDetailDialog` with the service data
- Add state `selectedServiceId` + render `ServiceDetailDialog`

### Step 6: Fix MasterDetail Sidebar
- Move address block (lines 580-585) outside the chat `<Card>` — place it as its own card above
- Fix map dialog: add explicit `style={{ height: 320 }}` to map container + use `setTimeout` after dialog open

### Step 7: Fix Organization Category Filtering
- Add `category_id` column to `business_locations` (migration)
- In `fetchBusinesses`: populate `category_id` from the first linked master's category
- Fix `filteredBusinesses` filter: when category selected, check `b.category_id === categoryFilter` (already there) but don't exclude businesses with null category_id if they have no masters

### Step 8: Fix City Filter
- Use new `city` column from `master_profiles` / `business_locations`
- Update `availableCities` memo to read from `city` field instead of regex parsing
- Update `CreateBusinessAccount.tsx` to include a `city` text input during creation
- Update master profile editing to include `city`

### Step 9: Fix Booking Dialog Scroll
- `MasterDetail.tsx` line 472: `<DialogContent>` → add `className="max-h-[85vh] overflow-y-auto"`

### Step 10: Fix Master Dashboard "Edit Profile"
- In `UniversalMasterDashboard.tsx`: add `useEffect` listener for `navigate-dashboard` custom event → `setActiveSection(e.detail)`
- Add `'profile'` case in `renderContent()` → render a `MasterProfileEditor` component
- Create inline `MasterProfileEditor` that loads `master_profiles` data and allows editing name, description, address, city, hashtags, photos

### Step 11: Fix Referral Counting
- Add `referred_by` column to `profiles` table (migration)
- In `Auth.tsx` signup: read `ref` param, pass as metadata; in `handle_new_user` trigger: save to `profiles.referred_by`
- In `ClientReferral.tsx`: count referrals from `profiles` where `referred_by` matches user's referral code

### Step 12: Avatar Crop (deferred)
- Note: requires `react-easy-crop` or similar library. Will add in a future iteration as it's a significant UX feature requiring a modal crop interface.

### Step 13: Business Internal Roles (deferred)
- The `organization_users` + `roles` + `role_permissions` tables already exist. Implementing role-based views inside BusinessDashboard is a major feature — flagged for next iteration.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/migrations/...` | Create `platform_settings` table; add `city` to master_profiles & business_locations; add `category_id` to business_locations; add `referred_by` to profiles |
| `src/hooks/usePlatformPricing.ts` | **Create**: hook to fetch/cache pricing from DB |
| `src/components/marketplace/CatalogMap.tsx` | Rewrite with GeoJSON cluster source |
| `src/components/marketplace/ServiceCardItem.tsx` | Add photo carousel |
| `src/components/marketplace/MasterCardItem.tsx` | Add photo carousel (optional) |
| `src/components/marketplace/BusinessCardItem.tsx` | Add photo carousel |
| `src/pages/MasterDetail.tsx` | Clickable services → ServiceDetailDialog; fix sidebar address; fix map; fix booking scroll |
| `src/pages/Catalog.tsx` | Fix business category filter; fix city filter using `city` column |
| `src/components/dashboard/universal/UniversalMasterDashboard.tsx` | Add event listener + profile section |
| `src/components/dashboard/universal/UniversalDashboardHome.tsx` | No changes needed (event dispatch already works) |
| `src/pages/Auth.tsx` | Save referral code during signup |
| `src/components/dashboard/client/ClientReferral.tsx` | Count referrals from profiles.referred_by |
| `src/pages/Subscription.tsx` | Use `usePlatformPricing()` |
| `src/pages/ForBusiness.tsx` | Use `usePlatformPricing()` |
| `src/pages/CreateBusinessAccount.tsx` | Use pricing hook; add city field |

Total: ~15 files, 1 migration. Dependencies: none new (Embla already installed).

