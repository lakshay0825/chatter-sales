import { FastifyRequest, FastifyReply } from 'fastify';
import { loginUser, registerUser, requestPasswordReset, resetPassword } from '../services/auth.service';
import { LoginInput, RegisterInput, ForgotPasswordInput, ResetPasswordInput } from '../validations/auth.schema';
import { ApiResponse } from '../types';
import { prisma } from '../config/database';

export async function login(
  request: FastifyRequest<{ Body: LoginInput }>,
  reply: FastifyReply
) {
  const { email, password } = request.body;
  
  const user = await loginUser(email, password);
  const token = request.server.jwt.sign(user);

  const response: ApiResponse<{ token: string; user: typeof user }> = {
    success: true,
    data: {
      token,
      user,
    },
  };

  return reply.code(200).send(response);
}

export async function register(
  request: FastifyRequest<{ Body: RegisterInput }>,
  reply: FastifyReply
) {
  const { token, password } = request.body;
  
  const user = await registerUser(token, password);
  const jwtToken = request.server.jwt.sign(user);

  const response: ApiResponse<{ token: string; user: typeof user }> = {
    success: true,
    data: {
      token: jwtToken,
      user,
    },
    message: 'Account activated successfully',
  };

  return reply.code(201).send(response);
}

export async function getCurrentUser(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({
      success: false,
      error: 'Unauthorized',
    });
  }

  // Load full user from database so frontend (Settings, header, etc.) has name, avatar, status, etc.
  const dbUser = await prisma.user.findUnique({
    where: { id: request.user.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatar: true,
      isActive: true,
      commissionPercent: true,
      fixedSalary: true,
      createdAt: true,
    },
  });

  if (!dbUser) {
    return reply.code(404).send({
      success: false,
      error: 'User not found',
    });
  }

  const response: ApiResponse<typeof dbUser> = {
    success: true,
    data: dbUser,
  };

  return reply.code(200).send(response);
}

export async function updateCurrentUserHandler(
  request: FastifyRequest<{ Body: { name: string } }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({
      success: false,
      error: 'Unauthorized',
    });
  }

  const { name } = request.body;

  if (!name || !name.trim()) {
    return reply.code(400).send({
      success: false,
      error: 'Name is required',
    });
  }

  const updatedUser = await prisma.user.update({
    where: { id: request.user.userId },
    data: { name: name.trim() },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatar: true,
      isActive: true,
      commissionPercent: true,
      fixedSalary: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const response: ApiResponse<typeof updatedUser> = {
    success: true,
    data: updatedUser,
    message: 'Profile updated successfully',
  };

  return reply.code(200).send(response);
}

export async function changePassword(
  request: FastifyRequest<{ Body: { currentPassword: string; newPassword: string } }>,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  const { changePassword: changePasswordService } = await import('../services/auth.service');
  await changePasswordService(
    request.user.userId,
    request.body.currentPassword,
    request.body.newPassword
  );

  const response: ApiResponse = {
    success: true,
    message: 'Password changed successfully',
  };

  return reply.code(200).send(response);
}

export async function forgotPassword(
  request: FastifyRequest<{ Body: ForgotPasswordInput }>,
  reply: FastifyReply
) {
  const { email } = request.body;
  
  await requestPasswordReset(email);

  // Always return success to prevent email enumeration
  const response: ApiResponse = {
    success: true,
    message: 'If an account exists with that email, a password reset link has been sent.',
  };

  return reply.code(200).send(response);
}

export async function resetPasswordHandler(
  request: FastifyRequest<{ Body: ResetPasswordInput }>,
  reply: FastifyReply
) {
  const { token, password } = request.body;
  
  const user = await resetPassword(token, password);
  const jwtToken = request.server.jwt.sign(user);

  const response: ApiResponse<{ token: string; user: typeof user }> = {
    success: true,
    data: {
      token: jwtToken,
      user,
    },
    message: 'Password reset successfully',
  };

  return reply.code(200).send(response);
}