import { prisma } from '../config/database';
import { UserRole } from '@prisma/client';
import { NotFoundError } from '../utils/errors';
import { calculateCommission, getUserSalesTotal, calculateTotalCommissions } from './commission.service';

/**
 * Get chatter dashboard data (monthly performance)
 */
export async function getChatterDashboard(userId: string, month: number, year: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Calculate date range for the month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // Get daily sales data
  const sales = await prisma.sale.findMany({
    where: {
      userId,
      saleDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      saleDate: 'asc',
    },
  });

  // Group sales by day
  const dailySales: { [key: string]: number } = {};
  const dailyCommissions: { [key: string]: number } = {};

  sales.forEach((sale) => {
    const dayKey = sale.saleDate.toISOString().split('T')[0];
    if (!dailySales[dayKey]) {
      dailySales[dayKey] = 0;
      dailyCommissions[dayKey] = 0;
    }
    dailySales[dayKey] += sale.amount;
    
    // Calculate commission for this sale
    if (user.commissionPercent) {
      dailyCommissions[dayKey] += (sale.amount * user.commissionPercent) / 100;
    }
  });

  // Add fixed salary to each day (distributed)
  if (user.fixedSalary) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailySalary = user.fixedSalary / daysInMonth;
    Object.keys(dailyCommissions).forEach((day) => {
      dailyCommissions[day] += dailySalary;
    });
  }

  // Convert to arrays for charts
  const salesChartData = Object.entries(dailySales).map(([date, amount]) => ({
    date,
    amount,
  }));

  const commissionsChartData = Object.entries(dailyCommissions).map(([date, amount]) => ({
    date,
    amount: Math.round(amount * 100) / 100, // Round to 2 decimal places
  }));

  // Calculate totals
  const totalSales = await getUserSalesTotal(userId, month, year);
  const totalCommissions = await calculateCommission(userId, month, year);

  return {
    salesChartData,
    commissionsChartData,
    totalSales,
    totalCommissions,
    user: {
      id: user.id,
      name: user.name,
      commissionPercent: user.commissionPercent,
      fixedSalary: user.fixedSalary,
    },
  };
}

/**
 * Get admin recap dashboard
 */
export async function getAdminDashboard(month: number, year: number, cumulative: boolean = false) {
  // Calculate date range
  let startDate: Date;
  let endDate: Date;
  
  if (cumulative) {
    // Cumulative: from the beginning of time to the end of selected month
    startDate = new Date(2000, 0, 1); // Start from year 2000
    endDate = new Date(year, month, 0, 23, 59, 59, 999);
  } else {
    // Monthly: just the selected month
    startDate = new Date(year, month - 1, 1);
    endDate = new Date(year, month, 0, 23, 59, 59, 999);
  }

  // Get all chatters
  const chatters = await prisma.user.findMany({
    where: {
      role: 'CHATTER',
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      commissionPercent: true,
      fixedSalary: true,
    },
  });

  // Calculate revenue and commissions per chatter
  const chatterRevenue: any[] = [];
  for (const chatter of chatters) {
    const sales = await prisma.sale.aggregate({
      where: {
        userId: chatter.id,
        saleDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const revenue = sales._sum.amount || 0;
    
    // Calculate commission based on compensation type
    let commission = 0;
    if (chatter.commissionPercent) {
      commission = (revenue * chatter.commissionPercent) / 100;
    } else if (chatter.fixedSalary) {
      // For cumulative view with fixed salary, calculate based on months
      if (cumulative) {
        const startYear = startDate.getFullYear();
        const startMonth = startDate.getMonth() + 1;
        const endYear = endDate.getFullYear();
        const endMonth = endDate.getMonth() + 1;
        
        let months = 0;
        for (let y = startYear; y <= endYear; y++) {
          const monthStart = y === startYear ? startMonth : 1;
          const monthEnd = y === endYear ? endMonth : 12;
          months += (monthEnd - monthStart + 1);
        }
        commission = chatter.fixedSalary * months;
      } else {
        commission = chatter.fixedSalary;
      }
    } else {
      // Fallback to calculateCommission for monthly view
      commission = await calculateCommission(chatter.id, month, year);
    }

    chatterRevenue.push({
      chatterId: chatter.id,
      chatterName: chatter.name,
      revenue,
      commission,
    });
  }

  // Calculate total commissions
  let totalCommissions: number;
  if (cumulative) {
    // For cumulative, sum all commissions from start date to end date
    totalCommissions = 0;
    for (const chatter of chatters) {
      // Get all sales for this chatter in the date range
      const sales = await prisma.sale.aggregate({
        where: {
          userId: chatter.id,
          saleDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: {
          amount: true,
        },
      });
      
      const revenue = sales._sum.amount || 0;
      
      // Calculate commission based on compensation type
      if (chatter.commissionPercent) {
        totalCommissions += (revenue * chatter.commissionPercent) / 100;
      } else if (chatter.fixedSalary) {
        // For fixed salary, calculate based on number of months
        const startYear = startDate.getFullYear();
        const startMonth = startDate.getMonth() + 1;
        const endYear = endDate.getFullYear();
        const endMonth = endDate.getMonth() + 1;
        
        let months = 0;
        for (let y = startYear; y <= endYear; y++) {
          const monthStart = y === startYear ? startMonth : 1;
          const monthEnd = y === endYear ? endMonth : 12;
          months += (monthEnd - monthStart + 1);
        }
        
        totalCommissions += chatter.fixedSalary * months;
      }
    }
  } else {
    totalCommissions = await calculateTotalCommissions(month, year);
  }

  // Get creator-level financial data
  const creators = await prisma.creator.findMany({
    where: { isActive: true },
    include: {
      monthlyFinancials: {
        where: cumulative
          ? {
              // For cumulative, get all financials up to the selected month
              year: {
                lte: year,
              },
              OR: [
                { year: { lt: year } },
                { year, month: { lte: month } },
              ],
            }
          : {
              year,
              month,
            },
      },
    },
  });

  const creatorFinancials = creators.map((creator) => {
    // Aggregate financials if cumulative
    let financial: {
      grossRevenue: number;
      marketingCosts: number;
      toolCosts: number;
      otherCosts: number;
    };
    
    if (cumulative && creator.monthlyFinancials.length > 0) {
      // Sum all monthly financials
      financial = creator.monthlyFinancials.reduce(
        (acc, mf) => ({
          grossRevenue: acc.grossRevenue + mf.grossRevenue,
          marketingCosts: acc.marketingCosts + mf.marketingCosts,
          toolCosts: acc.toolCosts + mf.toolCosts,
          otherCosts: acc.otherCosts + mf.otherCosts,
        }),
        {
          grossRevenue: 0,
          marketingCosts: 0,
          toolCosts: 0,
          otherCosts: 0,
        }
      );
    } else {
      financial = creator.monthlyFinancials[0] || {
        grossRevenue: 0,
        marketingCosts: 0,
        toolCosts: 0,
        otherCosts: 0,
      };
    }

    // Calculate creator earnings
    let creatorEarnings = 0;
    if (creator.compensationType === 'PERCENTAGE' && creator.revenueSharePercent) {
      creatorEarnings = (financial.grossRevenue * creator.revenueSharePercent) / 100;
    } else if (creator.compensationType === 'SALARY' && creator.fixedSalaryCost) {
      creatorEarnings = creator.fixedSalaryCost;
    }

    // Calculate net revenue
    const netRevenue = financial.grossRevenue - creatorEarnings - financial.marketingCosts - financial.toolCosts - financial.otherCosts;

    return {
      creatorId: creator.id,
      creatorName: creator.name,
      compensationType: creator.compensationType,
      revenueSharePercent: creator.revenueSharePercent,
      fixedSalaryCost: creator.fixedSalaryCost,
      grossRevenue: financial.grossRevenue,
      creatorEarnings,
      marketingCosts: financial.marketingCosts,
      toolCosts: financial.toolCosts,
      otherCosts: financial.otherCosts,
      netRevenue,
    };
  });

  return {
    month,
    year,
    chatterRevenue,
    totalCommissions,
    creatorFinancials,
  };
}

/**
 * Get sales statistics
 */
export async function getSalesStats(userRole: UserRole, userId: string, month: number, year: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const where: any = {
    saleDate: {
      gte: startDate,
      lte: endDate,
    },
  };

  // Chatters can only see their own stats
  if (userRole === 'CHATTER') {
    where.userId = userId;
  }

  const [totalSales, totalAmount, byType, byStatus] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.aggregate({
      where,
      _sum: { amount: true },
    }),
    prisma.sale.groupBy({
      by: ['saleType'],
      where,
      _sum: { amount: true },
      _count: true,
    }),
    prisma.sale.groupBy({
      by: ['status'],
      where,
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  return {
    totalSales,
    totalAmount: totalAmount._sum.amount || 0,
    byType: byType.map((item) => ({
      type: item.saleType,
      count: item._count,
      amount: item._sum.amount || 0,
    })),
    byStatus: byStatus.map((item) => ({
      status: item.status,
      count: item._count,
      amount: item._sum.amount || 0,
    })),
  };
}

