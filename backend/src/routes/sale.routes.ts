import { FastifyInstance } from 'fastify';
import {
  createSaleHandler,
  getSaleHandler,
  getSalesHandler,
  updateSaleHandler,
  deleteSaleHandler,
  exportSalesHandler,
} from '../controllers/sale.controller';
import { createSaleSchema, updateSaleSchema, getSalesQuerySchema } from '../validations/sale.schema';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';

export async function saleRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  // Create sale
  fastify.post(
    '/',
    {
      preHandler: [validate(createSaleSchema)],
      schema: {
        description: 'Create a new sale',
        tags: ['sales'],
        security: [{ bearerAuth: [] }],
      },
    },
    createSaleHandler as any
  );

  // Get all sales (with filters)
  fastify.get(
    '/',
    {
      preHandler: [validate(getSalesQuerySchema)],
      schema: {
        description: 'Get sales with filters and pagination',
        tags: ['sales'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            startDate: { type: 'string', format: 'date' }, // Accept date format (YYYY-MM-DD)
            endDate: { type: 'string', format: 'date' }, // Accept date format (YYYY-MM-DD)
            creatorId: { type: 'string' },
            // Keep this enum in sync with Prisma SaleType (including BASE and MASS_MESSAGE)
            saleType: { type: 'string', enum: ['CAM', 'TIP', 'PPV', 'INITIAL', 'CUSTOM', 'BASE', 'MASS_MESSAGE'] },
            status: { type: 'string', enum: ['ONLINE', 'OFFLINE'] },
            userId: { type: 'string' },
          },
        },
      },
    },
    getSalesHandler as any
  );

  // Export sales to CSV
  fastify.get(
    '/export',
    {
      preHandler: [validate(getSalesQuerySchema)],
      schema: {
        description: 'Export sales to CSV',
        tags: ['sales'],
        security: [{ bearerAuth: [] }],
      },
    },
    exportSalesHandler as any
  );

  // Get sale by ID
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get sale by ID',
        tags: ['sales'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    getSaleHandler
  );

  // Update sale
  fastify.put(
    '/:id',
    {
      preHandler: [validate(updateSaleSchema)],
      schema: {
        description: 'Update sale (24-hour limit for chatters)',
        tags: ['sales'],
        security: [{ bearerAuth: [] }],
      },
    },
    updateSaleHandler as any
  );

  // Delete sale (managers and admins only)
  fastify.delete(
    '/:id',
    {
      schema: {
        description: 'Delete sale (managers and admins only)',
        tags: ['sales'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    deleteSaleHandler
  );
}

