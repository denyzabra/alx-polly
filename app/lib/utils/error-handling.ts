'use server';

/**
 * @fileoverview Error handling utilities for authentication flows
 * 
 * This module provides standardized error handling for authentication-related
 * operations, including error categorization, logging, parsing, and account
 * lockout functionality. It helps maintain security by tracking failed login
 * attempts and implementing temporary account lockouts.
 */

import { cookies } from 'next/headers';
import { Buffer } from 'buffer';

/**
 * Enum representing different types of authentication errors
 * 
 * These error types allow for consistent categorization and handling of
 * authentication-related errors throughout the application.
 * 
 * @enum {string}
 */
export enum AuthErrorType {
  /** Invalid username/password combination */
  INVALID_CREDENTIALS = 'invalid_credentials',
  
  /** Too many requests in a given time period */
  RATE_LIMITED = 'rate_limited',
  
  /** Account temporarily locked due to too many failed attempts */
  ACCOUNT_LOCKED = 'account_locked',
  
  /** Additional verification step required (2FA, email verification) */
  VERIFICATION_REQUIRED = 'verification_required',
  
  /** Connection or server-side issues */
  NETWORK_ERROR = 'network_error',
  
  /** Fallback for unclassified errors */
  UNKNOWN = 'unknown'
}

/**
 * Interface for standardized error response details
 * 
 * @interface ErrorDetails
 * @property {string} message - User-friendly error message
 * @property {AuthErrorType} type - Categorized error type
 * @property {number} [retryAfter] - Optional seconds until retry is allowed
 * @property {Record<string, any>} [additionalInfo] - Optional extra context
 */
interface ErrorDetails {
  message: string;
  type: AuthErrorType;
  retryAfter?: number; // Seconds until retry is allowed
  additionalInfo?: Record<string, any>;
}

/**
 * Logs authentication errors for monitoring and debugging
 * 
 * This function centralizes error logging for authentication-related issues.
 * In a production environment, this would typically send errors to a monitoring
 * service like Sentry, LogRocket, or a custom logging endpoint.
 * 
 * @param error - The error object or message to log
 * @param context - Additional contextual information about the error
 * @example
 * try {
 *   await supabase.auth.signIn({ email, password });
 * } catch (error) {
 *   logAuthError(error, { action: 'login', email });
 *   return { error: 'Login failed' };
 * }
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
 * Parses Supabase authentication errors into a standardized format
 * 
 * This function normalizes various authentication error messages from Supabase
 * into a consistent format with appropriate error types and user-friendly messages.
 * It helps provide consistent error handling across the application.
 * 
 * @param error - The raw error from Supabase or other auth provider
 * @returns Standardized error details object with type, message, and optional metadata
 * @example
 * try {
 *   await supabase.auth.signIn({ email, password });
 * } catch (error) {
 *   const parsedError = parseAuthError(error);
 *   if (parsedError.type === AuthErrorType.RATE_LIMITED) {
 *     // Handle rate limiting specifically
 *   }
 *   return { error: parsedError.message };
 * }
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
  
  // Default case for unrecognized errors
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