import { FastifyRequest, FastifyReply } from 'fastify';
import { JWTPayload } from '../types';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

/**
 * Extend FastifyRequest to include user property
 * We override the default JWT user type with our JWTPayload
 */
declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: JWTPayload;
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
    const user = request.user as JWTPayload | undefined;
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!allowedRoles.includes(user.role)) {
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

/**
 * Helper function to safely get user from request
 */
export function getUser(request: FastifyRequest): JWTPayload {
  const user = request.user as JWTPayload | undefined;
  if (!user) {
    throw new UnauthorizedError('Authentication required');
  }
  return user;
}
