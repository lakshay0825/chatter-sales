import { FastifyInstance } from 'fastify';
import {
  createUserHandler,
  getUserHandler,
  getUsersHandler,
  updateUserHandler,
  deleteUserHandler,
} from '../controllers/user.controller';
import { uploadUserIdentificationPhotoHandler, uploadUserAvatarHandler } from '../controllers/upload.controller';
import { createUserSchema, updateUserSchema } from '../validations/user.schema';
import { validate } from '../middleware/validate';
import { authenticate, requireAdmin } from '../middleware/auth';

export async function userRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  // Create user (Admin only)
  fastify.post(
    '/',
    {
      preHandler: [requireAdmin, validate(createUserSchema)],
      schema: {
        description: 'Create and invite a new user (Admin only)',
        tags: ['users'],
        security: [{ bearerAuth: [] }],
      },
    },
    createUserHandler as any
  );

  // Get all users
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all users (filtered by role and active status)',
        tags: ['users'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            role: { type: 'string', enum: ['ADMIN', 'CHATTER_MANAGER', 'CHATTER'] },
            isActive: { type: 'string' }, // Query params are always strings
          },
        },
      },
    },
    getUsersHandler
  );

  // Get user by ID
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get user by ID',
        tags: ['users'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    getUserHandler
  );

  // Update user (Admin only)
  fastify.put(
    '/:id',
    {
      preHandler: [requireAdmin, validate(updateUserSchema)],
      schema: {
        description: 'Update user (Admin only)',
        tags: ['users'],
        security: [{ bearerAuth: [] }],
      },
    },
    updateUserHandler as any
  );

  // Delete user (Admin only)
  fastify.delete(
    '/:id',
    {
      preHandler: [requireAdmin],
      schema: {
        description: 'Delete user (Admin only)',
        tags: ['users'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    deleteUserHandler as any
  );

  // Upload identification photo (Admin only)
  fastify.post(
    '/:id/identification-photo',
    {
      preHandler: [requireAdmin],
      schema: {
        description: 'Upload identification photo for a user (Admin only)',
        tags: ['users'],
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
    uploadUserIdentificationPhotoHandler as any
  );

  // Upload avatar/profile image (User can upload their own, Admin can upload for anyone)
  fastify.post(
    '/:id/avatar',
    {
      schema: {
        description: 'Upload profile image for a user',
        tags: ['users'],
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
    uploadUserAvatarHandler as any
  );
}

