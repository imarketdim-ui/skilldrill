

# Analysis & Plan: Service Cards in Search + Service Data Completeness

## Current State vs Requirements

### Problem 1: "Услуги" tab in search shows nothing
In `Catalog.tsx` lines 524-526, the "Услуги" tab button exists but there is **no data fetching, no state, no filtering, and no rendering logic** for it. Lines 602-636 only render `masters` or `businesses` — the `services` tab case is completely missing.

### Problem 2: Service card design mismatch
- **PopularServices** (landing page): Uses rich cards with service image, service name, price, duration, location, master avatar+name, rating, and "Записаться" button — sourced from `mockCatalog.ts`
- **Search results (MasterCardItem)**: Shows master avatar, name, bio, min_price — no individual service info
- **MasterDetail services tab**: Plain list cards with name, description, price, duration — no photos
- **Need**: Service cards in search should match the PopularServices card style (image + service name + price + duration + location + master info)

### Problem 3: Service data in DB is incomplete
Real services in DB have: `name`, `price`, `duration_minutes`, `work_photos` (empty arrays), `hashtags` (empty), `description` (mostly null). Missing compared to mock: no individual cover image, no subcategory. The `work_photos` field exists but is empty for all test services.

### Problem 4: Service creation form missing fields
`UniversalServices.tsx` has: name, description, price, duration, hashtags, photos, active toggle. This is actually complete for the DB schema. The mock data has `subcategory` and `image` fields not in DB — but `work_photos[0]` can serve as cover image.

---

## Implementation Plan

### 1. Add services tab data + rendering in Catalog.tsx
- Add `ServiceItem` type with: `id`, `name`, `price`, `duration_minutes`, `description`, `work_photos`, `hashtags`, `master_id`, `master_name`, `master_avatar`, `master_location`, `master_rating`, `category_name`
- Add `fetchServices()` that queries `services` table joined with `master_profiles` + `profiles` + `service_categories`
- Add `filteredServices` memo with search/price/tag filtering
- Add `ServiceCardItem` component matching PopularServices card design:
  - Cover image from `work_photos[0]` (or placeholder)
  - Rating badge overlay
  - Category label
  - Service name as title
  - Duration + location row
  - Master avatar + name row
  - Price + "Записаться" button
- Wire tab rendering: when `tab === "services"`, render `ServiceCardItem` grid
- Click opens `ServiceDetailDialog` or navigates to `/master/:id?service=:serviceId`

### 2. Create ServiceCardItem component
New file `src/components/marketplace/ServiceCardItem.tsx` — styled identically to PopularServices cards but fed from real DB data.

### 3. Update services count in tab button
Show `Услуги (N)` count like masters/businesses tabs.

### 4. Update currentItems/currentCount for services tab
Fix line 325 to include services in count logic.

### 5. Ensure service creation produces cards that look good
The existing `UniversalServices.tsx` form already has all needed fields (name, description, price, duration, hashtags, work_photos). No schema changes needed. The key gap is that test data services have empty `work_photos` — but that's a data issue, not a code issue. The card will show a placeholder when no photo exists.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/marketplace/ServiceCardItem.tsx` | **Create**: Service card matching PopularServices style |
| `src/pages/Catalog.tsx` | **Modify**: Add services fetch, state, filtering, rendering |

No DB migration needed — `services` table already has all required columns.

