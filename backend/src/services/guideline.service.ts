import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateGuidelineData {
  title: string;
  content: string;
}

export interface UpdateGuidelineData {
  title?: string;
  content?: string;
}

export const guidelineService = {
  /**
   * Get the latest guideline
   */
  async getLatestGuideline() {
    const guideline = await prisma.guideline.findFirst({
      orderBy: {
        updatedAt: 'desc',
      },
    });
    return guideline;
  },

  /**
   * Get guideline by ID
   */
  async getGuidelineById(id: string) {
    const guideline = await prisma.guideline.findUnique({
      where: { id },
    });
    if (!guideline) {
      throw new Error('Guideline not found');
    }
    return guideline;
  },

  /**
   * Create a new guideline
   */
  async createGuideline(data: CreateGuidelineData, updatedBy: string) {
    // Get the latest version number
    const latest = await prisma.guideline.findFirst({
      orderBy: { version: 'desc' },
    });
    const nextVersion = latest ? latest.version + 1 : 1;

    const guideline = await prisma.guideline.create({
      data: {
        title: data.title,
        content: data.content,
        version: nextVersion,
        updatedBy,
      },
    });
    return guideline;
  },

  /**
   * Update guideline
   */
  async updateGuideline(id: string, data: UpdateGuidelineData, updatedBy: string) {
    const existing = await prisma.guideline.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new Error('Guideline not found');
    }

    // Increment version if content or title changed
    const contentChanged = data.content !== undefined && data.content !== existing.content;
    const titleChanged = data.title !== undefined && data.title !== existing.title;
    const shouldIncrementVersion = contentChanged || titleChanged;

    const guideline = await prisma.guideline.update({
      where: { id },
      data: {
        ...data,
        version: shouldIncrementVersion ? existing.version + 1 : existing.version,
        updatedBy,
      },
    });
    return guideline;
  },

  /**
   * Get all guidelines (for history/version tracking)
   */
  async getAllGuidelines() {
    const guidelines = await prisma.guideline.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
    });
    return guidelines;
  },
};

