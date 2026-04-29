import { addDays, eachDayOfInterval, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns';

export interface WorkHoursEntry {
  start: string;
  end: string;
}

export interface BreakEntry {
  start: string;
  end: string;
}

export interface MasterScheduleSettings {
  workDays: number[];
  defaultHours: WorkHoursEntry;
  perDayHours: Record<string, WorkHoursEntry>;
  breakConfig: Record<string, BreakEntry[]>;
  slotDuration: number;
  bufferMinutes: number;
}

export interface SyntheticBreakItem {
  id: string;
  title: string;
  status: 'break';
  notes: 'break';
  scheduled_at: string;
  duration_minutes: number;
  start_time: string;
  end_time: string;
  client_id: null;
  client: null;
  executor_id: string;
  service: null;
  resource_id: null;
  rawSource: 'break_config';
  rawBreakKey: string;
  rawBreakIndex: number;
}

const DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5];

export const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

export const addMinutesToTime = (value: string, minutes: number) => {
  const total = timeToMinutes(value) + minutes;
  return `${Math.floor(total / 60)
    .toString()
    .padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
};

export const normalizeMasterScheduleSettings = (
  workDaysRaw: number[] | null | undefined,
  workHoursConfigRaw: any,
  breakConfigRaw: any,
): MasterScheduleSettings => {
  const workHoursConfig = workHoursConfigRaw && typeof workHoursConfigRaw === 'object'
    ? workHoursConfigRaw
    : {};
  const defaultHours = {
    start: workHoursConfig.default?.start || '09:00',
    end: workHoursConfig.default?.end || '18:00',
  };
  const perDayHours = {
    ...(workHoursConfig.perDay && typeof workHoursConfig.perDay === 'object'
      ? workHoursConfig.perDay
      : {}),
  };

  for (const key of ['0', '1', '2', '3', '4', '5', '6']) {
    if (!perDayHours[key] && workHoursConfig[key]) {
      perDayHours[key] = workHoursConfig[key];
    }
  }

  const breakConfig: Record<string, BreakEntry[]> = {};
  const rawBreaks = breakConfigRaw && typeof breakConfigRaw === 'object' ? breakConfigRaw : {};
  for (const [key, value] of Object.entries(rawBreaks)) {
    if (Array.isArray(value)) {
      breakConfig[key] = value
        .map((entry: any) => ({
          start: entry?.start || '',
          end: entry?.end || '',
        }))
        .filter(entry => entry.start && entry.end);
    }
  }

  return {
    workDays: Array.isArray(workDaysRaw) && workDaysRaw.length > 0 ? workDaysRaw : DEFAULT_WORK_DAYS,
    defaultHours,
    perDayHours,
    breakConfig,
    slotDuration: Number(workHoursConfig.slotDuration) || 30,
    bufferMinutes: Number(workHoursConfig.breakDuration) || 0,
  };
};

export const serializeMasterScheduleSettings = (
  settings: MasterScheduleSettings,
  usePerDayHours: boolean,
) => {
  const workHoursConfig: Record<string, any> = {
    default: settings.defaultHours,
    slotDuration: settings.slotDuration,
  };

  if (usePerDayHours) {
    workHoursConfig.perDay = settings.perDayHours;
    for (const [key, value] of Object.entries(settings.perDayHours)) {
      workHoursConfig[key] = value;
    }
  }

  return {
    work_days: settings.workDays,
    work_hours_config: workHoursConfig,
    break_config: settings.breakConfig,
  };
};

export const getRangeForView = (currentDate: Date, view: 'day' | 'week' | 'month') => {
  if (view === 'day') {
    return { start: currentDate, end: currentDate };
  }
  if (view === 'week') {
    return {
      start: startOfWeek(currentDate, { weekStartsOn: 1 }),
      end: endOfWeek(currentDate, { weekStartsOn: 1 }),
    };
  }
  return {
    start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
    end: endOfWeek(addDays(startOfMonth(currentDate), 41), { weekStartsOn: 1 }),
  };
};

export const buildSyntheticBreakItems = (
  masterId: string,
  settings: MasterScheduleSettings,
  start: Date,
  end: Date,
) => {
  const days = eachDayOfInterval({ start, end });
  const items: SyntheticBreakItem[] = [];

  for (const day of days) {
    const dayKey = String(day.getDay());
    if (settings.workDays.length > 0 && !settings.workDays.includes(day.getDay())) continue;
    const breaks = settings.breakConfig[dayKey] || settings.breakConfig.all || [];
    breaks.forEach((entry, index) => {
      const duration = Math.max(0, timeToMinutes(entry.end) - timeToMinutes(entry.start));
      if (!duration) return;
      items.push({
        id: `break-${format(day, 'yyyy-MM-dd')}-${dayKey}-${index}`,
        title: 'Перерыв',
        status: 'break',
        notes: 'break',
        scheduled_at: new Date(`${format(day, 'yyyy-MM-dd')}T${entry.start}:00`).toISOString(),
        duration_minutes: duration,
        start_time: entry.start,
        end_time: entry.end,
        client_id: null,
        client: null,
        executor_id: masterId,
        service: null,
        resource_id: null,
        rawSource: 'break_config',
        rawBreakKey: dayKey in settings.breakConfig ? dayKey : 'all',
        rawBreakIndex: index,
      });
    });
  }

  return items;
};
