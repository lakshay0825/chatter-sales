import { z } from 'zod';

// Login validation
export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>['body'];

// Register/Invitation acceptance validation
export const registerSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Invitation token is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];

// Password change validation
export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];

