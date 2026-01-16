import { FastifyInstance } from 'fastify';
import {
  createCreatorHandler,
  getCreatorHandler,
  getCreatorsHandler,
  updateCreatorHandler,
  deleteCreatorHandler,
} from '../controllers/creator.controller';
import { uploadCreatorIdentificationPhotoHandler, uploadCreatorAvatarHandler } from '../controllers/upload.controller';
import { createCreatorSchema, updateCreatorSchema } from '../validations/creator.schema';
import { validate } from '../middleware/validate';
import { authenticate, requireAdmin } from '../middleware/auth';

export async function creatorRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  // Get all creators (accessible to all authenticated users)
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all creators',
        tags: ['creators'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            isActive: { type: 'string' }, // Query params are always strings
          },
        },
      },
    },
    getCreatorsHandler
  );

  // Get creator by ID (accessible to all authenticated users)
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get creator by ID',
        tags: ['creators'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    getCreatorHandler
  );

  // Admin-only routes
  fastify.post(
    '/',
    {
      preHandler: [requireAdmin, validate(createCreatorSchema)],
      schema: {
        description: 'Create a new creator (Admin only)',
        tags: ['creators'],
        security: [{ bearerAuth: [] }],
      },
    },
    createCreatorHandler as any
  );

  fastify.put(
    '/:id',
    {
      preHandler: [requireAdmin, validate(updateCreatorSchema)],
      schema: {
        description: 'Update creator (Admin only)',
        tags: ['creators'],
        security: [{ bearerAuth: [] }],
      },
    },
    updateCreatorHandler as any
  );

  fastify.delete(
    '/:id',
    {
      preHandler: [requireAdmin],
      schema: {
        description: 'Delete creator (Admin only)',
        tags: ['creators'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    deleteCreatorHandler as any
  );

  // Upload identification photo (Admin only)
  fastify.post(
    '/:id/identification-photo',
    {
      preHandler: [requireAdmin],
      schema: {
        description: 'Upload identification photo for a creator (Admin only)',
        tags: ['creators'],
        security: [{ bearerAuth: [] }],
        consumes: ['multipart/form-data'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    uploadCreatorIdentificationPhotoHandler as any
  );

  // Upload avatar/profile image (Admin only)
  fastify.post(
    '/:id/avatar',
    {
      preHandler: [requireAdmin],
      schema: {
        description: 'Upload profile image for a creator (Admin only)',
        tags: ['creators'],
        security: [{ bearerAuth: [] }],
        consumes: ['multipart/form-data'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    uploadCreatorAvatarHandler as any
  );
}

