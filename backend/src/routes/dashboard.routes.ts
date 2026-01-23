import { FastifyInstance } from 'fastify';
import {
  getChatterDashboardHandler,
  getAdminDashboardHandler,
  getSalesStatsHandler,
  getChatterDetailHandler,
} from '../controllers/dashboard.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

export async function dashboardRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  // Chatter dashboard (accessible to all authenticated users, but chatters can only see their own)
  fastify.get(
    '/chatter',
    {
      schema: {
        description: 'Get chatter dashboard (monthly performance)',
        tags: ['dashboard'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            month: { type: 'integer', minimum: 1, maximum: 12 },
            year: { type: 'integer' },
          },
        },
      },
    },
    getChatterDashboardHandler
  );

  // Sales statistics
  fastify.get(
    '/sales-stats',
    {
      schema: {
        description: 'Get sales statistics',
        tags: ['dashboard'],
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
    getSalesStatsHandler
  );

  // Admin dashboard (Admin only)
  fastify.get(
    '/admin',
    {
      preHandler: [requireAdmin],
      schema: {
        description: 'Get admin recap dashboard (Admin only)',
        tags: ['dashboard'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            month: { type: 'integer', minimum: 1, maximum: 12 },
            year: { type: 'integer' },
            cumulative: { type: 'boolean' },
          },
        },
      },
    },
    getAdminDashboardHandler as any
  );

  // Chatter detail (Admin can view any, others can only view their own)
  fastify.get(
    '/chatter/:userId',
    {
      schema: {
        description: 'Get chatter detail with daily breakdown and payments',
        tags: ['dashboard'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
          },
        },
      },
    },
    getChatterDetailHandler as any
  );
}

