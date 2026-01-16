import { z } from 'zod';

// Create/Update monthly financial validation
export const monthlyFinancialSchema = z.object({
  params: z.object({
    creatorId: z.string().cuid(),
    year: z.coerce.number().int().min(2000).max(3000),
    month: z.coerce.number().int().min(1).max(12),
  }),
  body: z.object({
    grossRevenue: z.number().min(0).default(0),
    marketingCosts: z.number().min(0).default(0),
    toolCosts: z.number().min(0).default(0),
    otherCosts: z.number().min(0).default(0),
    customCosts: z.array(z.object({
      name: z.string().min(1, 'Cost name is required'),
      amount: z.number().min(0, 'Amount must be positive'),
    })).optional(),
  }),
});

export type MonthlyFinancialInput = z.infer<typeof monthlyFinancialSchema>['body'];

// Get monthly financial query
export const getMonthlyFinancialQuerySchema = z.object({
  query: z.object({
    creatorId: z.string().cuid().optional(),
    year: z.coerce.number().int().optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
  }),
});

export type GetMonthlyFinancialQuery = z.infer<typeof getMonthlyFinancialQuerySchema>['query'];

