import { prisma } from '../config/database';
import { UserRole } from '@prisma/client';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { CreatePaymentInput, UpdatePaymentInput, GetPaymentsQuery } from '../validations/payment.schema';

/**
 * Create a new payment
 */
export async function createPayment(
  input: CreatePaymentInput
) {
  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  const payment = await prisma.payment.create({
    data: {
      amount: input.amount,
      paymentDate: input.paymentDate || new Date(),
      paymentMethod: input.paymentMethod,
      note: input.note,
      userId: input.userId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
    },
  });

  return payment;
}

/**
 * Get payment by ID
 */
export async function getPaymentById(paymentId: string, userRole: UserRole, userId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
    },
  });

  if (!payment) {
    throw new NotFoundError('Payment not found');
  }

  // Only admins can view any payment, others can only view their own
  if (userRole !== 'ADMIN' && payment.userId !== userId) {
    throw new ForbiddenError('You can only view your own payments');
  }

  return payment;
}

/**
 * Get payments with filters
 */
export async function getPayments(
  query: GetPaymentsQuery,
  userRole: UserRole,
  userId: string
) {
  const { userId: filterUserId, startDate, endDate } = query;

  const where: any = {};

  // Chatters can only see their own payments
  if (userRole === 'CHATTER') {
    where.userId = userId;
  } else if (filterUserId) {
    // Admins and managers can filter by userId
    where.userId = filterUserId;
  }

  if (startDate || endDate) {
    where.paymentDate = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      where.paymentDate.gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.paymentDate.lte = end;
    }
  }

  const payments = await prisma.payment.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
    },
    orderBy: {
      paymentDate: 'desc',
    },
  });

  return payments;
}

/**
 * Update payment
 */
export async function updatePayment(
  paymentId: string,
  input: UpdatePaymentInput,
  userRole: UserRole
) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new NotFoundError('Payment not found');
  }

  // Only admins can update payments
  if (userRole !== 'ADMIN') {
    throw new ForbiddenError('Only admins can update payments');
  }

  const updatedPayment = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.paymentDate !== undefined && { paymentDate: input.paymentDate }),
      ...(input.paymentMethod !== undefined && { paymentMethod: input.paymentMethod }),
      ...(input.note !== undefined && { note: input.note }),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
    },
  });

  return updatedPayment;
}

/**
 * Delete payment
 */
export async function deletePayment(
  paymentId: string,
  userRole: UserRole
) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new NotFoundError('Payment not found');
  }

  // Only admins can delete payments
  if (userRole !== 'ADMIN') {
    throw new ForbiddenError('Only admins can delete payments');
  }

  await prisma.payment.delete({
    where: { id: paymentId },
  });

  return { message: 'Payment deleted successfully' };
}
