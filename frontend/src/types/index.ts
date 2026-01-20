export enum UserRole {
  ADMIN = 'ADMIN',
  CHATTER_MANAGER = 'CHATTER_MANAGER',
  CHATTER = 'CHATTER',
}

export enum SaleType {
  CAM = 'CAM',
  TIP = 'TIP',
  PPV = 'PPV',
  INITIAL = 'INITIAL',
  CUSTOM = 'CUSTOM',
  BASE = 'BASE',
  MASS_MESSAGE = 'MASS_MESSAGE',
}

export enum SaleStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  identificationPhoto?: string;
  commissionPercent?: number;
  fixedSalary?: number;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Creator {
  id: string;
  name: string;
  avatar?: string;
  identificationPhoto?: string;
  compensationType: 'PERCENTAGE' | 'SALARY';
  revenueSharePercent?: number;
  fixedSalaryCost?: number;
  onlyfansCommissionPercent?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  id: string;
  amount: number;
  saleType: SaleType;
  status: SaleStatus;
  note?: string;
  saleDate: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  creatorId: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  creator?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

