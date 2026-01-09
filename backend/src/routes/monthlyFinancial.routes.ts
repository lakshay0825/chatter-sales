import { FastifyInstance } from 'fastify';
import {
  upsertMonthlyFinancialHandler,
  getMonthlyFinancialHandler,
  getMonthlyFinancialsHandler,
} from '../controllers/monthlyFinancial.controller';
import { monthlyFinancialSchema, getMonthlyFinancialQuerySchema } from '../validations/monthlyFinancial.schema';
import { validate } from '../middleware/validate';
import { authenticate, requireAdmin } from '../middleware/auth';

export async function monthlyFinancialRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  // Get all monthly financials (with filters)
  fastify.get(
    '/',
    {
      preHandler: [validate(getMonthlyFinancialQuerySchema)],
      schema: {
        description: 'Get monthly financials with filters',
        tags: ['monthly-financials'],
        security: [{ bearerAuth: [] }],
      },
    },
    getMonthlyFinancialsHandler
  );

  // Get monthly financial for specific creator, year, month
  fastify.get(
    '/:creatorId/:year/:month',
    {
      schema: {
        description: 'Get monthly financial data for a creator',
        tags: ['monthly-financials'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            creatorId: { type: 'string' },
            year: { type: 'integer' },
            month: { type: 'integer', minimum: 1, maximum: 12 },
          },
        },
      },
    },
    getMonthlyFinancialHandler
  );

  // Create or update monthly financial (Admin only)
  fastify.put(
    '/:creatorId/:year/:month',
    {
      preHandler: [requireAdmin, validate(monthlyFinancialSchema)],
      schema: {
        description: 'Create or update monthly financial data (Admin only)',
        tags: ['monthly-financials'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            grossRevenue: { type: 'number', minimum: 0 },
            marketingCosts: { type: 'number', minimum: 0 },
            toolCosts: { type: 'number', minimum: 0 },
            otherCosts: { type: 'number', minimum: 0 },
          },
        },
      },
    },
    upsertMonthlyFinancialHandler
  );
}

