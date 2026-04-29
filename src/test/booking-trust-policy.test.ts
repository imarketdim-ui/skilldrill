import { describe, expect, it } from 'vitest';
import { defaultBookingTrustPolicy, evaluateBookingGate } from '@/lib/bookingTrustPolicy';

describe('booking trust policy', () => {
  const baseContext = {
    isBlacklisted: false,
    activeBookingsCount: 0,
    hasPriorVisitsWithMaster: true,
    score: 72,
    scoreStatus: 'active',
    masterAutoBookingPolicy: 'known',
  } as const;

  it('sends new clients to manual review by default', () => {
    const decision = evaluateBookingGate({
      ...baseContext,
      hasPriorVisitsWithMaster: false,
      score: 68,
    }, defaultBookingTrustPolicy);

    expect(decision.mode).toBe('manual');
    expect(decision.allowBooking).toBe(false);
    expect(decision.allowManualRequest).toBe(true);
  });

  it('treats insufficient data as a soft state, not as a block', () => {
    const decision = evaluateBookingGate({
      ...baseContext,
      score: 60,
      scoreStatus: 'insufficient_data',
    }, defaultBookingTrustPolicy);

    expect(decision.mode).toBe('manual');
    expect(decision.description.toLowerCase()).toContain('не плохой рейтинг');
  });

  it('requires prepayment for low-score clients before a hard block', () => {
    const decision = evaluateBookingGate({
      ...baseContext,
      score: 45,
      scoreStatus: 'prepayment_required',
    }, defaultBookingTrustPolicy);

    expect(decision.mode).toBe('prepayment');
    expect(decision.allowBooking).toBe(true);
    expect(decision.bookingStatus).toBe('pending');
  });

  it('blocks very low-score clients but still allows manual contact', () => {
    const decision = evaluateBookingGate({
      ...baseContext,
      score: 30,
      scoreStatus: 'blocked',
    }, defaultBookingTrustPolicy);

    expect(decision.mode).toBe('block');
    expect(decision.allowBooking).toBe(false);
    expect(decision.allowManualRequest).toBe(true);
  });

  it('auto-confirms trusted clients above the configured threshold', () => {
    const decision = evaluateBookingGate({
      ...baseContext,
      score: 88,
      masterAutoBookingPolicy: 'none',
    }, defaultBookingTrustPolicy);

    expect(decision.mode).toBe('confirm');
    expect(decision.allowBooking).toBe(true);
    expect(decision.bookingStatus).toBe('confirmed');
  });
});
