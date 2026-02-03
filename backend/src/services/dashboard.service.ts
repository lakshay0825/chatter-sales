import { prisma } from '../config/database';
import { UserRole } from '@prisma/client';
import { NotFoundError, ForbiddenError } from '../utils/errors';
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
    // Percentage applies only to variable sales (amount), BASE is added 1:1
    if (user.commissionPercent) {
      dailyCommissions[dayKey] += (sale.amount * user.commissionPercent) / 100;
    }
    // BASE earnings are always added 1:1
    if (sale.baseAmount) {
      dailyCommissions[dayKey] += sale.baseAmount;
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
        baseAmount: true,
      },
    });

    // SALES for creator/agency revenue should exclude BASE
    const revenue = sales._sum.amount || 0;
    const baseEarnings = sales._sum.baseAmount || 0;
    
    // Calculate commission based on compensation type
    let commission = 0;
    if (chatter.commissionPercent) {
      // Percentage on variable sales only, BASE added 1:1
      commission = (revenue * chatter.commissionPercent) / 100 + baseEarnings;
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
      fixedSalary: chatter.fixedSalary ?? 0,
    });
  }

  // Calculate total commissions and total fixed salaries separately
  let totalCommissions: number;
  let totalFixedSalaries: number = 0;
  let totalOwedToChatters: number = 0;
  
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
          baseAmount: true,
        },
      });
      
      const revenue = sales._sum.amount || 0;
      const baseAmount = sales._sum.baseAmount || 0;
      
      // Calculate commission based on compensation type
      if (chatter.commissionPercent) {
        totalCommissions += (revenue * chatter.commissionPercent) / 100 + baseAmount;
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
        
        const fixedSalaryTotal = chatter.fixedSalary * months;
        totalFixedSalaries += fixedSalaryTotal;
        totalCommissions += fixedSalaryTotal + baseAmount;
      } else {
        totalCommissions += baseAmount;
      }
  }
  } else {
    totalCommissions = await calculateTotalCommissions(month, year);
    // Calculate total fixed salaries for the month
    for (const chatter of chatters) {
      if (chatter.fixedSalary) {
        totalFixedSalaries += chatter.fixedSalary;
      }
    }

    // For the selected month, compute total amount owed to all chatters:
    //   total commissions (percentage + BASE + fixed) minus payments sent in the same period.
    const paymentsAgg = await prisma.payment.aggregate({
      where: {
        userId: {
          in: chatters.map((c) => c.id),
        },
        paymentDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const totalPaymentsToChatters = paymentsAgg._sum.amount || 0;
    totalOwedToChatters = totalCommissions - totalPaymentsToChatters;
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
    // SALES for creator earnings should exclude BASE – BASE is chatter-only
    const totalSalesAmount = creator.sales.reduce(
      (sum, sale) => sum + sale.amount,
      0
    );

    // Get OnlyFans commission percent (default to 20% if not set)
    const onlyfansCommissionPercent = creator.onlyfansCommissionPercent ?? 20;

    // Cashback logic:
    // - OnlyFans always takes 20% from creators' perspective
    // - Some creators give 5% cashback to the agency (effective 15% platform fee)
    // - Creator earnings are ALWAYS calculated on Revenue * 0.8 (after 20%)
    // - Cashback (if any) is additional margin for the agency only
    const cashbackPercent = onlyfansCommissionPercent === 15 ? 5 : 0;

    const cashback = totalSalesAmount * (cashbackPercent / 100);

    // Revenue after OnlyFans 20% (used for creator earnings)
    const revenueAfterOnlyFans20 = totalSalesAmount * 0.8;

    // Calculate creator earnings based on actual sales
    // For PERCENTAGE: earnings = (Revenue * 0.8 * creator%) as per spec
    // For SALARY: earnings = fixed salary cost
    let creatorEarnings = 0;
    if (creator.compensationType === 'PERCENTAGE' && creator.revenueSharePercent) {
      creatorEarnings = (revenueAfterOnlyFans20 * creator.revenueSharePercent) / 100;
    } else if (creator.compensationType === 'SALARY' && creator.fixedSalaryCost) {
      creatorEarnings = creator.fixedSalaryCost;
    }

    // Calculate net revenue from the agency perspective:
    // Net Revenue = (Revenue * 0.8 - Creator Earnings) + Cashback (if present)
    const netRevenue = revenueAfterOnlyFans20 - creatorEarnings + cashback;
    
    // Calculate total custom costs
    const customCostsTotal = financial.customCosts 
      ? financial.customCosts.reduce((sum: number, cost: { name: string; amount: number }) => sum + (cost.amount || 0), 0)
      : 0;
    
    // Calculate chatter commissions for this creator's sales. 
    // For percentage-based chatters:
    //   - commission% applies ONLY to variable sales (amount)
    //   - BASE earnings are added 1:1
    // Fixed salaries are NOT included here (handled separately in total commissions).
    let chatterCommissions = 0;
    for (const sale of creator.sales) {
      if (sale.user && sale.user.commissionPercent) {
        const variableAmount = sale.amount;
        const baseEarnings = sale.baseAmount || 0;
        chatterCommissions +=
          (variableAmount * sale.user.commissionPercent) / 100 +
          baseEarnings;
      }
    }
    
    // Agency profit: Net Revenue minus ALL costs, including chatter commissions.
    // This matches the visual breakdown: Net Revenue
    //  - Chatter Commissions
    //  - Marketing Costs
    //  - Infloww Cost
    //  - Other/Custom Costs
    const agencyProfit =
      netRevenue -
      chatterCommissions -
      financial.marketingCosts -
      financial.toolCosts -
      financial.otherCosts -
      customCostsTotal;

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
    totalFixedSalaries, // Add total fixed salaries for agency earnings calculation
    totalOwedToChatters,
    creatorFinancials,
  };
}

/**
 * Get chatter detail data with daily breakdown and payments
 */
export async function getChatterDetail(
  targetUserId: string,
  userRole: UserRole,
  requestingUserId: string,
  startDate?: Date,
  _endDate?: Date
) {
  // Only admins can view other chatters' details
  if (userRole !== 'ADMIN' && targetUserId !== requestingUserId) {
    throw new ForbiddenError('You can only view your own details');
  }

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      commissionPercent: true,
      fixedSalary: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // For chatter dashboards we always work on full calendar months.
  // Use the month of the provided startDate (coming from the frontend month selector),
  // or the current month if none is provided.
  const base = startDate || new Date();
  const defaultStartDate = new Date(base.getFullYear(), base.getMonth(), 1);
  const defaultEndDate = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999);
  const daysDiff = Math.ceil((defaultEndDate.getTime() - defaultStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Get sales in date range
  const sales = await prisma.sale.findMany({
    where: {
      userId: targetUserId,
      saleDate: {
        gte: defaultStartDate,
        lte: defaultEndDate,
      },
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      saleDate: 'asc',
    },
  });

  // Get payments in date range
  const payments = await prisma.payment.findMany({
    where: {
      userId: targetUserId,
      paymentDate: {
        gte: defaultStartDate,
        lte: defaultEndDate,
      },
    },
    orderBy: {
      paymentDate: 'desc',
    },
  });

  // Helper to generate a stable local calendar date key (YYYY-MM-DD) without timezone shifts
  const toLocalDateKey = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Group sales by day (using local calendar date keys)
  const dailyData: {
    [key: string]: {
      sales: number;
      commissionPercentOnly: number;
      baseEarnings: number;
      fixedSalaryPortion: number;
      count: number;
    };
  } = {};

  sales.forEach((sale) => {
    const dayKey = toLocalDateKey(sale.saleDate);
    if (!dailyData[dayKey]) {
      dailyData[dayKey] = {
        sales: 0,
        commissionPercentOnly: 0,
        baseEarnings: 0,
        fixedSalaryPortion: 0,
        count: 0,
      };
    }
    dailyData[dayKey].sales += sale.amount;
    dailyData[dayKey].count += 1;
    dailyData[dayKey].baseEarnings += sale.baseAmount || 0;
    
    // Calculate percentage commission for this sale (EXCLUDING fixed salary and BASE)
    if (user.commissionPercent) {
      dailyData[dayKey].commissionPercentOnly += (sale.amount * user.commissionPercent) / 100;
    }
  });

  // Distribute fixed salary evenly across days that have activity in the selected range
  if (user.fixedSalary && Object.keys(dailyData).length > 0) {
    const daysInMonthApprox = 30; // keep approximation consistent with total calculation
    const totalSalaryForRange = (user.fixedSalary / daysInMonthApprox) * daysDiff;
    const perActiveDaySalary = totalSalaryForRange / Object.keys(dailyData).length;

    Object.keys(dailyData).forEach((day) => {
      dailyData[day].fixedSalaryPortion = perActiveDaySalary;
    });
  }

  // Ensure we have an entry for every calendar day in the selected range,
  // even if there were no sales that day. This lets the UI render a full
  // month view instead of only days with activity.
  const cursor = new Date(defaultStartDate);
  cursor.setHours(0, 0, 0, 0);
  const endOfRange = new Date(defaultEndDate);
  endOfRange.setHours(0, 0, 0, 0);

  while (cursor <= endOfRange) {
    const dayKey = toLocalDateKey(cursor);
    if (!dailyData[dayKey]) {
      dailyData[dayKey] = {
        sales: 0,
        commissionPercentOnly: 0,
        baseEarnings: 0,
        fixedSalaryPortion: 0,
        count: 0,
      };
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  // Convert to arrays for charts / tables, sorted by date.
  // Clamp to the selected month so older/next‑month days never appear
  // even if timezone conversions shift raw timestamps.
  const targetMonth = defaultStartDate.getMonth() + 1; // 1-12
  const dailyBreakdown = Object.entries(dailyData)
    .filter(([dateKey]) => {
      const monthPart = parseInt(dateKey.split('-')[1] || '0', 10);
      return monthPart === targetMonth;
    })
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, data]) => ({
      date,
      sales: data.sales,
      // For graphs/tables we now expose ONLY percentage-based commission
      commission: Math.round(data.commissionPercentOnly * 100) / 100,
      baseEarnings: Math.round(data.baseEarnings * 100) / 100,
      fixedSalaryPortion: Math.round(data.fixedSalaryPortion * 100) / 100,
      count: data.count,
    }));

  // Calculate totals
  const totalSales = sales.reduce((sum, sale) => sum + sale.amount, 0);
  
  // Calculate total commission from sales
  let totalCommission = 0;
  const totalVariableSales = sales.reduce((sum, sale) => sum + sale.amount, 0);
  const totalBaseEarnings = sales.reduce((sum, sale) => sum + (sale.baseAmount || 0), 0);
  
  if (user.commissionPercent !== null) {
    totalCommission += (totalVariableSales * user.commissionPercent) / 100;
  }
  
  if (user.fixedSalary !== null) {
    // Calculate fixed salary for the date range
    const daysInMonth = 30; // Approximate
    totalCommission += (user.fixedSalary / daysInMonth) * daysDiff;
  }
  
  // BASE earnings are always added 1:1
  totalCommission += totalBaseEarnings;
  
  const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const amountOwed = totalCommission - totalPayments;

  return {
    user,
    dailyBreakdown,
    totalSales,
    totalCommission,
    payments,
    totalPayments,
    amountOwed,
    startDate: defaultStartDate,
    endDate: defaultEndDate,
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

