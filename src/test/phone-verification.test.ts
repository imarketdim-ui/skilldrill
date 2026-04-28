import { describe, expect, it } from 'vitest';
import { getPhoneVerificationState, normalizeVerificationPhone } from '@/lib/phoneVerification';

describe('phone verification helpers', () => {
  it('normalizes russian local numbers to +7 format', () => {
    expect(normalizeVerificationPhone('8 (999) 123-45-67')).toBe('+79991234567');
    expect(normalizeVerificationPhone('9991234567')).toBe('+79991234567');
  });

  it('marks the phone as verified only when the verified number matches the draft', () => {
    const state = getPhoneVerificationState({
      draftPhone: '+7 (999) 123-45-67',
      verifiedPhone: '+79991234567',
      verifiedAt: '2026-04-28T00:00:00Z',
    });

    expect(state.hasVerifiedPhone).toBe(true);
    expect(state.matchesVerifiedPhone).toBe(true);
    expect(state.needsVerification).toBe(false);
  });

  it('requires sms confirmation for a changed number', () => {
    const state = getPhoneVerificationState({
      draftPhone: '+7 (901) 555-00-00',
      verifiedPhone: '+79991234567',
      verifiedAt: '2026-04-28T00:00:00Z',
    });

    expect(state.hasVerifiedPhone).toBe(true);
    expect(state.matchesVerifiedPhone).toBe(false);
    expect(state.needsVerification).toBe(true);
  });
});
