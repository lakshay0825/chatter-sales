import api from './api';
import { ApiResponse } from '../types';

export interface Guideline {
  id: string;
  title: string;
  content: string; // HTML content
  version: number;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface CreateGuidelineData {
  title: string;
  content: string;
}

export interface UpdateGuidelineData {
  title?: string;
  content?: string;
}

export const guidelineService = {
  /**
   * Get the latest guideline
   */
  async getLatestGuideline(): Promise<Guideline | null> {
    const response = await api.get<ApiResponse<Guideline | null>>('/guidelines/latest');
    return response.data.data || null;
  },

  /**
   * Get guideline by ID
   */
  async getGuidelineById(id: string): Promise<Guideline> {
    const response = await api.get<ApiResponse<Guideline>>(`/guidelines/${id}`);
    return response.data.data!;
  },

  /**
   * Get all guidelines (for version history)
   */
  async getAllGuidelines(): Promise<Guideline[]> {
    const response = await api.get<ApiResponse<Guideline[]>>('/guidelines');
    return response.data.data!;
  },

  /**
   * Create guideline
   */
  async createGuideline(data: CreateGuidelineData): Promise<Guideline> {
    const response = await api.post<ApiResponse<Guideline>>('/guidelines', data);
    return response.data.data!;
  },

  /**
   * Update guideline
   */
  async updateGuideline(id: string, data: UpdateGuidelineData): Promise<Guideline> {
    const response = await api.put<ApiResponse<Guideline>>(`/guidelines/${id}`, data);
    return response.data.data!;
  },

  /**
   * Upload image for guidelines
   */
  async uploadImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    // Use axios directly for file uploads (without default JSON Content-Type)
    const axios = (await import('axios')).default;
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('token');

    const response = await axios.post<ApiResponse<{ url: string }>>(
      `${API_BASE_URL}/guidelines/upload-image`,
      formData,
      {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          // Don't set Content-Type - let browser set it with boundary for multipart/form-data
        },
      }
    );
    return response.data.data!;
  },
};

