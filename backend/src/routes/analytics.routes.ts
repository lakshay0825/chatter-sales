import { FastifyInstance } from 'fastify';
import {
  getMonthOverMonthHandler,
  getYearOverYearHandler,
  getTrendAnalysisHandler,
  getPerformanceIndicatorsHandler,
  getLeaderboardHandler,
} from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth';

export async function analyticsRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  // Month-over-month comparison
  fastify.get(
    '/comparison/month-over-month',
    {
      schema: {
        description: 'Get month-over-month comparison data',
        tags: ['analytics'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            month: { type: 'integer', minimum: 1, maximum: 12 },
            year: { type: 'integer' },
            userId: { type: 'string' },
          },
        },
      },
    },
    getMonthOverMonthHandler
  );

  // Year-over-year comparison
  fastify.get(
    '/comparison/year-over-year',
    {
      schema: {
        description: 'Get year-over-year comparison data',
        tags: ['analytics'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            year: { type: 'integer' },
            userId: { type: 'string' },
          },
        },
      },
    },
    getYearOverYearHandler
  );

  // Trend analysis (last 12 months)
  fastify.get(
    '/trends',
    {
      schema: {
        description: 'Get trend analysis for last 12 months',
        tags: ['analytics'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
          },
        },
      },
    },
    getTrendAnalysisHandler
  );

  // Performance indicators
  fastify.get(
    '/performance-indicators',
    {
      schema: {
        description: 'Get performance indicators for a month',
        tags: ['analytics'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            month: { type: 'integer', minimum: 1, maximum: 12 },
            year: { type: 'integer' },
            userId: { type: 'string' },
          },
        },
      },
    },
    getPerformanceIndicatorsHandler
  );

  // Leaderboard
  fastify.get(
    '/leaderboard',
    {
      schema: {
        description: 'Get chatter leaderboard/rankings',
        tags: ['analytics'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            month: { type: 'integer', minimum: 1, maximum: 12 },
            year: { type: 'integer' },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          },
        },
      },
    },
    getLeaderboardHandler
  );
}

