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
 * Get shifts with filters
 */
export async function getShifts(query: GetShiftsQuery) {
  const { startDate, endDate, userId } = query;

  const where: any = {};

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = startDate;
    if (endDate) where.date.lte = endDate;
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
  };

  // Generate shifts for each day of the week (Monday to Sunday)
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const currentDate = new Date(weekStartDate);
    currentDate.setDate(currentDate.getDate() + dayOffset);
    
    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = currentDate.getDay();
    
    // Get template for this day
    const dayTemplate = template[dayOfWeek] || {};
    
    // Create shifts for each time slot
    for (const [startTime, userIds] of Object.entries(dayTemplate)) {
      const endTime = shiftTimes[startTime];
      if (!endTime) continue;
      
      for (const userId of userIds) {
        // Check if shift already exists
        const existingShift = await prisma.shift.findFirst({
          where: {
            userId,
            date: currentDate,
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
            date: currentDate,
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
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  // Get all shifts for this week
  const shifts = await prisma.shift.findMany({
    where: {
      date: {
        gte: weekStart,
        lte: weekEnd,
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
    const dayOfWeek = shiftDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
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
  };
  
  // Ensure templateWeekStartDate is a Date object
  let weekStartDate: Date;
  if (templateWeekStartDate instanceof Date) {
    weekStartDate = templateWeekStartDate;
  } else if (typeof templateWeekStartDate === 'string') {
    weekStartDate = new Date(templateWeekStartDate);
  } else {
    weekStartDate = new Date(templateWeekStartDate);
  }
  
  // Validate the date
  if (isNaN(weekStartDate.getTime())) {
    throw new Error('Invalid template week start date');
  }
  
  // Get the year from the template week
  const year = weekStartDate.getFullYear();
  
  // Find the first Monday of the year (or the Monday of the template week if it's in the future)
  const firstDayOfYear = new Date(year, 0, 1);
  let firstMonday = new Date(firstDayOfYear);
  
  // If template week is in the current year and after Jan 1, use it as starting point
  if (weekStartDate.getFullYear() === year && weekStartDate >= firstDayOfYear) {
    // Get Monday of the template week
    firstMonday = new Date(weekStartDate);
    const dayOfWeek = firstMonday.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday
    firstMonday.setDate(firstMonday.getDate() + diff);
  } else {
    // Find first Monday of the year
    const dayOfWeek = firstDayOfYear.getDay();
    const diff = dayOfWeek === 0 ? 1 : 8 - dayOfWeek; // Days to add to get to Monday
    firstMonday.setDate(firstDayOfYear.getDate() + diff);
  }
  
  // Generate shifts for 52 weeks
  for (let week = 0; week < 52; week++) {
    const weekStart = new Date(firstMonday);
    weekStart.setDate(weekStart.getDate() + (week * 7));
    
    // Generate shifts for each day of the week
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = new Date(weekStart);
      currentDate.setDate(currentDate.getDate() + dayOffset);
      
      // Skip if date is in the past (before template week)
      if (currentDate < weekStartDate) {
        continue;
      }
      
      // Get day of week (0 = Sunday, 1 = Monday, etc.)
      const dayOfWeek = currentDate.getDay();
      
      // Get template for this day
      const dayTemplate = template[dayOfWeek] || {};
      
      // Create shifts for each time slot
      for (const [startTime, userIds] of Object.entries(dayTemplate)) {
        const endTime = shiftTimes[startTime];
        if (!endTime) continue;
        
        for (const userId of userIds) {
          // Check if shift already exists
          const existingShift = await prisma.shift.findFirst({
            where: {
              userId,
              date: currentDate,
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
              date: currentDate,
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

