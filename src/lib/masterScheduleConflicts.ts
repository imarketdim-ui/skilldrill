import { format, parseISO } from 'date-fns';
import { MasterScheduleSettings, timeToMinutes } from './serviceSchedule';

export interface BusinessDaySchedule {
  status: 'work' | 'off' | 'custom';
  start?: string;
  end?: string;
  breakStart?: string;
  breakEnd?: string;
}

interface MinuteInterval {
  start: number;
  end: number;
}

interface StoredBusinessSchedule {
  businessId: string;
  masterId: string;
  month: string;
  schedule: Record<string, BusinessDaySchedule>;
}

export interface ScheduleConflict {
  date: string;
  start: string;
  end: string;
  type: 'solo_vs_business' | 'business_vs_business';
  businessId?: string;
  otherBusinessId?: string;
}

const STORAGE_PREFIX = 'work_schedule_';
const STORAGE_RE = /^work_schedule_(.+?)_(.+?)_(\d{4}-\d{2})$/;

const minutesToTime = (value: number) =>
  `${Math.floor(value / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;

const overlapInterval = (left: MinuteInterval, right: MinuteInterval): MinuteInterval | null => {
  const start = Math.max(left.start, right.start);
  const end = Math.min(left.end, right.end);
  return start < end ? { start, end } : null;
};

const subtractBreak = (base: MinuteInterval, breakInterval: MinuteInterval | null) => {
  if (!breakInterval) return [base];
  const overlap = overlapInterval(base, breakInterval);
  if (!overlap) return [base];
  const result: MinuteInterval[] = [];
  if (base.start < overlap.start) result.push({ start: base.start, end: overlap.start });
  if (overlap.end < base.end) result.push({ start: overlap.end, end: base.end });
  return result;
};

const parseInterval = (start?: string, end?: string): MinuteInterval[] => {
  if (!start || !end) return [];
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes) || endMinutes <= startMinutes) return [];
  return [{ start: startMinutes, end: endMinutes }];
};

const getPersonalIntervalsForDate = (settings: MasterScheduleSettings, date: string) => {
  const day = parseISO(date).getDay();
  if (settings.workDays.length > 0 && !settings.workDays.includes(day)) return [];
  const dayKey = String(day);
  const hours = settings.perDayHours[dayKey] || settings.defaultHours;
  const base = parseInterval(hours.start, hours.end);
  if (base.length === 0) return [];
  const breakEntries = settings.breakConfig[dayKey] || settings.breakConfig.all || [];
  return breakEntries.reduce<MinuteInterval[]>(
    (intervals, entry) =>
      intervals.flatMap(interval =>
        subtractBreak(
          interval,
          parseInterval(entry.start, entry.end)[0] || null,
        ),
      ),
    base,
  );
};

const getBusinessIntervalsForDay = (daySchedule?: BusinessDaySchedule) => {
  if (!daySchedule || daySchedule.status === 'off') return [];
  const base = parseInterval(daySchedule.start, daySchedule.end);
  if (base.length === 0) return [];
  const breakInterval = parseInterval(daySchedule.breakStart, daySchedule.breakEnd)[0] || null;
  return subtractBreak(base[0], breakInterval);
};

const listStoredBusinessSchedules = (masterId: string) => {
  if (typeof window === 'undefined') return [] as StoredBusinessSchedule[];
  const entries: StoredBusinessSchedule[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
    const match = key.match(STORAGE_RE);
    if (!match) continue;
    const [, businessId, storedMasterId, month] = match;
    if (storedMasterId !== masterId) continue;
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;
    try {
      entries.push({
        businessId,
        masterId: storedMasterId,
        month,
        schedule: JSON.parse(raw) as Record<string, BusinessDaySchedule>,
      });
    } catch {
      continue;
    }
  }
  return entries;
};

const findOverlap = (left: MinuteInterval[], right: MinuteInterval[]) => {
  for (const leftInterval of left) {
    for (const rightInterval of right) {
      const overlap = overlapInterval(leftInterval, rightInterval);
      if (overlap) return overlap;
    }
  }
  return null;
};

export const findSoloScheduleConflicts = (
  masterId: string,
  settings: MasterScheduleSettings,
) => {
  const conflicts: ScheduleConflict[] = [];
  for (const stored of listStoredBusinessSchedules(masterId)) {
    for (const [date, daySchedule] of Object.entries(stored.schedule)) {
      const personalIntervals = getPersonalIntervalsForDate(settings, date);
      const businessIntervals = getBusinessIntervalsForDay(daySchedule);
      const overlap = findOverlap(personalIntervals, businessIntervals);
      if (!overlap) continue;
      conflicts.push({
        date,
        start: minutesToTime(overlap.start),
        end: minutesToTime(overlap.end),
        type: 'solo_vs_business',
        businessId: stored.businessId,
      });
    }
  }
  return conflicts.sort((left, right) => left.date.localeCompare(right.date));
};

export const findBusinessScheduleConflicts = ({
  masterId,
  businessId,
  schedule,
  personalSettings,
}: {
  masterId: string;
  businessId: string;
  schedule: Record<string, BusinessDaySchedule>;
  personalSettings: MasterScheduleSettings | null;
}) => {
  const conflicts: ScheduleConflict[] = [];
  const otherSchedules = listStoredBusinessSchedules(masterId).filter(stored => stored.businessId !== businessId);

  for (const [date, daySchedule] of Object.entries(schedule)) {
    const currentIntervals = getBusinessIntervalsForDay(daySchedule);
    if (currentIntervals.length === 0) continue;

    if (personalSettings) {
      const personalIntervals = getPersonalIntervalsForDate(personalSettings, date);
      const overlap = findOverlap(currentIntervals, personalIntervals);
      if (overlap) {
        conflicts.push({
          date,
          start: minutesToTime(overlap.start),
          end: minutesToTime(overlap.end),
          type: 'solo_vs_business',
          businessId,
        });
      }
    }

    for (const stored of otherSchedules) {
      const overlap = findOverlap(currentIntervals, getBusinessIntervalsForDay(stored.schedule[date]));
      if (!overlap) continue;
      conflicts.push({
        date,
        start: minutesToTime(overlap.start),
        end: minutesToTime(overlap.end),
        type: 'business_vs_business',
        businessId,
        otherBusinessId: stored.businessId,
      });
    }
  }

  return conflicts.sort((left, right) => left.date.localeCompare(right.date));
};

export const formatScheduleConflictMessage = (conflict: ScheduleConflict) => {
  if (conflict.type === 'solo_vs_business') {
    return `${format(parseISO(conflict.date), 'dd.MM.yyyy')} · ${conflict.start}-${conflict.end} пересекается с личным графиком мастера`;
  }
  return `${format(parseISO(conflict.date), 'dd.MM.yyyy')} · ${conflict.start}-${conflict.end} пересекается с графиком в другой организации`;
};
