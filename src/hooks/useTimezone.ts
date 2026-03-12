import { useMemo } from 'react';

// Common Russian/CIS timezones
export const TIMEZONE_OPTIONS = [
  { value: 'Europe/Kaliningrad', label: 'Калининград (UTC+2)' },
  { value: 'Europe/Moscow', label: 'Москва (UTC+3)' },
  { value: 'Europe/Samara', label: 'Самара (UTC+4)' },
  { value: 'Asia/Yekaterinburg', label: 'Екатеринбург (UTC+5)' },
  { value: 'Asia/Omsk', label: 'Омск (UTC+6)' },
  { value: 'Asia/Krasnoyarsk', label: 'Красноярск (UTC+7)' },
  { value: 'Asia/Irkutsk', label: 'Иркутск (UTC+8)' },
  { value: 'Asia/Yakutsk', label: 'Якутск (UTC+9)' },
  { value: 'Asia/Vladivostok', label: 'Владивосток (UTC+10)' },
  { value: 'Asia/Magadan', label: 'Магадан (UTC+11)' },
  { value: 'Asia/Kamchatka', label: 'Камчатка (UTC+12)' },
  { value: 'Asia/Almaty', label: 'Алматы (UTC+6)' },
  { value: 'Asia/Tashkent', label: 'Ташкент (UTC+5)' },
  { value: 'Europe/Minsk', label: 'Минск (UTC+3)' },
];

export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'Europe/Moscow';
  }
}

/**
 * Convert a date from one timezone to another for display purposes.
 */
export function convertToTimezone(date: Date, targetTimezone: string): Date {
  const str = date.toLocaleString('en-US', { timeZone: targetTimezone });
  return new Date(str);
}

/**
 * Format a UTC date string for display in a specific timezone.
 */
export function formatInTimezone(utcDateStr: string, timezone: string, options?: Intl.DateTimeFormatOptions): string {
  const date = new Date(utcDateStr);
  return date.toLocaleString('ru-RU', { timeZone: timezone, ...options });
}

export function useTimezone(orgTimezone?: string | null) {
  const userTz = useMemo(() => getUserTimezone(), []);
  const effectiveTz = orgTimezone || userTz;
  
  return {
    userTimezone: userTz,
    orgTimezone: effectiveTz,
    formatDate: (utcStr: string, opts?: Intl.DateTimeFormatOptions) => 
      formatInTimezone(utcStr, effectiveTz, opts),
    formatUserDate: (utcStr: string, opts?: Intl.DateTimeFormatOptions) => 
      formatInTimezone(utcStr, userTz, opts),
  };
}
