import { User, UserRole } from '../types';

/**
 * Permission utility functions
 * Based on the permissions matrix:
 * - Chatter: Can insert sales, edit own sales (< 24h), view own dashboard only
 * - Chatter Manager: Can insert sales, edit any sale, reassign sales, modify shifts, view all sales
 *   Restrictions: Cannot change commission percentages, fixed salaries, invite/remove users, manage creators
 *   Cannot see other chatters' commission percentages (only admins can)
 * - Admin: Full access to everything
 */

export function isAdmin(user: User | null): boolean {
  return user?.role === UserRole.ADMIN;
}

export function isManager(user: User | null): boolean {
  return user?.role === UserRole.CHATTER_MANAGER || isAdmin(user);
}

export function isChatter(user: User | null): boolean {
  return user?.role === UserRole.CHATTER;
}

/**
 * Check if user can edit a specific sale
 */
export function canEditSale(
  user: User | null,
  saleUserId: string,
  saleDate: string | Date
): boolean {
  if (!user) return false;

  // Admins and managers can always edit any sale
  if (isManager(user)) {
    return true;
  }

  // Chatters can only edit their own sales
  if (saleUserId !== user.id) {
    return false;
  }

  // Check 24-hour window for chatters
  const saleDateTime = typeof saleDate === 'string' ? new Date(saleDate) : saleDate;
  const now = new Date();
  const diffHours = (now.getTime() - saleDateTime.getTime()) / (1000 * 60 * 60);

  return diffHours <= 24;
}

/**
 * Check if user can reassign sales to other chatters
 */
export function canReassignSales(user: User | null): boolean {
  return isManager(user);
}

/**
 * Check if user can view others' commissions
 */
export function canViewOthersCommissions(user: User | null): boolean {
  return isAdmin(user);
}

/**
 * Check if user can modify shifts
 */
export function canModifyShifts(user: User | null): boolean {
  return isManager(user);
}

/**
 * Check if user can manage chatters (users)
 */
export function canManageChatters(user: User | null): boolean {
  return isAdmin(user);
}

/**
 * Check if user can manage creators
 */
export function canManageCreators(user: User | null): boolean {
  return isAdmin(user);
}

/**
 * Check if user can insert sales
 */
export function canInsertSales(user: User | null): boolean {
  return !!user; // All authenticated users can insert sales
}

