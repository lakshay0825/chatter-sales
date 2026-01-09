import { FastifyRequest, FastifyReply } from 'fastify';
import { JWTPayload } from '../types';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

/**
 * Extend FastifyRequest to include user property
 */
declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload;
  }
}

/**
 * Authentication middleware - verifies JWT token
 */
export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch (err) {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

/**
 * Role-based authorization middleware factory
 */
export function requireRole(...allowedRoles: string[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!allowedRoles.includes(request.user.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }
  };
}

/**
 * Require Admin role
 */
export const requireAdmin = requireRole('ADMIN');

/**
 * Require Admin or Chatter Manager role
 */
export const requireManager = requireRole('ADMIN', 'CHATTER_MANAGER');

