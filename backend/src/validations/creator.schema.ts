import { z } from 'zod';

// Create creator validation
export const createCreatorSchema = z.object({
  body: z
    .object({
      name: z.string().min(1, 'Name is required'),
      compensationType: z.enum(['PERCENTAGE', 'SALARY']),
      revenueSharePercent: z.number().min(0).max(100).optional(),
      fixedSalaryCost: z.number().min(0).optional(),
      onlyfansCommissionPercent: z.number().min(0).max(100).optional(), // 15 or 20
    })
    .refine(
      (data: {
        compensationType: string;
        revenueSharePercent?: number;
        fixedSalaryCost?: number;
      }) => {
        if (data.compensationType === 'PERCENTAGE') {
          // Require a positive percentage value
          return data.revenueSharePercent !== undefined && data.revenueSharePercent > 0;
        }
        if (data.compensationType === 'SALARY') {
          // Require a positive fixed salary value
          return data.fixedSalaryCost !== undefined && data.fixedSalaryCost > 0;
        }
        return true;
      },
      {
        message: 'Compensation value is required based on compensation type',
      }
    ),
});

export type CreateCreatorInput = z.infer<typeof createCreatorSchema>['body'];

// Update creator validation
export const updateCreatorSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    compensationType: z.enum(['PERCENTAGE', 'SALARY']).optional(),
    revenueSharePercent: z.number().min(0).max(100).optional(),
    fixedSalaryCost: z.number().min(0).optional(),
    onlyfansCommissionPercent: z.number().min(0).max(100).optional(), // 15 or 20
    isActive: z.boolean().optional(),
    avatar: z.string().optional(),
    identificationPhoto: z.string().optional(),
  }),
});

export type UpdateCreatorInput = z.infer<typeof updateCreatorSchema>['body'];

