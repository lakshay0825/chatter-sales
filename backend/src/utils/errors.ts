import { FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation error', public errors?: any) {
    super(400, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(409, message);
  }
}

// Error handler middleware
export async function errorHandler(
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  request.log.error(error);

  // Zod validation errors
  if (error instanceof ZodError) {
    return reply.status(400).send({
      success: false,
      error: 'Validation error',
      details: error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
      })),
    });
  }

  // Custom application errors
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: error.message,
      ...(error instanceof ValidationError && error.errors ? { details: error.errors } : {}),
    });
  }

  // Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;
    
    if (prismaError.code === 'P2002') {
      return reply.status(409).send({
        success: false,
        error: 'A record with this value already exists',
      });
    }

    if (prismaError.code === 'P2025') {
      return reply.status(404).send({
        success: false,
        error: 'Record not found',
      });
    }
  }

  // Default error
  return reply.status(500).send({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
  });
}

