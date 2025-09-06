'use server';

/**
 * @fileoverview Role-Based Access Control (RBAC) utilities for user authorization
 * 
 * This module provides functionality for checking user roles and protecting routes
 * based on required authorization levels. It ensures that users can only access
 * resources and perform actions appropriate for their assigned role.
 */

import { createClient } from '@/lib/supabase/server';

/**
 * Enum representing the available user roles in the system
 * 
 * @enum {string}
 * @property {string} USER - Standard user with basic permissions
 * @property {string} ADMIN - Administrator with full system access
 * @property {string} MODERATOR - Moderator with content management permissions
 */
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator'
}

/**
 * Checks if the current authenticated user has one of the required roles
 * 
 * This function verifies if the currently logged-in user has sufficient
 * permissions by checking if their assigned role matches any of the roles
 * in the required roles array. It first retrieves the user's session,
 * then fetches their role from the profiles table in the database.
 * 
 * @param requiredRoles - Array of roles that are allowed to access the resource
 * @returns Promise resolving to boolean indicating if user has sufficient permissions
 * @example
 * // Check if user can access admin features
 * const canAccess = await checkUserRole([UserRole.ADMIN]);
 * 
 * // Check if user can access moderator or admin features
 * const canModerate = await checkUserRole([UserRole.MODERATOR, UserRole.ADMIN]);
 */
export async function checkUserRole(requiredRoles: UserRole[]): Promise<boolean> {
  const supabase = createClient();
  
  // Get the current user session from Supabase auth
  const { data: { session } } = await supabase.auth.getSession();
  
  // If no active session exists, user is not authenticated
  if (!session) {
    return false;
  }
  
  // Get the user's role from the profiles table in the database
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();
  
  // If profile doesn't exist or has no role, deny access
  if (!profile) {
    return false;
  }
  
  // Check if the user's assigned role is included in the required roles list
  return requiredRoles.includes(profile.role as UserRole);
}

/**
 * Higher-order function to protect routes based on user role requirements
 * 
 * This function creates a route protection middleware that checks if the
 * current user has sufficient permissions to access a protected route.
 * If the user lacks the required role, they are redirected to an unauthorized page.
 * 
 * @param requiredRoles - Array of roles that are allowed to access the route
 * @returns Async function that can be used as middleware for route protection
 * @example
 * // In a route handler:
 * export default async function AdminPage() {
 *   // This will redirect to /unauthorized if user is not an admin
 *   await withRoleProtection([UserRole.ADMIN])();
 *   
 *   return <AdminDashboard />;
 * }
 */
export function withRoleProtection(requiredRoles: UserRole[]) {
  return async function protectRoute() {
    const hasAccess = await checkUserRole(requiredRoles);
    
    if (!hasAccess) {
      // Redirect unauthorized users to the unauthorized page
      redirect('/unauthorized');
    }
  };
}