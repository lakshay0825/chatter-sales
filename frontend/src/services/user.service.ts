import api from './api';
import { ApiResponse, User, UserRole } from '../types';

export interface CreateUserData {
  email: string;
  name: string;
  role: UserRole;
  commissionPercent?: number;
  fixedSalary?: number;
}

export interface UpdateUserData {
  name?: string;
  role?: UserRole;
  commissionPercent?: number;
  fixedSalary?: number;
  isActive?: boolean;
}

export interface GetUsersParams {
  role?: UserRole;
  isActive?: boolean;
}

export const userService = {
  async getUsers(params: GetUsersParams = {}): Promise<User[]> {
    const response = await api.get<ApiResponse<User[]>>('/users', { params });
    return response.data.data!;
  },

  async getUserById(id: string): Promise<User> {
    const response = await api.get<ApiResponse<User>>(`/users/${id}`);
    return response.data.data!;
  },

  async createUser(data: CreateUserData): Promise<User> {
    const response = await api.post<ApiResponse<User>>('/users', data);
    return response.data.data!;
  },

  async updateUser(id: string, data: UpdateUserData): Promise<User> {
    const response = await api.put<ApiResponse<User>>(`/users/${id}`, data);
    return response.data.data!;
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },
};

