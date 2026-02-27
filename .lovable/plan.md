

# Plan: Polishing & Bug Fixes — Full Audit and Improvements

## Gap Analysis: Current State vs Requirements

| # | Requirement | Current State | Action |
|---|-------------|---------------|--------|
| 1a | Chat: no photo/video/file upload | Buttons exist but do nothing | Implement real file upload via Supabase Storage |
| 1b | Chat: no voice messages/emoji | Not implemented | Add emoji picker; voice recording is complex (defer) |
| 1c | Chat: shows "В сети" incorrectly | Hardcoded `<p className="text-xs text-emerald-600">В сети</p>` line 230 | Remove completely |
| 1d | Chat: Telegram-style statuses (sent/delivered/read) | Only single `✓` for own messages | Add `is_delivered` column to `chat_messages`; show ✓/✓✓/blue ✓✓ |
| 2 | SEO-friendly links for master/service/business | Routes exist (`/master/:id`, `/business/:id`) but no service route | Add `/master/:masterId/service/:serviceId` route; add "copy link" buttons |
| 3 | Notifications: history 1 month, last 10, archive | Shows last 30 flat | Limit display to 10, add "Show archive" expand; admin sees full history |
| 4a | Calendar Day: completed sessions get status choice (attended/no-show + reason), 24h review window | Only ✓/⊘ buttons, no reason selection | Add reason dialog for no-show; add "Leave review" button within 24h |
| 4b | Calendar Week: vertical day list, click → day view | Grid layout, no click-to-day | Redesign week view as vertical list; click navigates to day |
| 4c | Calendar Month: day cells with count, click → day | Currently same grid pattern | Show count badges; click sets day view |
| 5a | Rename "Каталог"/"Маркетплейс" → "Поиск услуг" everywhere | `h1: "Каталог услуг"`, breadcrumbs say "Каталог", menu items | Global rename in Catalog.tsx, Header, ClientDashboard, links |
| 5b | Service card opens full details on click | Services listed inline in MasterDetail, no standalone service card view | Add service detail dialog/page |
| 5c | Popular services card style in search | Landing has PopularServices component | Reuse card style in search results |
| 5d | Map hangs on address click in master/business | Map dialog uses `useEffect` with `mapOpen` dependency — may fire before container mounts | Add `setTimeout` or `requestAnimationFrame` delay for map init |
| 5e | Add "Услуги" tab alongside Мастера/Организации | Only masters/businesses tabs | Add third tab that searches `services` table directly |
| 6a | Client: profile photo upload broken | Settings.tsx line 154: `<Button disabled>` | Enable button, add PhotoUploader for avatar upload to `avatars` bucket |
| 6b | Client: phone 8→+7 auto-replace | No transformation in Settings.tsx | Add `onBlur`/`onChange` handler to normalize phone |
| 6c | Favorites don't show saved items | ClientDashboard favorites section is a static placeholder | Fetch from `favorites` table and display actual items |
| 6d | "Перейти в маркетплейс" text overflows | Full text button in overview card | Replace with icon-only Search button |
| 6e | Reminder settings per booking | Not implemented | Add `reminder_minutes` to profiles + booking override (DB + UI) |
| 7a | Master: social media links | Not in master_profiles | Add `social_links` jsonb column; UI in profile editor |
| 7b | Chat: add to clients / block from chat header | No action buttons on chat contact header | Add "Add to clients" and "Block chat" buttons |
| 7c | Auto-booking settings (who can auto-book) | Not implemented | Add `auto_booking_policy` to master_profiles; check on booking |
| 7d | Booking: confirm/reject/reschedule flow | Bookings created as `confirmed` immediately | Change to `pending`; add confirm/reject/reschedule actions with notifications |
| 7e | "Записать клиента" dialog redesign | Current dialog: title/date/time/type fields | Redesign: client search (list/ID/manual), service+price select, timeslot grid, comment field |
| 7f | Master stats blocks clickable with detail pages | Static stat cards | Make cards clickable with drill-down panels |
| 7g | "Редактировать" button on master home doesn't work | `<Button>Редактировать</Button>` with no onClick | Wire to master profile editor section |
| 7h | Master settings photo upload broken | Same Settings.tsx issue as client | Fix avatar upload (shared fix) |
| 7i | Missing "Уведомления" and "Заявки" tabs in master dashboard | `menuItems` in UniversalMasterDashboard lacks these | Add notification + requests menu items |
| 7j | Client card: status picker (VIP/regular/blacklist etc.) | Only blacklist toggle exists | Add status dropdown in client detail dialog |
| 8 | Org creation: map picker clears form data | Form state likely reset when MapPicker component mounts/unmounts | Preserve form state across map interaction |

---

## Implementation Plan (Prioritized)

### Phase 1: Critical Bug Fixes (6 files)

**1.1 Fix avatar photo upload** — `Settings.tsx`
- Create `avatars` storage bucket (migration)
- Enable camera button, integrate `PhotoUploader` for single avatar
- On upload, update `profiles.avatar_url`
- Add phone 8→+7 auto-normalization on blur

**1.2 Fix map hang** — `MasterDetail.tsx`
- Wrap map initialization in `requestAnimationFrame` to ensure container is rendered
- Guard against null container ref

**1.3 Fix favorites display** — `ClientDashboard.tsx`
- Fetch `favorites` with joined `master_profiles`/`business_locations` data
- Render actual favorite cards instead of placeholder

**1.4 Fix "Редактировать" button** — `UniversalDashboardHome.tsx`
- Wire button to switch active section to profile editor (or navigate to settings)

**1.5 Add missing master dashboard tabs** — `UniversalMasterDashboard.tsx`
- Add "Уведомления" and "Заявки" menu items
- Render notifications list and client requests components

**1.6 Fix org creation form reset** — `CreateOrganization.tsx` / `CreateBusinessAccount.tsx`
- Store form state in ref/parent before map picker opens
- Restore after map closes

### Phase 2: Chat Improvements (2 files + 1 migration)

**2.1 DB Migration:**
- Add `is_delivered` boolean to `chat_messages` (default false)
- Add `attachment_url` text nullable, `attachment_type` text nullable
- Create `avatars` storage bucket if not exists

**2.2 TeachingChats.tsx overhaul:**
- Remove "В сети" indicator entirely
- Implement ✓ (sent) / ✓✓ (delivered) / blue ✓✓ (read) using `is_read` + `is_delivered`
- Enable file/image upload via `PhotoUploader` component integration (attach to message)
- Add emoji picker (simple grid of common emojis)
- Add "Add to clients" and "Block in chat" action buttons in chat header
- Mark messages as delivered when recipient opens chat

### Phase 3: Naming & Navigation (5+ files)

**3.1 Global rename "Каталог"/"Маркетплейс" → "Поиск услуг"**
- `Catalog.tsx`: h1, subtitle, breadcrumbs
- `Header.tsx`: nav link text
- `ClientDashboard.tsx`: all button labels "Перейти в маркетплейс" → icon-only search
- `MasterDetail.tsx`: breadcrumb "Каталог" → "Поиск услуг"
- Quick action card: replace text with `<Search />` icon only

**3.2 Add "Услуги" tab in search** — `Catalog.tsx`
- Add third tab fetching from `services` table with master join
- Display service cards with name, price, duration, master name
- Click opens service detail

**3.3 SEO links**
- Add route `/master/:masterId/service/:serviceId` — shows master page scrolled to service
- Add "Copy link" icon on each service card in `MasterDetail.tsx`
- Add "Copy link" in master header and business detail

### Phase 4: Calendar Redesign (1 file)

**4.1 UniversalSchedule.tsx:**
- **Day view**: After session end time + 24h, show "Оценить" button; completed sessions show status choice dialog (attended/no-show with reason picker)
- **Week view**: Redesign as vertical list of days with summary info; click on day → switch to day view
- **Month view**: Show day cells with booking count badge; click → switch to day view

### Phase 5: Booking Flow Improvements (2 files + 1 migration)

**5.1 DB Migration:**
- Add `social_links` jsonb to `master_profiles`
- Add `auto_booking_policy` text to `master_profiles` (values: 'all', 'clients_only', 'high_rating', 'selected', 'none')
- Add `reminder_minutes` integer to `profiles` (default 60)
- Add `reminder_minutes` integer to `lesson_bookings` (nullable, override)
- Add `reschedule_reason` text to `lesson_bookings`

**5.2 Booking status flow** — `UniversalSchedule.tsx` + `MasterDetail.tsx`
- New bookings from clients → status `pending` (not `confirmed`)
- Master dashboard: show pending bookings with Confirm/Reject/Reschedule actions
- Confirm → sends notification to client
- Reject → reason picker, notification without reason shown to client
- Reschedule → pick new slot, notify client, client confirms/cancels in their bookings
- Auto-booking check: if client meets policy → auto-confirm

**5.3 "Записать клиента" dialog redesign** — `UniversalSchedule.tsx`
- Client selection: dropdown from client list + search by SkillSpot ID + manual name/phone entry
- Service selection with auto-filled price (editable)
- Available timeslots grid (existing logic)
- Comment field (renamed from "Описание")

### Phase 6: Notifications & Client Status (3 files)

**6.1 Notifications:**
- Display last 10 in dashboard, "Показать архив" button loads more
- Archive: older than 1 month hidden by default
- Admin: full history in client card view

**6.2 Client card status picker** — `UniversalClients.tsx`
- Replace simple blacklist toggle with status dropdown (VIP/Regular/New/Sleeping/Inactive/Blacklisted)
- Save via `client_tags` table

**6.3 Master social links** — `UniversalDashboardHome.tsx` or profile editor
- Add social media inputs (Telegram, VK, Instagram, YouTube)
- Display links on master public profile

### Phase 7: Service Detail View (2 files)

**7.1 Service card view** — New component or dialog
- Full service card: photo gallery, description, price, duration, hashtags, reviews
- Accessible from search results and master profile

**7.2 Popular services in search** — `Catalog.tsx`
- Match card design from landing `PopularServices` component

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/migrations/XXXXX_chat_and_booking_improvements.sql` | Create: avatars bucket, add chat_messages columns, add master_profiles columns, add profiles.reminder_minutes |
| `src/pages/Settings.tsx` | Modify: avatar upload, phone normalization |
| `src/components/dashboard/teaching/TeachingChats.tsx` | Major rewrite: statuses, file upload, emoji, remove online indicator, chat actions |
| `src/pages/Catalog.tsx` | Modify: rename, add services tab |
| `src/components/dashboard/ClientDashboard.tsx` | Modify: favorites fetch, icon-only search, overview cards |
| `src/pages/MasterDetail.tsx` | Modify: fix map, copy link buttons, booking flow to pending |
| `src/components/dashboard/universal/UniversalMasterDashboard.tsx` | Modify: add notifications/requests tabs |
| `src/components/dashboard/universal/UniversalSchedule.tsx` | Major: calendar redesign, booking flow, dialog redesign |
| `src/components/dashboard/universal/UniversalDashboardHome.tsx` | Modify: wire edit button, social links |
| `src/components/dashboard/universal/UniversalClients.tsx` | Modify: status picker in client detail |
| `src/components/landing/Header.tsx` | Modify: rename catalog link |
| `src/App.tsx` | Modify: add service detail route |
| `src/pages/CreateBusinessAccount.tsx` | Modify: preserve form on map interaction |

Total: ~1 migration, ~13 files modified/created. No new dependencies needed.

