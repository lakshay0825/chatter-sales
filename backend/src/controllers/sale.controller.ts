import { FastifyRequest, FastifyReply } from 'fastify';
import {
  createSale,
  getSaleById,
  getSales,
  updateSale,
  deleteSale,
  exportSalesToCSV,
} from '../services/sale.service';
import { CreateSaleInput, UpdateSaleInput, GetSalesQuery } from '../validations/sale.schema';
import { ApiResponse } from '../types';

export async function createSaleHandler(
  request: FastifyRequest<{ Body: CreateSaleInput }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const sale = await createSale(request.user.userId, request.body);

  const response: ApiResponse<typeof sale> = {
    success: true,
    data: sale,
    message: 'Sale created successfully',
  };

  return reply.code(201).send(response);
}

export async function getSaleHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const { id } = request.params;
  const sale = await getSaleById(id, request.user.role, request.user.userId);

  const response: ApiResponse<typeof sale> = {
    success: true,
    data: sale,
  };

  return reply.code(200).send(response);
}

export async function getSalesHandler(
  request: FastifyRequest<{ Querystring: GetSalesQuery }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const sales = await getSales(request.query, request.user.role, request.user.userId);

  const response: ApiResponse<typeof sales> = {
    success: true,
    data: sales,
  };

  return reply.code(200).send(response);
}

export async function updateSaleHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateSaleInput }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const { id } = request.params;
  const sale = await updateSale(id, request.body, request.user.role, request.user.userId);

  const response: ApiResponse<typeof sale> = {
    success: true,
    data: sale,
    message: 'Sale updated successfully',
  };

  return reply.code(200).send(response);
}

export async function deleteSaleHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const { id } = request.params;
  await deleteSale(id, request.user.role, request.user.userId);

  const response: ApiResponse = {
    success: true,
    message: 'Sale deleted successfully',
  };

  return reply.code(200).send(response);
}

export async function exportSalesHandler(
  request: FastifyRequest<{ Querystring: GetSalesQuery }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const csv = await exportSalesToCSV(request.query, request.user.role, request.user.userId);

  reply.header('Content-Type', 'text/csv');
  reply.header('Content-Disposition', 'attachment; filename="sales-export.csv"');

  return reply.code(200).send(csv);
}

