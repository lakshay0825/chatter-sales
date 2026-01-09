/**
 * Timezone utilities for handling Italian timezone (Europe/Rome)
 */

const DEFAULT_TIMEZONE = process.env.DEFAULT_TIMEZONE || 'Europe/Rome';

/**
 * Convert UTC date to Italian timezone
 */
export function toItalianTimezone(date: Date): Date {
  return new Date(
    date.toLocaleString('en-US', {
      timeZone: DEFAULT_TIMEZONE,
    })
  );
}

/**
 * Get current date/time in Italian timezone
 */
export function getItalianNow(): Date {
  return new Date(
    new Date().toLocaleString('en-US', {
      timeZone: DEFAULT_TIMEZONE,
    })
  );
}

/**
 * Check if a sale is real-time (within last 5 minutes) or offline
 */
export function isRealTimeSale(saleDate: Date): boolean {
  const now = new Date();
  const diffMs = now.getTime() - saleDate.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  
  // Consider real-time if created within last 5 minutes
  return diffMinutes <= 5 && diffMinutes >= 0;
}

/**
 * Format date for display in Italian timezone
 */
export function formatItalianDate(date: Date): string {
  return date.toLocaleString('it-IT', {
    timeZone: DEFAULT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Check if sale can be edited (within 24 hours for chatters)
 */
export function canEditSale(saleDate: Date, isAdminOrManager: boolean): boolean {
  if (isAdminOrManager) {
    return true; // Admins and managers can always edit
  }

  const now = new Date();
  const diffMs = now.getTime() - saleDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  return diffHours <= 24;
}

