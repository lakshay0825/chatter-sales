import api from './api';
import { ApiResponse, User, UserRole } from '../types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  token: string;
  password: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface AuthResponse {
  token: string;
  user: {
    userId: string;
    email: string;
    role: UserRole;
  };
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
    return response.data.data!;
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', data);
    return response.data.data!;
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get<ApiResponse<User>>('/auth/me');
    return response.data.data!;
  },

  async changePassword(data: ChangePasswordData): Promise<void> {
    await api.post<ApiResponse>('/auth/change-password', data);
  },

  async updateProfileName(name: string): Promise<User> {
    const response = await api.patch<ApiResponse<User>>('/auth/me', { name });
    return response.data.data!;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

