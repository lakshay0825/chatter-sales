import { FastifyInstance } from 'fastify';
import { login, register, getCurrentUser, changePassword, updateCurrentUserHandler } from '../controllers/auth.controller';
import { loginSchema, registerSchema, changePasswordSchema } from '../validations/auth.schema';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';

export async function authRoutes(fastify: FastifyInstance) {
  // Login
  fastify.post(
    '/login',
    {
      preHandler: [validate(loginSchema)],
      schema: {
        description: 'Login with email and password',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  token: { type: 'string' },
                  user: {
                    type: 'object',
                    properties: {
                      userId: { type: 'string' },
                      email: { type: 'string' },
                      role: { type: 'string', enum: ['ADMIN', 'CHATTER_MANAGER', 'CHATTER'] },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    login as any
  );

  // Register/Activate account
  fastify.post(
    '/register',
    {
      preHandler: [validate(registerSchema)],
      schema: {
        description: 'Register/Activate account with invitation token',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['token', 'password'],
          properties: {
            token: { type: 'string' },
            password: { type: 'string', minLength: 6 },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  token: { type: 'string' },
                  user: {
                    type: 'object',
                    properties: {
                      userId: { type: 'string' },
                      email: { type: 'string' },
                      role: { type: 'string' },
                    },
                  },
                },
              },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    register as any
  );

  // Get current user
  fastify.get(
    '/me',
    {
      preHandler: [authenticate],
      schema: {
        description: 'Get current authenticated user',
        tags: ['auth'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string', nullable: true },
                  email: { type: 'string' },
                  role: { type: 'string' },
                  avatar: { type: 'string', nullable: true },
                  isActive: { type: 'boolean' },
                  commissionPercent: { type: 'number', nullable: true },
                  fixedSalary: { type: 'number', nullable: true },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
      },
    },
    getCurrentUser
  );

  // Update current user profile (name only)
  fastify.patch(
    '/me',
    {
      preHandler: [authenticate],
      schema: {
        description: 'Update current user profile (name only)',
        tags: ['auth'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    updateCurrentUserHandler as any
  );

  // Change password
  fastify.post(
    '/change-password',
    {
      preHandler: [authenticate, validate(changePasswordSchema)],
      schema: {
        description: 'Change password for authenticated user',
        tags: ['auth'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string' },
            newPassword: { type: 'string', minLength: 6 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    changePassword as any
  );
}

