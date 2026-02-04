import api from './api';
import { ApiResponse } from '../types';

export interface Goal {
  id: string;
  userId?: string;
  creatorId?: string;
  type: 'SALES' | 'COMMISSION' | 'REVENUE';
  target: number;
  year: number;
  month: number; // 0 for yearly goals
  createdAt: string;
  updatedAt: string;
  bonusAmount?: number;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  creator?: {
    id: string;
    name: string;
  };
}

export interface CreateGoalData {
  userId?: string;
  creatorId?: string;
  type: 'SALES' | 'COMMISSION' | 'REVENUE';
  target: number;
  year: number;
  month: number;
  bonusAmount?: number;
}

export interface UpdateGoalData {
  target?: number;
  month?: number;
  bonusAmount?: number;
}

export interface GoalProgress {
  goal: Goal;
  current: number;
  target: number;
  progress: number; // 0-100
  remaining: number;
  achieved: boolean;
}

export interface GetGoalsParams {
  userId?: string;
  creatorId?: string;
  type?: string;
  year?: number;
  month?: number;
}

export const goalService = {
  /**
   * Get all goals
   */
  async getGoals(params: GetGoalsParams = {}): Promise<Goal[]> {
    const response = await api.get<ApiResponse<Goal[]>>('/goals', { params });
    return response.data.data!;
  },

  /**
   * Get goal by ID
   */
  async getGoalById(id: string): Promise<Goal> {
    const response = await api.get<ApiResponse<Goal>>(`/goals/${id}`);
    return response.data.data!;
  },

  /**
   * Create goal
   */
  async createGoal(data: CreateGoalData): Promise<Goal> {
    const response = await api.post<ApiResponse<Goal>>('/goals', data);
    return response.data.data!;
  },

  /**
   * Update goal
   */
  async updateGoal(id: string, data: UpdateGoalData): Promise<Goal> {
    const response = await api.put<ApiResponse<Goal>>(`/goals/${id}`, data);
    return response.data.data!;
  },

  /**
   * Delete goal
   */
  async deleteGoal(id: string): Promise<void> {
    await api.delete(`/goals/${id}`);
  },

  /**
   * Get goal progress
   */
  async getGoalProgress(id: string): Promise<GoalProgress> {
    const response = await api.get<ApiResponse<GoalProgress>>(`/goals/${id}/progress`);
    return response.data.data!;
  },
};

