import { isValidPhone } from '@/lib/validation';

export const PENDING_PHONE_VERIFICATION_KEY = 'skillspot_pending_phone_verification';

export const normalizeVerificationPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  if (digits.startsWith('8')) {
    return `+7${digits.slice(1)}`;
  }

  if (digits.startsWith('7')) {
    return `+${digits}`;
  }

  return `+7${digits}`;
};

interface PhoneVerificationParams {
  draftPhone: string;
  verifiedPhone: string | null | undefined;
  verifiedAt?: string | null;
}

export const getPhoneVerificationState = ({
  draftPhone,
  verifiedPhone,
  verifiedAt,
}: PhoneVerificationParams) => {
  const normalizedDraftPhone = normalizeVerificationPhone(draftPhone);
  const normalizedVerifiedPhone = normalizeVerificationPhone(verifiedPhone || '');
  const hasVerifiedPhone = Boolean(verifiedAt && normalizedVerifiedPhone);
  const matchesVerifiedPhone =
    Boolean(normalizedDraftPhone) && normalizedDraftPhone === normalizedVerifiedPhone;
  const needsVerification =
    Boolean(normalizedDraftPhone) && (!hasVerifiedPhone || !matchesVerifiedPhone);

  return {
    normalizedDraftPhone,
    normalizedVerifiedPhone,
    hasVerifiedPhone,
    matchesVerifiedPhone,
    needsVerification,
    isValidDraftPhone: normalizedDraftPhone ? isValidPhone(normalizedDraftPhone) : false,
  };
};
