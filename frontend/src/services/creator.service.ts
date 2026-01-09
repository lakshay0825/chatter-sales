import api from './api';
import { ApiResponse, Creator } from '../types';

export interface CreateCreatorData {
  name: string;
  compensationType: 'PERCENTAGE' | 'SALARY';
  revenueSharePercent?: number;
  fixedSalaryCost?: number;
}

export interface UpdateCreatorData {
  name?: string;
  compensationType?: 'PERCENTAGE' | 'SALARY';
  revenueSharePercent?: number;
  fixedSalaryCost?: number;
  isActive?: boolean;
}

export const creatorService = {
  async getCreators(isActive?: boolean): Promise<Creator[]> {
    const params = isActive !== undefined ? { isActive } : {};
    const response = await api.get<ApiResponse<Creator[]>>('/creators', { params });
    return response.data.data!;
  },

  async getCreatorById(id: string): Promise<Creator> {
    const response = await api.get<ApiResponse<Creator>>(`/creators/${id}`);
    return response.data.data!;
  },

  async createCreator(data: CreateCreatorData): Promise<Creator> {
    const response = await api.post<ApiResponse<Creator>>('/creators', data);
    return response.data.data!;
  },

  async updateCreator(id: string, data: UpdateCreatorData): Promise<Creator> {
    const response = await api.put<ApiResponse<Creator>>(`/creators/${id}`, data);
    return response.data.data!;
  },

  async deleteCreator(id: string): Promise<void> {
    await api.delete(`/creators/${id}`);
  },
};

