import api from './api';
import { ApiResponse } from '../types';

export enum PaymentMethod {
  CRYPTO = 'CRYPTO',
  WIRE_TRANSFER = 'WIRE_TRANSFER',
  PAYPAL = 'PAYPAL',
  OTHER = 'OTHER',
}

export interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  note?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export interface CreatePaymentData {
  userId: string;
  amount: number;
  paymentDate?: string;
  paymentMethod: PaymentMethod;
  note?: string;
}

export interface UpdatePaymentData {
  amount?: number;
  paymentDate?: string;
  paymentMethod?: PaymentMethod;
  note?: string;
}

export interface GetPaymentsParams {
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export const paymentService = {
  async getPayments(params: GetPaymentsParams = {}): Promise<Payment[]> {
    const response = await api.get<ApiResponse<Payment[]>>('/payments', { params });
    return response.data.data!;
  },

  async getPaymentById(id: string): Promise<Payment> {
    const response = await api.get<ApiResponse<Payment>>(`/payments/${id}`);
    return response.data.data!;
  },

  async createPayment(data: CreatePaymentData): Promise<Payment> {
    const response = await api.post<ApiResponse<Payment>>('/payments', data);
    return response.data.data!;
  },

  async updatePayment(id: string, data: UpdatePaymentData): Promise<Payment> {
    const response = await api.put<ApiResponse<Payment>>(`/payments/${id}`, data);
    return response.data.data!;
  },

  async deletePayment(id: string): Promise<void> {
    await api.delete(`/payments/${id}`);
  },
};
