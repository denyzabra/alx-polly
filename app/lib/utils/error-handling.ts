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
 * Tracks failed authentication attempts for a specific identifier
 * 
 * This function increments a counter of failed login attempts for a given
 * identifier (typically an email address) and stores it in a secure HTTP-only cookie.
 * The counter is used to implement temporary account lockouts after too many
 * failed attempts, helping to prevent brute force attacks.
 * 
 * @param identifier - The identifier (usually email) to track failed attempts for
 * @returns The new number of failed attempts for this identifier
 * @example
 * if (loginFailed) {
 *   const attempts = await trackFailedAttempt(email);
 *   if (attempts >= 5) {
 *     return { error: 'Account locked. Please try again later.' };
 *   }
 * }
 */
export async function trackFailedAttempt(identifier: string): Promise<number> {
  const cookieStore = await cookies();
  // Base64 encode the identifier to avoid special characters in cookie names
  const cookieKey = `failed_${Buffer.from(identifier).toString('base64')}`;
  
  // Get current attempt count or default to 0
  const currentAttempts = parseInt(cookieStore.get(cookieKey)?.value || '0');
  const newAttempts = currentAttempts + 1;
  
  // Store the updated count in a secure HTTP-only cookie
  cookieStore.set(cookieKey, newAttempts.toString(), {
    httpOnly: true,    // Prevents JavaScript access to the cookie
    secure: true,      // Only sent over HTTPS connections
    maxAge: 15 * 60,   // Cookie expires after 15 minutes
    path: '/'          // Cookie is available across the entire site
  });
  
  return newAttempts;
}

/**
 * Resets the failed authentication attempts counter for a specific identifier
 * 
 * This function is typically called after a successful login to clear the
 * failed attempts counter. It sets the counter back to zero, allowing the user
 * to start with a clean slate.
 * 
 * @param identifier - The identifier (usually email) to reset failed attempts for
 * @example
 * if (loginSuccessful) {
 *   await resetFailedAttempts(email);
 *   // Proceed with successful login flow
 * }
 */
export async function resetFailedAttempts(identifier: string): Promise<void> {
  const cookieStore = await cookies();
  const cookieKey = `failed_${Buffer.from(identifier).toString('base64')}`;
  
  // Reset the counter to 0 but keep the cookie with the same security settings
  cookieStore.set(cookieKey, '0', {
    httpOnly: true,    // Prevents JavaScript access to the cookie
    secure: true,      // Only sent over HTTPS connections
    maxAge: 15 * 60,   // Cookie expires after 15 minutes
    path: '/'          // Cookie is available across the entire site
  });
}

/**
 * Checks if an account should be temporarily locked due to too many failed attempts
 * 
 * This function determines if a user account should be temporarily locked
 * based on the number of recent failed login attempts. It's used to prevent
 * brute force attacks by implementing a temporary lockout after multiple failures.
 * 
 * @param identifier - The identifier (usually email) to check lock status for
 * @returns Boolean indicating if the account should be locked
 * @example
 * if (await isAccountLocked(email)) {
 *   return { error: 'Account temporarily locked. Please try again later.' };
 * }
 * // Proceed with normal authentication flow
 */
export async function isAccountLocked(identifier: string): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieKey = `failed_${Buffer.from(identifier).toString('base64')}`;
  
  // Get the current number of failed attempts
  const attempts = parseInt(cookieStore.get(cookieKey)?.value || '0');
  
  // Lock the account after 5 failed attempts
  // This threshold should match the MAX_ATTEMPTS in rate-limiter.ts
  return attempts >= 5;
}