/**
 * Матрица доступа разделов по тарифам платформы.
 *
 * Источник истины: ТЗ «Личные кабинеты v1.0», разделы 3.3 (Мастер),
 * 3.4 (Про / Бизнес-точка), 3.5 (Сеть).
 *
 * Принципы:
 * - Внутренний ключ тарифа `business` = UI-label «Про».
 * - Soft-gating: разделы недоступного тарифа показываются с замком и ведут
 *   на SubscriptionPaywall с указанием минимально требуемого тарифа.
 * - Мастер может задать адрес работы и фото интерьера в профиле,
 *   но не создаёт `business_locations` и не приглашает сотрудников.
 */

export type SubscriptionTierKey = 'none' | 'master' | 'business' | 'network';

export const TIER_LABELS: Record<SubscriptionTierKey, string> = {
  none: 'Нет подписки',
  master: 'Мастер',
  business: 'Про',
  network: 'Сеть',
};

/** Ранг тарифа: чем выше — тем больше прав. */
export const TIER_RANK: Record<SubscriptionTierKey, number> = {
  none: 0,
  master: 1,
  business: 2,
  network: 3,
};

/** Лимиты по тарифам (создание точек, сотрудников). */
export const TIER_LIMITS: Record<SubscriptionTierKey, {
  locationLimit: number;
  employeeLimit: number;
  canCreateLocation: boolean;
  canInviteEmployees: boolean;
  canSetWorkAddress: boolean;
}> = {
  none: {
    locationLimit: 0,
    employeeLimit: 0,
    canCreateLocation: false,
    canInviteEmployees: false,
    canSetWorkAddress: false,
  },
  master: {
    locationLimit: 0,            // Мастер не создаёт business_location
    employeeLimit: 0,            // Мастер не приглашает сотрудников
    canCreateLocation: false,
    canInviteEmployees: false,
    canSetWorkAddress: true,     // Адрес и фото интерьера через master_profiles
  },
  business: {
    locationLimit: 1,
    employeeLimit: 10,
    canCreateLocation: true,
    canInviteEmployees: true,
    canSetWorkAddress: true,
  },
  network: {
    locationLimit: Infinity,
    employeeLimit: Infinity,
    canCreateLocation: true,
    canInviteEmployees: true,
    canSetWorkAddress: true,
  },
};

/**
 * Минимальный тариф, дающий доступ к разделу.
 * Ключи — стабильные имена разделов в дашбордах (BusinessDashboard / UniversalMasterDashboard).
 */
export const SECTION_MIN_TIER: Record<string, SubscriptionTierKey> = {
  // ── Базовые (доступны всем тарифам, включая Мастер) ──
  home: 'master',
  profile: 'master',
  schedule: 'master',
  clients: 'master',
  services: 'master',
  finances: 'master',
  stats: 'master',
  marketing: 'master',
  promotions: 'master',
  requests: 'master',
  messages: 'master',
  notifications: 'master',
  subscription: 'master',
  settings: 'master',
  achievements: 'master',
  techcards: 'master',
  portfolio: 'master',
  reviews: 'master',
  dir_client_types: 'master',
  dir_stats: 'master',

  // ── Только Про/Сеть ──
  staff: 'business',              // Команда / сотрудники
  employees: 'business',
  cash: 'business',               // Кассы
  cash_registers: 'business',
  inventory: 'business',          // Склад / инвентарь
  procurement: 'business',        // Закупки
  writeoffs: 'business',          // Списания
  certificates: 'business',       // Подарочные сертификаты
  gift_certificates: 'business',
  bonus_programs: 'business',
  product_sales: 'business',
  penalties: 'business',
  booking_settings: 'business',
  work_schedule: 'business',
  employee_groups: 'business',
  notification_settings: 'business',
  permissions: 'business',
  positions: 'business',
  products: 'business',
  business_settings: 'business',
  analytics: 'business',
  promotions_business: 'business',
  salaries: 'business',           // Расчёт зарплат сотрудников
  broadcasts: 'business',         // CRM-рассылки
  loyalty_programs: 'business',   // Программы лояльности

  // ── Только Сеть ──
  locations: 'network',           // Список точек
  network_dashboard: 'network',
  network_marketing: 'network',
  network_finance: 'network',
  network_clients: 'network',
  network_masters: 'network',
};

/** Проверка: даёт ли тариф `tier` доступ к разделу `sectionKey`. */
export function tierAllowsSection(tier: SubscriptionTierKey, sectionKey: string): boolean {
  const required = SECTION_MIN_TIER[sectionKey];
  if (!required) return true; // Раздел не зарегистрирован — по умолчанию доступен
  return TIER_RANK[tier] >= TIER_RANK[required];
}

/** Минимально требуемый тариф для раздела (для отображения в Paywall). */
export function getRequiredTier(sectionKey: string): SubscriptionTierKey {
  return SECTION_MIN_TIER[sectionKey] || 'master';
}

/** Сравнение фич по тарифам — для UI карточек сравнения в SubscriptionManager. */
export interface TierFeature {
  key: string;
  label: string;
  master: boolean | string;
  business: boolean | string;
  network: boolean | string;
}

export const TIER_COMPARISON: TierFeature[] = [
  { key: 'locations', label: 'Бизнес-точки', master: '—', business: '1', network: '∞' },
  { key: 'employees', label: 'Сотрудники', master: '—', business: 'до 10', network: '∞' },
  { key: 'address', label: 'Адрес и фото интерьера', master: true, business: true, network: true },
  { key: 'schedule', label: 'Расписание и записи', master: true, business: true, network: true },
  { key: 'crm', label: 'CRM и клиенты', master: true, business: true, network: true },
  { key: 'finance', label: 'Финансы', master: true, business: true, network: true },
  { key: 'marketing', label: 'Маркетинг и рассылки', master: 'базовый', business: true, network: true },
  { key: 'cash', label: 'Кассы', master: false, business: true, network: true },
  { key: 'inventory', label: 'Склад и инвентарь', master: false, business: true, network: true },
  { key: 'procurement', label: 'Закупки и списания', master: false, business: true, network: true },
  { key: 'gift_certificates', label: 'Подарочные сертификаты', master: false, business: true, network: true },
  { key: 'bonus_programs', label: 'Бонусные программы', master: false, business: true, network: true },
  { key: 'permissions', label: 'Управление правами', master: false, business: true, network: true },
  { key: 'salaries', label: 'Расчёт зарплат', master: false, business: true, network: true },
  { key: 'broadcasts', label: 'CRM-рассылки', master: false, business: true, network: true },
  { key: 'loyalty_programs', label: 'Программы лояльности', master: false, business: true, network: true },
  { key: 'multi_location', label: 'Мульти-точки и агрегация', master: false, business: false, network: true },
  { key: 'cross_marketing', label: 'Сквозной маркетинг сети', master: false, business: false, network: true },
];
