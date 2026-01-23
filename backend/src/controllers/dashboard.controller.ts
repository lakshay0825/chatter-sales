import { FastifyRequest, FastifyReply } from 'fastify';
import { getChatterDashboard, getAdminDashboard, getSalesStats, getChatterDetail } from '../services/dashboard.service';
import { ApiResponse } from '../types';

export async function getChatterDashboardHandler(
  request: FastifyRequest<{ Querystring: { month?: string; year?: string; userId?: string } }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  // Chatters can only see their own dashboard
  const userId = request.query.userId || request.user.userId;
  if (request.user.role === 'CHATTER' && userId !== request.user.userId) {
    return reply.code(403).send({ success: false, error: 'Forbidden' });
  }

  const now = new Date();
  const month = request.query.month ? parseInt(request.query.month) : now.getMonth() + 1;
  const year = request.query.year ? parseInt(request.query.year) : now.getFullYear();

  const dashboard = await getChatterDashboard(userId, month, year);

  const response: ApiResponse<typeof dashboard> = {
    success: true,
    data: dashboard,
  };

  return reply.code(200).send(response);
}

export async function getAdminDashboardHandler(
  request: FastifyRequest<{ Querystring: { month?: string; year?: string; cumulative?: string } }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const now = new Date();
  const month = request.query.month ? parseInt(request.query.month) : now.getMonth() + 1;
  const year = request.query.year ? parseInt(request.query.year) : now.getFullYear();
  const cumulative = request.query.cumulative === 'true';

  const dashboard = await getAdminDashboard(month, year, cumulative);

  const response: ApiResponse<typeof dashboard> = {
    success: true,
    data: dashboard,
  };

  return reply.code(200).send(response);
}

export async function getSalesStatsHandler(
  request: FastifyRequest<{ Querystring: { month?: string; year?: string } }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const now = new Date();
  const month = request.query.month ? parseInt(request.query.month) : now.getMonth() + 1;
  const year = request.query.year ? parseInt(request.query.year) : now.getFullYear();

  const stats = await getSalesStats(request.user.role, request.user.userId, month, year);

  const response: ApiResponse<typeof stats> = {
    success: true,
    data: stats,
  };

  return reply.code(200).send(response);
}

export async function getChatterDetailHandler(
  request: FastifyRequest<{ 
    Params: { userId: string };
    Querystring: { startDate?: string; endDate?: string };
  }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const { userId } = request.params;
  const startDate = request.query.startDate ? new Date(request.query.startDate) : undefined;
  const endDate = request.query.endDate ? new Date(request.query.endDate) : undefined;

  const detail = await getChatterDetail(
    userId,
    request.user.role,
    request.user.userId,
    startDate,
    endDate
  );

  const response: ApiResponse<typeof detail> = {
    success: true,
    data: detail,
  };

  return reply.code(200).send(response);
}

