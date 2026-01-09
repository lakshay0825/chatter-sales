import { FastifyInstance } from 'fastify';
import {
  listLessonsHandler,
  createLessonHandler,
  updateLessonHandler,
  deleteLessonHandler,
  incrementLessonViewsHandler,
  uploadLessonMediaHandler,
} from '../controllers/lesson.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

export async function lessonRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);

  fastify.get(
    '/',
    {
      schema: {
        description: 'List lessons with optional filters',
        tags: ['lessons'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            search: { type: 'string' },
            category: { type: 'string' },
            sortBy: { type: 'string', enum: ['newest', 'mostViewed', 'category'] },
          },
        },
      },
    },
    listLessonsHandler
  );

  fastify.post(
    '/',
    {
      preHandler: [requireAdmin],
      schema: {
        description: 'Create lesson (admin only)',
        tags: ['lessons'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['title', 'videoUrl', 'duration', 'category'],
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            videoUrl: { type: 'string' },
            thumbnailUrl: { type: 'string' },
            duration: { type: 'integer' },
            category: { type: 'string' },
            notes: { type: 'string' },
          },
        },
      },
    },
    createLessonHandler
  );

  fastify.put(
    '/:id',
    {
      preHandler: [requireAdmin],
      schema: {
        description: 'Update lesson (admin only)',
        tags: ['lessons'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    updateLessonHandler
  );

  fastify.delete(
    '/:id',
    {
      preHandler: [requireAdmin],
      schema: {
        description: 'Delete lesson (admin only)',
        tags: ['lessons'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    deleteLessonHandler
  );

  fastify.post(
    '/:id/views',
    {
      schema: {
        description: 'Increment lesson views',
        tags: ['lessons'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    incrementLessonViewsHandler
  );

  fastify.post(
    '/upload',
    {
      preHandler: [requireAdmin],
      schema: {
        description: 'Upload lesson media (video or thumbnail)',
        tags: ['lessons'],
        security: [{ bearerAuth: [] }],
        consumes: ['multipart/form-data'],
      },
    },
    uploadLessonMediaHandler
  );
}


