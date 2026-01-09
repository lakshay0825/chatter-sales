import api from './api';
import { ApiResponse } from '../types';

export interface ChatterDashboardData {
  salesChartData: Array<{ date: string; amount: number }>;
  commissionsChartData: Array<{ date: string; amount: number }>;
  totalSales: number;
  totalCommissions: number;
  user: {
    id: string;
    name: string;
    commissionPercent?: number;
    fixedSalary?: number;
  };
}

export interface AdminDashboardData {
  month: number;
  year: number;
  chatterRevenue: Array<{
    chatterId: string;
    chatterName: string;
    revenue: number;
    commission: number;
  }>;
  totalCommissions: number;
  creatorFinancials: Array<{
    creatorId: string;
    creatorName: string;
    compensationType: string;
    revenueSharePercent?: number;
    fixedSalaryCost?: number;
    grossRevenue: number;
    creatorEarnings: number;
    marketingCosts: number;
    toolCosts: number;
    otherCosts: number;
    netRevenue: number;
  }>;
}

export interface SalesStats {
  totalSales: number;
  totalAmount: number;
  byType: Array<{
    type: string;
    count: number;
    amount: number;
  }>;
  byStatus: Array<{
    status: string;
    count: number;
    amount: number;
  }>;
}

export const dashboardService = {
  async getChatterDashboard(
    userId?: string,
    month?: number,
    year?: number
  ): Promise<ChatterDashboardData> {
    const params: any = {};
    if (userId) params.userId = userId;
    if (month) params.month = month;
    if (year) params.year = year;

    const response = await api.get<ApiResponse<ChatterDashboardData>>('/dashboard/chatter', {
      params,
    });
    return response.data.data!;
  },

  async getAdminDashboard(month?: number, year?: number, cumulative?: boolean): Promise<AdminDashboardData> {
    const params: any = {};
    if (month) params.month = month;
    if (year) params.year = year;
    if (cumulative !== undefined) params.cumulative = cumulative;

    const response = await api.get<ApiResponse<AdminDashboardData>>('/dashboard/admin', {
      params,
    });
    return response.data.data!;
  },

  async getSalesStats(month?: number, year?: number): Promise<SalesStats> {
    const params: any = {};
    if (month) params.month = month;
    if (year) params.year = year;

    const response = await api.get<ApiResponse<SalesStats>>('/dashboard/sales-stats', {
      params,
    });
    return response.data.data!;
  },
};

