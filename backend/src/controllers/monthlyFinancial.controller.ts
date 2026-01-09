import { FastifyRequest, FastifyReply } from 'fastify';
import {
  upsertMonthlyFinancial,
  getMonthlyFinancial,
  getMonthlyFinancials,
} from '../services/monthlyFinancial.service';
import { MonthlyFinancialInput, GetMonthlyFinancialQuery } from '../validations/monthlyFinancial.schema';
import { ApiResponse } from '../types';

export async function upsertMonthlyFinancialHandler(
  request: FastifyRequest<{ Params: { creatorId: string; year: string; month: string }; Body: MonthlyFinancialInput }>,
  reply: FastifyReply
) {
  const { creatorId, year, month } = request.params;
  const yearNum = parseInt(year);
  const monthNum = parseInt(month);

  const monthlyFinancial = await upsertMonthlyFinancial(
    creatorId,
    yearNum,
    monthNum,
    request.body
  );

  const response: ApiResponse<typeof monthlyFinancial> = {
    success: true,
    data: monthlyFinancial,
    message: 'Monthly financial data saved successfully',
  };

  return reply.code(200).send(response);
}

export async function getMonthlyFinancialHandler(
  request: FastifyRequest<{ Params: { creatorId: string; year: string; month: string } }>,
  reply: FastifyReply
) {
  const { creatorId, year, month } = request.params;
  const yearNum = parseInt(year);
  const monthNum = parseInt(month);

  const monthlyFinancial = await getMonthlyFinancial(creatorId, yearNum, monthNum);

  const response: ApiResponse<typeof monthlyFinancial> = {
    success: true,
    data: monthlyFinancial,
  };

  return reply.code(200).send(response);
}

export async function getMonthlyFinancialsHandler(
  request: FastifyRequest<{ Querystring: GetMonthlyFinancialQuery }>,
  reply: FastifyReply
) {
  const monthlyFinancials = await getMonthlyFinancials(request.query);

  const response: ApiResponse<typeof monthlyFinancials> = {
    success: true,
    data: monthlyFinancials,
  };

  return reply.code(200).send(response);
}

