import { FastifyReply, FastifyRequest } from 'fastify';
import { ApiResponse } from '../types';
import {
  listLessons,
  createLesson,
  updateLesson,
  deleteLesson,
  incrementLessonViews,
} from '../services/lesson.service';
import { parseFileUpload, saveUploadedFile } from '../utils/upload';

export async function listLessonsHandler(
  request: FastifyRequest<{
    Querystring: { search?: string; category?: string; sortBy?: 'newest' | 'mostViewed' | 'category' };
  }>,
  reply: FastifyReply
) {
  const { search, category, sortBy } = request.query;
  const lessons = await listLessons({ search, category, sortBy });

  const response: ApiResponse<typeof lessons> = {
    success: true,
    data: lessons,
  };

  return reply.code(200).send(response);
}

export async function createLessonHandler(
  request: FastifyRequest<{
    Body: {
      title: string;
      description?: string;
      videoUrl: string;
      thumbnailUrl?: string;
      duration: number;
      category: string;
      notes?: string;
    };
  }>,
  reply: FastifyReply
) {
  const lesson = await createLesson(request.body);

  const response: ApiResponse<typeof lesson> = {
    success: true,
    data: lesson,
    message: 'Lesson created successfully',
  };

  return reply.code(201).send(response);
}

export async function updateLessonHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      title?: string;
      description?: string;
      videoUrl?: string;
      thumbnailUrl?: string;
      duration?: number;
      category?: string;
      notes?: string;
    };
  }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const lesson = await updateLesson(id, request.body);

  const response: ApiResponse<typeof lesson> = {
    success: true,
    data: lesson,
    message: 'Lesson updated successfully',
  };

  return reply.code(200).send(response);
}

export async function deleteLessonHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  await deleteLesson(id);

  const response: ApiResponse = {
    success: true,
    message: 'Lesson deleted successfully',
  };

  return reply.code(200).send(response);
}

export async function incrementLessonViewsHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const lesson = await incrementLessonViews(id);

  const response: ApiResponse<typeof lesson> = {
    success: true,
    data: lesson,
  };

  return reply.code(200).send(response);
}

export async function uploadLessonMediaHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const file = await parseFileUpload(request);
  if (!file) {
    return reply.code(400).send({
      success: false,
      error: 'No file uploaded',
    });
  }

  const path = await saveUploadedFile(file, 'lessons');

  const baseUrl =
    process.env.API_BASE_URL || `${request.protocol}://${request.headers.host}`;
  const url = `${String(baseUrl).replace(/\/$/, '')}${path}`;

  const response: ApiResponse<{ url: string }> = {
    success: true,
    data: { url },
  };

  return reply.code(200).send(response);
}


