import { FastifyRequest, FastifyReply } from 'fastify';
import { guidelineService } from '../services/guideline.service';
import { ApiResponse } from '../types';
import { saveUploadedFile, validateImageFile } from '../utils/upload';
import { ValidationError } from '../utils/errors';

export const guidelineController = {
  /**
   * Get the latest guideline
   */
  async getLatestGuidelineHandler(
    _request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const guideline = await guidelineService.getLatestGuideline();
      const response: ApiResponse<typeof guideline> = {
        success: true,
        data: guideline,
      };
      reply.send(response);
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message || 'Failed to fetch guideline',
      });
    }
  },

  /**
   * Get guideline by ID
   */
  async getGuidelineByIdHandler(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = request.params;
      const guideline = await guidelineService.getGuidelineById(id);
      const response: ApiResponse<typeof guideline> = {
        success: true,
        data: guideline,
      };
      reply.send(response);
    } catch (error: any) {
      reply.status(404).send({
        success: false,
        error: error.message || 'Guideline not found',
      });
    }
  },

  /**
   * Create a new guideline
   */
  async createGuidelineHandler(
    request: FastifyRequest<{ Body: { title: string; content: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { title, content } = request.body;
      const userId = (request.user as any)?.userId;
      if (!userId) {
        reply.status(401).send({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const guideline = await guidelineService.createGuideline(
        { title, content },
        userId
      );
      const response: ApiResponse<typeof guideline> = {
        success: true,
        data: guideline,
      };
      reply.status(201).send(response);
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message || 'Failed to create guideline',
      });
    }
  },

  /**
   * Update guideline
   */
  async updateGuidelineHandler(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { title?: string; content?: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = request.params;
      const { title, content } = request.body;
      const userId = (request.user as any)?.userId;
      if (!userId) {
        reply.status(401).send({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const guideline = await guidelineService.updateGuideline(
        id,
        { title, content },
        userId
      );
      const response: ApiResponse<typeof guideline> = {
        success: true,
        data: guideline,
      };
      reply.send(response);
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message || 'Failed to update guideline',
      });
    }
  },

  /**
   * Get all guidelines
   */
  async getAllGuidelinesHandler(
    _request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const guidelines = await guidelineService.getAllGuidelines();
      const response: ApiResponse<typeof guidelines> = {
        success: true,
        data: guidelines,
      };
      reply.send(response);
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message || 'Failed to fetch guidelines',
      });
    }
  },

  /**
   * Upload image for guidelines
   */
  async uploadGuidelineImageHandler(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
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
      const filePath = await saveUploadedFile(data, 'guidelines');

      const response: ApiResponse<{ url: string }> = {
        success: true,
        data: { url: `/${filePath}` },
        message: 'Image uploaded successfully',
      };

      reply.code(200).send(response);
    } catch (error: any) {
      reply.status(400).send({
        success: false,
        error: error.message || 'Failed to upload image',
      });
    }
  },
};
