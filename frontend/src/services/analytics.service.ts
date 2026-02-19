import api from './api';
import { ApiResponse } from '../types';

export interface MonthOverMonthComparison {
  current: {
    month: number;
    year: number;
    amount: number;
    count: number;
  };
  previous: {
    month: number;
    year: number;
    amount: number;
    count: number;
  };
  change: {
    amount: number;
    percent: number;
  };
}

export interface YearOverYearComparison {
  current: {
    year: number;
    amount: number;
    count: number;
  };
  previous: {
    year: number;
    amount: number;
    count: number;
  };
  change: {
    amount: number;
    percent: number;
  };
}

export interface TrendData {
  month?: number;
  year?: number;
  amount: number;
  count?: number;
  label: string;
  date?: Date | string;
}

export interface PerformanceIndicators {
  totalSales: number;
  salesCount: number;
  avgSaleAmount: number;
  avgDailySales: number;
  avgSalesPerDay: number;
  daysInMonth?: number;
  daysInPeriod?: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar?: string;
  salesTotal: number;
  commission: number;
  salesCount: number;
}

export interface CreatorBreakdown {
  name: string;
  revenue: number;
}

export interface DailyRevenueBreakdown {
  date: string;
  totalRevenue: number;
  creatorBreakdown: CreatorBreakdown[];
}

export interface WeeklyRevenueBreakdown {
  weekStart: string;
  weekEnd: string;
  totalRevenue: number;
  creatorBreakdown: CreatorBreakdown[];
}

export interface MonthlyRevenueBreakdown {
  month: number;
  year: number;
  totalRevenue: number;
  creatorBreakdown: CreatorBreakdown[];
}

export interface DateRangeRevenueBreakdown {
  startDate: string;
  endDate: string;
  totalRevenue: number;
  creatorBreakdown: CreatorBreakdown[];
}

export interface MonthlySalesHeatmapCell {
  dayOfWeek: number;
  timeSlot: number;
  totalAmount: number;
}

export interface MonthlySalesHeatmap {
  month: number;
  year: number;
  cells: MonthlySalesHeatmapCell[];
  dayLabels: string[];
  timeSlotLabels: string[];
  maxAmount: number;
}

// Helper: format a Date as local calendar date (YYYY-MM-DD) without timezone shifting.
// Using toISOString() can move dates back/forward a day when converting to UTC,
// which breaks weekly/YTD ranges. This helper keeps the actual chosen calendar day.
const toLocalDateString = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const analyticsService = {
  /**
   * Get month-over-month comparison
   */
  async getMonthOverMonthComparison(
    month?: number,
    year?: number,
    userId?: string
  ): Promise<MonthOverMonthComparison> {
    const params: any = {};
    if (month) params.month = month;
    if (year) params.year = year;
    if (userId) params.userId = userId;

    const response = await api.get<ApiResponse<MonthOverMonthComparison>>(
      '/analytics/comparison/month-over-month',
      { params }
    );
    return response.data.data!;
  },

  /**
   * Get year-over-year comparison
   */
  async getYearOverYearComparison(year?: number, userId?: string): Promise<YearOverYearComparison> {
    const params: any = {};
    if (year) params.year = year;
    if (userId) params.userId = userId;

    const response = await api.get<ApiResponse<YearOverYearComparison>>(
      '/analytics/comparison/year-over-year',
      { params }
    );
    return response.data.data!;
  },

  /**
   * Get trend analysis (last 12 months or date range)
   */
  async getTrendAnalysis(
    userId?: string,
    startDate?: Date,
    endDate?: Date,
    viewType?: 'DAY' | 'WEEK' | 'MONTH' | 'YTD'
  ): Promise<TrendData[]> {
    const params: any = {};
    if (userId) params.userId = userId;
    if (startDate) {
      params.startDate =
        viewType === 'DAY' ? startDate.toISOString() : toLocalDateString(startDate);
    }
    if (endDate) {
      params.endDate =
        viewType === 'DAY' ? endDate.toISOString() : toLocalDateString(endDate);
    }
    if (viewType) params.viewType = viewType;

    const response = await api.get<ApiResponse<TrendData[]>>('/analytics/trends', { params });
    return response.data.data!;
  },

  /**
   * Get performance indicators
   */
  async getPerformanceIndicators(
    month?: number,
    year?: number,
    userId?: string,
    startDate?: Date,
    endDate?: Date,
    viewType?: 'DAY' | 'WEEK' | 'MONTH' | 'YTD'
  ): Promise<PerformanceIndicators> {
    const params: any = {};
    if (month) params.month = month;
    if (year) params.year = year;
    if (userId) params.userId = userId;
    if (startDate) {
      params.startDate =
        viewType === 'DAY' ? startDate.toISOString() : toLocalDateString(startDate);
    }
    if (endDate) {
      params.endDate =
        viewType === 'DAY' ? endDate.toISOString() : toLocalDateString(endDate);
    }
    if (viewType) params.viewType = viewType;

    const response = await api.get<ApiResponse<PerformanceIndicators>>(
      '/analytics/performance-indicators',
      { params }
    );
    return response.data.data!;
  },

  /**
   * Get leaderboard
   */
  async getLeaderboard(
    month?: number,
    year?: number,
    limit: number = 10,
    startDate?: Date,
    endDate?: Date
  ): Promise<LeaderboardEntry[]> {
    const params: any = { limit };
    if (month) params.month = month;
    if (year) params.year = year;
    // Pass full ISO range so leaderboard uses exact same period as selected view (Day/Week/Month/YTD)
    if (startDate) params.startDate = startDate.toISOString();
    if (endDate) params.endDate = endDate.toISOString();

    const response = await api.get<ApiResponse<LeaderboardEntry[]>>('/analytics/leaderboard', {
      params,
    });
    return response.data.data!;
  },

  /**
   * Get daily revenue breakdown with creator breakdown.
   * Pass startDate/endDate for day view so breakdown and leaderboard use the same range (and partial "today").
   */
  async getDailyRevenueBreakdown(
    date?: Date,
    userId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<DailyRevenueBreakdown> {
    const params: any = {};
    if (date) params.date = date.toISOString().split('T')[0];
    if (userId) params.userId = userId;
    if (startDate) params.startDate = startDate.toISOString();
    if (endDate) params.endDate = endDate.toISOString();

    const response = await api.get<ApiResponse<DailyRevenueBreakdown>>('/analytics/revenue/daily', {
      params,
    });
    return response.data.data!;
  },

  /**
   * Get weekly revenue breakdown with creator breakdown (MON to SUN)
   */
  async getWeeklyRevenueBreakdown(weekStart?: Date, userId?: string): Promise<WeeklyRevenueBreakdown> {
    const params: any = {};
    // Backend schema expects a plain date (YYYY-MM-DD) for weekStart
    if (weekStart) params.weekStart = toLocalDateString(weekStart);
    if (userId) params.userId = userId;

    const response = await api.get<ApiResponse<WeeklyRevenueBreakdown>>('/analytics/revenue/weekly', {
      params,
    });
    return response.data.data!;
  },

  /**
   * Get monthly revenue breakdown with creator breakdown
   */
  async getMonthlyRevenueBreakdown(month?: number, year?: number, userId?: string): Promise<MonthlyRevenueBreakdown> {
    const params: any = {};
    if (month) params.month = month.toString();
    if (year) params.year = year.toString();
    if (userId) params.userId = userId;

    const response = await api.get<ApiResponse<MonthlyRevenueBreakdown>>('/analytics/revenue/monthly', {
      params,
    });
    return response.data.data!;
  },

  /**
   * Get monthly sales heatmap by day of week (Mon–Sun) and time of day (for Analytics Monthly view).
   */
  async getMonthlySalesHeatmap(
    month: number,
    year: number,
    userId?: string
  ): Promise<MonthlySalesHeatmap> {
    const params: any = { month, year };
    if (userId) params.userId = userId;

    const response = await api.get<ApiResponse<MonthlySalesHeatmap>>('/analytics/revenue/monthly-heatmap', {
      params,
    });
    return response.data.data!;
  },

  /**
   * Get available years from sales data
   */
  async getAvailableYears(userId?: string): Promise<number[]> {
    const params: any = {};
    if (userId) params.userId = userId;

    const response = await api.get<ApiResponse<number[]>>('/analytics/available-years', {
      params,
    });
    return response.data.data!;
  },

  /**
   * Get revenue breakdown for custom date range with creator breakdown.
   * Use local calendar dates (YYYY-MM-DD) to avoid timezone shifting the range
   * (e.g. Jan 1 becoming Dec 31 in UTC).
   */
  async getDateRangeRevenueBreakdown(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<DateRangeRevenueBreakdown> {
    const params: any = {
      startDate: toLocalDateString(startDate),
      endDate: toLocalDateString(endDate),
    };
    if (userId) params.userId = userId;

    const response = await api.get<ApiResponse<DateRangeRevenueBreakdown>>('/analytics/revenue/date-range', {
      params,
    });
    return response.data.data!;
  },
};

