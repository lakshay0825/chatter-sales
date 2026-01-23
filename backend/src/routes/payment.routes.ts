import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createPaymentSchema,
  updatePaymentSchema,
  getPaymentsQuerySchema,
} from '../validations/payment.schema';
import {
  createPaymentHandler,
  getPaymentHandler,
  getPaymentsHandler,
  updatePaymentHandler,
  deletePaymentHandler,
} from '../controllers/payment.controller';

export async function paymentRoutes(fastify: FastifyInstance) {
  // All payment routes require authentication
  fastify.addHook('onRequest', authenticate);

  // Create payment
  fastify.post(
    '/',
    {
      preHandler: [validate(createPaymentSchema)],
      schema: {
        description: 'Create a new payment (admin only)',
        tags: ['payments'],
        security: [{ bearerAuth: [] }],
      },
    },
    createPaymentHandler as any
  );

  // Get payments
  fastify.get(
    '/',
    {
      preHandler: [validate(getPaymentsQuerySchema)],
      schema: {
        description: 'Get payments with filters',
        tags: ['payments'],
        security: [{ bearerAuth: [] }],
      },
    },
    getPaymentsHandler as any
  );

  // Get payment by ID
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get payment by ID',
        tags: ['payments'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    getPaymentHandler
  );

  // Update payment
  fastify.put(
    '/:id',
    {
      preHandler: [validate(updatePaymentSchema)],
      schema: {
        description: 'Update payment (admin only)',
        tags: ['payments'],
        security: [{ bearerAuth: [] }],
      },
    },
    updatePaymentHandler as any
  );

  // Delete payment
  fastify.delete(
    '/:id',
    {
      schema: {
        description: 'Delete payment (admin only)',
        tags: ['payments'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    deletePaymentHandler
  );
}
