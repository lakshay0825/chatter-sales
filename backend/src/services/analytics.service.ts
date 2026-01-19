import { prisma } from '../config/database';

/**
 * Get month-over-month comparison data
 */
export async function getMonthOverMonthComparison(
  month: number,
  year: number,
  userId?: string
) {
  const currentStart = new Date(year, month - 1, 1);
  const currentEnd = new Date(year, month, 0, 23, 59, 59, 999);

  // Previous month
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevStart = new Date(prevYear, prevMonth - 1, 1);
  const prevEnd = new Date(prevYear, prevMonth, 0, 23, 59, 59, 999);

  const whereClause = userId ? { userId } : {};

  // Current month sales
  const currentSales = await prisma.sale.aggregate({
    where: {
      ...whereClause,
      saleDate: {
        gte: currentStart,
        lte: currentEnd,
      },
    },
    _sum: { amount: true },
    _count: true,
  });

  // Previous month sales
  const prevSales = await prisma.sale.aggregate({
    where: {
      ...whereClause,
      saleDate: {
        gte: prevStart,
        lte: prevEnd,
      },
    },
    _sum: { amount: true },
    _count: true,
  });

  const currentAmount = currentSales._sum.amount || 0;
  const prevAmount = prevSales._sum.amount || 0;
  const change = currentAmount - prevAmount;
  const changePercent = prevAmount > 0 ? ((change / prevAmount) * 100) : 0;

  return {
    current: {
      month,
      year,
      amount: currentAmount,
      count: currentSales._count,
    },
    previous: {
      month: prevMonth,
      year: prevYear,
      amount: prevAmount,
      count: prevSales._count,
    },
    change: {
      amount: change,
      percent: changePercent,
    },
  };
}

/**
 * Get year-over-year comparison data
 */
export async function getYearOverYearComparison(
  year: number,
  userId?: string
) {
  const currentStart = new Date(year, 0, 1);
  const currentEnd = new Date(year, 11, 31, 23, 59, 59, 999);

  const prevStart = new Date(year - 1, 0, 1);
  const prevEnd = new Date(year - 1, 11, 31, 23, 59, 59, 999);

  const whereClause = userId ? { userId } : {};

  // Current year sales
  const currentSales = await prisma.sale.aggregate({
    where: {
      ...whereClause,
      saleDate: {
        gte: currentStart,
        lte: currentEnd,
      },
    },
    _sum: { amount: true },
    _count: true,
  });

  // Previous year sales
  const prevSales = await prisma.sale.aggregate({
    where: {
      ...whereClause,
      saleDate: {
        gte: prevStart,
        lte: prevEnd,
      },
    },
    _sum: { amount: true },
    _count: true,
  });

  const currentAmount = currentSales._sum.amount || 0;
  const prevAmount = prevSales._sum.amount || 0;
  const change = currentAmount - prevAmount;
  const changePercent = prevAmount > 0 ? ((change / prevAmount) * 100) : 0;

  return {
    current: {
      year,
      amount: currentAmount,
      count: currentSales._count,
    },
    previous: {
      year: year - 1,
      amount: prevAmount,
      count: prevSales._count,
    },
    change: {
      amount: change,
      percent: changePercent,
    },
  };
}

/**
 * Get trend analysis data (last 12 months)
 */
export async function getTrendAnalysis(userId?: string) {
  const months = [];
  const currentDate = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const whereClause = userId ? { userId } : {};

    const sales = await prisma.sale.aggregate({
      where: {
        ...whereClause,
        saleDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: { amount: true },
      _count: true,
    });

    months.push({
      month,
      year,
      amount: sales._sum.amount || 0,
      count: sales._count,
      label: `${date.toLocaleString('default', { month: 'short' })} ${year}`,
    });
  }

  return months;
}

/**
 * Get performance indicators
 */
export async function getPerformanceIndicators(
  month: number,
  year: number,
  userId?: string
) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  const daysInMonth = new Date(year, month, 0).getDate();

  const whereClause = userId ? { userId } : {};

  const sales = await prisma.sale.findMany({
    where: {
      ...whereClause,
      saleDate: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const totalSales = sales.reduce((sum, sale) => sum + sale.amount, 0);
  const avgSaleAmount = sales.length > 0 ? totalSales / sales.length : 0;
  const avgDailySales = totalSales / daysInMonth;
  const salesCount = sales.length;
  const avgSalesPerDay = salesCount / daysInMonth;

  return {
    totalSales,
    salesCount,
    avgSaleAmount,
    avgDailySales,
    avgSalesPerDay,
    daysInMonth,
  };
}

/**
 * Get leaderboard/rankings for chatters
 */
export async function getChatterLeaderboard(
  month: number,
  year: number,
  limit: number = 10
) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // Get all chatters with their sales totals
  const chatters = await prisma.user.findMany({
    where: {
      role: 'CHATTER',
      isActive: true,
    },
    include: {
      sales: {
        where: {
          saleDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
    },
  });

  // Calculate totals and commissions for each chatter
  const leaderboard = chatters
    .map((chatter) => {
      const salesTotal = chatter.sales.reduce((sum, sale) => sum + sale.amount, 0);
      let commission = 0;

      if (chatter.commissionPercent) {
        commission = (salesTotal * chatter.commissionPercent) / 100;
      } else if (chatter.fixedSalary) {
        commission = chatter.fixedSalary;
      }

      return {
        userId: chatter.id,
        name: chatter.name,
        avatar: chatter.avatar,
        salesTotal,
        commission,
        salesCount: chatter.sales.length,
      };
    })
    .sort((a, b) => b.salesTotal - a.salesTotal)
    .slice(0, limit)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

  return leaderboard;
}

/**
 * Get daily revenue breakdown with creator breakdown
 */
export async function getDailyRevenueBreakdown(
  date: Date,
  userId?: string
) {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);

  const whereClause: any = {
    saleDate: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (userId) {
    whereClause.userId = userId;
  }

  const sales = await prisma.sale.findMany({
    where: whereClause,
    include: {
      creator: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Group by creator
  const creatorBreakdown: { [key: string]: { name: string; revenue: number } } = {};
  let totalRevenue = 0;

  sales.forEach((sale) => {
    totalRevenue += sale.amount;
    const creatorId = sale.creator.id;
    if (!creatorBreakdown[creatorId]) {
      creatorBreakdown[creatorId] = {
        name: sale.creator.name,
        revenue: 0,
      };
    }
    creatorBreakdown[creatorId].revenue += sale.amount;
  });

  return {
    date: date.toISOString().split('T')[0],
    totalRevenue,
    creatorBreakdown: Object.values(creatorBreakdown),
  };
}

/**
 * Get weekly revenue breakdown with creator breakdown (MON to SUN)
 */
export async function getWeeklyRevenueBreakdown(
  weekStartDate: Date,
  userId?: string
) {
  // Ensure week starts on Monday
  const startDate = new Date(weekStartDate);
  const dayOfWeek = startDate.getDay();
  const diff = startDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday
  startDate.setDate(diff);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6); // Sunday
  endDate.setHours(23, 59, 59, 999);

  const whereClause: any = {
    saleDate: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (userId) {
    whereClause.userId = userId;
  }

  const sales = await prisma.sale.findMany({
    where: whereClause,
    include: {
      creator: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Group by creator
  const creatorBreakdown: { [key: string]: { name: string; revenue: number } } = {};
  let totalRevenue = 0;

  sales.forEach((sale) => {
    totalRevenue += sale.amount;
    const creatorId = sale.creator.id;
    if (!creatorBreakdown[creatorId]) {
      creatorBreakdown[creatorId] = {
        name: sale.creator.name,
        revenue: 0,
      };
    }
    creatorBreakdown[creatorId].revenue += sale.amount;
  });

  return {
    weekStart: startDate.toISOString().split('T')[0],
    weekEnd: endDate.toISOString().split('T')[0],
    totalRevenue,
    creatorBreakdown: Object.values(creatorBreakdown),
  };
}

/**
 * Get available years from sales data
 */
export async function getAvailableYears(userId?: string) {
  const whereClause = userId ? { userId } : {};

  // Get earliest and latest sale dates
  const [earliestSale, latestSale] = await Promise.all([
    prisma.sale.findFirst({
      where: whereClause,
      orderBy: { saleDate: 'asc' },
      select: { saleDate: true },
    }),
    prisma.sale.findFirst({
      where: whereClause,
      orderBy: { saleDate: 'desc' },
      select: { saleDate: true },
    }),
  ]);

  if (!earliestSale || !latestSale) {
    // No sales data, return current year only
    const currentYear = new Date().getFullYear();
    return [currentYear];
  }

  const startYear = earliestSale.saleDate.getFullYear();
  const endYear = latestSale.saleDate.getFullYear();
  const currentYear = new Date().getFullYear();
  
  // Return years from start to max of endYear or currentYear
  const maxYear = Math.max(endYear, currentYear);
  const years = [];
  for (let year = startYear; year <= maxYear; year++) {
    years.push(year);
  }

  return years;
}

/**
 * Get revenue breakdown for custom date range with creator breakdown
 */
export async function getDateRangeRevenueBreakdown(
  startDate: Date,
  endDate: Date,
  userId?: string
) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const whereClause: any = {
    saleDate: {
      gte: start,
      lte: end,
    },
  };

  if (userId) {
    whereClause.userId = userId;
  }

  const sales = await prisma.sale.findMany({
    where: whereClause,
    include: {
      creator: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Group by creator
  const creatorBreakdown: { [key: string]: { name: string; revenue: number } } = {};
  let totalRevenue = 0;

  sales.forEach((sale) => {
    totalRevenue += sale.amount;
    const creatorId = sale.creator.id;
    if (!creatorBreakdown[creatorId]) {
      creatorBreakdown[creatorId] = {
        name: sale.creator.name,
        revenue: 0,
      };
    }
    creatorBreakdown[creatorId].revenue += sale.amount;
  });

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
    totalRevenue,
    creatorBreakdown: Object.values(creatorBreakdown),
  };
}
