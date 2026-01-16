import { prisma } from '../config/database';

/**
 * Calculate commission for a chatter based on sales
 */
export async function calculateCommission(
  userId: string,
  month: number,
  year: number
): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      commissionPercent: true,
      fixedSalary: true,
    },
  });

  if (!user) {
    return 0;
  }

  // Get all sales for the user in the given month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const sales = await prisma.sale.findMany({
    where: {
      userId,
      saleDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      amount: true,
      baseAmount: true,
    },
  });

  // For chatter earnings: include both amount and baseAmount
  const totalSalesForCommission = sales.reduce(
    (sum: number, sale) => sum + sale.amount + (sale.baseAmount || 0),
    0
  );

  // Calculate commission: ((amount + baseAmount) * commissionPercent) + fixedSalary
  let commission = 0;
  
  if (user.commissionPercent !== null) {
    commission += (totalSalesForCommission * user.commissionPercent) / 100;
  }
  
  if (user.fixedSalary !== null) {
    commission += user.fixedSalary;
  }

  return commission;
}

/**
 * Calculate total commission for all chatters in a month
 */
export async function calculateTotalCommissions(
  month: number,
  year: number
): Promise<number> {
  const users = await prisma.user.findMany({
    where: {
      role: 'CHATTER',
      isActive: true,
    },
    select: {
      id: true,
      commissionPercent: true,
      fixedSalary: true,
    },
  });

  let totalCommissions = 0;

  for (const user of users) {
    const commission = await calculateCommission(user.id, month, year);
    totalCommissions += commission;
  }

  return totalCommissions;
}

/**
 * Get sales total for a user in a month
 */
export async function getUserSalesTotal(
  userId: string,
  month: number,
  year: number
): Promise<number> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // Get all sales and sum amount + baseAmount for total revenue
  const sales = await prisma.sale.findMany({
    where: {
      userId,
      saleDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      amount: true,
      baseAmount: true,
    },
  });

  return sales.reduce((sum, sale) => sum + sale.amount + (sale.baseAmount || 0), 0);
}

