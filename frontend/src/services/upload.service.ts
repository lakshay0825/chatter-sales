import axios, { AxiosInstance } from 'axios';
import { ApiResponse, User, Creator } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Create a separate axios instance for file uploads (without default JSON Content-Type)
const uploadApi: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to upload requests
uploadApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Don't set Content-Type - let browser set it with boundary for multipart/form-data
  return config;
});

export const uploadService = {
  async uploadUserIdentificationPhoto(userId: string, file: File): Promise<User> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await uploadApi.post<ApiResponse<User>>(
      `/users/${userId}/identification-photo`,
      formData
    );
    return response.data.data!;
  },

  async uploadCreatorIdentificationPhoto(creatorId: string, file: File): Promise<Creator> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await uploadApi.post<ApiResponse<Creator>>(
      `/creators/${creatorId}/identification-photo`,
      formData
    );
    return response.data.data!;
  },

  async uploadUserAvatar(userId: string, file: File): Promise<User> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await uploadApi.post<ApiResponse<User>>(
      `/users/${userId}/avatar`,
      formData
    );
    return response.data.data!;
  },

  async uploadCreatorAvatar(creatorId: string, file: File): Promise<Creator> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await uploadApi.post<ApiResponse<Creator>>(
      `/creators/${creatorId}/avatar`,
      formData
    );
    return response.data.data!;
  },
};
