import { prisma } from '../config/database';
import { NotFoundError, ConflictError } from '../utils/errors';
import { CreateShiftInput, UpdateShiftInput, GetShiftsQuery } from '../validations/shift.schema';

/**
 * Create a new shift
 */
export async function createShift(
  createdBy: string,
  input: CreateShiftInput
) {
  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Ensure date is a Date object (handle string dates from frontend)
  // If date is a string like "2025-12-30", convert it to a Date at midnight UTC
  let shiftDate: Date;
  const dateInput = input.date as Date | string | number;
  if (dateInput instanceof Date) {
    shiftDate = dateInput;
  } else if (typeof dateInput === 'string') {
    // Handle date strings - if it's just a date (YYYY-MM-DD), normalize to UTC midnight
    if (dateInput.includes('T')) {
      shiftDate = new Date(dateInput);
    } else {
      // Parse YYYY-MM-DD and create date at UTC midnight to avoid timezone issues
      const [year, month, day] = dateInput.split('-').map(Number);
      shiftDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    }
  } else {
    shiftDate = new Date(dateInput);
  }
  
  // Validate the date
  if (isNaN(shiftDate.getTime())) {
    throw new Error(`Invalid date format: ${input.date}`);
  }
  
  console.log(`[createShift] Input date: ${input.date}, Converted date: ${shiftDate.toISOString()}`);
  
  // Check if shift already exists for this user, date, and time
  const existingShift = await prisma.shift.findFirst({
    where: {
      userId: input.userId,
      date: shiftDate,
      startTime: input.startTime,
    },
  });

  if (existingShift) {
    throw new ConflictError('Shift already exists for this user, date, and time');
  }

  const shift = await prisma.shift.create({
    data: {
      userId: input.userId,
      date: shiftDate,
      startTime: input.startTime,
      endTime: input.endTime,
      createdBy,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
    },
  });

  return shift;
}

/**
 * Get shift by ID
 */
export async function getShiftById(shiftId: string) {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
    },
  });

  if (!shift) {
    throw new NotFoundError('Shift not found');
  }

  return shift;
}

/**
 * Normalize a date to end of that calendar day in UTC (23:59:59.999).
 * Ensures the full last day is included when filtering by range (e.g. week including Sunday),
 * regardless of client timezone (e.g. endDate sent as 2026-02-22T18:29:59.999Z).
 */
function endOfDayUTC(d: Date): Date {
  const date = d instanceof Date ? d : new Date(d);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

/** Add N days in UTC and return the result as UTC midnight (avoids month overflow from day-of-month math). */
function addDaysUTC(date: Date, days: number): Date {
  const d = new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Given a week start coming from the frontend (which is Monday in the user's local timezone,
 * serialized to ISO), compute the corresponding Monday 00:00 UTC for that visual week.
 *
 * - If the UTC day is Monday (1), use that day.
 * - If the UTC day is Sunday (0), treat it as "Monday of the next day" (common when client is ahead of UTC).
 * - Otherwise, fall back to shifting to the nearest previous Monday.
 */
function getMondayUTCFromClientWeekDate(d: Date): Date {
  const base = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  const utcDay = d.getUTCDay(); // 0 = Sunday, 1 = Monday, ...

  if (utcDay === 1) {
    // Already Monday in UTC
    return base;
  }
  if (utcDay === 0) {
    // Sunday in UTC, but the client intended Monday in a timezone ahead of UTC (e.g. UTC+5:30),
    // so shift to next day which is Monday.
    return addDaysUTC(base, 1);
  }

  // Generic case: shift back to the previous Monday.
  return addDaysUTC(base, 1 - utcDay);
}

/** Get template for a day; if Sunday (0) is missing, use Saturday (6) so Sunday always gets shifts. */
function getDayTemplate(
  template: { [dayOfWeek: number]: { [startTime: string]: string[] } },
  dayOfWeek: number
): { [startTime: string]: string[] } {
  const day = template[dayOfWeek];
  if (day && Object.keys(day).length > 0) return day;
  if (dayOfWeek === 0) return template[6] || {};
  return {};
}

/**
 * Get shifts with filters
 */
export async function getShifts(query: GetShiftsQuery) {
  const { startDate, endDate, userId } = query;

  const where: any = {};

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = startDate;
    // Normalize endDate to end of that day in UTC so the last day (e.g. Sunday) is always included
    if (endDate) where.date.lte = endOfDayUTC(endDate);
  }

  if (userId) where.userId = userId;

  const shifts = await prisma.shift.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
    },
    orderBy: [
      { date: 'asc' },
      { startTime: 'asc' },
    ],
  });

  return shifts;
}

/**
 * Delete all shifts in a given date range.
 * Used to clear an entire week of shifts from the calendar.
 */
export async function deleteShiftsInRange(startDate: Date | string, endDate: Date | string) {
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date range for deleting shifts');
  }

  const result = await prisma.shift.deleteMany({
    where: {
      date: {
        gte: start,
        lte: end,
      },
    },
  });

  return result.count;
}

/**
 * Update shift (for drag & drop)
 */
export async function updateShift(
  shiftId: string,
  input: UpdateShiftInput
) {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
  });

  if (!shift) {
    throw new NotFoundError('Shift not found');
  }

  // Verify user exists if updating
  if (input.userId) {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
    });
    if (!user) {
      throw new NotFoundError('User not found');
    }
  }

  // Ensure date is a Date object if provided
  const updateData: any = {};
  if (input.userId !== undefined) updateData.userId = input.userId;
  if (input.date !== undefined) {
    // Handle date strings - if it's just a date (YYYY-MM-DD), add time
    let dateValue: Date;
    const dateInput = input.date as Date | string | number;
    if (dateInput instanceof Date) {
      dateValue = dateInput;
    } else {
      // input.date is a string or other type - convert to Date
      const dateStr = typeof dateInput === 'string' && !dateInput.includes('T') 
        ? `${dateInput}T00:00:00` 
        : String(dateInput);
      dateValue = new Date(dateStr);
      if (isNaN(dateValue.getTime())) {
        throw new Error('Invalid date format');
      }
    }
    updateData.date = dateValue;
    console.log(`[updateShift] Input date: ${input.date}, Converted date: ${updateData.date.toISOString()}`);
  }
  if (input.startTime !== undefined) updateData.startTime = input.startTime;
  if (input.endTime !== undefined) updateData.endTime = input.endTime;

  const updatedShift = await prisma.shift.update({
    where: { id: shiftId },
    data: updateData,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
    },
  });

  return updatedShift;
}

/**
 * Delete shift
 */
export async function deleteShift(shiftId: string) {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
  });

  if (!shift) {
    throw new NotFoundError('Shift not found');
  }

  await prisma.shift.delete({
    where: { id: shiftId },
  });

  return { message: 'Shift deleted successfully' };
}

/**
 * Auto-generate weekly shifts based on a default template
 * Template structure: { dayOfWeek: { startTime: userId[] } }
 * dayOfWeek: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
 */
export async function autoGenerateWeeklyShifts(
  weekStartDate: Date,
  template: { [dayOfWeek: number]: { [startTime: string]: string[] } },
  createdBy: string,
  overwriteExisting: boolean = false
) {
  const shifts = [];
  const shiftTimes: { [key: string]: string } = {
    '09:00': '14:30',
    '14:30': '20:00',
    '20:00': '01:00',
    '01:00': '09:00', // Night shift: 01:00–09:00
  };

  // Normalize week start to Monday 00:00 UTC so adding 0..6 days gives Mon..Sun in UTC (no skipped day).
  const w = weekStartDate instanceof Date ? weekStartDate : new Date(weekStartDate);
  const utcDay = w.getUTCDay();
  const diffToMonday = utcDay === 0 ? -6 : 1 - utcDay;
  const mondayUTC = new Date(Date.UTC(
    w.getUTCFullYear(),
    w.getUTCMonth(),
    w.getUTCDate() + diffToMonday,
    0, 0, 0, 0
  ));

  // Generate shifts for each day of the week (Monday to Sunday) using UTC day-add (no month overflow)
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const normalizedDate = addDaysUTC(mondayUTC, dayOffset);

    // Get day of week (0 = Sunday, 1 = Monday, etc.); use Saturday template for Sunday if missing
    const dayOfWeek = normalizedDate.getUTCDay();
    const dayTemplate = getDayTemplate(template, dayOfWeek);

    // Create shifts for each time slot
    for (const [startTime, userIds] of Object.entries(dayTemplate)) {
      const endTime = shiftTimes[startTime];
      if (!endTime) continue;
      
      for (const userId of userIds) {
        // Check if shift already exists
        const existingShift = await prisma.shift.findFirst({
          where: {
            userId,
            date: normalizedDate,
            startTime: startTime as any,
          },
        });
        
        if (existingShift) {
          if (overwriteExisting) {
            // Update existing shift
            await prisma.shift.update({
              where: { id: existingShift.id },
              data: {
                endTime: endTime as any,
                createdBy,
              },
            });
            shifts.push(existingShift);
          }
          // Skip if not overwriting
          continue;
        }
        
        // Create new shift
        const shift = await prisma.shift.create({
          data: {
            userId,
            date: normalizedDate,
            startTime: startTime as any,
            endTime: endTime as any,
            createdBy,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        });
        
        shifts.push(shift);
      }
    }
  }
  
  return shifts;
}

/**
 * Get default weekly shift template
 * Returns a template that can be customized
 */
export function getDefaultWeeklyTemplate(userIds: string[]): { [dayOfWeek: number]: { [startTime: string]: string[] } } {
  // Default: distribute users evenly across shifts
  // Monday-Friday: all shifts
  // Saturday-Sunday: only morning and afternoon
  
  const template: { [dayOfWeek: number]: { [startTime: string]: string[] } } = {};
  
  // Distribute users across shifts (round-robin)
  const shiftsPerDay = userIds.length > 0 ? Math.ceil(userIds.length / 3) : 0;
  
  for (let day = 1; day <= 5; day++) {
    // Monday (1) to Friday (5) - all shifts
    template[day] = {
      '09:00': userIds.slice(0, shiftsPerDay),
      '14:30': userIds.slice(shiftsPerDay, shiftsPerDay * 2),
      '20:00': userIds.slice(shiftsPerDay * 2),
    };
  }
  
  // Saturday (6) and Sunday (0) - only morning and afternoon
  for (const day of [0, 6]) {
    template[day] = {
      '09:00': userIds.slice(0, shiftsPerDay),
      '14:30': userIds.slice(shiftsPerDay),
    };
  }
  
  return template;
}

/**
 * Extract shift template from current week's shifts
 * Converts actual shifts into a reusable template
 */
export async function extractTemplateFromWeek(
  weekStartDate: Date | string
): Promise<{ [dayOfWeek: number]: { [startTime: string]: string[] } }> {
  // Ensure weekStartDate is a Date object
  let weekStart: Date;
  if (weekStartDate instanceof Date) {
    weekStart = weekStartDate;
  } else if (typeof weekStartDate === 'string') {
    weekStart = new Date(weekStartDate);
  } else {
    weekStart = new Date(weekStartDate);
  }
  
  // Validate the date
  if (isNaN(weekStart.getTime())) {
    throw new Error('Invalid week start date');
  }

  // Normalize to Monday 00:00 UTC and Sunday 23:59:59.999 UTC for the *visual* week the user selected.
  const mondayUTC = getMondayUTCFromClientWeekDate(weekStart);
  const sundayEndUTC = endOfDayUTC(addDaysUTC(mondayUTC, 6));

  // Get all shifts for this week (Mon 00:00 UTC through Sun 23:59:59 UTC)
  const shifts = await prisma.shift.findMany({
    where: {
      date: {
        gte: mondayUTC,
        lte: sundayEndUTC,
      },
    },
    orderBy: [
      { date: 'asc' },
      { startTime: 'asc' },
    ],
  });
  
  // Build template: { dayOfWeek: { startTime: userId[] } }
  const template: { [dayOfWeek: number]: { [startTime: string]: string[] } } = {};
  
  for (const shift of shifts) {
    const shiftDate = new Date(shift.date);
    const dayOfWeek = shiftDate.getUTCDay(); // 0 = Sunday, 1 = Monday (UTC for consistency with generation)
    
    if (!template[dayOfWeek]) {
      template[dayOfWeek] = {};
    }
    
    if (!template[dayOfWeek][shift.startTime]) {
      template[dayOfWeek][shift.startTime] = [];
    }
    
    // Add userId if not already in array (avoid duplicates)
    if (!template[dayOfWeek][shift.startTime].includes(shift.userId)) {
      template[dayOfWeek][shift.startTime].push(shift.userId);
    }
  }
  
  return template;
}

/**
 * Generate shifts for entire year based on a weekly template
 * Copies the template pattern to all 52 weeks of the year
 */
export async function generateShiftsForYear(
  templateWeekStartDate: Date | string,
  template: { [dayOfWeek: number]: { [startTime: string]: string[] } },
  createdBy: string,
  overwriteExisting: boolean = false
) {
  const shifts = [];
  const shiftTimes: { [key: string]: string } = {
    '09:00': '14:30',
    '14:30': '20:00',
    '20:00': '01:00',
    '01:00': '09:00', // Night shift: 01:00–09:00
  };

  // Ensure templateWeekStartDate is a Date object and normalize it to Monday of that week.
  let templateWeekStart: Date;
  if (templateWeekStartDate instanceof Date) {
    templateWeekStart = new Date(templateWeekStartDate);
  } else if (typeof templateWeekStartDate === 'string') {
    templateWeekStart = new Date(templateWeekStartDate);
  } else {
    templateWeekStart = new Date(templateWeekStartDate);
  }

  if (isNaN(templateWeekStart.getTime())) {
    throw new Error('Invalid template week start date');
  }

  // Normalize to Monday 00:00 UTC of the *visual* template week the user selected (same logic as extraction).
  const mondayUTC = getMondayUTCFromClientWeekDate(templateWeekStart);

  // Generate shifts for 52 consecutive weeks; add days by time so month boundaries are correct (no skipped 22nd).
  for (let week = 0; week < 52; week++) {
    const weekStart = addDaysUTC(mondayUTC, week * 7);
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const normalizedDate = addDaysUTC(weekStart, dayOffset);

      // Get day of week (0 = Sunday, 1 = Monday, etc.); use Saturday template for Sunday if missing
      const dayOfWeek = normalizedDate.getUTCDay();
      const dayTemplate = getDayTemplate(template, dayOfWeek);

      // Create shifts for each time slot
      for (const [startTime, userIds] of Object.entries(dayTemplate)) {
        const endTime = shiftTimes[startTime];
        if (!endTime) continue;
        
        for (const userId of userIds) {
          // Check if shift already exists
          const existingShift = await prisma.shift.findFirst({
            where: {
              userId,
              date: normalizedDate,
              startTime: startTime as any,
            },
          });
          
          if (existingShift) {
            if (overwriteExisting) {
              // Update existing shift
              await prisma.shift.update({
                where: { id: existingShift.id },
                data: {
                  endTime: endTime as any,
                  createdBy,
                },
              });
              shifts.push(existingShift);
            }
            // Skip if not overwriting
            continue;
          }
          
          // Create new shift
          const shift = await prisma.shift.create({
            data: {
              userId,
              date: normalizedDate,
              startTime: startTime as any,
              endTime: endTime as any,
              createdBy,
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
            },
          });
          
          shifts.push(shift);
        }
      }
    }
  }
  
  return shifts;
}

