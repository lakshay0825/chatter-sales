import { FastifyInstance } from 'fastify';
import {
  exportSalesExcelHandler,
  exportSalesPDFHandler,
  exportCommissionsExcelHandler,
  exportShiftsExcelHandler,
} from '../controllers/export.controller';
import { getSalesQuerySchema } from '../validations/sale.schema';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';

export async function exportRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  // Export sales to Excel
  fastify.get(
    '/sales/excel',
    {
      schema: {
        description: 'Export sales to Excel format',
        tags: ['exports'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            creatorId: { type: 'string' },
            saleType: { type: 'string', enum: ['CAM', 'TIP', 'PPV', 'INITIAL', 'CUSTOM'] },
            status: { type: 'string', enum: ['ONLINE', 'OFFLINE'] },
            userId: { type: 'string' },
          },
        },
      },
    },
    exportSalesExcelHandler
  );

  // Export sales to PDF
  fastify.get(
    '/sales/pdf',
    {
      schema: {
        description: 'Export sales to PDF format',
        tags: ['exports'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            creatorId: { type: 'string' },
            saleType: { type: 'string', enum: ['CAM', 'TIP', 'PPV', 'INITIAL', 'CUSTOM'] },
            status: { type: 'string', enum: ['ONLINE', 'OFFLINE'] },
            userId: { type: 'string' },
          },
        },
      },
    },
    exportSalesPDFHandler
  );

  // Export commissions to Excel
  fastify.get(
    '/commissions/excel',
    {
      schema: {
        description: 'Export commissions to Excel format',
        tags: ['exports'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            month: { type: 'integer', minimum: 1, maximum: 12 },
            year: { type: 'integer' },
          },
        },
      },
    },
    exportCommissionsExcelHandler
  );

  // Export shifts to Excel
  fastify.get(
    '/shifts/excel',
    {
      schema: {
        description: 'Export shifts to Excel format',
        tags: ['exports'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
          },
        },
      },
    },
    exportShiftsExcelHandler
  );
}

