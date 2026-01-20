import { z } from 'zod';

// Create shift validation
export const createShiftSchema = z.object({
  body: z.object({
    userId: z.string().cuid('Invalid user ID'),
    date: z.coerce.date(),
    startTime: z.enum(['09:00', '14:30', '20:00', '01:00']), // Added '01:00' for night shift
    endTime: z.enum(['14:30', '20:00', '01:00', '09:00']), // Added '09:00' as end time for night shift
  }),
});

export type CreateShiftInput = z.infer<typeof createShiftSchema>['body'];

// Update shift validation (for drag & drop)
export const updateShiftSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
  }),
  body: z.object({
    userId: z.string().cuid().optional(),
    date: z.coerce.date().optional(),
    startTime: z.enum(['09:00', '14:30', '20:00', '01:00']).optional(), // Added '01:00' for night shift
    endTime: z.enum(['14:30', '20:00', '01:00', '09:00']).optional(), // Added '09:00' as end time for night shift
  }),
});

export type UpdateShiftInput = z.infer<typeof updateShiftSchema>['body'];

// Get shifts query validation
export const getShiftsQuerySchema = z.object({
  query: z.object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    userId: z.string().cuid().optional(),
  }),
});

export type GetShiftsQuery = z.infer<typeof getShiftsQuerySchema>['query'];

// Auto-generate weekly shifts validation
export const autoGenerateShiftsSchema = z.object({
  body: z.object({
    weekStartDate: z.coerce.date(),
    template: z.record(
      z.number().min(0).max(6), // dayOfWeek
      z.record(
        z.enum(['09:00', '14:30', '20:00']), // startTime
        z.array(z.string().cuid()) // userIds
      )
    ).optional(),
    userIds: z.array(z.string().cuid()).optional(), // If no template, use default distribution
    overwriteExisting: z.boolean().default(false),
    generateForYear: z.boolean().default(false), // If true, generate for all 52 weeks
  }),
});

export type AutoGenerateShiftsInput = z.infer<typeof autoGenerateShiftsSchema>['body'];

