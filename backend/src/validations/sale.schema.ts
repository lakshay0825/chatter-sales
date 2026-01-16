import { z } from 'zod';
import { SaleType } from '@prisma/client';

// Create sale validation
export const createSaleSchema = z.object({
  body: z.object({
    creatorId: z.string().cuid('Invalid creator ID'),
    amount: z.number().positive('Amount must be positive'),
    baseAmount: z.number().min(0).optional(), // BASE amount - optional, defaults to 0
    saleType: z.nativeEnum(SaleType),
    note: z.string().optional(),
    saleDate: z.coerce.date().optional(), // Optional for backdating
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
    amount: z.number().positive().optional(),
    baseAmount: z.number().min(0).optional(), // BASE amount - optional
    saleType: z.nativeEnum(SaleType).optional(),
    note: z.string().optional(),
    saleDate: z.coerce.date().optional(),
    userId: z.string().cuid().optional(), // For reassigning sales (managers only)
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

