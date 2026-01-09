import { FastifyRequest, FastifyReply } from 'fastify';
import {
  createCreator,
  getCreatorById,
  getCreators,
  updateCreator,
  deleteCreator,
} from '../services/creator.service';
import { CreateCreatorInput, UpdateCreatorInput } from '../validations/creator.schema';
import { ApiResponse } from '../types';

export async function createCreatorHandler(
  request: FastifyRequest<{ Body: CreateCreatorInput }>,
  reply: FastifyReply
) {
  const creator = await createCreator(request.body);

  const response: ApiResponse<typeof creator> = {
    success: true,
    data: creator,
    message: 'Creator created successfully',
  };

  return reply.code(201).send(response);
}

export async function getCreatorHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const creator = await getCreatorById(id);

  const response: ApiResponse<typeof creator> = {
    success: true,
    data: creator,
  };

  return reply.code(200).send(response);
}

export async function getCreatorsHandler(
  request: FastifyRequest<{ Querystring: { isActive?: string | boolean } }>,
  reply: FastifyReply
) {
  const { isActive } = request.query;
  
  // Handle query parameter - Fastify receives query params as strings
  // Axios sends boolean as string "true"/"false" in URL
  let isActiveFilter: boolean | undefined = undefined;
  if (isActive !== undefined && isActive !== null) {
    if (typeof isActive === 'boolean') {
      isActiveFilter = isActive;
    } else if (typeof isActive === 'string') {
      // Convert string to boolean
      isActiveFilter = isActive === 'true' || isActive === '1';
    }
  }
  
  const creators = await getCreators(isActiveFilter);
  
  console.log(`[getCreatorsHandler] isActive param: ${JSON.stringify(isActive)}, type: ${typeof isActive}, filter: ${isActiveFilter}, result: ${creators.length} creators`);

  const response: ApiResponse<typeof creators> = {
    success: true,
    data: creators,
  };

  return reply.code(200).send(response);
}

export async function updateCreatorHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateCreatorInput }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const creator = await updateCreator(id, request.body);

  const response: ApiResponse<typeof creator> = {
    success: true,
    data: creator,
    message: 'Creator updated successfully',
  };

  return reply.code(200).send(response);
}

export async function deleteCreatorHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  await deleteCreator(id);

  const response: ApiResponse = {
    success: true,
    message: 'Creator deleted successfully',
  };

  return reply.code(200).send(response);
}

