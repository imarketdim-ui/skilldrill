# Plan: Site Polishing — Pricing, Routing, Filters, UI Fixes

## Current State vs Requirements — Gap Analysis


| #                    | Issue                                                              | Current                                                                                                                                                  | Fix                                                                                    |
| -------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Pricing**          | &nbsp;                                                             | &nbsp;                                                                                                                                                   | &nbsp;                                                                                 |
| 1                    | Master price                                                       | 900 in Subscription.tsx, ForBusiness.tsx, CreateBusinessAccount.tsx; 650 in UniversalFinances.tsx; 900 in TeachingMasterDashboard/FitnessMasterDashboard | → 690 everywhere                                                                       |
| 2                    | Business price                                                     | "от 2 500" in Subscription/ForBusiness; "3 000" in CreateBusinessAccount; 2490 in BusinessDashboard                                                      | → 2490 everywhere                                                                      |
| 3                    | Network price                                                      | "от 4 500" in Subscription/ForBusiness; "3 000 + 1 200/точка" in CreateBusinessAccount; 6490 in NetworkDashboard                                         | → 6490 everywhere                                                                      |
| **Scroll**           | &nbsp;                                                             | &nbsp;                                                                                                                                                   | &nbsp;                                                                                 |
| 4                    | Dialog content cut off (service create, booking)                   | `DialogContent` has no `max-h` or `overflow-y-auto`                                                                                                      | Add `max-h-[85vh] overflow-y-auto` to all dialog forms                                 |
| 5                    | Page loads at bottom                                               | ScrollToTop exists but `search` dep triggers on URL param changes during filtering                                                                       | Remove `search` from ScrollToTop deps — only scroll on `pathname` change               |
| **Routing**          | &nbsp;                                                             | &nbsp;                                                                                                                                                   | &nbsp;                                                                                 |
| 6                    | Make `/catalog` the landing page                                   | `/` = Index (Hero+PopularServices), `/catalog` = search                                                                                                  | Swap: `/` → Catalog, old Index content → merge into About                              |
| 7                    | Merge Home + About into one "О платформе"                          | Two separate pages                                                                                                                                       | Combine Hero section + PopularServices + About benefits into one `/about` page         |
| 8                    | Move Subscription content into ForBusiness                         | Separate `/subscription` page                                                                                                                            | Add pricing section to ForBusiness, redirect `/subscription` → `/for-business#pricing` |
| **Naming**           | &nbsp;                                                             | &nbsp;                                                                                                                                                   | &nbsp;                                                                                 |
| 9                    | "Каталог услуг" still in Footer                                    | Footer line 6                                                                                                                                            | → "Поиск услуг"                                                                        |
| 10                   | "Маркетплейс" in Hero, Auth, Footer, Offer                         | Multiple files                                                                                                                                           | → "Платформа услуг" or remove                                                          |
| 11                   | "Перейти в каталог" in About, CTA                                  | About line 43, CTA line 47                                                                                                                               | → "Найти услугу"                                                                       |
| 12                   | "В каталоге" badge in NetworkDashboard                             | Line 66                                                                                                                                                  | → "Опубликован"                                                                        |
| 13                   | "каталоге" in CreateBusinessAccount, ProfileCompletionCheck        | Toast messages                                                                                                                                           | → "поиске"                                                                             |
| 14                   | "Каталог" breadcrumb in BusinessDetail                             | Line 114                                                                                                                                                 | → "Поиск услуг"                                                                        |
| **Filters**          | &nbsp;                                                             | &nbsp;                                                                                                                                                   | &nbsp;                                                                                 |
| 15                   | Businesses/services ignore category, price, tag filters            | `filteredBusinesses` only checks `searchQuery`; `filteredServices` doesn't check tags or category                                                        | Apply all filters to all tabs                                                          |
| 16                   | Price filter is slider (inconvenient)                              | Slider component                                                                                                                                         | Replace with two Input fields (min/max)                                                |
| 17                   | Service click → master page, services not clickable                | `onClick={() => navigate('/master/${s.master_id}')`                                                                                                      | Open ServiceDetailDialog instead                                                       |
| 18                   | No location filter                                                 | Not implemented                                                                                                                                          | Add location text input with autocomplete (populated from master addresses)            |
| 19                   | Hashtag limit                                                      | No limit                                                                                                                                                 | Cap at 5 selected                                                                      |
| **Number fields**    | &nbsp;                                                             | &nbsp;                                                                                                                                                   | &nbsp;                                                                                 |
| 20                   | `type="number"` with default 0 that won't delete                   | Price=0, duration=60 as numbers                                                                                                                          | Use string state for numeric inputs, parse on save; empty string = empty field         |
| **Master dashboard** | &nbsp;                                                             | &nbsp;                                                                                                                                                   | &nbsp;                                                                                 |
| 21                   | "Редактировать" goes to client settings                            | Navigates to `/settings` which edits client profile                                                                                                      | Navigate to master profile edit section in dashboard                                   |
| 22                   | Master can be active with 0 services                               | No check                                                                                                                                                 | Add guard: if services.length === 0, disable "Active" toggle with tooltip              |
| 23                   | Hashtag input UX                                                   | Comma-separated text input                                                                                                                               | Add individual input + "Добавить" button, show as removable badges                     |
| **Master creation**  | &nbsp;                                                             | &nbsp;                                                                                                                                                   | &nbsp;                                                                                 |
| 24                   | Address field: can't type manually, map shows random business name | MapPicker doesn't allow manual text override                                                                                                             | Allow manual text input alongside map; make address field editable after map pick      |
| 25                   | No short/full description split                                    | Single `description` field                                                                                                                               | Add `short_description` field (for search cards) and keep `description` (full)         |
| 26                   | Service creation during master creation                            | Exists in form                                                                                                                                           | Remove — will be done in master dashboard                                              |


---

## Implementation Steps

### Step 1: Fix all pricing (8 files)

- `Subscription.tsx`: Master 690, Business "от 2 490", Network "от 6 490"
- `ForBusiness.tsx`: Same prices in plans array
- `CreateBusinessAccount.tsx`: typeCards desc — Master 690, Business 2490, Network 6490
- `UniversalFinances.tsx`: basePrice 650 → 690
- `TeachingMasterDashboard.tsx`: basePrice 900 → 690
- `FitnessMasterDashboard.tsx`: basePrice 900 → 690
- `BusinessDashboard.tsx`: basePrice 2490 (already correct)
- `NetworkDashboard.tsx`: basePrice 6490 (already correct)

### Step 2: Fix ScrollToTop + dialog scroll (2 files + scan all dialogs)

- `ScrollToTop.tsx`: Remove `search` from useEffect deps, only trigger on `pathname`
- `UniversalServices.tsx` DialogContent: add `max-h-[85vh] overflow-y-auto`
- `UniversalSchedule.tsx` all DialogContent: same fix
- Scan all other Dialog usages for same issue

### Step 3: Route restructure (4 files)

- `App.tsx`: `/` → Catalog, `/about` → merged About+Home, `/subscription` renders redirect to `/for-business#pricing`
- `Index.tsx` → delete or repurpose
- `About.tsx` → merge in Hero search box, PopularServices, existing benefits
- `ForBusiness.tsx` → add id="pricing" to pricing section
- `Header.tsx` navLinks: remove "Тарифы" (now in ForBusiness), adjust links
- `Footer.tsx`: "Тарифы" link → `/for-business#pricing`

### Step 4: Global rename remaining "Каталог"/"Маркетплейс" (8+ files)

- Footer.tsx, Hero.tsx, Auth.tsx, CTA.tsx, About.tsx, BusinessDetail.tsx, Offer.tsx, NetworkDashboard.tsx, CreateBusinessAccount.tsx, ProfileCompletionCheck.tsx, AdminDashboard.tsx

### Step 5: Fix search filters (Catalog.tsx)

- Apply category, price range, and tag filters to `filteredBusinesses` and `filteredServices`
- Replace price Slider with two Input fields (от / до)
- Add location text filter (search across master/business addresses)
- Limit tag selection to max 5
- Service card click → open ServiceDetailDialog (not navigate to master)

### Step 6: Fix number input fields (UniversalServices.tsx, UniversalSchedule.tsx, CreateBusinessAccount.tsx)

- Change numeric form fields from `value={form.price}` (number) to string-based state
- Use `value={form.price === 0 ? '' : String(form.price)}` pattern or store as string
- Parse to number only on save
- Add duration unit selector (minutes/hours/days) for service duration

### Step 7: Hashtag UX improvement (UniversalServices.tsx, CreateBusinessAccount.tsx)

- Replace comma-separated input with: text input + "Добавить" button
- Display added tags as removable badges below
- Same pattern in master creation form

### Step 8: Master dashboard fixes

- `UniversalDashboardHome.tsx`: "Редактировать" onClick → switch dashboard section to profile editor (not `/settings`)
- Add service count check: if 0 services, show warning and prevent activation
- `CreateBusinessAccount.tsx`: Make address input editable after map selection; add short_description field; remove service creation step

## Step 9: **Test Listings Completion Requirement**



All test listings must be fully completed and properly structured. Each business profile must include: full address details, business photos, and interior images.

Each service card must contain: a detailed description, relevant images of completed work, and all required service information.

Additionally, every business profile must include a photo of the specialist (master).

Test listings should visually and structurally reflect real, fully operational marketplace entries.

---

## Files to Modify


| File                          | Changes                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `Subscription.tsx`            | Prices → 690/2490/6490; redirect to ForBusiness                                |
| `ForBusiness.tsx`             | Prices → 690/2490/6490; add `id="pricing"`                                     |
| `CreateBusinessAccount.tsx`   | Prices; address UX; remove services step; hashtag UX                           |
| `UniversalFinances.tsx`       | basePrice 650 → 690                                                            |
| `TeachingMasterDashboard.tsx` | basePrice 900 → 690                                                            |
| `FitnessMasterDashboard.tsx`  | basePrice 900 → 690                                                            |
| `ScrollToTop.tsx`             | Remove `search` from deps                                                      |
| `App.tsx`                     | Route restructure: `/` → Catalog                                               |
| `About.tsx`                   | Merge Home content (Hero, PopularServices)                                     |
| `Header.tsx`                  | Remove Тарифы link, adjust nav                                                 |
| `Footer.tsx`                  | Rename "Каталог" → "Поиск услуг", Тарифы → link to for-business#pricing        |
| `Hero.tsx`                    | Remove "Маркетплейс" text                                                      |
| `Auth.tsx`                    | Remove "Маркетплейс"                                                           |
| `CTA.tsx`                     | "Посмотреть каталог" → "Найти услугу"                                          |
| `BusinessDetail.tsx`          | Breadcrumb "Каталог" → "Поиск услуг"                                           |
| `Offer.tsx`                   | Replace "маркетплейсу"                                                         |
| `NetworkDashboard.tsx`        | "В каталоге" → "Опубликован"                                                   |
| `AdminDashboard.tsx`          | "каталоге" → "поиске"                                                          |
| `ProfileCompletionCheck.tsx`  | "каталоге" → "поиске"                                                          |
| `Catalog.tsx`                 | Filter fixes, price inputs, location filter, tag limit, service click → dialog |
| `UniversalServices.tsx`       | Dialog scroll, number fields, hashtag UX                                       |
| `UniversalSchedule.tsx`       | Dialog scroll, number fields                                                   |
| `UniversalDashboardHome.tsx`  | "Редактировать" → master profile edit, service count guard                     |


Total: ~23 files modified. No new dependencies or migrations needed.