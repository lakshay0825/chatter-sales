import { prisma } from '../config/database';
import { UserRole } from '@prisma/client';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors';
import { generateInvitationToken, hashPassword } from './auth.service';
import { sendInvitationEmail } from '../utils/email';
import { CreateUserInput, UpdateUserInput } from '../validations/user.schema';

/**
 * Create and invite a new user
 */
export async function createUser(input: CreateUserInput) {
  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }

  // Generate invitation token
  const invitationToken = generateInvitationToken();
  const invitationExpires = new Date();
  invitationExpires.setDate(invitationExpires.getDate() + 7); // 7 days expiry

  // Create user
  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      name: input.name,
      role: input.role,
      commissionPercent: input.commissionPercent || null,
      fixedSalary: input.fixedSalary || null,
      password: '', // Will be set when user activates account
      invitationToken,
      invitationExpires,
      emailVerified: false,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      invitationToken: true,
    },
  });

  // Send invitation email
  try {
    await sendInvitationEmail(user.email, user.name, user.invitationToken!);
  } catch (error) {
    // Log error but don't fail user creation
    console.error('Failed to send invitation email:', error);
  }

  return user;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatar: true,
      identificationPhoto: true,
      commissionPercent: true,
      fixedSalary: true,
      isActive: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user;
}

/**
 * Get all users (with optional filtering)
 */
export async function getUsers(role?: UserRole, isActive?: boolean) {
  const where: any = {};
  if (role) where.role = role;
  if (isActive !== undefined && isActive !== null) {
    where.isActive = isActive;
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatar: true,
      identificationPhoto: true,
      commissionPercent: true,
      fixedSalary: true,
      isActive: true,
      emailVerified: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  
  console.log(`[getUsers service] role filter: ${role}, isActive filter: ${isActive}, where clause: ${JSON.stringify(where)}, found ${users.length} users`);

  return users;
}

/**
 * Update user
 */
export async function updateUser(userId: string, input: UpdateUserInput) {
  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    throw new NotFoundError('User not found');
  }

  // Validate commission percent if provided
  if (input.commissionPercent !== undefined && (input.commissionPercent < 0 || input.commissionPercent > 100)) {
    throw new ValidationError('Commission percentage must be between 0 and 100');
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.role !== undefined && { role: input.role }),
      ...(input.commissionPercent !== undefined && { commissionPercent: input.commissionPercent }),
      ...(input.fixedSalary !== undefined && { fixedSalary: input.fixedSalary }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.identificationPhoto !== undefined && { identificationPhoto: input.identificationPhoto }),
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatar: true,
      identificationPhoto: true,
      commissionPercent: true,
      fixedSalary: true,
      isActive: true,
      updatedAt: true,
    },
  });

  return user;
}

/**
 * Delete user (soft delete by setting isActive to false)
 */
export async function deleteUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Soft delete
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });

  return { message: 'User deleted successfully' };
}

