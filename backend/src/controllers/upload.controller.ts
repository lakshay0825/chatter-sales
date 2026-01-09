import { FastifyRequest, FastifyReply } from 'fastify';
import { saveUploadedFile, validateImageFile } from '../utils/upload';
import { updateUser } from '../services/user.service';
import { updateCreator } from '../services/creator.service';
import { ApiResponse } from '../types';
import { ValidationError } from '../utils/errors';

/**
 * Upload identification photo for a user
 */
export async function uploadUserIdentificationPhotoHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const data = await request.file();

  if (!data) {
    throw new ValidationError('No file provided');
  }

  // Validate file
  const validation = await validateImageFile(data);
  if (!validation.valid) {
    throw new ValidationError(validation.error || 'Invalid file');
  }

  // Save file
  const filePath = await saveUploadedFile(data, 'users');

  // Update user with file path
  const user = await updateUser(id, { identificationPhoto: filePath });

  const response: ApiResponse<typeof user> = {
    success: true,
    data: user,
    message: 'Identification photo uploaded successfully',
  };

  return reply.code(200).send(response);
}

/**
 * Upload identification photo for a creator
 */
export async function uploadCreatorIdentificationPhotoHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const data = await request.file();

  if (!data) {
    throw new ValidationError('No file provided');
  }

  // Validate file
  const validation = await validateImageFile(data);
  if (!validation.valid) {
    throw new ValidationError(validation.error || 'Invalid file');
  }

  // Save file
  const filePath = await saveUploadedFile(data, 'creators');

  // Update creator with file path
  const creator = await updateCreator(id, { identificationPhoto: filePath });

  const response: ApiResponse<typeof creator> = {
    success: true,
    data: creator,
    message: 'Identification photo uploaded successfully',
  };

  return reply.code(200).send(response);
}

