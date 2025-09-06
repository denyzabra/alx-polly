'use server';

/**
 * @fileoverview Identity verification utilities for enhanced authentication security
 * 
 * This module provides functionality for device fingerprinting and suspicious activity
 * detection to enhance authentication security. It helps identify new devices and
 * potentially suspicious login attempts, allowing for additional verification steps
 * when necessary.
 * 
 * In a production environment, the in-memory device store should be replaced with
 * a persistent database to maintain device history across server restarts.
 */

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { Buffer } from 'buffer';

/**
 * Represents information about a user's device
 * 
 * @typedef {Object} DeviceInfo
 * @property {string} fingerprint - Unique identifier for the device
 * @property {string} userAgent - Browser/client user agent string
 * @property {number} lastSeen - Timestamp of last activity from this device
 */
type DeviceInfo = {
  fingerprint: string;
  userAgent: string;
  lastSeen: number;
};

// In-memory store for known devices
// In a production environment, this should be stored in a database
// to persist across server restarts and scale across multiple instances
const knownDevices = new Map<string, DeviceInfo[]>();

/**
 * Generates a simple device fingerprint based on user agent and IP address
 * 
 * This function creates a basic device identifier by combining the user agent
 * and IP address, then encoding it as a base64 string. This helps identify
 * different devices used by the same user for security monitoring.
 * 
 * NOTE: In a production application, a more sophisticated fingerprinting library
 * should be used that considers additional factors like browser features, screen
 * resolution, timezone, etc., while respecting user privacy.
 * 
 * @param userAgent - The browser/client user agent string
 * @param ip - The client's IP address
 * @returns Base64-encoded fingerprint string
 * @example
 * const fingerprint = generateFingerprint(req.headers['user-agent'], clientIp);
 */
export function generateFingerprint(userAgent: string, ip: string): string {
  return Buffer.from(`${userAgent}:${ip}`).toString('base64');
}

/**
 * Checks if the current device is known for a specific user
 * 
 * This function determines if a login attempt is coming from a device that
 * the user has previously used. New devices may trigger additional verification
 * steps to ensure account security. The function also maintains a history of
 * known devices for each user.
 * 
 * @param userId - The authenticated user's ID
 * @param fingerprint - The device fingerprint generated from user agent and IP
 * @param userAgent - The browser/client user agent string
 * @returns Object indicating if this is a known device and if verification is required
 * @example
 * const { isKnownDevice, requiresVerification } = await checkDeviceVerification(
 *   user.id,
 *   fingerprint,
 *   req.headers['user-agent']
 * );
 * 
 * if (requiresVerification) {
 *   // Trigger additional verification steps (e.g., email code, SMS)
 * }
 */
export async function checkDeviceVerification(
  userId: string,
  fingerprint: string,
  userAgent: string
): Promise<{ isKnownDevice: boolean; requiresVerification: boolean }> {
  const now = Date.now();
  // Get the list of devices this user has previously used, or initialize empty array
  const userDevices = knownDevices.get(userId) || [];
  
  // Check if this device is already in the user's known devices list
  const knownDevice = userDevices.find(device => device.fingerprint === fingerprint);
  
  if (knownDevice) {
    // This is a known device - update the last seen timestamp
    knownDevice.lastSeen = now;
    knownDevices.set(userId, userDevices);
    return { isKnownDevice: true, requiresVerification: false };
  }
  
  // This is a new device - add it to the user's known devices list
  userDevices.push({
    fingerprint,
    userAgent,
    lastSeen: now
  });
  
  knownDevices.set(userId, userDevices);
  
  // New devices require additional verification for security
  return { isKnownDevice: false, requiresVerification: true };
}

/**
 * Sets the verification status for a user's device
 * 
 * After a user completes additional verification steps for a new device,
 * this function updates the device's verification status by setting a secure
 * HTTP-only cookie that persists the verification state across sessions.
 * 
 * @param userId - The authenticated user's ID
 * @param verified - Whether the device has been successfully verified
 * @returns Promise that resolves when the status has been updated
 * @example
 * // After user completes email verification:
 * await setVerificationStatus(user.id, true);
 */
export async function setVerificationStatus(userId: string, verified: boolean): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(`device_verified_${userId}`, verified ? '1' : '0', {
    httpOnly: true, // Prevents JavaScript access to the cookie
    secure: true, // Always use secure in production
    maxAge: 30 * 24 * 60 * 60, // 30 days expiration
    path: '/' // Available across the entire site
  });
}

/**
 * Checks for suspicious login activity based on failed login attempts
 * 
 * This function analyzes the current session and login attempt history to detect
 * potentially suspicious activity, such as multiple failed login attempts.
 * This helps identify potential brute force attacks or account compromise attempts.
 * 
 * @param userId - The authenticated user's ID
 * @param fingerprint - The device fingerprint
 * @param userAgent - The browser/client user agent string
 * @returns Promise resolving to boolean indicating if activity appears suspicious
 * @example
 * const isSuspicious = await checkSuspiciousActivity(user.id, fingerprint, userAgent);
 * if (isSuspicious) {
 *   // Take security precautions like forcing password reset or 2FA
 * }
 */
export async function checkSuspiciousActivity(userId: string, fingerprint: string, userAgent: string): Promise<boolean> {
  const cookieStore = await cookies();
  const failedAttemptsCookie = cookieStore.get(`failed_attempts_${userId}`);
  const failedAttempts = failedAttemptsCookie ? parseInt(failedAttemptsCookie.value, 10) : 0;
  
  // Check if there are multiple failed login attempts
  // Three or more failed attempts is considered suspicious behavior
  if (failedAttempts >= 3) {
    return true;
  }
  
  // Check if this is a new device by comparing against known devices
  const userDevices = knownDevices.get(userId) || [];
  const isNewDevice = !userDevices.some(device => device.fingerprint === fingerprint);
  
  // Combination of new device + any failed attempts is considered suspicious
  // This helps prevent credential stuffing attacks using stolen credentials
  return isNewDevice && failedAttempts > 0;
}