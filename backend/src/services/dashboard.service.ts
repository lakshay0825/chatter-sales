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
    
    // Calculate commission for this sale: use special rate when sale.useSpecialCommission
    const basePct = user.commissionPercent ?? 0;
    const specialPct = user.specialCommissionPercent ?? basePct;
    const pct = sale.useSpecialCommission && specialPct > 0 ? specialPct : basePct;
    if (pct > 0) {
      dailyCommissions[dayKey] += (sale.amount * pct) / 100;
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
      specialCommissionPercent: user.specialCommissionPercent,
      fixedSalary: user.fixedSalary,
    },
  };
}

/**
 * Get admin recap dashboard
 */
type AdminDashboardResult = {
  month: number;
  year: number;
  chatterRevenue: Array<{
    chatterId: string;
    chatterName: string;
    avatar?: string;
    revenue: number;
    commission: number;
    fixedSalary: number;
    totalBase: number;
    bonus: number;
    totalRetribution: number;
  }>;
  totalCommissions: number;
  totalFixedSalaries?: number;
  totalOwedToChatters?: number;
  totalBonuses?: number;
  creatorFinancials: Array<{
    creatorId: string;
    creatorName: string;
    compensationType: string;
    revenueSharePercent?: number | null;
    fixedSalaryCost?: number | null;
    grossRevenue: number;
    totalSalesAmount: number;
    creatorEarnings: number;
    chatterCommissions: number;
    marketingCosts: number;
    toolCosts: number;
    otherCosts: number;
    customCosts: Array<{ name: string; amount: number }>;
    paymentProcessorCostPercent?: number;
    paymentProcessorCost?: number;
    netRevenue: number;
    agencyProfit: number;
  }>;
};

export async function getAdminDashboard(
  month: number,
  year: number,
  cumulative: boolean = false
): Promise<AdminDashboardResult> {
  // When cumulative/YTD is requested, build it as the sum of all monthly
  // figures in the selected year so that YTD matches the sum of each month.
  if (cumulative) {
    const monthlyResults: AdminDashboardResult[] = [];
    for (let m = 1; m <= 12; m++) {
      const result = await getAdminDashboard(m, year, false);
      monthlyResults.push(result);
    }

    // Aggregate chatter revenue across all months
    const chatterMap = new Map<string, AdminDashboardResult['chatterRevenue'][number]>();

    for (const res of monthlyResults) {
      for (const item of res.chatterRevenue) {
        const existing =
          chatterMap.get(item.chatterId) || {
            chatterId: item.chatterId,
            chatterName: item.chatterName,
            avatar: item.avatar,
            revenue: 0,
            commission: 0,
            fixedSalary: 0,
            totalBase: 0,
            bonus: 0,
            totalRetribution: 0,
          };
        existing.revenue += item.revenue;
        existing.commission += item.commission;
        existing.fixedSalary += item.fixedSalary;
        existing.totalBase += item.totalBase ?? 0;
        existing.bonus += item.bonus ?? 0;
        existing.totalRetribution += item.totalRetribution ?? 0;
        chatterMap.set(item.chatterId, existing);
      }
    }

    // Aggregate creator financials across all months
    const creatorMap = new Map<string, AdminDashboardResult['creatorFinancials'][number]>();

    for (const res of monthlyResults) {
      for (const cf of res.creatorFinancials) {
        const existing = creatorMap.get(cf.creatorId) || {
          creatorId: cf.creatorId,
          creatorName: cf.creatorName,
          compensationType: cf.compensationType,
          revenueSharePercent: cf.revenueSharePercent,
          fixedSalaryCost: cf.fixedSalaryCost,
          grossRevenue: 0,
          totalSalesAmount: 0,
          creatorEarnings: 0,
          chatterCommissions: 0,
          marketingCosts: 0,
          toolCosts: 0,
          otherCosts: 0,
          customCosts: [],
          paymentProcessorCostPercent: cf.paymentProcessorCostPercent,
          paymentProcessorCost: 0,
          netRevenue: 0,
          agencyProfit: 0,
        };

        existing.grossRevenue += cf.grossRevenue;
        existing.totalSalesAmount += cf.totalSalesAmount;
        existing.creatorEarnings += cf.creatorEarnings;
        existing.chatterCommissions += cf.chatterCommissions;
        existing.marketingCosts += cf.marketingCosts;
        existing.toolCosts += cf.toolCosts;
        existing.otherCosts += cf.otherCosts;
        existing.netRevenue += cf.netRevenue;
        existing.agencyProfit += cf.agencyProfit;
        existing.paymentProcessorCost = (existing.paymentProcessorCost ?? 0) + (cf.paymentProcessorCost ?? 0);

        if (cf.customCosts && cf.customCosts.length > 0) {
          existing.customCosts = [...existing.customCosts, ...cf.customCosts];
        }

        creatorMap.set(cf.creatorId, existing);
      }
    }

    const chatterRevenue = Array.from(chatterMap.values());
    const creatorFinancials = Array.from(creatorMap.values());

    const totalCommissions: number = monthlyResults.reduce(
      (sum, res) => sum + (res.totalCommissions || 0),
      0
    );
    const totalFixedSalaries: number = monthlyResults.reduce(
      (sum, res) => sum + (res.totalFixedSalaries || 0),
      0
    );
    const totalOwedToChatters: number = monthlyResults.reduce(
      (sum, res) => sum + (res.totalOwedToChatters || 0),
      0
    );
    const totalBonuses: number = monthlyResults.reduce(
      (sum, res) => sum + (res.totalBonuses || 0),
      0
    );

    return {
      month: 12,
      year,
      chatterRevenue,
      totalCommissions,
      totalFixedSalaries,
      totalOwedToChatters,
      totalBonuses,
      creatorFinancials,
    };
  }

  // Monthly path: just the selected month
  // Calculate date range
  let startDate: Date;
  let endDate: Date;
  startDate = new Date(year, month - 1, 1);
  endDate = new Date(year, month, 0, 23, 59, 59, 999);

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
      specialCommissionPercent: true,
      fixedSalary: true,
    },
  });

  // Pre-calculate bonuses per chatter for this month (payments whose note mentions "bonus")
  const bonusByChatter = await prisma.payment.groupBy({
    by: ['userId'],
    where: {
      paymentDate: {
        gte: startDate,
        lte: endDate,
      },
      note: {
        contains: 'bonus',
      },
    },
    _sum: {
      amount: true,
    },
  });
  const bonusMap = new Map<string, number>();
  for (const row of bonusByChatter) {
    bonusMap.set(row.userId, (row._sum?.amount as number | null) || 0);
  }

  let totalBonuses = 0;

  // Calculate revenue, commissions and bonuses per chatter
  const chatterRevenue: any[] = [];
  for (const chatter of chatters) {
    let revenue = 0;
    let baseEarnings = 0;

    const salesList = await prisma.sale.findMany({
      where: {
        userId: chatter.id,
        saleDate: { gte: startDate, lte: endDate },
      },
      select: { amount: true, baseAmount: true, useSpecialCommission: true },
    });
    revenue = salesList.reduce((s, x) => s + x.amount, 0);
    baseEarnings = salesList.reduce((s, x) => s + (x.baseAmount || 0), 0);
    const totalBase = baseEarnings;

    const basePct = chatter.commissionPercent ?? 0;
    const specialPct = chatter.specialCommissionPercent ?? basePct;
    let salesCommission = 0;
    for (const sale of salesList) {
      const pct = sale.useSpecialCommission && specialPct > 0 ? specialPct : basePct;
      salesCommission += (sale.amount * pct) / 100;
    }

    // Fixed salary for the period: one month
    let fixedSalaryForPeriod = chatter.fixedSalary ?? 0;

    // Bonuses paid to this chatter in the month
    const bonus = bonusMap.get(chatter.id) || 0;
    totalBonuses += bonus;

    // Total retribution = TOTAL BASE + FIXED SALARY + SALES COMMISSION + BONUSES
    const totalRetribution = totalBase + fixedSalaryForPeriod + salesCommission + bonus;

    // Calculate commission (full) based on compensation type (for backward compatibility)
    let commission = 0;
    if (chatter.commissionPercent) {
      commission = salesCommission + baseEarnings;
    } else if (chatter.fixedSalary) {
      commission = chatter.fixedSalary;
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
      bonus,
      totalRetribution,
    });
  }

  // Calculate total commissions and total fixed salaries separately
  let totalCommissions: number;
  let totalFixedSalaries: number = 0;
  let totalOwedToChatters: number = 0;
  
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

  const creators = await prisma.creator.findMany({
    where: { isActive: true },
    include: {
      monthlyFinancials: {
        where: { year, month },
      },
      sales: {
        where: { saleDate: { gte: startDate, lte: endDate } },
        select: {
          amount: true,
          baseAmount: true,
          useSpecialCommission: true,
          userId: true,
          user: { select: { commissionPercent: true, specialCommissionPercent: true, fixedSalary: true } },
        },
      },
    },
  });

  const creatorFinancials = creators.map((creator) => {
    let financial: {
      grossRevenue: number;
      marketingCosts: number;
      toolCosts: number;
      otherCosts: number;
      customCosts: Array<{ name: string; amount: number }>;
    };
    
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

    // Calculate total sales amount for this creator in the selected period
    // SALES for creator earnings should exclude BASE – BASE is chatter-only
    const creatorSales = creator.sales || [];
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
    // For percentage-based chatters: use specialCommissionPercent when sale.useSpecialCommission
    let chatterCommissions = 0;
    for (const sale of creatorSales) {
      const user = (sale as { user?: { commissionPercent?: number; specialCommissionPercent?: number } }).user;
      const basePct = user?.commissionPercent ?? 0;
      const specialPct = user?.specialCommissionPercent ?? basePct;
      const pct = (sale as { useSpecialCommission?: boolean }).useSpecialCommission && specialPct > 0 ? specialPct : basePct;
      if (pct > 0) {
        chatterCommissions += (sale.amount * pct) / 100;
      }
      chatterCommissions += sale.baseAmount || 0;
    }

    // Payment Processor Cost: % of (Revenue*0.8) - deducted from agency profit
    const paymentProcessorCostPercent = creator.paymentProcessorCostPercent ?? 0;
    const paymentProcessorCost = revenueAfterOnlyFans20 * (paymentProcessorCostPercent / 100);
    
    // Agency profit: Net Revenue minus ALL costs, including chatter commissions and payment processor cost.
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
      customCostsTotal -
      paymentProcessorCost;

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
      paymentProcessorCostPercent: paymentProcessorCostPercent,
      paymentProcessorCost,
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
    totalBonuses,
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
      specialCommissionPercent: true,
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
    
    // Calculate percentage commission: use special rate when sale.useSpecialCommission
    const basePct = user.commissionPercent ?? 0;
    const specialPct = user.specialCommissionPercent ?? basePct;
    const pct = sale.useSpecialCommission && specialPct > 0 ? specialPct : basePct;
    if (pct > 0) {
      dailyData[dayKey].commissionPercentOnly += (sale.amount * pct) / 100;
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
  const totalBaseEarnings = sales.reduce((sum, sale) => sum + (sale.baseAmount || 0), 0);

  // Total retribution = TOTAL BASE + FIXED SALARY (for month) + SALES COMMISSION (matches admin Revenue per Chatter)
  // Sales commission uses per-sale rate (special when useSpecialCommission)
  const basePct = user.commissionPercent ?? 0;
  const specialPct = user.specialCommissionPercent ?? basePct;
  let salesCommission = 0;
  for (const sale of sales) {
    const pct = sale.useSpecialCommission && specialPct > 0 ? specialPct : basePct;
    salesCommission += (sale.amount * pct) / 100;
  }
  const fixedSalaryForMonth = user.fixedSalary ?? 0;
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

