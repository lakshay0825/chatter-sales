import api from './api';
import { ApiResponse, Shift } from '../types';

export interface CreateShiftData {
  userId: string;
  date: string;
  startTime: '09:00' | '14:30' | '20:00';
  endTime: '14:30' | '20:00' | '01:00';
}

export interface UpdateShiftData {
  userId?: string;
  date?: string;
  startTime?: '09:00' | '14:30' | '20:00';
  endTime?: '14:30' | '20:00' | '01:00';
}

export interface GetShiftsParams {
  startDate?: string;
  endDate?: string;
  userId?: string;
}

export interface ClearShiftsRangePayload {
  startDate: string;
  endDate: string;
}

export const shiftService = {
  async getShifts(params: GetShiftsParams = {}): Promise<Shift[]> {
    const response = await api.get<ApiResponse<Shift[]>>('/shifts', { params });
    return response.data.data!;
  },

  async getShiftById(id: string): Promise<Shift> {
    const response = await api.get<ApiResponse<Shift>>(`/shifts/${id}`);
    return response.data.data!;
  },

  async createShift(data: CreateShiftData): Promise<Shift> {
    const response = await api.post<ApiResponse<Shift>>('/shifts', data);
    return response.data.data!;
  },

  async updateShift(id: string, data: UpdateShiftData): Promise<Shift> {
    const response = await api.put<ApiResponse<Shift>>(`/shifts/${id}`, data);
    return response.data.data!;
  },

  async deleteShift(id: string): Promise<void> {
    await api.delete(`/shifts/${id}`);
  },

  async autoGenerateShifts(
    weekStartDate: Date,
    userIds?: string[],
    overwriteExisting: boolean = false,
    generateForYear: boolean = false
  ): Promise<Shift[]> {
    const response = await api.post<ApiResponse<Shift[]>>('/shifts/auto-generate', {
      weekStartDate: weekStartDate.toISOString(),
      userIds,
      overwriteExisting,
      generateForYear,
    });
    return response.data.data!;
  },

  async clearShiftsRange(payload: ClearShiftsRangePayload): Promise<void> {
    await api.post('/shifts/clear-range', payload);
  },
};

