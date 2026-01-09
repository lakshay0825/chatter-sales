import { formatInTimeZone, utcToZonedTime } from 'date-fns-tz';
import { parseISO, format } from 'date-fns';

const ITALIAN_TIMEZONE = 'Europe/Rome';

/**
 * Get current date/time in Italian timezone
 */
export function getItalianNow(): Date {
  return utcToZonedTime(new Date(), ITALIAN_TIMEZONE);
}

/**
 * Format date in Italian timezone
 */
export function formatItalianDate(date: Date | string, formatStr: string = 'dd MMM, yyyy'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(dateObj, ITALIAN_TIMEZONE, formatStr);
}

/**
 * Format date and time in Italian timezone
 */
export function formatItalianDateTime(date: Date | string): string {
  return formatItalianDate(date, 'dd MMM, yyyy HH:mm');
}

/**
 * Format time only in Italian timezone
 */
export function formatItalianTime(date: Date | string): string {
  return formatItalianDate(date, 'HH:mm');
}

/**
 * Get today's date string in Italian timezone
 */
export function getTodayString(): string {
  return formatInTimeZone(new Date(), ITALIAN_TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Get current month and year
 */
export function getCurrentMonthYear(): { month: number; year: number } {
  const now = getItalianNow();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

/**
 * Format date for display: "Today, 12:52 - Italy (CEST)"
 */
export function formatDateWithTimezone(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const now = getItalianNow();
  const dateOnly = formatInTimeZone(dateObj, ITALIAN_TIMEZONE, 'yyyy-MM-dd');
  const todayOnly = formatInTimeZone(now, ITALIAN_TIMEZONE, 'yyyy-MM-dd');

  const isToday = dateOnly === todayOnly;
  const timeStr = formatInTimeZone(dateObj, ITALIAN_TIMEZONE, 'HH:mm');
  const timezoneStr = formatInTimeZone(dateObj, ITALIAN_TIMEZONE, 'zzz');

  if (isToday) {
    return `${timeStr} - Italy (${timezoneStr})`;
  }

  const dateStr = formatInTimeZone(dateObj, ITALIAN_TIMEZONE, 'MMM dd, yyyy');
  return `${dateStr}, ${timeStr} - Italy (${timezoneStr})`;
}

/**
 * Get current time string for display: "12:52"
 */
export function getCurrentTimeString(): string {
  return formatInTimeZone(new Date(), ITALIAN_TIMEZONE, 'HH:mm');
}

/**
 * Get current timezone abbreviation: "CEST" or "CET"
 */
export function getCurrentTimezoneAbbr(): string {
  return formatInTimeZone(new Date(), ITALIAN_TIMEZONE, 'zzz');
}

/**
 * Get month name
 */
export function getMonthName(month: number): string {
  const date = new Date(2024, month - 1, 1);
  return format(date, 'MMMM');
}

/**
 * Get date range for a month
 */
export function getMonthDateRange(month: number, year: number): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

