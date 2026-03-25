import { z } from 'zod';

export const upsertGlobalFixedCostsSchema = z.object({
  query: z.object({
    year: z.coerce.number().int().min(2000).max(3000),
    month: z.coerce.number().int().min(1).max(12),
  }),
  body: z.object({
    costs: z
      .array(
        z.object({
          name: z.string().min(1, 'Cost name is required'),
          amount: z.number().min(0, 'Amount must be positive'),
        })
      )
      .default([]),
  }),
});

export type UpsertGlobalFixedCostsInput = z.infer<typeof upsertGlobalFixedCostsSchema>['body'];

