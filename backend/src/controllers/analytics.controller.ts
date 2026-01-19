import { FastifyRequest, FastifyReply } from 'fastify';
import {
  getMonthOverMonthComparison,
  getYearOverYearComparison,
  getTrendAnalysis,
  getPerformanceIndicators,
  getChatterLeaderboard,
  getDailyRevenueBreakdown,
  getWeeklyRevenueBreakdown,
  getAvailableYears,
  getDateRangeRevenueBreakdown,
} from '../services/analytics.service';
import { ApiResponse } from '../types';

export async function getMonthOverMonthHandler(
  request: FastifyRequest<{ Querystring: { month?: string; year?: string; userId?: string } }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const now = new Date();
  const month = request.query.month ? parseInt(request.query.month) : now.getMonth() + 1;
  const year = request.query.year ? parseInt(request.query.year) : now.getFullYear();
  const userId = request.query.userId || (request.user.role === 'CHATTER' ? request.user.userId : undefined);

  const comparison = await getMonthOverMonthComparison(month, year, userId);

  const response: ApiResponse<typeof comparison> = {
    success: true,
    data: comparison,
  };

  return reply.code(200).send(response);
}

export async function getYearOverYearHandler(
  request: FastifyRequest<{ Querystring: { year?: string; userId?: string } }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const now = new Date();
  const year = request.query.year ? parseInt(request.query.year) : now.getFullYear();
  const userId = request.query.userId || (request.user.role === 'CHATTER' ? request.user.userId : undefined);

  const comparison = await getYearOverYearComparison(year, userId);

  const response: ApiResponse<typeof comparison> = {
    success: true,
    data: comparison,
  };

  return reply.code(200).send(response);
}

export async function getTrendAnalysisHandler(
  request: FastifyRequest<{ Querystring: { userId?: string } }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const userId = request.query.userId || (request.user.role === 'CHATTER' ? request.user.userId : undefined);

  const trends = await getTrendAnalysis(userId);

  const response: ApiResponse<typeof trends> = {
    success: true,
    data: trends,
  };

  return reply.code(200).send(response);
}

export async function getPerformanceIndicatorsHandler(
  request: FastifyRequest<{ Querystring: { month?: string; year?: string; userId?: string } }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const now = new Date();
  const month = request.query.month ? parseInt(request.query.month) : now.getMonth() + 1;
  const year = request.query.year ? parseInt(request.query.year) : now.getFullYear();
  const userId = request.query.userId || (request.user.role === 'CHATTER' ? request.user.userId : undefined);

  const indicators = await getPerformanceIndicators(month, year, userId);

  const response: ApiResponse<typeof indicators> = {
    success: true,
    data: indicators,
  };

  return reply.code(200).send(response);
}

export async function getLeaderboardHandler(
  request: FastifyRequest<{ Querystring: { month?: string; year?: string; limit?: string } }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const now = new Date();
  const month = request.query.month ? parseInt(request.query.month) : now.getMonth() + 1;
  const year = request.query.year ? parseInt(request.query.year) : now.getFullYear();
  const limit = request.query.limit ? parseInt(request.query.limit) : 10;

  const leaderboard = await getChatterLeaderboard(month, year, limit);

  const response: ApiResponse<typeof leaderboard> = {
    success: true,
    data: leaderboard,
  };

  return reply.code(200).send(response);
}

export async function getDailyRevenueBreakdownHandler(
  request: FastifyRequest<{ Querystring: { date?: string; userId?: string } }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const date = request.query.date ? new Date(request.query.date) : new Date();
  const userId = request.query.userId || (request.user.role === 'CHATTER' ? request.user.userId : undefined);

  const breakdown = await getDailyRevenueBreakdown(date, userId);

  const response: ApiResponse<typeof breakdown> = {
    success: true,
    data: breakdown,
  };

  return reply.code(200).send(response);
}

export async function getWeeklyRevenueBreakdownHandler(
  request: FastifyRequest<{ Querystring: { weekStart?: string; userId?: string } }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const weekStart = request.query.weekStart ? new Date(request.query.weekStart) : new Date();
  const userId = request.query.userId || (request.user.role === 'CHATTER' ? request.user.userId : undefined);

  const breakdown = await getWeeklyRevenueBreakdown(weekStart, userId);

  const response: ApiResponse<typeof breakdown> = {
    success: true,
    data: breakdown,
  };

  return reply.code(200).send(response);
}

export async function getAvailableYearsHandler(
  request: FastifyRequest<{ Querystring: { userId?: string } }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const userId = request.query.userId || (request.user.role === 'CHATTER' ? request.user.userId : undefined);

  const years = await getAvailableYears(userId);

  const response: ApiResponse<number[]> = {
    success: true,
    data: years,
  };

  return reply.code(200).send(response);
}

export async function getDateRangeRevenueBreakdownHandler(
  request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string; userId?: string } }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const startDate = request.query.startDate ? new Date(request.query.startDate) : new Date();
  const endDate = request.query.endDate ? new Date(request.query.endDate) : new Date();
  const userId = request.query.userId || (request.user.role === 'CHATTER' ? request.user.userId : undefined);

  const breakdown = await getDateRangeRevenueBreakdown(startDate, endDate, userId);

  const response: ApiResponse<typeof breakdown> = {
    success: true,
    data: breakdown,
  };

  return reply.code(200).send(response);
}
