import { z } from 'zod';
import { SaleType } from '@prisma/client';

// Create sale validation
export const createSaleSchema = z.object({
  body: z.object({
    creatorId: z.string().cuid('Invalid creator ID'),
    amount: z.number().min(0, 'Amount must be non-negative'),
    baseAmount: z.number().min(0).optional(), // BASE amount - optional, defaults to 0
    saleType: z.preprocess(
      (val) => {
        // Reject empty strings explicitly
        if (val === '' || val === null || val === undefined) {
          return undefined;
        }
        return val;
      },
      z.nativeEnum(SaleType, {
        errorMap: () => ({ 
          message: `Invalid sale type. Must be one of: ${Object.values(SaleType).join(', ')}` 
        }),
      })
    ),
    note: z.string().optional(),
    saleDate: z.coerce.date().optional(), // Optional for backdating
  }).refine((data) => {
    // If saleType is BASE, amount can be 0, but baseAmount must be > 0
    // For MASS_MESSAGE and other types, amount must be > 0
    if (data.saleType === SaleType.BASE) {
      const baseAmountValue = data.baseAmount ?? 0;
      return (data.amount === 0 && baseAmountValue > 0) || data.amount > 0;
    }
    // For all other types (including MASS_MESSAGE), amount must be > 0
    return data.amount > 0;
  }, {
    message: 'Amount must be positive, or if BASE type is selected, either amount or baseAmount must be positive',
    path: ['amount'],
  }),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>['body'];

// Update sale validation
export const updateSaleSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
  }),
  body: z.object({
    creatorId: z.string().cuid().optional(),
    amount: z.number().min(0).optional(),
    baseAmount: z.number().min(0).optional(), // BASE amount - optional
    saleType: z.nativeEnum(SaleType).optional(),
    note: z.string().optional(),
    saleDate: z.coerce.date().optional(),
    userId: z.string().cuid().optional(), // For reassigning sales (managers only)
  }).refine((data) => {
    // If saleType is BASE, amount can be 0, but baseAmount must be > 0
    // Otherwise, if amount is provided, it must be > 0
    if (data.saleType === SaleType.BASE && data.amount !== undefined) {
      const baseAmountValue = data.baseAmount ?? 0;
      return (data.amount === 0 && baseAmountValue > 0) || data.amount > 0;
    }
    if (data.amount !== undefined) {
      return data.amount > 0;
    }
    return true;
  }, {
    message: 'Amount must be positive, or if BASE type is selected, either amount or baseAmount must be positive',
    path: ['amount'],
  }),
});

export type UpdateSaleInput = z.infer<typeof updateSaleSchema>['body'];

// Get sales query validation (filters)
export const getSalesQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    creatorId: z.string().cuid().optional(),
    saleType: z.nativeEnum(SaleType).optional(),
    status: z.enum(['ONLINE', 'OFFLINE']).optional(),
    userId: z.string().cuid().optional(),
  }),
});

export type GetSalesQuery = z.infer<typeof getSalesQuerySchema>['query'];

