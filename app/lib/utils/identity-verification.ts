'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { Buffer } from 'buffer';

type DeviceInfo = {
  fingerprint: string;
  userAgent: string;
  lastSeen: number;
};

// In-memory store for known devices
// In a production environment, this should be stored in a database
const knownDevices = new Map<string, DeviceInfo[]>();

/**
 * Generate a simple device fingerprint based on user agent and IP
 * In a production app, use a more sophisticated fingerprinting library
 */
export function generateFingerprint(userAgent: string, ip: string): string {
  return Buffer.from(`${userAgent}:${ip}`).toString('base64');
}

/**
 * Check if the current device is known for this user
 * @param userId - The user's ID
 * @param fingerprint - The device fingerprint
 * @param userAgent - The user agent string
 * @returns Whether this is a new device and if verification is required
 */
export async function checkDeviceVerification(
  userId: string,
  fingerprint: string,
  userAgent: string
): Promise<{ isKnownDevice: boolean; requiresVerification: boolean }> {
  const now = Date.now();
  const userDevices = knownDevices.get(userId) || [];
  
  // Check if this device is already known
  const knownDevice = userDevices.find(device => device.fingerprint === fingerprint);
  
  if (knownDevice) {
    // Update last seen timestamp
    knownDevice.lastSeen = now;
    knownDevices.set(userId, userDevices);
    return { isKnownDevice: true, requiresVerification: false };
  }
  
  // This is a new device, add it to known devices
  userDevices.push({
    fingerprint,
    userAgent,
    lastSeen: now
  });
  
  knownDevices.set(userId, userDevices);
  
  // New device requires verification
  return { isKnownDevice: false, requiresVerification: true };
}

/**
 * Store the verification status in a secure cookie
 */
export async function setVerificationStatus(userId: string, verified: boolean): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(`device_verified_${userId}`, verified ? '1' : '0', {
    httpOnly: true,
    secure: true, // Always use secure in production
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/'
  });
}

/**
 * Check if the current session has suspicious activity
 * @param userId - The user's ID
 * @returns Whether the session has suspicious activity
 */
export async function checkSuspiciousActivity(userId: string, fingerprint: string, userAgent: string): Promise<boolean> {
  const supabase = await createClient();
  const cookieStore = await cookies();
  
  // Get the current session
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return false;
  }
  
  // Check for multiple active sessions
  // This is a simplified check - in production, implement more sophisticated detection
  const failedAttempts = parseInt(cookieStore.get('failedAttempts')?.value || '0');
  
  // If there have been multiple failed attempts, consider it suspicious
  return failedAttempts >= 3;
}