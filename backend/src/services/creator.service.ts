import { prisma } from '../config/database';
import { NotFoundError, ConflictError } from '../utils/errors';
import { CreateCreatorInput, UpdateCreatorInput } from '../validations/creator.schema';

/**
 * Create a new creator
 */
export async function createCreator(input: CreateCreatorInput) {
  // Check if creator with same name already exists
  const existingCreator = await prisma.creator.findUnique({
    where: { name: input.name },
  });

  if (existingCreator) {
    throw new ConflictError('Creator with this name already exists');
  }

  const creator = await prisma.creator.create({
    data: {
      name: input.name,
      compensationType: input.compensationType,
      revenueSharePercent: input.compensationType === 'PERCENTAGE' ? (input.revenueSharePercent !== undefined ? input.revenueSharePercent : null) : null,
      fixedSalaryCost: input.compensationType === 'SALARY' ? (input.fixedSalaryCost !== undefined ? input.fixedSalaryCost : null) : null,
    },
  });

  return creator;
}

/**
 * Get creator by ID
 */
export async function getCreatorById(creatorId: string) {
  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
  });

  if (!creator) {
    throw new NotFoundError('Creator not found');
  }

  return creator;
}

/**
 * Get all creators
 */
export async function getCreators(isActive?: boolean) {
  const where: any = {};
  if (isActive !== undefined && isActive !== null) {
    where.isActive = isActive;
  }

  const creators = await prisma.creator.findMany({
    where,
    orderBy: {
      name: 'asc',
    },
  });
  
  console.log(`[getCreators service] isActive filter: ${isActive}, where clause: ${JSON.stringify(where)}, found ${creators.length} creators`);

  return creators;
}

/**
 * Update creator
 */
export async function updateCreator(creatorId: string, input: UpdateCreatorInput) {
  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
  });

  if (!creator) {
    throw new NotFoundError('Creator not found');
  }

  // Handle compensation type changes
  let revenueSharePercent = creator.revenueSharePercent;
  let fixedSalaryCost = creator.fixedSalaryCost;

  if (input.compensationType) {
    if (input.compensationType === 'PERCENTAGE') {
      revenueSharePercent = input.revenueSharePercent ?? creator.revenueSharePercent;
      fixedSalaryCost = null;
    } else {
      fixedSalaryCost = input.fixedSalaryCost ?? creator.fixedSalaryCost;
      revenueSharePercent = null;
    }
  } else {
    // If not changing type, update values for current type
    if (creator.compensationType === 'PERCENTAGE' && input.revenueSharePercent !== undefined) {
      revenueSharePercent = input.revenueSharePercent;
    }
    if (creator.compensationType === 'SALARY' && input.fixedSalaryCost !== undefined) {
      fixedSalaryCost = input.fixedSalaryCost;
    }
  }

  const updatedCreator = await prisma.creator.update({
    where: { id: creatorId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.compensationType !== undefined && { compensationType: input.compensationType }),
      revenueSharePercent,
      fixedSalaryCost,
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.identificationPhoto !== undefined && { identificationPhoto: input.identificationPhoto }),
    },
  });

  return updatedCreator;
}

/**
 * Delete creator (hard delete)
 * Note: Cannot delete if creator has associated sales (due to foreign key constraint)
 */
export async function deleteCreator(creatorId: string) {
  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
    include: {
      sales: {
        take: 1, // Just check if any sales exist
      },
      monthlyFinancials: {
        take: 1,
      },
      goals: {
        take: 1,
      },
    },
  });

  if (!creator) {
    throw new NotFoundError('Creator not found');
  }

  // Check if creator has associated sales
  if (creator.sales.length > 0) {
    throw new ConflictError('Cannot delete creator with associated sales. Please remove or reassign sales first.');
  }

  // Delete related monthly financials and goals first (they cascade, but being explicit)
  await prisma.monthlyFinancial.deleteMany({
    where: { creatorId },
  });

  await prisma.goal.deleteMany({
    where: { creatorId },
  });

  // Hard delete the creator
  await prisma.creator.delete({
    where: { id: creatorId },
  });

  return { message: 'Creator deleted successfully' };
}

