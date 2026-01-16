import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { UnauthorizedError, NotFoundError, ValidationError } from '../utils/errors';
import { JWTPayload } from '../types';
import crypto from 'crypto';

/**
 * Generate invitation token
 */
export function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify password
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Login user
 */
export async function loginUser(email: string, password: string): Promise<JWTPayload> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user || !user.isActive) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const isValidPassword = await verifyPassword(password, user.password);
  if (!isValidPassword) {
    throw new UnauthorizedError('Invalid credentials');
  }

  if (!user.emailVerified) {
    throw new ValidationError('Please verify your email first');
  }

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
}

/**
 * Register/Activate account with invitation token
 */
export async function registerUser(
  token: string,
  password: string
): Promise<JWTPayload> {
  const user = await prisma.user.findUnique({
    where: { invitationToken: token },
  });

  if (!user) {
    throw new NotFoundError('Invalid invitation token');
  }

  if (user.invitationExpires && user.invitationExpires < new Date()) {
    throw new ValidationError('Invitation token has expired');
  }

  if (user.emailVerified) {
    throw new ValidationError('Account already activated');
  }

  const hashedPassword = await hashPassword(password);

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      invitationToken: null,
      invitationExpires: null,
    },
  });

  return {
    userId: updatedUser.id,
    email: updatedUser.email,
    role: updatedUser.role,
  };
}

/**
 * Change password for authenticated user
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Verify current password
  const isValidPassword = await verifyPassword(currentPassword, user.password);
  if (!isValidPassword) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
    },
  });
}

/**
 * Request password reset - generates token and sends email
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  // Don't reveal if user exists for security
  if (!user || !user.emailVerified) {
    return;
  }

  // Generate reset token (reuse invitationToken field)
  const resetToken = generateInvitationToken();
  const resetExpires = new Date();
  resetExpires.setHours(resetExpires.getHours() + 24); // 24 hours expiry

  await prisma.user.update({
    where: { id: user.id },
    data: {
      invitationToken: resetToken,
      invitationExpires: resetExpires,
    },
  });

  // Send reset email
  const { sendPasswordResetEmail } = await import('../utils/email');
  await sendPasswordResetEmail(user.email, user.name || 'User', resetToken);
}

/**
 * Reset password with token
 */
export async function resetPassword(
  token: string,
  password: string
): Promise<JWTPayload> {
  const user = await prisma.user.findUnique({
    where: { invitationToken: token },
  });

  if (!user) {
    throw new NotFoundError('Invalid reset token');
  }

  if (!user.invitationExpires || user.invitationExpires < new Date()) {
    throw new ValidationError('Reset token has expired');
  }

  if (!user.emailVerified) {
    throw new ValidationError('Account not verified');
  }

  const hashedPassword = await hashPassword(password);

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      invitationToken: null,
      invitationExpires: null,
    },
  });

  return {
    userId: updatedUser.id,
    email: updatedUser.email,
    role: updatedUser.role,
  };
}
/**
 * Request password reset - generates token and sends email
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  // Don't reveal if user exists for security
  if (!user || !user.emailVerified) {
    return;
  }

  // Generate reset token (reuse invitationToken field)
  const resetToken = generateInvitationToken();
  const resetExpires = new Date();
  resetExpires.setHours(resetExpires.getHours() + 24); // 24 hours expiry

  await prisma.user.update({
    where: { id: user.id },
    data: {
      invitationToken: resetToken,
      invitationExpires: resetExpires,
    },
  });

  // Send reset email
  const { sendPasswordResetEmail } = await import('../utils/email');
  await sendPasswordResetEmail(user.email, user.name || 'User', resetToken);
}

/**
 * Reset password with token
 */
export async function resetPassword(
  token: string,
  password: string
): Promise<JWTPayload> {
  const user = await prisma.user.findUnique({
    where: { invitationToken: token },
  });

  if (!user) {
    throw new NotFoundError('Invalid reset token');
  }

  if (!user.invitationExpires || user.invitationExpires < new Date()) {
    throw new ValidationError('Reset token has expired');
  }

  if (!user.emailVerified) {
    throw new ValidationError('Account not verified');
  }

  const hashedPassword = await hashPassword(password);

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      invitationToken: null,
      invitationExpires: null,
    },
  });

  return {
    userId: updatedUser.id,
    email: updatedUser.email,
    role: updatedUser.role,
  };
}