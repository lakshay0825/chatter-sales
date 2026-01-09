import { FastifyRequest, FastifyReply } from 'fastify';
import { ZodError, ZodObject } from 'zod';
import { ValidationError } from '../utils/errors';

/**
 * Validation middleware factory for Fastify routes
 * Validates request body, query, and params using Zod schemas
 * Accepts a ZodObject with nested body/query/params properties
 */
export function validate(schema: ZodObject<any>) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      const shape = schema.shape;
      
      if (shape.body) {
        request.body = shape.body.parse(request.body);
      }
      if (shape.query) {
        request.query = shape.query.parse(request.query);
      }
      if (shape.params) {
        request.params = shape.params.parse(request.params);
      }
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        throw new ValidationError('Validation failed', error.errors);
      }
      throw error;
    }
  };
}

