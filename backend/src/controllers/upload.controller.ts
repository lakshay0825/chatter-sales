import { FastifyRequest, FastifyReply } from 'fastify';
import { saveUploadedFile, validateImageFile } from '../utils/upload';
import { updateUser } from '../services/user.service';
import { updateCreator } from '../services/creator.service';
import { ApiResponse } from '../types';
import { ValidationError, ForbiddenError } from '../utils/errors';

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
  const relativePath = await saveUploadedFile(data, 'users');

  // Convert to absolute URL
  const baseUrl = process.env.API_BASE_URL || `${request.protocol}://${request.headers.host}`;
  const absoluteUrl = `${String(baseUrl).replace(/\/$/, '')}${relativePath}`;

  // Update user with absolute URL
  const user = await updateUser(id, { identificationPhoto: absoluteUrl });

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
  const relativePath = await saveUploadedFile(data, 'creators');

  // Convert to absolute URL
  const baseUrl = process.env.API_BASE_URL || `${request.protocol}://${request.headers.host}`;
  const absoluteUrl = `${String(baseUrl).replace(/\/$/, '')}${relativePath}`;

  // Update creator with absolute URL
  const creator = await updateCreator(id, { identificationPhoto: absoluteUrl });

  const response: ApiResponse<typeof creator> = {
    success: true,
    data: creator,
    message: 'Identification photo uploaded successfully',
  };

  return reply.code(200).send(response);
}

/**
 * Upload avatar/profile image for a user
 */
export async function uploadUserAvatarHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const { id } = request.params;
  const userId = request.user.userId;
  const userRole = request.user.role;

  // Users can only upload their own avatar, admins can upload for anyone
  if (userRole !== 'ADMIN' && id !== userId) {
    throw new ForbiddenError('You can only upload your own profile image');
  }

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
  const relativePath = await saveUploadedFile(data, 'users');

  // Convert to absolute URL
  const baseUrl = process.env.API_BASE_URL || `${request.protocol}://${request.headers.host}`;
  const absoluteUrl = `${String(baseUrl).replace(/\/$/, '')}${relativePath}`;

  // Update user with absolute URL
  const user = await updateUser(id, { avatar: absoluteUrl });

  const response: ApiResponse<typeof user> = {
    success: true,
    data: user,
    message: 'Profile image uploaded successfully',
  };

  return reply.code(200).send(response);
}

/**
 * Upload avatar/profile image for a creator
 */
export async function uploadCreatorAvatarHandler(
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
  const relativePath = await saveUploadedFile(data, 'creators');

  // Convert to absolute URL
  const baseUrl = process.env.API_BASE_URL || `${request.protocol}://${request.headers.host}`;
  const absoluteUrl = `${String(baseUrl).replace(/\/$/, '')}${relativePath}`;

  // Update creator with absolute URL
  const creator = await updateCreator(id, { avatar: absoluteUrl });

  const response: ApiResponse<typeof creator> = {
    success: true,
    data: creator,
    message: 'Profile image uploaded successfully',
  };

  return reply.code(200).send(response);
}
