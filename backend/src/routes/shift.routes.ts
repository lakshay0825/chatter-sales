import { FastifyInstance } from 'fastify';
import {
  createShiftHandler,
  getShiftHandler,
  getShiftsHandler,
  updateShiftHandler,
  deleteShiftHandler,
  autoGenerateShiftsHandler,
} from '../controllers/shift.controller';
import { createShiftSchema, updateShiftSchema, getShiftsQuerySchema, autoGenerateShiftsSchema } from '../validations/shift.schema';
import { validate } from '../middleware/validate';
import { authenticate, requireManager } from '../middleware/auth';

export async function shiftRoutes(fastify: FastifyInstance) {
  // View routes accessible to all authenticated users
  fastify.get(
    '/',
    {
      preHandler: [authenticate, validate(getShiftsQuerySchema)],
      schema: {
        description: 'Get shifts with filters',
        tags: ['shifts'],
        security: [{ bearerAuth: [] }],
      },
    },
    getShiftsHandler as any
  );

  fastify.get(
    '/:id',
    {
      preHandler: [authenticate],
      schema: {
        description: 'Get shift by ID',
        tags: ['shifts'],
        security: [{ bearerAuth: [] }],
      },
    },
    getShiftHandler as any
  );

  // Modify routes require manager or admin
  fastify.post(
    '/',
    {
      preHandler: [authenticate, requireManager, validate(createShiftSchema)],
      schema: {
        description: 'Create a new shift (Manager/Admin only)',
        tags: ['shifts'],
        security: [{ bearerAuth: [] }],
      },
    },
    createShiftHandler as any
  );

  fastify.put(
    '/:id',
    {
      preHandler: [authenticate, requireManager, validate(updateShiftSchema)],
      schema: {
        description: 'Update shift - drag & drop (Manager/Admin only)',
        tags: ['shifts'],
        security: [{ bearerAuth: [] }],
      },
    },
    updateShiftHandler as any
  );

  fastify.delete(
    '/:id',
    {
      preHandler: [authenticate, requireManager],
      schema: {
        description: 'Delete shift (Manager/Admin only)',
        tags: ['shifts'],
        security: [{ bearerAuth: [] }],
      },
    },
    deleteShiftHandler as any
  );

  // Auto-generate weekly shifts (Admin only)
  fastify.post(
    '/auto-generate',
    {
      preHandler: [authenticate, requireManager, validate(autoGenerateShiftsSchema)],
      schema: {
        description: 'Auto-generate weekly shifts based on template (Manager/Admin only)',
        tags: ['shifts'],
        security: [{ bearerAuth: [] }],
      },
    },
    autoGenerateShiftsHandler as any
  );
}

