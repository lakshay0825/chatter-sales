import { FastifyRequest, FastifyReply } from 'fastify';
import { GetSalesQuery } from '../validations/sale.schema';
import { exportSalesToExcel, exportSalesToPDF, exportCommissionsToExcel, exportShiftsToExcel } from '../services/export.service';

export async function exportSalesExcelHandler(
  request: FastifyRequest<{ Querystring: GetSalesQuery }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const buffer = await exportSalesToExcel(request.query, request.user.role, request.user.userId);

  reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  reply.header('Content-Disposition', 'attachment; filename="sales-export.xlsx"');

  return reply.code(200).send(buffer);
}

export async function exportSalesPDFHandler(
  request: FastifyRequest<{ Querystring: GetSalesQuery }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const buffer = await exportSalesToPDF(request.query, request.user.role, request.user.userId);

  reply.header('Content-Type', 'application/pdf');
  reply.header('Content-Disposition', 'attachment; filename="sales-export.pdf"');

  return reply.code(200).send(buffer);
}

export async function exportCommissionsExcelHandler(
  request: FastifyRequest<{ Querystring: { month?: string; year?: string } }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const month = request.query.month ? parseInt(request.query.month) : new Date().getMonth() + 1;
  const year = request.query.year ? parseInt(request.query.year) : new Date().getFullYear();

  const buffer = await exportCommissionsToExcel(month, year);

  reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  reply.header('Content-Disposition', `attachment; filename="commissions-export-${month}-${year}.xlsx"`);

  return reply.code(200).send(buffer);
}

export async function exportShiftsExcelHandler(
  request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string } }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const startDate = request.query.startDate ? new Date(request.query.startDate) : new Date();
  const endDate = request.query.endDate ? new Date(request.query.endDate) : new Date();

  const buffer = await exportShiftsToExcel(startDate, endDate);

  reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  reply.header('Content-Disposition', 'attachment; filename="shifts-export.xlsx"');

  return reply.code(200).send(buffer);
}

