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
    avatar?: string;
    revenue: number;
    commission: number;
    fixedSalary: number;
    totalBase: number;
    totalRetribution: number;
  }>;
  totalCommissions: number;
  totalFixedSalaries?: number; // Total fixed salaries for agency earnings calculation
  totalOwedToChatters?: number;
  creatorFinancials: Array<{
    creatorId: string;
    creatorName: string;
    compensationType: string;
    revenueSharePercent?: number;
    fixedSalaryCost?: number;
    grossRevenue: number;
    totalSalesAmount: number;
    creatorEarnings: number;
    chatterCommissions: number; // Chatter commissions for this creator
    marketingCosts: number;
    toolCosts: number;
    otherCosts: number;
    customCosts: Array<{ name: string; amount: number }>;
    netRevenue: number;
    agencyProfit: number;
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

  async getChatterDetail(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ChatterDetailData> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await api.get<ApiResponse<ChatterDetailData>>(`/dashboard/chatter/${userId}`, {
      params,
    });
    return response.data.data!;
  },
};

export interface ChatterDetailData {
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    commissionPercent?: number;
    fixedSalary?: number;
  };
  dailyBreakdown: Array<{
    date: string;
    sales: number;
    commission: number;
    baseEarnings: number;
    fixedSalaryPortion: number;
    count: number;
  }>;
  totalSales: number;
  totalCommission: number;
  totalRetribution?: number; // TOTAL BASE + FIXED SALARY + SALES COMMISSION (matches admin Revenue per Chatter)
  payments: Array<{
    id: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    note?: string;
  }>;
  totalPayments: number;
  amountOwed: number;
  startDate: string;
  endDate: string;
}

