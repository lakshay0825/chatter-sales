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
  month: number;
  year: number;
  amount: number;
  count: number;
  label: string;
}

export interface PerformanceIndicators {
  totalSales: number;
  salesCount: number;
  avgSaleAmount: number;
  avgDailySales: number;
  avgSalesPerDay: number;
  daysInMonth: number;
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
   * Get trend analysis (last 12 months)
   */
  async getTrendAnalysis(userId?: string): Promise<TrendData[]> {
    const params: any = {};
    if (userId) params.userId = userId;

    const response = await api.get<ApiResponse<TrendData[]>>('/analytics/trends', { params });
    return response.data.data!;
  },

  /**
   * Get performance indicators
   */
  async getPerformanceIndicators(
    month?: number,
    year?: number,
    userId?: string
  ): Promise<PerformanceIndicators> {
    const params: any = {};
    if (month) params.month = month;
    if (year) params.year = year;
    if (userId) params.userId = userId;

    const response = await api.get<ApiResponse<PerformanceIndicators>>(
      '/analytics/performance-indicators',
      { params }
    );
    return response.data.data!;
  },

  /**
   * Get leaderboard
   */
  async getLeaderboard(month?: number, year?: number, limit: number = 10): Promise<LeaderboardEntry[]> {
    const params: any = { limit };
    if (month) params.month = month;
    if (year) params.year = year;

    const response = await api.get<ApiResponse<LeaderboardEntry[]>>('/analytics/leaderboard', {
      params,
    });
    return response.data.data!;
  },
};

