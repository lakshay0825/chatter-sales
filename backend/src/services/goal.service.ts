import { prisma } from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errors';
import { calculateCommission, getUserSalesTotal } from './commission.service';

export interface CreateGoalInput {
  userId?: string;
  creatorId?: string;
  type: 'SALES' | 'COMMISSION' | 'REVENUE';
  target: number;
  year: number;
  month: number; // 0 for yearly goals
}

export interface UpdateGoalInput {
  target?: number;
  month?: number;
}

/**
 * Create a new goal
 */
export async function createGoal(input: CreateGoalInput) {
  if (input.month < 0 || input.month > 12) {
    throw new ValidationError('Month must be between 0 (yearly) and 12');
  }

  if (input.target <= 0) {
    throw new ValidationError('Target must be greater than 0');
  }

  // Validate user/creator exists
  if (input.userId) {
    const user = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }
  }

  if (input.creatorId) {
    const creator = await prisma.creator.findUnique({ where: { id: input.creatorId } });
    if (!creator) {
      throw new NotFoundError('Creator not found');
    }
  }

  const goal = await prisma.goal.create({
    data: input,
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      creator: {
        select: { id: true, name: true },
      },
    },
  });

  return goal;
}

/**
 * Get goal by ID
 */
export async function getGoalById(goalId: string) {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      creator: {
        select: { id: true, name: true },
      },
    },
  });

  if (!goal) {
    throw new NotFoundError('Goal not found');
  }

  return goal;
}

/**
 * Get goals with filters
 */
export async function getGoals(filters: {
  userId?: string;
  creatorId?: string;
  type?: string;
  year?: number;
  month?: number;
}) {
  const where: any = {};

  if (filters.userId) where.userId = filters.userId;
  if (filters.creatorId) where.creatorId = filters.creatorId;
  if (filters.type) where.type = filters.type;
  if (filters.year !== undefined) where.year = filters.year;
  if (filters.month !== undefined) where.month = filters.month;

  const goals = await prisma.goal.findMany({
    where,
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      creator: {
        select: { id: true, name: true },
      },
    },
    orderBy: [
      { year: 'desc' },
      { month: 'desc' },
    ],
  });

  return goals;
}

/**
 * Update goal
 */
export async function updateGoal(goalId: string, input: UpdateGoalInput) {
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal) {
    throw new NotFoundError('Goal not found');
  }

  if (input.target !== undefined && input.target <= 0) {
    throw new ValidationError('Target must be greater than 0');
  }

  if (input.month !== undefined && (input.month < 0 || input.month > 12)) {
    throw new ValidationError('Month must be between 0 (yearly) and 12');
  }

  const updated = await prisma.goal.update({
    where: { id: goalId },
    data: input,
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      creator: {
        select: { id: true, name: true },
      },
    },
  });

  return updated;
}

/**
 * Delete goal
 */
export async function deleteGoal(goalId: string) {
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal) {
    throw new NotFoundError('Goal not found');
  }

  await prisma.goal.delete({ where: { id: goalId } });
  return { message: 'Goal deleted successfully' };
}

/**
 * Get goal progress (current vs target)
 */
export async function getGoalProgress(goalId: string) {
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal) {
    throw new NotFoundError('Goal not found');
  }

  let current = 0;

  if (goal.type === 'SALES') {
    if (goal.userId) {
      current = await getUserSalesTotal(goal.userId, goal.month || 1, goal.year);
    } else if (goal.creatorId) {
      // Get total sales for creator
      const startDate = goal.month 
        ? new Date(goal.year, goal.month - 1, 1)
        : new Date(goal.year, 0, 1);
      const endDate = goal.month
        ? new Date(goal.year, goal.month, 0, 23, 59, 59, 999)
        : new Date(goal.year, 11, 31, 23, 59, 59, 999);

      const sales = await prisma.sale.aggregate({
        where: {
          creatorId: goal.creatorId,
          saleDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { amount: true },
      });

      current = sales._sum.amount || 0;
    }
  } else if (goal.type === 'COMMISSION' && goal.userId) {
    current = await calculateCommission(goal.userId, goal.month || 1, goal.year);
  }

  const progress = goal.target > 0 ? (current / goal.target) * 100 : 0;
  const remaining = Math.max(0, goal.target - current);

  return {
    goal,
    current,
    target: goal.target,
    progress: Math.min(100, Math.max(0, progress)),
    remaining,
    achieved: current >= goal.target,
  };
}

