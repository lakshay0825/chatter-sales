import { FastifyRequest, FastifyReply } from 'fastify';
import {
  createShift,
  getShiftById,
  getShifts,
  updateShift,
  deleteShift,
  autoGenerateWeeklyShifts,
  getDefaultWeeklyTemplate,
  extractTemplateFromWeek,
  generateShiftsForYear,
} from '../services/shift.service';
import { CreateShiftInput, UpdateShiftInput, GetShiftsQuery, AutoGenerateShiftsInput } from '../validations/shift.schema';
import { ApiResponse } from '../types';

export async function createShiftHandler(
  request: FastifyRequest<{ Body: CreateShiftInput }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const shift = await createShift(request.user.userId, request.body);

  const response: ApiResponse<typeof shift> = {
    success: true,
    data: shift,
    message: 'Shift created successfully',
  };

  return reply.code(201).send(response);
}

export async function getShiftHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const shift = await getShiftById(id);

  const response: ApiResponse<typeof shift> = {
    success: true,
    data: shift,
  };

  return reply.code(200).send(response);
}

export async function getShiftsHandler(
  request: FastifyRequest<{ Querystring: GetShiftsQuery }>,
  reply: FastifyReply
) {
  const shifts = await getShifts(request.query);

  const response: ApiResponse<typeof shifts> = {
    success: true,
    data: shifts,
  };

  return reply.code(200).send(response);
}

export async function updateShiftHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateShiftInput }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const shift = await updateShift(id, request.body);

  const response: ApiResponse<typeof shift> = {
    success: true,
    data: shift,
    message: 'Shift updated successfully',
  };

  return reply.code(200).send(response);
}

export async function deleteShiftHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  await deleteShift(id);

  const response: ApiResponse = {
    success: true,
    message: 'Shift deleted successfully',
  };

  return reply.code(200).send(response);
}

export async function autoGenerateShiftsHandler(
  request: FastifyRequest<{ Body: AutoGenerateShiftsInput }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const { weekStartDate, template, userIds, overwriteExisting, generateForYear } = request.body;
  
  // If generateForYear is true, extract template from current week and generate for all 52 weeks
  if (generateForYear) {
    // Extract template from the current week's shifts
    let shiftTemplate = template;
    if (!shiftTemplate) {
      shiftTemplate = await extractTemplateFromWeek(weekStartDate);
    }
    
    // Check if template is empty
    const hasShifts = Object.keys(shiftTemplate).some(
      day => Object.keys(shiftTemplate[parseInt(day)] || {}).length > 0
    );
    
    if (!hasShifts) {
      return reply.code(400).send({
        success: false,
        error: 'No shifts found in the current week. Please set up shifts for this week first.',
      });
    }
    
    // Generate shifts for entire year
    const shifts = await generateShiftsForYear(
      weekStartDate,
      shiftTemplate,
      request.user.userId,
      overwriteExisting ?? false
    );

    const response: ApiResponse<typeof shifts> = {
      success: true,
      data: shifts,
      message: `Successfully generated ${shifts.length} shifts for the entire year`,
    };

    return reply.code(201).send(response);
  }
  
  // Original behavior: generate for single week
  // If no template provided, use default template with provided userIds
  let shiftTemplate = template;
  if (!shiftTemplate && userIds && userIds.length > 0) {
    shiftTemplate = getDefaultWeeklyTemplate(userIds);
  } else if (!shiftTemplate) {
    // Get all active chatters if no userIds provided
    const { prisma } = await import('../config/database');
    const allUsers = await prisma.user.findMany({
      where: {
        role: 'CHATTER',
        isActive: true,
      },
      select: { id: true },
    });
    const allUserIds = allUsers.map(u => u.id);
    shiftTemplate = getDefaultWeeklyTemplate(allUserIds);
  }

  const shifts = await autoGenerateWeeklyShifts(
    weekStartDate,
    shiftTemplate!,
    request.user.userId,
    overwriteExisting ?? false
  );

  const response: ApiResponse<typeof shifts> = {
    success: true,
    data: shifts,
    message: `Successfully generated ${shifts.length} shifts`,
  };

  return reply.code(201).send(response);
}

