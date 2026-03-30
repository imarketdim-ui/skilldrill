

# Plan: Business Dashboard Feature Additions (19 Items)

## Audit Summary

| # | Feature | Status | Action |
|---|---------|--------|--------|
| 1 | Ручное добавление клиента (телефон, ДР, пол, источник, комментарий) | Partial — dialog exists but says "register first" | Implement full form |
| 2 | Группы клиентов | Missing | Add to Directories + Clients page |
| 3 | Данные по клиенту (визиты, средний чек, маржинальность) | Partial — visitCount, revenue exist | Add avg check, margin |
| 4 | Категории клиентов (постоянные, VIP, спящие, пропавшие, штрафники) | Partial — ClientTypeDirectory exists | Wire categories to clients |
| 5 | Бонусные программы | Missing | New component |
| 6 | Оплата бонусами | Missing | New component |
| 7 | Подарочные сертификаты | Missing | New component |
| 8 | Чаевые | Missing | New section |
| 9 | Штрафы клиентов | Missing | New component |
| 10 | Акции (эффективность) | Partial — promotions exist, no analytics | Add effectiveness tracking |
| 11 | График работы (шахматка) | Partial — UniversalSchedule has workHours config | Add monthly chess-grid editor |
| 12 | Онлайн запись (мин. время, рассылки, оферта) | Missing | Add settings section |
| 13 | Уведомления бизнеса (напоминания, поздравления) | Missing — only manual notifications | Add notification templates |
| 14 | Товары и склад | Exists — BusinessInventory ✓ | Done |
| 15 | Настройки — адрес по частям | Partial — single address field | Split into city/street/house/office |
| 16 | Услуги — перерыв после услуги | Missing | Add break checkbox + duration |
| 17 | Расчет зарплаты (% от услуги, фикс, возвращаемость) | Partial — PayrollSection exists with hardcoded values | Make configurable |
| 18 | Начисление ЗП и взаиморасчеты | Partial — PayrollSection shows accruals | Add period-based scheme switching |
| 19 | Группы сотрудников (стажер, специалист, мастер + премирование) | Missing | New section |

---

## Implementation Plan

### Phase 1: Client Management (Items 1-4, 9)

**1. Full Manual Client Form** (`BusinessDashboard.tsx` — `BusinessClients`)
- Replace placeholder dialog with real form: name, phone, birthday, gender (М/Ж), source (dropdown: Instagram, Авито, Рекомендация, Сайт, Другое + custom input), comment
- Store via `client_tags` with tag `manual_client` and JSON note containing all fields
- No registration required — store as local business contact

**2. Client Groups** (`BusinessDashboard.tsx` + new directory item)
- Add `dir_client_groups` to `directoryItems`
- Component: create/edit/delete groups per business, stored in `business_locations.role_permissions` JSON under `client_groups` key (or new simple table if needed)
- On Clients page: bulk assign clients to groups, filter by group

**3. Client Stats Enhancement** (`BusinessClients`)
- Calculate: avg check (`revenue / visitCount`), visits per month, margin (from tech cards if available)
- Display in client card row

**4. Client Categories Wiring**
- Auto-categorize: VIP (>10 visits + high spend), Постоянные (>5 visits), Спящие (no visit 60+ days), Пропавшие (90+ days), Штрафники (no_show > 2)
- Show category badge on each client card
- Filter dropdown in client list

**9. Client Penalties**
- Add to CRM items: `{ key: 'penalties', label: 'Штрафы' }`
- Settings: penalty amount per no-show, per late cancel, per reschedule
- Display penalty history per client
- Store in `business_finances` with category `penalty`

### Phase 2: Loyalty & Payments (Items 5-8)

**5. Bonus Programs** (new `BusinessBonusPrograms.tsx`)
- Add to CRM items
- Program types: birthday discount, holiday discount, early booking, cashback %, every Nth service free
- Config: program name, type, value, conditions, active dates
- Store in `promotions` table with `discount_type` extended or new `bonus_programs` JSON in `business_locations`

**6. Bonus Payment Settings** (add to BusinessSettings)
- Settings: max % payable by bonuses for services, for products, allow split payment
- Store in `business_locations.role_permissions` JSON under `bonus_settings`

**7. Gift Certificates** (new `BusinessGiftCertificates.tsx`)
- Add to CRM items
- Create certificate: amount, recipient name, validity period, unique code
- Track: issued, redeemed, expired
- Store in new section of `balance_transactions` or `promotions`

**8. Tips** (new section in BusinessFinances)
- Add tips tracking: per booking, manual entry
- Display in PayrollSection as additional income per master
- Store in `business_finances` with category `tips`

### Phase 3: Schedule & Booking (Items 11-13, 16)

**11. Work Schedule Chess-Grid** (enhance `BusinessSchedule.tsx`)
- Monthly view: rows = days, columns = masters
- Click cell to set: working/day-off/custom hours
- Presets: weekdays only, all days, weekends only
- Set working hours per day, break time
- Save per master per month

**12. Online Booking Settings** (new section in BusinessSettings)
- Min booking time before appointment (1h, 2h, 4h, 24h, custom)
- Consent to mailing checkbox (toggle requirement)
- Booking terms/offer text (textarea, displayed to client at booking)
- Store in `business_locations` JSON or dedicated columns

**13. Notification Templates** (new `BusinessNotificationSettings.tsx`)
- Template types: booking reminder (configurable hours before), post-cancel invite, birthday greeting, holiday greetings, reschedule notice, cancel notice, review request
- Enable/disable each, set timing
- Store config in `business_locations.role_permissions` JSON under `notification_templates`

**16. Service Break After** (enhance `BusinessServices.tsx`)
- Add to service form: checkbox "Перерыв после услуги" + duration input (5-60 min)
- Store in `services` table — use `custom_data` JSON field: `{ break_after_minutes: 15 }`
- Display in service card

### Phase 4: Payroll & Staff (Items 17-19, 15)

**17. Configurable Payroll** (enhance `PayrollSection` in `BusinessFinances.tsx`)
- Per-master settings: calculation type (% from service / fixed / mixed)
- Options: include/exclude discount, deduct material cost
- Client retention bonus toggle + %
- Product sales commission %
- Store in `business_masters` — use `commission_percent` + extend with JSON config

**18. Period-Based Schemes** (enhance `PayrollSection`)
- Add period selector (monthly)
- Allow different calculation schemes per period
- History of scheme changes
- Settlement report: accrued vs paid, balance

**19. Employee Groups** (new section in Directories)
- Add `dir_employee_groups` to `directoryItems`
- Groups: Стажер, Специалист, Мастер, Старший мастер (system + custom)
- Per group: level premium % (e.g., +5% for Мастер, +10% for Старший)
- Assign masters to groups
- Integrate with payroll calculation

**15. Address Parts** (enhance `BusinessSettings.tsx`)
- Replace single `address` field with: city (select), street, house, office/apartment
- Compose full address string for storage in `address` field
- Pre-fill city from existing data

### Phase 5: Promotions Analytics (Item 10)

**10. Promotion Effectiveness** (enhance `BusinessPromotions.tsx`)
- Track per promotion: bookings created with promo, revenue from promo bookings, conversion rate
- Display metrics on each promotion card
- Archive tab with historical data (already partially built)

---

## Files to Modify/Create

| File | Changes |
|------|---------|
| `BusinessDashboard.tsx` | Add CRM items (penalties, bonus programs, certificates), directory items (client groups, employee groups), client form enhancement |
| `BusinessServices.tsx` | Add break_after checkbox + duration to form |
| `BusinessSettings.tsx` | Split address fields, add online booking settings section |
| `BusinessFinances.tsx` | Configurable payroll, tips category, period schemes |
| `BusinessPromotions.tsx` | Add effectiveness metrics per promotion |
| `BusinessSchedule.tsx` | Monthly chess-grid schedule editor |
| New: `BusinessBonusPrograms.tsx` | Loyalty program management |
| New: `BusinessGiftCertificates.tsx` | Certificate creation/tracking |
| New: `BusinessNotificationSettings.tsx` | Notification template config |
| New: `BusinessPenalties.tsx` | Client penalty management |

No database migrations required — all new data stored in existing JSON fields (`custom_data`, `role_permissions`) or existing tables (`business_finances`, `promotions`, `client_tags`).

