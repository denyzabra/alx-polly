'use server';

import { createClient } from '@/lib/supabase/server';
import { LoginFormData, RegisterFormData } from '../types';
import { checkEmailRateLimit, checkIpRateLimit } from '../utils/rate-limiter';
import { checkDeviceVerification, generateFingerprint, checkSuspiciousActivity } from '../utils/identity-verification';
import { AuthErrorType, logAuthError, parseAuthError, trackFailedAttempt, resetFailedAttempts, isAccountLocked } from '../utils/error-handling';
import { cookies } from 'next/headers';
import { headers } from 'next/headers';

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
