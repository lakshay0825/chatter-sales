import { UserRole, SaleType, SaleStatus } from '@prisma/client';

// Extended types for JWT payload
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}

// Request types with authenticated user
export interface AuthenticatedRequest {
  user: JWTPayload;
}

// Common response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
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

// Export Prisma enums for use in validation schemas
export { UserRole, SaleType, SaleStatus };

