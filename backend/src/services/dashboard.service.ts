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
    // YTD: full year Jan 1 – Dec 31 (same pattern as monthly, which works)
    startDate = new Date(year, 0, 1);
    endDate = new Date(year, 11, 31, 23, 59, 59, 999);
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

  // For YTD: use raw SQL with inline date strings (matches DB query that works)
  const safeYear = Math.min(2100, Math.max(2000, Number(year)));
  const ytdStartStr = `${safeYear}-01-01`;
  const ytdEndStr = `${safeYear}-12-31 23:59:59`;
  const useRawSqlForYtd = cumulative;

  // Calculate revenue and commissions per chatter
  const chatterRevenue: any[] = [];
  for (const chatter of chatters) {
    let revenue = 0;
    let baseEarnings = 0;

    if (useRawSqlForYtd) {
      const rows = await prisma.$queryRawUnsafe<{ totalAmount: unknown; totalBase: unknown }[]>(
        `SELECT COALESCE(SUM(amount), 0) as totalAmount, COALESCE(SUM(COALESCE(baseAmount, 0)), 0) as totalBase
         FROM sales WHERE userId = ? AND saleDate >= '${ytdStartStr}' AND saleDate <= '${ytdEndStr}'`,
        chatter.id
      );
      revenue = Number(rows[0]?.totalAmount ?? 0);
      baseEarnings = Number(rows[0]?.totalBase ?? 0);
    } else {
      const sales = await prisma.sale.aggregate({
        where: {
          userId: chatter.id,
          saleDate: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true, baseAmount: true },
      });
      revenue = sales._sum.amount || 0;
      baseEarnings = sales._sum.baseAmount || 0;
    }
    const totalBase = baseEarnings;

    // Fixed salary for the period: one month or (cumulative) fixedSalary * months
    let fixedSalaryForPeriod = chatter.fixedSalary ?? 0;
    if (cumulative && (chatter.fixedSalary ?? 0) > 0) {
      const startYear = startDate.getFullYear();
      const startMonth = startDate.getMonth() + 1;
      const endYear = endDate.getFullYear();
      const endMonth = endDate.getMonth() + 1;
      let months = 0;
      for (let y = startYear; y <= endYear; y++) {
        const monthStart = y === startYear ? startMonth : 1;
        const monthEnd = y === endYear ? endMonth : 12;
        months += monthEnd - monthStart + 1;
      }
      fixedSalaryForPeriod = (chatter.fixedSalary ?? 0) * months;
    }

    // Sales commission = percentage on variable sales only (excludes BASE and fixed salary)
    const salesCommission = (revenue * (chatter.commissionPercent ?? 0)) / 100;

    // Total retribution = TOTAL BASE + FIXED SALARY + SALES COMMISSION (matches chatter detail view)
    const totalRetribution = totalBase + fixedSalaryForPeriod + salesCommission;

    // Calculate commission (full) based on compensation type (for backward compatibility)
    let commission = 0;
    if (chatter.commissionPercent) {
      commission = salesCommission + baseEarnings;
    } else if (chatter.fixedSalary) {
      commission = cumulative ? fixedSalaryForPeriod : chatter.fixedSalary;
    } else {
      // Neither percent nor fixed: commission = BASE only; use baseEarnings (already from full date range)
      commission = baseEarnings;
    }

    chatterRevenue.push({
      chatterId: chatter.id,
      chatterName: chatter.name,
      avatar: chatter.avatar,
      revenue,
      commission,
      fixedSalary: chatter.fixedSalary ?? 0,
      totalBase,
      totalRetribution,
    });
  }

  // Calculate total commissions and total fixed salaries separately
  let totalCommissions: number;
  let totalFixedSalaries: number = 0;
  let totalOwedToChatters: number = 0;
  
  if (cumulative) {
    // For cumulative, sum all commissions from start date to end date (raw SQL for YTD)
    totalCommissions = 0;
    for (const chatter of chatters) {
      let revenue = 0;
      let baseAmount = 0;
      const rows = await prisma.$queryRawUnsafe<{ totalAmount: unknown; totalBase: unknown }[]>(
        `SELECT COALESCE(SUM(amount), 0) as totalAmount, COALESCE(SUM(COALESCE(baseAmount, 0)), 0) as totalBase
         FROM sales WHERE userId = ? AND saleDate >= '${ytdStartStr}' AND saleDate <= '${ytdEndStr}'`,
        chatter.id
      );
      revenue = Number(rows[0]?.totalAmount ?? 0);
      baseAmount = Number(rows[0]?.totalBase ?? 0);
      
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

    // YTD: amount owed = total commissions minus payments (raw SQL for date range)
    const chatterIds = chatters.map((c) => c.id);
    const placeholders = chatterIds.map(() => '?').join(',');
    const paymentsRows = await prisma.$queryRawUnsafe<{ totalAmount: unknown }[]>(
      `SELECT COALESCE(SUM(amount), 0) as totalAmount FROM payments WHERE userId IN (${placeholders}) AND paymentDate >= '${ytdStartStr}' AND paymentDate <= '${ytdEndStr}'`,
      ...chatterIds
    );
    const totalPayments = Number(paymentsRows[0]?.totalAmount ?? 0);
    totalOwedToChatters = totalCommissions - totalPayments;
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
  // For YTD: fetch sales via raw SQL (Prisma Date filter fails for year range), then join manually
  let ytdSalesByCreator: Map<string, Array<{ userId: string; amount: number; baseAmount: number; commissionPercent: number | null }>> = new Map();

  if (cumulative) {
    const ytdSalesRows = await prisma.$queryRawUnsafe<
      Array<{ creatorId: string; userId: string; amount: unknown; baseAmount: unknown; commissionPercent: number | null }>
    >(
      `SELECT s.creatorId, s.userId, s.amount, COALESCE(s.baseAmount, 0) as baseAmount, u.commissionPercent
       FROM sales s
       JOIN users u ON u.id = s.userId
       WHERE s.saleDate >= '${ytdStartStr}' AND s.saleDate <= '${ytdEndStr}'`
    );
    for (const row of ytdSalesRows) {
      const list = ytdSalesByCreator.get(row.creatorId) || [];
      list.push({
        userId: row.userId,
        amount: Number(row.amount),
        baseAmount: Number(row.baseAmount),
        commissionPercent: row.commissionPercent,
      });
      ytdSalesByCreator.set(row.creatorId, list);
    }
  }

  const creators = await prisma.creator.findMany({
    where: { isActive: true },
    include: {
      monthlyFinancials: {
        where: cumulative ? { year } : { year, month },
      },
      ...(cumulative ? {} : {
        sales: {
          where: { saleDate: { gte: startDate, lte: endDate } },
          select: {
            amount: true,
            baseAmount: true,
            userId: true,
            user: { select: { commissionPercent: true, fixedSalary: true } },
          },
        },
      }),
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
    const creatorSales = cumulative
      ? (ytdSalesByCreator.get(creator.id) || []).map((s) => ({ amount: s.amount, baseAmount: s.baseAmount, user: { commissionPercent: s.commissionPercent } }))
      : (creator.sales || []);
    const totalSalesAmount = creatorSales.reduce((sum: number, sale: { amount: number }) => sum + sale.amount, 0);

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
      creatorEarnings = cumulative ? creator.fixedSalaryCost * 12 : creator.fixedSalaryCost;
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
    for (const sale of creatorSales) {
      const commissionPercent = (sale as { user?: { commissionPercent?: number } }).user?.commissionPercent;
      if (commissionPercent) {
        const variableAmount = sale.amount;
        const baseEarnings = sale.baseAmount || 0;
        chatterCommissions += (variableAmount * commissionPercent) / 100 + baseEarnings;
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
    totalFixedSalaries,
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
  const totalVariableSales = sales.reduce((sum, sale) => sum + sale.amount, 0);
  const totalBaseEarnings = sales.reduce((sum, sale) => sum + (sale.baseAmount || 0), 0);

  // Total retribution = TOTAL BASE + FIXED SALARY (for month) + SALES COMMISSION (matches admin Revenue per Chatter)
  const fixedSalaryForMonth = user.fixedSalary ?? 0;
  const salesCommission = (totalVariableSales * (user.commissionPercent ?? 0)) / 100;
  const totalRetribution = totalBaseEarnings + fixedSalaryForMonth + salesCommission;

  const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
  // Amount owed = total retribution (for the month) minus payments, so it matches admin view
  const amountOwed = totalRetribution - totalPayments;
  // Keep totalCommission = totalRetribution for backward compatibility (same value for full month)
  const totalCommission = totalRetribution;

  return {
    user,
    dailyBreakdown,
    totalSales,
    totalCommission,
    totalRetribution,
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

