import { z } from 'zod';
import { UserRole } from '@prisma/client';

// Create/Invite user validation
export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    name: z.string().min(1, 'Name is required'),
    role: z.nativeEnum(UserRole),
    commissionPercent: z.number().min(0).max(100).optional(),
    fixedSalary: z.number().min(0).optional(),
  }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>['body'];

// Update user validation
export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    role: z.nativeEnum(UserRole).optional(),
    commissionPercent: z.number().min(0).max(100).optional(),
    fixedSalary: z.number().min(0).optional(),
    isActive: z.boolean().optional(),
    avatar: z.string().optional(),
    identificationPhoto: z.string().optional(),
  }),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];

