'use server';

import { cookies } from 'next/headers';
import { Buffer } from 'buffer';

// Error types for better categorization
export enum AuthErrorType {
  INVALID_CREDENTIALS = 'invalid_credentials',
  RATE_LIMITED = 'rate_limited',
  ACCOUNT_LOCKED = 'account_locked',
  VERIFICATION_REQUIRED = 'verification_required',
  NETWORK_ERROR = 'network_error',
  UNKNOWN = 'unknown'
}

interface ErrorDetails {
  message: string;
  type: AuthErrorType;
  retryAfter?: number; // Seconds until retry is allowed
  additionalInfo?: Record<string, any>;
}

/**
 * Log authentication errors for monitoring
 */
export function logAuthError(error: any, context: Record<string, any> = {}): void {
  // In production, this would send to a logging service
  console.error('Authentication error:', {
    error: error?.message || error,
    timestamp: new Date().toISOString(),
    ...context
  });
}

/**
 * Parse Supabase authentication errors into standardized format
 */
export function parseAuthError(error: any): ErrorDetails {
  if (!error) {
    return { message: 'Unknown error', type: AuthErrorType.UNKNOWN };
  }
  
  const errorMessage = error.message || String(error);
  
  // Map common Supabase error messages to our error types
  if (errorMessage.includes('Invalid login credentials')) {
    return {
      message: 'Invalid email or password',
      type: AuthErrorType.INVALID_CREDENTIALS
    };
  }
  
  if (errorMessage.includes('Too many requests')) {
    return {
      message: 'Too many attempts. Please try again later',
      type: AuthErrorType.RATE_LIMITED,
      retryAfter: 900 // 15 minutes
    };
  }
  
  if (errorMessage.includes('Email not confirmed')) {
    return {
      message: 'Please verify your email before logging in',
      type: AuthErrorType.VERIFICATION_REQUIRED
    };
  }
  
  // Default case
  return {
    message: errorMessage,
    type: AuthErrorType.UNKNOWN
  };
}

/**
 * Track failed authentication attempts
 */
export async function trackFailedAttempt(identifier: string): Promise<number> {
  const cookieStore = await cookies();
  const cookieKey = `failed_${Buffer.from(identifier).toString('base64')}`;
  
  const currentAttempts = parseInt(cookieStore.get(cookieKey)?.value || '0');
  const newAttempts = currentAttempts + 1;
  
  cookieStore.set(cookieKey, newAttempts.toString(), {
    httpOnly: true,
    secure: true, // Always use secure in production
    maxAge: 15 * 60, // 15 minutes
    path: '/'
  });
  
  return newAttempts;
}

/**
 * Reset failed authentication attempts
 */
export async function resetFailedAttempts(identifier: string): Promise<void> {
  const cookieStore = await cookies();
  const cookieKey = `failed_${Buffer.from(identifier).toString('base64')}`;
  
  cookieStore.set(cookieKey, '0', {
    httpOnly: true,
    secure: true, // Always use secure in production
    maxAge: 15 * 60,
    path: '/'
  });
}

/**
 * Check if account should be temporarily locked
 */
export async function isAccountLocked(identifier: string): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieKey = `failed_${Buffer.from(identifier).toString('base64')}`;
  
  const attempts = parseInt(cookieStore.get(cookieKey)?.value || '0');
  return attempts >= 5; // Lock after 5 failed attempts
}