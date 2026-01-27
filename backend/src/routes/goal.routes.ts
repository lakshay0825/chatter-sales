import { FastifyInstance } from 'fastify';
import {
  createGoalHandler,
  getGoalHandler,
  getGoalsHandler,
  updateGoalHandler,
  deleteGoalHandler,
  getGoalProgressHandler,
} from '../controllers/goal.controller';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';

// Goal validation schemas
const createGoalSchema = z.object({
  body: z.object({
    userId: z.string().cuid().optional(),
    creatorId: z.string().cuid().optional(),
    type: z.enum(['SALES', 'COMMISSION', 'REVENUE']),
    target: z.number().positive(),
    year: z.number().int().min(2000).max(2100),
    month: z.number().int().min(0).max(12),
  }),
});

const updateGoalSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
  }),
  body: z.object({
    target: z.number().positive().optional(),
    month: z.number().int().min(0).max(12).optional(),
    bonusAmount: z.number().min(0).optional(),
  }),
});

export async function goalRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  // Create goal (Admin/Manager only)
  fastify.post(
    '/',
    {
      preHandler: [requireAdmin, validate(createGoalSchema)],
      schema: {
        description: 'Create a new goal (Admin only)',
        tags: ['goals'],
        security: [{ bearerAuth: [] }],
      },
    },
    createGoalHandler as any
  );

  // Get all goals
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get goals with filters',
        tags: ['goals'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            creatorId: { type: 'string' },
            type: { type: 'string', enum: ['SALES', 'COMMISSION', 'REVENUE'] },
            year: { type: 'integer' },
            month: { type: 'integer', minimum: 0, maximum: 12 },
          },
        },
      },
    },
    getGoalsHandler
  );

  // Get goal by ID
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get goal by ID',
        tags: ['goals'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    getGoalHandler
  );

  // Get goal progress
  fastify.get(
    '/:id/progress',
    {
      schema: {
        description: 'Get goal progress (current vs target)',
        tags: ['goals'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    getGoalProgressHandler
  );

  // Update goal (Admin only)
  fastify.put(
    '/:id',
    {
      preHandler: [requireAdmin, validate(updateGoalSchema)],
      schema: {
        description: 'Update goal (Admin only)',
        tags: ['goals'],
        security: [{ bearerAuth: [] }],
      },
    },
    updateGoalHandler as any
  );

  // Delete goal (Admin only)
  fastify.delete(
    '/:id',
    {
      preHandler: [requireAdmin],
      schema: {
        description: 'Delete goal (Admin only)',
        tags: ['goals'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    deleteGoalHandler as any
  );
}

