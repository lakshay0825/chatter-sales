import api from './api';
import { ApiResponse, Sale, PaginatedResponse, SaleType, SaleStatus } from '../types';

export interface CreateSaleData {
  creatorId: string;
  amount: number;
  saleType: SaleType;
  note?: string;
  saleDate?: Date;
}

export interface UpdateSaleData {
  creatorId?: string;
  amount?: number;
  saleType?: SaleType;
  note?: string;
  saleDate?: Date;
  userId?: string;
}

export interface GetSalesParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  creatorId?: string;
  saleType?: SaleType;
  status?: SaleStatus;
  userId?: string;
}

export const saleService = {
  async getSales(params: GetSalesParams = {}): Promise<PaginatedResponse<Sale>> {
    const response = await api.get<ApiResponse<PaginatedResponse<Sale>>>('/sales', { params });
    return response.data.data!;
  },

  async getSaleById(id: string): Promise<Sale> {
    const response = await api.get<ApiResponse<Sale>>(`/sales/${id}`);
    return response.data.data!;
  },

  async createSale(data: CreateSaleData): Promise<Sale> {
    const response = await api.post<ApiResponse<Sale>>('/sales', data);
    return response.data.data!;
  },

  async updateSale(id: string, data: UpdateSaleData): Promise<Sale> {
    const response = await api.put<ApiResponse<Sale>>(`/sales/${id}`, data);
    return response.data.data!;
  },

  async deleteSale(id: string): Promise<void> {
    await api.delete(`/sales/${id}`);
  },

  async exportSales(params: GetSalesParams = {}): Promise<Blob> {
    const response = await api.get('/sales/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};

