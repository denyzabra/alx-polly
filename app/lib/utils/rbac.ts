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
 * Check if the current user has the required role
 * @param requiredRole - The role required to access a resource
 * @returns Object containing whether the user is authorized and their role
 */
export async function checkUserRole(requiredRole: UserRole): Promise<{ authorized: boolean; role: UserRole | null }> {
  const supabase = await createClient();
  
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { authorized: false, role: null };
  }
  
  // Get user's role from the database
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  
  if (error || !data) {
    // Default to regular user if no role is found
    const userRole = UserRole.USER;
    return { authorized: userRole === requiredRole, role: userRole };
  }
  
  const userRole = data.role as UserRole;
  
  return { 
    authorized: userRole === requiredRole,
    role: userRole
  };
}

/**
 * Middleware to protect routes based on user role
 * @param requiredRole - The role required to access the route
 */
export async function withRoleProtection(requiredRole: UserRole) {
  const { authorized } = await checkUserRole(requiredRole);
  
  if (!authorized) {
    throw new Error('Unauthorized: You do not have permission to access this resource');
  }
}