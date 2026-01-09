import { FastifyInstance } from 'fastify';
import { guidelineController } from '../controllers/guideline.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

export default async function guidelineRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  // Get latest guideline (public for authenticated users)
  fastify.get(
    '/guidelines/latest',
    {
      schema: {
        description: 'Get the latest guideline',
        tags: ['guidelines'],
        security: [{ bearerAuth: [] }],
      },
    },
    guidelineController.getLatestGuidelineHandler
  );

  // Get all guidelines (admin only - for version history)
  fastify.get(
    '/guidelines',
    {
      preHandler: [requireAdmin],
      schema: {
        description: 'Get all guidelines (Admin only)',
        tags: ['guidelines'],
        security: [{ bearerAuth: [] }],
      },
    },
    guidelineController.getAllGuidelinesHandler
  );

  // Get guideline by ID
  fastify.get(
    '/guidelines/:id',
    {
      schema: {
        description: 'Get guideline by ID',
        tags: ['guidelines'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    guidelineController.getGuidelineByIdHandler
  );

  // Upload image for guidelines (admin only)
  fastify.post(
    '/guidelines/upload-image',
    {
      preHandler: [requireAdmin],
      schema: {
        description: 'Upload image for guidelines (Admin only)',
        tags: ['guidelines'],
        security: [{ bearerAuth: [] }],
      },
    },
    guidelineController.uploadGuidelineImageHandler
  );

  // Create guideline (admin only)
  fastify.post(
    '/guidelines',
    {
      preHandler: [requireAdmin],
      schema: {
        description: 'Create a new guideline (Admin only)',
        tags: ['guidelines'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['title', 'content'],
          properties: {
            title: { type: 'string' },
            content: { type: 'string' },
          },
        },
      },
    },
    guidelineController.createGuidelineHandler
  );

  // Update guideline (admin only)
  fastify.put(
    '/guidelines/:id',
    {
      preHandler: [requireAdmin],
      schema: {
        description: 'Update guideline (Admin only)',
        tags: ['guidelines'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            content: { type: 'string' },
          },
        },
      },
    },
    guidelineController.updateGuidelineHandler
  );
}

