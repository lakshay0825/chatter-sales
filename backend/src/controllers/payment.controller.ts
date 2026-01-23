import { FastifyRequest, FastifyReply } from 'fastify';
import {
  createPayment,
  getPaymentById,
  getPayments,
  updatePayment,
  deletePayment,
} from '../services/payment.service';
import { CreatePaymentInput, UpdatePaymentInput, GetPaymentsQuery } from '../validations/payment.schema';
import { ApiResponse } from '../types';

export async function createPaymentHandler(
  request: FastifyRequest<{ Body: CreatePaymentInput }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  // Only admins can create payments
  if (request.user.role !== 'ADMIN') {
    return reply.code(403).send({ success: false, error: 'Only admins can create payments' });
  }

  const payment = await createPayment(request.body);

  const response: ApiResponse<typeof payment> = {
    success: true,
    data: payment,
    message: 'Payment created successfully',
  };

  return reply.code(201).send(response);
}

export async function getPaymentHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const { id } = request.params;
  const payment = await getPaymentById(id, request.user.role, request.user.userId);

  const response: ApiResponse<typeof payment> = {
    success: true,
    data: payment,
  };

  return reply.code(200).send(response);
}

export async function getPaymentsHandler(
  request: FastifyRequest<{ Querystring: GetPaymentsQuery }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const payments = await getPayments(request.query, request.user.role, request.user.userId);

  const response: ApiResponse<typeof payments> = {
    success: true,
    data: payments,
  };

  return reply.code(200).send(response);
}

export async function updatePaymentHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdatePaymentInput }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const { id } = request.params;
  const payment = await updatePayment(id, request.body, request.user.role);

  const response: ApiResponse<typeof payment> = {
    success: true,
    data: payment,
    message: 'Payment updated successfully',
  };

  return reply.code(200).send(response);
}

export async function deletePaymentHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const { id } = request.params;
  await deletePayment(id, request.user.role);

  const response: ApiResponse = {
    success: true,
    message: 'Payment deleted successfully',
  };

  return reply.code(200).send(response);
}
