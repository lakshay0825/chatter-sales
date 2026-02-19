import { FastifyInstance } from 'fastify';
import {
  getMonthOverMonthHandler,
  getYearOverYearHandler,
  getTrendAnalysisHandler,
  getPerformanceIndicatorsHandler,
  getLeaderboardHandler,
  getDailyRevenueBreakdownHandler,
  getWeeklyRevenueBreakdownHandler,
  getMonthlyRevenueBreakdownHandler,
  getMonthlySalesHeatmapHandler,
  getAvailableYearsHandler,
  getDateRangeRevenueBreakdownHandler,
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

  // Daily revenue breakdown
  fastify.get(
    '/revenue/daily',
    {
      schema: {
        description: 'Get daily revenue breakdown with creator breakdown',
        tags: ['analytics'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            date: { type: 'string', format: 'date' },
            userId: { type: 'string' },
            startDate: { type: 'string' },
            endDate: { type: 'string' },
          },
        },
      },
    },
    getDailyRevenueBreakdownHandler
  );

  // Weekly revenue breakdown
  fastify.get(
    '/revenue/weekly',
    {
      schema: {
        description: 'Get weekly revenue breakdown with creator breakdown (MON to SUN)',
        tags: ['analytics'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            weekStart: { type: 'string', format: 'date' },
            userId: { type: 'string' },
          },
        },
      },
    },
    getWeeklyRevenueBreakdownHandler
  );

  // Monthly revenue breakdown
  fastify.get(
    '/revenue/monthly',
    {
      schema: {
        description: 'Get monthly revenue breakdown with creator breakdown',
        tags: ['analytics'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            month: { type: 'string' },
            year: { type: 'string' },
            userId: { type: 'string' },
          },
        },
      },
    },
    getMonthlyRevenueBreakdownHandler
  );

  // Monthly sales heatmap (day of week × time of day)
  fastify.get(
    '/revenue/monthly-heatmap',
    {
      schema: {
        description: 'Get monthly sales heatmap by day of week and time of day',
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
    getMonthlySalesHeatmapHandler
  );

  // Get available years
  fastify.get(
    '/available-years',
    {
      schema: {
        description: 'Get available years from sales data',
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
    getAvailableYearsHandler
  );

  // Date range revenue breakdown
  fastify.get(
    '/revenue/date-range',
    {
      schema: {
        description: 'Get revenue breakdown for custom date range with creator breakdown',
        tags: ['analytics'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            userId: { type: 'string' },
          },
        },
      },
    },
    getDateRangeRevenueBreakdownHandler
  );
}

