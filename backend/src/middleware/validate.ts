import { FastifyRequest, FastifyReply } from 'fastify';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

/**
 * Validation middleware factory for Fastify routes
 * Validates request body, query, and params using Zod schemas
 */
export function validate(schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      if (schema.body) {
        request.body = schema.body.parse(request.body);
      }
      if (schema.query) {
        request.query = schema.query.parse(request.query);
      }
      if (schema.params) {
        request.params = schema.params.parse(request.params);
      }
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        throw new ValidationError('Validation failed', error.errors);
      }
      throw error;
    }
  };
}

