import { FastifyRequest, FastifyReply } from 'fastify';
import {
  createGoal,
  getGoalById,
  getGoals,
  updateGoal,
  deleteGoal,
  getGoalProgress,
  CreateGoalInput,
  UpdateGoalInput,
} from '../services/goal.service';
import { ApiResponse } from '../types';

export async function createGoalHandler(
  request: FastifyRequest<{ Body: CreateGoalInput }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const goal = await createGoal(request.body);

  const response: ApiResponse<typeof goal> = {
    success: true,
    data: goal,
    message: 'Goal created successfully',
  };

  return reply.code(201).send(response);
}

export async function getGoalHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const goal = await getGoalById(request.params.id);

  const response: ApiResponse<typeof goal> = {
    success: true,
    data: goal,
  };

  return reply.code(200).send(response);
}

export async function getGoalsHandler(
  request: FastifyRequest<{ Querystring: { userId?: string; creatorId?: string; type?: string; year?: string; month?: string } }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const filters: any = {};
  if (request.query.userId) filters.userId = request.query.userId;
  if (request.query.creatorId) filters.creatorId = request.query.creatorId;
  if (request.query.type) filters.type = request.query.type;
  if (request.query.year) filters.year = parseInt(request.query.year);
  if (request.query.month) filters.month = parseInt(request.query.month);

  // Chatters and chatter managers see their own goals plus all creator-level goals
  const role = request.user.role;
  if ((role === 'CHATTER' || role === 'CHATTER_MANAGER') && !request.query.userId && !request.query.creatorId) {
    filters.forChatterOrManagerUserId = request.user.userId;
  }

  const goals = await getGoals(filters);

  const response: ApiResponse<typeof goals> = {
    success: true,
    data: goals,
  };

  return reply.code(200).send(response);
}

export async function updateGoalHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateGoalInput }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const goal = await updateGoal(request.params.id, request.body);

  const response: ApiResponse<typeof goal> = {
    success: true,
    data: goal,
    message: 'Goal updated successfully',
  };

  return reply.code(200).send(response);
}

export async function deleteGoalHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  await deleteGoal(request.params.id);

  const response: ApiResponse = {
    success: true,
    message: 'Goal deleted successfully',
  };

  return reply.code(200).send(response);
}

export async function getGoalProgressHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const progress = await getGoalProgress(request.params.id);

  const response: ApiResponse<typeof progress> = {
    success: true,
    data: progress,
  };

  return reply.code(200).send(response);
}

