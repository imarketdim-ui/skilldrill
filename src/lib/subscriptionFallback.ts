export const ACTIVE_BUSINESS_STATUSES = ['trial', 'active', 'in_network'] as const;

export function resolvePreferredBusinessId(
  businessIds: string[],
  preferredId?: string | null,
  fallbackId?: string | null,
) {
  if (preferredId && businessIds.includes(preferredId)) {
    return preferredId;
  }

  if (fallbackId && businessIds.includes(fallbackId)) {
    return fallbackId;
  }

  return businessIds[0] ?? null;
}

export function resolvePreferredMasterProfileId(
  masterProfileIds: string[],
  preferredId?: string | null,
) {
  if (preferredId && masterProfileIds.includes(preferredId)) {
    return preferredId;
  }

  return masterProfileIds[0] ?? null;
}
