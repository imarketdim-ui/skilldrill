import { describe, expect, it } from 'vitest';
import {
  buildSyntheticBreakItems,
  normalizeMasterScheduleSettings,
  serializeMasterScheduleSettings,
} from '@/lib/serviceSchedule';
import { classifyClientSegment } from '@/lib/clientSegmentation';

describe('service schedule helpers', () => {
  it('reads both legacy and current per-day schedule formats', () => {
    const settings = normalizeMasterScheduleSettings(
      [1, 2, 3, 4, 5],
      {
        default: { start: '09:00', end: '18:00' },
        perDay: { '1': { start: '10:00', end: '19:00' } },
        '2': { start: '11:00', end: '20:00' },
        slotDuration: 15,
      },
      { all: [{ start: '13:00', end: '14:00' }] },
    );

    expect(settings.defaultHours.start).toBe('09:00');
    expect(settings.perDayHours['1'].start).toBe('10:00');
    expect(settings.perDayHours['2'].start).toBe('11:00');
    expect(settings.slotDuration).toBe(15);
    expect(settings.breakConfig.all).toHaveLength(1);
  });

  it('serializes schedule settings into both current and rpc-compatible shapes', () => {
    const payload = serializeMasterScheduleSettings(
      {
        workDays: [1, 2, 3],
        defaultHours: { start: '09:00', end: '18:00' },
        perDayHours: { '1': { start: '10:00', end: '19:00' } },
        breakConfig: { all: [{ start: '13:00', end: '14:00' }] },
        slotDuration: 30,
        bufferMinutes: 10,
      },
      true,
    );

    expect(payload.work_hours_config.default.start).toBe('09:00');
    expect((payload.work_hours_config as any).perDay['1'].start).toBe('10:00');
    expect((payload.work_hours_config as any)['1'].start).toBe('10:00');
    expect(payload.break_config.all).toHaveLength(1);
  });

  it('builds synthetic break items only for active work days', () => {
    const breaks = buildSyntheticBreakItems(
      'master-1',
      {
        workDays: [1],
        defaultHours: { start: '09:00', end: '18:00' },
        perDayHours: {},
        breakConfig: { all: [{ start: '13:00', end: '14:00' }] },
        slotDuration: 30,
        bufferMinutes: 0,
      },
      new Date('2026-04-27T00:00:00'),
      new Date('2026-04-28T00:00:00'),
    );

    expect(breaks).toHaveLength(1);
    expect(breaks[0].start_time).toBe('13:00');
  });
});

describe('client segmentation helpers', () => {
  it('marks strong returning clients as trusted', () => {
    expect(classifyClientSegment({
      visitCount: 6,
      completedCount: 6,
      noShowCount: 0,
      lastVisit: new Date().toISOString(),
      revenue: 20000,
      isBlacklisted: false,
      hasVipTag: false,
      score: 72,
      scoreStatus: 'active',
    })).toBe('trusted');
  });

  it('marks risky clients for prepayment or low score', () => {
    expect(classifyClientSegment({
      visitCount: 3,
      completedCount: 2,
      noShowCount: 2,
      lastVisit: new Date().toISOString(),
      revenue: 5000,
      isBlacklisted: false,
      hasVipTag: false,
      score: 42,
      scoreStatus: 'prepayment_required',
    })).toBe('prepayment');
  });

  it('keeps vip clients in vip segment', () => {
    expect(classifyClientSegment({
      visitCount: 10,
      completedCount: 10,
      noShowCount: 0,
      lastVisit: new Date().toISOString(),
      revenue: 60000,
      isBlacklisted: false,
      hasVipTag: true,
      score: 90,
      scoreStatus: 'active',
    })).toBe('vip');
  });
});
