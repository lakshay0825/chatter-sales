import { FastifyRequest, FastifyReply } from 'fastify';
import {
  createUser,
  getUserById,
  getUsers,
  updateUser,
  deleteUser,
} from '../services/user.service';
import { CreateUserInput, UpdateUserInput } from '../validations/user.schema';
import { ApiResponse } from '../types';

export async function createUserHandler(
  request: FastifyRequest<{ Body: CreateUserInput }>,
  reply: FastifyReply
) {
  const user = await createUser(request.body);

  const response: ApiResponse<typeof user> = {
    success: true,
    data: user,
    message: 'User created and invitation email sent',
  };

  return reply.code(201).send(response);
}

export async function getUserHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const user = await getUserById(id);

  const response: ApiResponse<typeof user> = {
    success: true,
    data: user,
  };

  return reply.code(200).send(response);
}

export async function getUsersHandler(
  request: FastifyRequest<{ Querystring: { role?: string; isActive?: string | boolean } }>,
  reply: FastifyReply
) {
  const { role, isActive } = request.query;
  
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
  
  const users = await getUsers(
    role as any,
    isActiveFilter
  );
  
  console.log(`[getUsersHandler] role: ${role}, isActive param: ${JSON.stringify(isActive)}, type: ${typeof isActive}, filter: ${isActiveFilter}, result: ${users.length} users`);

  const response: ApiResponse<typeof users> = {
    success: true,
    data: users,
  };

  return reply.code(200).send(response);
}

export async function updateUserHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateUserInput }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const user = await updateUser(id, request.body);

  const response: ApiResponse<typeof user> = {
    success: true,
    data: user,
    message: 'User updated successfully',
  };

  return reply.code(200).send(response);
}

export async function deleteUserHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { id } = request.params;

  // Prevent a user (including admins) from deleting themselves
  if (request.user && request.user.userId === id) {
    const response: ApiResponse = {
      success: false,
      error: 'You cannot delete your own account. Please have another admin perform this action.',
    };
    return reply.code(400).send(response);
  }

  await deleteUser(id);

  const response: ApiResponse = {
    success: true,
    message: 'User deleted successfully',
  };

  return reply.code(200).send(response);
}

