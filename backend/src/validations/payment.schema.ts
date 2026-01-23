import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';

// Create payment validation
export const createPaymentSchema = z.object({
  body: z.object({
    userId: z.string().cuid('Invalid user ID'),
    amount: z.number().positive('Amount must be positive'),
    paymentDate: z.coerce.date().optional(),
    paymentMethod: z.nativeEnum(PaymentMethod, {
      errorMap: () => ({ 
        message: `Invalid payment method. Must be one of: ${Object.values(PaymentMethod).join(', ')}` 
      }),
    }),
    note: z.string().optional(),
  }),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>['body'];

// Update payment validation
export const updatePaymentSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
  }),
  body: z.object({
    amount: z.number().positive().optional(),
    paymentDate: z.coerce.date().optional(),
    paymentMethod: z.nativeEnum(PaymentMethod).optional(),
    note: z.string().optional(),
  }),
});

export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>['body'];

// Get payments query validation
export const getPaymentsQuerySchema = z.object({
  query: z.object({
    userId: z.string().cuid().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  }),
});

export type GetPaymentsQuery = z.infer<typeof getPaymentsQuerySchema>['query'];
