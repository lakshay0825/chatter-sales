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

  // Get all chatters and chatter managers
  const chatters = await prisma.user.findMany({
    where: {
      role: { in: ['CHATTER', 'CHATTER_MANAGER'] },
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
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
      avatar: chatter.avatar,
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
      sales: {
        where: {
          saleDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          amount: true,
          baseAmount: true,
          userId: true,
          user: {
            select: {
              commissionPercent: true,
              fixedSalary: true,
            },
          },
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
      customCosts: Array<{ name: string; amount: number }>;
    };
    
    if (cumulative && creator.monthlyFinancials.length > 0) {
      // Sum all monthly financials and aggregate custom costs
      const allCustomCosts: Array<{ name: string; amount: number }> = [];
      const baseFinancial = creator.monthlyFinancials.reduce(
        (acc, mf) => {
          // Collect custom costs from each month
          if (mf.customCosts && Array.isArray(mf.customCosts)) {
            allCustomCosts.push(...(mf.customCosts as Array<{ name: string; amount: number }>));
          }
          return {
            grossRevenue: acc.grossRevenue + mf.grossRevenue,
            marketingCosts: acc.marketingCosts + mf.marketingCosts,
            toolCosts: acc.toolCosts + mf.toolCosts,
            otherCosts: acc.otherCosts + mf.otherCosts,
          };
        },
        {
          grossRevenue: 0,
          marketingCosts: 0,
          toolCosts: 0,
          otherCosts: 0,
        }
      );
      financial = {
        ...baseFinancial,
        customCosts: allCustomCosts,
      };
    } else {
      const mf = creator.monthlyFinancials[0];
      financial = mf ? {
        grossRevenue: mf.grossRevenue,
        marketingCosts: mf.marketingCosts,
        toolCosts: mf.toolCosts,
        otherCosts: mf.otherCosts,
        customCosts: (mf.customCosts && Array.isArray(mf.customCosts)) 
          ? (mf.customCosts as Array<{ name: string; amount: number }>)
          : [],
      } : {
        grossRevenue: 0,
        marketingCosts: 0,
        toolCosts: 0,
        otherCosts: 0,
        customCosts: [],
      };
    }

    // Calculate total sales amount for this creator in the selected period
    const totalSalesAmount = creator.sales.reduce((sum, sale) => sum + sale.amount, 0);

    // Get OnlyFans commission percent (default to 20% if not set)
    const onlyfansCommissionPercent = creator.onlyfansCommissionPercent ?? 20;
    const onlyfansCommissionMultiplier = 1 - (onlyfansCommissionPercent / 100);
    
    // Calculate net revenue after OnlyFans commission
    const netRevenueAfterOnlyFans = totalSalesAmount * onlyfansCommissionMultiplier;

    // Calculate creator earnings based on actual sales
    // For PERCENTAGE: earnings = (net revenue after OnlyFans * creator percentage) / 100
    // For SALARY: earnings = fixed salary cost (net revenue after OnlyFans - fixed salary)
    let creatorEarnings = 0;
    if (creator.compensationType === 'PERCENTAGE' && creator.revenueSharePercent) {
      creatorEarnings = (netRevenueAfterOnlyFans * creator.revenueSharePercent) / 100;
    } else if (creator.compensationType === 'SALARY' && creator.fixedSalaryCost) {
      creatorEarnings = creator.fixedSalaryCost;
    }

    // Calculate net revenue (net revenue after OnlyFans minus creator earnings)
    const netRevenue = netRevenueAfterOnlyFans - creatorEarnings;
    
    // Calculate total custom costs
    const customCostsTotal = financial.customCosts 
      ? financial.customCosts.reduce((sum: number, cost: { name: string; amount: number }) => sum + (cost.amount || 0), 0)
      : 0;
    
    // Calculate chatter commissions for this creator's sales (only percentage-based, not fixed salary)
    let chatterCommissions = 0;
    for (const sale of creator.sales) {
      if (sale.user && sale.user.commissionPercent) {
        // Only count percentage-based commissions, not fixed salary
        const saleAmountForCommission = sale.amount + (sale.baseAmount || 0);
        chatterCommissions += (saleAmountForCommission * sale.user.commissionPercent) / 100;
      }
    }
    
    // Calculate agency profit (net revenue minus all costs including custom costs and chatter commissions)
    const agencyProfit = netRevenue - financial.marketingCosts - financial.toolCosts - financial.otherCosts - customCostsTotal - chatterCommissions;

    return {
      creatorId: creator.id,
      creatorName: creator.name,
      compensationType: creator.compensationType,
      revenueSharePercent: creator.revenueSharePercent,
      fixedSalaryCost: creator.fixedSalaryCost,
      grossRevenue: financial.grossRevenue, // Keep manually entered gross revenue for display
      totalSalesAmount, // Add actual sales amount
      creatorEarnings,
      chatterCommissions, // Add chatter commissions for this creator
      marketingCosts: financial.marketingCosts,
      toolCosts: financial.toolCosts,
      otherCosts: financial.otherCosts,
      customCosts: financial.customCosts || [],
      netRevenue,
      agencyProfit,
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

