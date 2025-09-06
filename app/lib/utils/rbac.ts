'use server';

import { createClient } from '@/lib/supabase/server';

// Define user roles
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin'
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