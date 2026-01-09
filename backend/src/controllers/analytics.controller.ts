import { FastifyRequest, FastifyReply } from 'fastify';
import {
  getMonthOverMonthComparison,
  getYearOverYearComparison,
  getTrendAnalysis,
  getPerformanceIndicators,
  getChatterLeaderboard,
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

