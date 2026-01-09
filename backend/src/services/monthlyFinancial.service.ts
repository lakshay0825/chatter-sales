import { prisma } from '../config/database';
import { NotFoundError } from '../utils/errors';
import { MonthlyFinancialInput, GetMonthlyFinancialQuery } from '../validations/monthlyFinancial.schema';

/**
 * Create or update monthly financial data
 */
export async function upsertMonthlyFinancial(
  creatorId: string,
  year: number,
  month: number,
  input: MonthlyFinancialInput
) {
  // Verify creator exists
  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
  });

  if (!creator) {
    throw new NotFoundError('Creator not found');
  }

  const monthlyFinancial = await prisma.monthlyFinancial.upsert({
    where: {
      creatorId_year_month: {
        creatorId,
        year,
        month,
      },
    },
    create: {
      creatorId,
      year,
      month,
      grossRevenue: input.grossRevenue,
      marketingCosts: input.marketingCosts,
      toolCosts: input.toolCosts,
      otherCosts: input.otherCosts,
    },
    update: {
      grossRevenue: input.grossRevenue,
      marketingCosts: input.marketingCosts,
      toolCosts: input.toolCosts,
      otherCosts: input.otherCosts,
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          compensationType: true,
          revenueSharePercent: true,
          fixedSalaryCost: true,
        },
      },
    },
  });

  return monthlyFinancial;
}

/**
 * Get monthly financial data
 */
export async function getMonthlyFinancial(
  creatorId: string,
  year: number,
  month: number
) {
  const monthlyFinancial = await prisma.monthlyFinancial.findUnique({
    where: {
      creatorId_year_month: {
        creatorId,
        year,
        month,
      },
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          compensationType: true,
          revenueSharePercent: true,
          fixedSalaryCost: true,
        },
      },
    },
  });

  if (!monthlyFinancial) {
    // Return default structure if not found
    const creator = await prisma.creator.findUnique({
      where: { id: creatorId },
      select: {
        id: true,
        name: true,
        compensationType: true,
        revenueSharePercent: true,
        fixedSalaryCost: true,
      },
    });

    if (!creator) {
      throw new NotFoundError('Creator not found');
    }

    return {
      id: null,
      creatorId,
      year,
      month,
      grossRevenue: 0,
      marketingCosts: 0,
      toolCosts: 0,
      otherCosts: 0,
      creator,
    };
  }

  return monthlyFinancial;
}

/**
 * Get all monthly financials with filters
 */
export async function getMonthlyFinancials(query: GetMonthlyFinancialQuery) {
  const { creatorId, year, month } = query;

  const where: any = {};
  if (creatorId) where.creatorId = creatorId;
  if (year) where.year = year;
  if (month) where.month = month;

  const monthlyFinancials = await prisma.monthlyFinancial.findMany({
    where,
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          compensationType: true,
          revenueSharePercent: true,
          fixedSalaryCost: true,
        },
      },
    },
    orderBy: [
      { year: 'desc' },
      { month: 'desc' },
    ],
  });

  return monthlyFinancials;
}

