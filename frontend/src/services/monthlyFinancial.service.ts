import api from './api';
import { ApiResponse } from '../types';

export interface MonthlyFinancial {
  id: string;
  year: number;
  month: number;
  grossRevenue: number;
  marketingCosts: number;
  toolCosts: number;
  otherCosts: number;
  creator: {
    id: string;
    name: string;
    compensationType: string;
    revenueSharePercent?: number;
    fixedSalaryCost?: number;
  };
}

export interface CreateMonthlyFinancialData {
  grossRevenue: number;
  marketingCosts: number;
  toolCosts: number;
  otherCosts: number;
}

export interface GetMonthlyFinancialsParams {
  creatorId?: string;
  year?: number;
  month?: number;
}

export const monthlyFinancialService = {
  async getMonthlyFinancials(
    params: GetMonthlyFinancialsParams = {}
  ): Promise<MonthlyFinancial[]> {
    const response = await api.get<ApiResponse<MonthlyFinancial[]>>('/monthly-financials', {
      params,
    });
    return response.data.data!;
  },

  async getMonthlyFinancial(
    creatorId: string,
    year: number,
    month: number
  ): Promise<MonthlyFinancial> {
    const response = await api.get<ApiResponse<MonthlyFinancial>>(
      `/monthly-financials/${creatorId}/${year}/${month}`
    );
    return response.data.data!;
  },

  async upsertMonthlyFinancial(
    creatorId: string,
    year: number,
    month: number,
    data: CreateMonthlyFinancialData
  ): Promise<MonthlyFinancial> {
    const response = await api.put<ApiResponse<MonthlyFinancial>>(
      `/monthly-financials/${creatorId}/${year}/${month}`,
      data
    );
    return response.data.data!;
  },
};

