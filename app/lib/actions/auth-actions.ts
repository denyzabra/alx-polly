'use server';

/**
 * @fileoverview Authentication actions for user login, registration, and session management
 * 
 * This module provides server actions for handling user authentication flows including
 * login, registration, logout, and session management. It implements several security
 * features including rate limiting, account lockout, device fingerprinting, and
 * suspicious activity detection to protect against common authentication attacks.
 * 
 * All authentication operations use Supabase Auth as the underlying authentication provider.
 */

import { createClient } from '@/lib/supabase/server';
import { LoginFormData, RegisterFormData } from '../types';
import { checkEmailRateLimit, checkIpRateLimit } from '../utils/rate-limiter';
import { checkDeviceVerification, generateFingerprint, checkSuspiciousActivity } from '../utils/identity-verification';
import { AuthErrorType, logAuthError, parseAuthError, trackFailedAttempt, resetFailedAttempts, isAccountLocked } from '../utils/error-handling';
import { cookies } from 'next/headers';
import { headers } from 'next/headers';

/**
 * Authenticates a user with email and password
 * 
 * This function handles user login with multiple security measures:
 * 1. Applies rate limiting by IP address and email
 * 2. Checks if the account is locked due to too many failed attempts
 * 3. Validates credentials against Supabase Auth
 * 4. Tracks failed attempts and resets counter on success
 * 5. Performs device fingerprinting to detect new devices
 * 6. Checks for suspicious activity patterns
 * 
 * @param data - Object containing email and password
 * @param clientIp - Optional IP address of the client
 * @returns Object with error message if login fails
 */
export async function login(data: LoginFormData, clientIp?: string) {
  // Apply rate limiting
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || 'unknown';
  const ip = clientIp || 'unknown-ip';
  const ipCheck = checkIpRateLimit(ip);
  const emailCheck = checkEmailRateLimit(data.email);
  
  // Check if either IP or email is rate limited
if (ipCheck.limited) {
  return { error: ipCheck.message || 'Too many login attempts from this IP. Please try again later.' };
}

if (emailCheck.limited) {
  return { error: emailCheck.message || 'Too many login attempts for this email. Please try again later.' };
}

// Check if account is locked due to too many failed attempts
if (await isAccountLocked(data.email)) {
  return { error: 'Account temporarily locked due to too many failed attempts. Please try again later.' };
}
  
  const supabase = await createClient();

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) {
    // Track failed login attempts is now handled by the trackFailedAttempt function
    
    // Track failed login attempt
    const attempts = await trackFailedAttempt(data.email);
    
    return { error: error.message };
  }

  // Reset failed attempts on successful login
// This is handled by resetFailedAttempts function above

// Reset failed attempts counter
await resetFailedAttempts(data.email);
  
  // Check for suspicious activity or new device
  if (authData.user) {
    const fingerprint = generateFingerprint(userAgent, ip);
    const { isKnownDevice, requiresVerification } = await checkDeviceVerification(
      authData.user.id,
      fingerprint,
      userAgent
    );
    
    const isSuspicious = await checkSuspiciousActivity(
      authData.user.id,
      fingerprint,
      userAgent
    );
    
    if (!isKnownDevice || isSuspicious) {
      // In a real app, you would send an email verification or SMS code here
      console.log('New device detected or suspicious activity. Additional verification would be required.');
      
      // For demo purposes, we'll just log this and continue
      // In a real app, you might return a different response to trigger 2FA
    }
  }
  
  // Success: no error
  return { error: null };
}

/**
 * Registers a new user account
 * 
 * This function handles new user registration with security measures:
 * 1. Applies rate limiting by IP address and email to prevent abuse
 * 2. Creates a new user account in Supabase Auth
 * 3. Stores additional user metadata including name
 * 4. Records the device information for future verification
 * 5. Handles and logs authentication errors
 * 
 * @param data - Object containing email, password and name
 * @param clientIp - Optional IP address of the client
 * @returns Object with error message if registration fails
 */
export async function register(data: RegisterFormData, clientIp?: string) {
  try {
    // Apply rate limiting
    const headersList = await headers();
    const userAgent = headersList.get('user-agent') || 'unknown';
    const ip = clientIp || 'unknown-ip';
    const ipCheck = checkIpRateLimit(ip);
    const emailCheck = checkEmailRateLimit(data.email);
    
    // Check if either IP or email is rate limited
    if (ipCheck.limited) {
      return { error: ipCheck.message || 'Too many registration attempts from this IP. Please try again later.' };
    }
    
    if (emailCheck.limited) {
      return { error: emailCheck.message || 'Too many registration attempts for this email. Please try again later.' };
    }
    
    const supabase = await createClient();

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
        },
      },
    });

    if (error) {
      // Parse and log the error
      const parsedError = parseAuthError(error);
      logAuthError(error, { action: 'register', email: data.email, ip, errorType: parsedError.type });
      
      return { error: parsedError.message };
    }
    
    // If registration is successful, store the device information
    if (authData.user) {
      const fingerprint = generateFingerprint(userAgent, ip);
      await checkDeviceVerification(
        authData.user.id,
        fingerprint,
        userAgent
      );
    }

    // Success: no error
    return { error: null };
  } catch (error) {
    // Catch any unexpected errors
    logAuthError(error, { action: 'register', unexpected: true });
    return { error: 'An unexpected error occurred. Please try again later.' };
  }
}
export async function logout() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { error: error.message };
  }
  return { error: null };
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session;
}
