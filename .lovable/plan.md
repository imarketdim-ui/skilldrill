

# Plan: Transfer Marketplace, Creation Flow, and Client Rating System

This is a large-scale transfer from two projects (Travel and Skill) into the current SkillSpot project. The work breaks into three independent streams.

---

## Stream 1: Marketplace Redesign (from Travel)

### Current State
The current `Catalog.tsx` uses mock data (`mockCatalog.ts`) with basic search and category cards. No map, no filters, no favorites, no sharing.

### What Will Be Transferred

**1.1. New Catalog/Marketplace Page (`src/pages/Catalog.tsx` — full rewrite)**
Adapting Travel's `Marketplace.tsx` (725 lines) to work with SkillSpot's data model:

- **Search bar** with text search across master names, services, descriptions, hashtags
- **Category filter** tabs (Beauty, Auto, Education, Fitness, etc.) instead of Travel's type filters
- **Region/city filter** (simplified to city since all are in Abakan initially)
- **Expandable filters panel**: price range slider, sort (popular/cheapest/rating/newest), subcategory tags
- **Grid/Map view toggle**: grid view shows service/master cards; map view uses MapLibre GL
- **URL sync**: all filters persist in URL search params
- **Result count** display
- **"Reset filters" button**

Data source: `master_profiles` + `services` + `profiles` tables from Supabase (replacing mock data).

**1.2. Map Component (`src/components/marketplace/CatalogMap.tsx` — new)**
Adapting Travel's `ListingsMap.tsx`:
- MapLibre GL with CartoDB positron tiles (free, no API key)
- Markers for masters/businesses with coordinates
- Popup cards showing name, photo, rating, price, "Open" link
- Auto-fitting bounds to visible results

**1.3. Master/Service Cards (update existing)**
Adapting Travel's card design (clean, no gradients):
- Cover image with hover scale effect
- Category badge top-left, price badge bottom-right
- Rating stars, location, tags as `Badge variant="outline"`
- Remove all gradient overlays, backdrop-blur, glass effects per design system rules

**1.4. Detail Pages (update `MasterDetail.tsx`, `BusinessDetail.tsx`)**
Adapting Travel's `ListingDetail.tsx`:
- **Image gallery** with sidebar thumbnails (3-image grid layout)
- **Favorite button** (heart icon, persisted to `favorites` table — already exists in DB)
- **Share dropdown**: VK, Telegram, WhatsApp, copy link
- **Map dialog**: click on address opens MapLibre map in dialog
- **Reviews section** with star rating widget, photo upload, owner replies
- **Breadcrumbs**: Catalog > Category > Master name
- Sticky booking sidebar on desktop

**1.5. Database Changes**
- Add `latitude`, `longitude` columns to `master_profiles` and `business_locations`
- The `favorites` table already exists with `user_id`, `target_id`, `favorite_type`

### Dependencies
- `maplibre-gl` package needs to be added
- No API keys needed (uses free CartoDB tiles)

---

## Stream 2: Creation Flow Redesign (from Travel)

### What Will Be Transferred

**2.1. MapPicker Component (`src/components/marketplace/MapPicker.tsx` — new)**
Direct transfer of Travel's MapPicker from `MyListings.tsx`:
- Click-to-place marker on map
- Reverse geocoding via Nominatim (free, no API key) for auto-filling address
- Geolocation for initial centering

**2.2. TagDropdown Component (`src/components/marketplace/TagDropdown.tsx` — new)**
Transfer of Travel's preset + custom tag picker:
- Dropdown with preset options (services, amenities, hashtags)
- Custom input with Enter to add
- Tags shown as removable badges

**2.3. PhotoUploader Component (`src/components/marketplace/PhotoUploader.tsx` — new)**
Transfer of Travel's photo uploader:
- Grid of uploaded photos with hover overlay
- "Set as cover" and "Delete" actions
- Drag-and-drop upload area
- File validation (format, size)

**2.4. Update `ProfileCompletionCheck.tsx`**
Replace current inline photo/tag/address inputs with the new components:
- Address field: MapPicker instead of text input
- Photos: PhotoUploader with per-category sections
- Hashtags: TagDropdown with presets
- Services: improved dialog with catalog selection

**2.5. Update `CreateBusinessAccount.tsx`**
Integrate MapPicker for address selection during initial registration.

---

## Stream 3: Client Rating System (from Skill)

### What Will Be Transferred

**3.1. Database: `user_scores` table (migration)**
```sql
CREATE TABLE user_scores (
  user_id UUID PRIMARY KEY REFERENCES profiles(id),
  total_score NUMERIC DEFAULT 0,
  profile_score NUMERIC DEFAULT 0,
  activity_score NUMERIC DEFAULT 0,
  risk_score NUMERIC DEFAULT 0,
  reputation_score NUMERIC DEFAULT 0,
  completed_visits INT DEFAULT 0,
  no_show_count INT DEFAULT 0,
  cancel_under_1h INT DEFAULT 0,
  cancel_under_3h INT DEFAULT 0,
  total_cancellations INT DEFAULT 0,
  disputes_total INT DEFAULT 0,
  disputes_won INT DEFAULT 0,
  disputes_lost INT DEFAULT 0,
  vip_by_count INT DEFAULT 0,
  blacklist_by_count INT DEFAULT 0,
  unique_partners INT DEFAULT 0,
  top_partner_pct NUMERIC DEFAULT 0,
  has_full_name BOOLEAN DEFAULT false,
  has_photo BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'insufficient_data',
  account_age_days INT DEFAULT 0,
  last_calculated_at TIMESTAMPTZ
);
```
RLS: users see their own score; masters see scores of their clients; admins see all.

**3.2. Database: `calculate_user_score` RPC function**
A `SECURITY DEFINER` function that aggregates data from `bookings`, `ratings`, `blacklists`, `disputes`, `profiles` to compute all score fields. Called on-demand or periodically.

**3.3. `UserScoreCard` component (`src/components/dashboard/UserScoreCard.tsx` — new)**
Direct transfer from Skill with minimal changes:
- **Client view**: shows stats only (completed visits, no-shows %, cancellations %, VIP ratings, blacklist count, disputes)
- **Master view**: full score with circular progress indicator, 4 block cards (Profile, Activity, Risk, Reputation), detailed metrics table
- Recalculate button
- Status labels: "Insufficient data", "Active", "Flagged", "Restricted", "Blocked"

**3.4. Integration into dashboards**
- **Client dashboard** (`ClientDashboard.tsx`): add "Your Statistics" section with `UserScoreCard viewMode="client"`
- **Teaching/Fitness/Universal client lists** (`TeachingStudents.tsx`, `FitnessClients.tsx`, `UniversalClients.tsx`): when viewing a client, show `UserScoreCard viewMode="master"` with their score, risk factors, and detailed metrics
- **Master detail pages**: show aggregate client behavior stats

---

## Technical Details

### New Package
- `maplibre-gl` — open-source map library, no API key required

### New Files (7)
1. `src/components/marketplace/CatalogMap.tsx`
2. `src/components/marketplace/MapPicker.tsx`
3. `src/components/marketplace/TagDropdown.tsx`
4. `src/components/marketplace/PhotoUploader.tsx`
5. `src/components/dashboard/UserScoreCard.tsx`
6. Migration: `user_scores` table + `calculate_user_score` function + lat/lng columns
7. Types update: `src/integrations/supabase/types.ts`

### Modified Files (8-10)
1. `src/pages/Catalog.tsx` — full rewrite for real data + filters + map
2. `src/pages/MasterDetail.tsx` — gallery, favorites, sharing, map, reviews
3. `src/pages/BusinessDetail.tsx` — same enhancements
4. `src/components/dashboard/ProfileCompletionCheck.tsx` — use new components
5. `src/pages/CreateBusinessAccount.tsx` — MapPicker for address
6. `src/components/dashboard/ClientDashboard.tsx` — add score card
7. `src/components/dashboard/teaching/TeachingStudents.tsx` — score display
8. `src/components/dashboard/fitness/FitnessClients.tsx` — score display
9. `src/components/dashboard/universal/UniversalClients.tsx` — score display
10. `src/data/mockCatalog.ts` — can be kept as fallback but catalog will use Supabase

### Design Principles Applied
- No gradients, glass, blur, neon per design system
- Solid fills, 8px grid, Indigo #4F46E5 accent
- Clean card layout matching Travel's flat style
- All colors via design tokens (bg-card, text-foreground, etc.)

---

## Implementation Order

1. **Migration** (user_scores + lat/lng columns) — foundation for everything
2. **Reusable components** (MapPicker, TagDropdown, PhotoUploader, UserScoreCard) — independent, parallelizable
3. **Catalog page** — depends on lat/lng columns
4. **Detail pages** — depends on catalog being done
5. **Profile/creation flow** — uses new components
6. **Client score integration** — uses UserScoreCard

