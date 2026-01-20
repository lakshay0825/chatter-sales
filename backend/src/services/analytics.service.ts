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
/**
 * Get trend analysis for a date range (for DAY, WEEK, YTD views)
 */
export async function getTrendAnalysisForDateRange(
  startDate: Date,
  endDate: Date,
  viewType: 'DAY' | 'WEEK' | 'MONTH' | 'YTD',
  userId?: string
) {
  const whereClause = userId ? { userId } : {};
  const data: any[] = [];

  if (viewType === 'DAY') {
    // For day view, show hourly breakdown
    const sales = await prisma.sale.findMany({
      where: {
        ...whereClause,
        saleDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Group by hour
    const hourlyData: { [key: number]: number } = {};
    sales.forEach((sale) => {
      const hour = new Date(sale.saleDate).getHours();
      hourlyData[hour] = (hourlyData[hour] || 0) + sale.amount + (sale.baseAmount || 0);
    });

    for (let hour = 0; hour < 24; hour++) {
      data.push({
        label: `${hour}:00`,
        amount: hourlyData[hour] || 0,
        date: new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), hour),
      });
    }
  } else if (viewType === 'WEEK') {
    // For week view, show daily breakdown
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const sales = await prisma.sale.findMany({
        where: {
          ...whereClause,
          saleDate: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
        select: {
          amount: true,
          baseAmount: true,
        },
      });

      // Sum both amount and baseAmount
      const totalAmount = sales.reduce((sum, sale) => sum + sale.amount + (sale.baseAmount || 0), 0);

      data.push({
        label: currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        amount: totalAmount,
        date: new Date(currentDate),
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }
  } else if (viewType === 'MONTH') {
    // For month view, show daily breakdown
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const sales = await prisma.sale.findMany({
        where: {
          ...whereClause,
          saleDate: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
        select: {
          amount: true,
          baseAmount: true,
        },
      });

      // Sum both amount and baseAmount
      const totalAmount = sales.reduce((sum, sale) => sum + sale.amount + (sale.baseAmount || 0), 0);

      data.push({
        label: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount: totalAmount,
        date: new Date(currentDate),
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }
  } else if (viewType === 'YTD') {
    // For YTD view, show monthly breakdown
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

      const sales = await prisma.sale.findMany({
        where: {
          ...whereClause,
          saleDate: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        select: {
          amount: true,
          baseAmount: true,
        },
      });

      // Sum both amount and baseAmount
      const totalAmount = sales.reduce((sum, sale) => sum + sale.amount + (sale.baseAmount || 0), 0);

      data.push({
        label: `${currentDate.toLocaleString('default', { month: 'short' })} ${year}`,
        amount: totalAmount,
        date: new Date(year, month - 1, 1),
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  }

  return data;
}

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
      date: new Date(year, month - 1, 1),
    });
  }

  return months;
}

/**
 * Get performance indicators for a date range
 */
export async function getPerformanceIndicatorsForDateRange(
  startDate: Date,
  endDate: Date,
  userId?: string,
  viewType?: 'DAY' | 'WEEK' | 'MONTH' | 'YTD'
) {
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

  // Total Sales includes both amount and baseAmount (like commission calculations)
  const totalSales = sales.reduce((sum, sale) => sum + sale.amount + (sale.baseAmount || 0), 0);
  // Average sale amount also includes baseAmount
  const avgSaleAmount = sales.length > 0 ? totalSales / sales.length : 0;
  const salesCount = sales.length;

  // Calculate period length based on view type
  let periodLength: number;
  if (viewType === 'DAY') {
    // For day view, use 24 hours
    periodLength = 24;
  } else {
    // For week/month/YTD, use days
    const timeDiff = endDate.getTime() - startDate.getTime();
    periodLength = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
  }

  const avgDailySales = periodLength > 0 ? totalSales / periodLength : 0;
  const avgSalesPerDay = periodLength > 0 ? salesCount / periodLength : 0;

  return {
    totalSales,
    salesCount,
    avgSaleAmount,
    avgDailySales,
    avgSalesPerDay,
    daysInPeriod: viewType === 'DAY' ? 1 : periodLength,
    daysInMonth: viewType === 'MONTH' ? periodLength : undefined,
  };
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
  const result = await getPerformanceIndicatorsForDateRange(startDate, endDate, userId);
  return {
    ...result,
    daysInMonth, // Keep for backward compatibility
  };
}

/**
 * Get leaderboard/rankings for chatters for a date range
 */
export async function getChatterLeaderboardForDateRange(
  startDate: Date,
  endDate: Date,
  limit: number = 10
) {
  // Get all chatters and chatter managers with their sales totals
  const chatters = await prisma.user.findMany({
    where: {
      role: { in: ['CHATTER', 'CHATTER_MANAGER'] },
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
        // For fixed salary, calculate based on number of days in period
        const timeDiff = endDate.getTime() - startDate.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;
        const daysInMonth = 30; // Approximate
        commission = (chatter.fixedSalary / daysInMonth) * daysDiff;
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
 * Get leaderboard/rankings for chatters
 */
export async function getChatterLeaderboard(
  month: number,
  year: number,
  limit: number = 10
) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  return getChatterLeaderboardForDateRange(startDate, endDate, limit);
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
  // Ensure week starts on Monday (using date-fns logic)
  const startDate = new Date(weekStartDate);
  const dayOfWeek = startDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // Calculate days to subtract to get to Monday (day 1)
  // If Sunday (0), subtract 6 days; otherwise subtract (dayOfWeek - 1)
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startDate.setDate(startDate.getDate() - daysToMonday);
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
    // Total Revenue includes both amount and baseAmount (gross revenue)
    const saleTotal = sale.amount + (sale.baseAmount || 0);
    totalRevenue += saleTotal;
    const creatorId = sale.creator.id;
    if (!creatorBreakdown[creatorId]) {
      creatorBreakdown[creatorId] = {
        name: sale.creator.name,
        revenue: 0,
      };
    }
    creatorBreakdown[creatorId].revenue += saleTotal;
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
 * Get monthly revenue breakdown with creator breakdown
 */
export async function getMonthlyRevenueBreakdown(
  month: number,
  year: number,
  userId?: string
) {
  const startDate = new Date(year, month - 1, 1);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

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
    // Total Revenue includes both amount and baseAmount (gross revenue)
    const saleTotal = sale.amount + (sale.baseAmount || 0);
    totalRevenue += saleTotal;
    const creatorId = sale.creator.id;
    if (!creatorBreakdown[creatorId]) {
      creatorBreakdown[creatorId] = {
        name: sale.creator.name,
        revenue: 0,
      };
    }
    creatorBreakdown[creatorId].revenue += saleTotal;
  });

  return {
    month,
    year,
    totalRevenue,
    creatorBreakdown: Object.values(creatorBreakdown),
  };
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
    // Total Revenue includes both amount and baseAmount (gross revenue)
    const saleTotal = sale.amount + (sale.baseAmount || 0);
    totalRevenue += saleTotal;
    const creatorId = sale.creator.id;
    if (!creatorBreakdown[creatorId]) {
      creatorBreakdown[creatorId] = {
        name: sale.creator.name,
        revenue: 0,
      };
    }
    creatorBreakdown[creatorId].revenue += saleTotal;
  });

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
    totalRevenue,
    creatorBreakdown: Object.values(creatorBreakdown),
  };
}
