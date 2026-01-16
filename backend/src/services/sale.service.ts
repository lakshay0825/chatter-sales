import { prisma } from '../config/database';
import { SaleStatus, UserRole } from '@prisma/client';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { CreateSaleInput, UpdateSaleInput, GetSalesQuery } from '../validations/sale.schema';
import { isRealTimeSale, canEditSale } from '../utils/timezone';
import { PaginatedResponse } from '../types';

/**
 * Create a new sale
 */
export async function createSale(
  userId: string,
  input: CreateSaleInput
) {
  // Verify creator exists
  const creator = await prisma.creator.findUnique({
    where: { id: input.creatorId },
  });

  if (!creator) {
    throw new NotFoundError('Creator not found');
  }

  // Determine sale date (use provided date or current time)
  const saleDate = input.saleDate || new Date();
  
  // Determine status (ONLINE if real-time, OFFLINE if backdated)
  const status = input.saleDate ? SaleStatus.OFFLINE : 
                 (isRealTimeSale(saleDate) ? SaleStatus.ONLINE : SaleStatus.OFFLINE);

  const sale = await prisma.sale.create({
    data: {
      amount: input.amount,
      baseAmount: input.baseAmount || 0,
      saleType: input.saleType,
      note: input.note,
      saleDate,
      status,
      userId,
      creatorId: input.creatorId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return sale;
}

/**
 * Get sale by ID
 */
export async function getSaleById(saleId: string, userRole: UserRole, userId: string) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!sale) {
    throw new NotFoundError('Sale not found');
  }

  // Chatters can only see their own sales
  if (userRole === 'CHATTER' && sale.userId !== userId) {
    throw new ForbiddenError('You can only view your own sales');
  }

  return sale;
}

/**
 * Get sales with filters and pagination
 */
export async function getSales(
  query: GetSalesQuery,
  userRole: UserRole,
  userId: string
): Promise<PaginatedResponse<any>> {
  const { page = 1, limit = 20, startDate, endDate, creatorId, saleType, status, userId: filterUserId } = query;

  const where: any = {};

  // Chatters can only see their own sales
  if (userRole === 'CHATTER') {
    where.userId = userId;
  } else if (filterUserId) {
    // Managers and admins can filter by userId
    where.userId = filterUserId;
  }

  if (startDate || endDate) {
    where.saleDate = {};
    if (startDate) {
      // Set to start of day (00:00:00)
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      where.saleDate.gte = start;
    }
    if (endDate) {
      // Set to end of day (23:59:59.999)
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.saleDate.lte = end;
    }
  }

  if (creatorId) where.creatorId = creatorId;
  if (saleType) where.saleType = saleType;
  if (status) where.status = status;

  const skip = (page - 1) * limit;

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        saleDate: 'desc',
      },
    }),
    prisma.sale.count({ where }),
  ]);

  return {
    data: sales,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Update sale
 */
export async function updateSale(
  saleId: string,
  input: UpdateSaleInput,
  userRole: UserRole,
  userId: string
) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
  });

  if (!sale) {
    throw new NotFoundError('Sale not found');
  }

  // Check permissions
  const isAdminOrManager = userRole === 'ADMIN' || userRole === 'CHATTER_MANAGER';
  
  if (!isAdminOrManager && sale.userId !== userId) {
    throw new ForbiddenError('You can only edit your own sales');
  }

  if (!isAdminOrManager && !canEditSale(sale.saleDate, false)) {
    throw new ForbiddenError('Sales can only be edited within 24 hours');
  }

  // Verify creator exists if updating
  if (input.creatorId) {
    const creator = await prisma.creator.findUnique({
      where: { id: input.creatorId },
    });
    if (!creator) {
      throw new NotFoundError('Creator not found');
    }
  }

  // Verify user exists if reassigning (managers only)
  if (input.userId && isAdminOrManager) {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
    });
    if (!user) {
      throw new NotFoundError('User not found');
    }
  }

  // Determine status if saleDate is being updated
  let status = sale.status;
  const saleDate = input.saleDate || sale.saleDate;
  if (input.saleDate) {
    status = isRealTimeSale(saleDate) ? SaleStatus.ONLINE : SaleStatus.OFFLINE;
  }

  const updatedSale = await prisma.sale.update({
    where: { id: saleId },
    data: {
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.baseAmount !== undefined && { baseAmount: input.baseAmount }),
      ...(input.saleType !== undefined && { saleType: input.saleType }),
      ...(input.note !== undefined && { note: input.note }),
      ...(input.saleDate !== undefined && { saleDate: input.saleDate, status }),
      ...(input.creatorId !== undefined && { creatorId: input.creatorId }),
      ...(input.userId !== undefined && isAdminOrManager && { userId: input.userId }),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return updatedSale;
}

/**
 * Delete sale
 */
export async function deleteSale(
  saleId: string,
  userRole: UserRole,
  _userId: string
) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
  });

  if (!sale) {
    throw new NotFoundError('Sale not found');
  }

  // Only admins and managers can delete sales
  const isAdminOrManager = userRole === 'ADMIN' || userRole === 'CHATTER_MANAGER';
  if (!isAdminOrManager) {
    throw new ForbiddenError('Only admins and managers can delete sales');
  }

  await prisma.sale.delete({
    where: { id: saleId },
  });

  return { message: 'Sale deleted successfully' };
}

/**
 * Export sales to CSV format
 */
export async function exportSalesToCSV(
  query: GetSalesQuery,
  userRole: UserRole,
  userId: string
): Promise<string> {
  const sales = await getSales({ ...query, limit: 10000 }, userRole, userId);

  // CSV header
  const headers = ['Date', 'Time', 'Chatter', 'Creator', 'Sale Type', 'Amount', 'Status', 'Note'];
  const rows = sales.data.map((sale: any) => {
    const date = new Date(sale.saleDate);
    return [
      date.toISOString().split('T')[0],
      date.toTimeString().split(' ')[0],
      sale.user.name,
      sale.creator.name,
      sale.saleType,
      sale.amount.toFixed(2),
      sale.status,
      sale.note || '',
    ];
  });

  // Combine headers and rows
  const csvRows = [headers, ...rows.map((row: any[]) => row.map((cell) => `"${cell}"`).join(','))];
  
  return csvRows.join('\n');
}

