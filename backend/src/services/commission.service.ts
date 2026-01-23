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

  // Split revenue into percentage-based part and BASE part
  const totalVariableSales = sales.reduce(
    (sum: number, sale) => sum + sale.amount,
    0
  );

  const totalBaseEarnings = sales.reduce(
    (sum: number, sale) => sum + (sale.baseAmount || 0),
    0
  );

  // Calculate commission:
  // - Percentage applies ONLY to variable sales (amount)
  // - BASE earnings are added 1:1 on top of commission
  let commission = 0;
  
  if (user.commissionPercent !== null) {
    commission += (totalVariableSales * user.commissionPercent) / 100;
  }
  
  if (user.fixedSalary !== null) {
    commission += user.fixedSalary;
  }

  // BASE earnings are always added in full, independent of commission%
  commission += totalBaseEarnings;

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
      role: { in: ['CHATTER', 'CHATTER_MANAGER'] },
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

