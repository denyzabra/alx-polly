'use server';

/**
 * @fileoverview Rate limiting implementation for authentication attempts
 * 
 * This module provides rate limiting functionality to protect against brute force
 * attacks and credential stuffing. It tracks login attempts by IP address and email,
 * implementing a sliding window approach with temporary lockouts after too many failed attempts.
 * 
 * In a production environment, the in-memory stores should be replaced with a distributed
 * cache like Redis to ensure rate limiting works across multiple server instances.
 */

/**
 * Represents a record of rate limit attempts for a specific identifier (IP or email)
 * @typedef {Object} RateLimitRecord
 * @property {number} count - Number of attempts made within the current window
 * @property {number} firstAttempt - Timestamp of the first attempt in the current window
 * @property {number} lastAttempt - Timestamp of the most recent attempt
 */
type RateLimitRecord = {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
};

// In-memory stores for rate limiting
// In a production environment, these should be replaced with Redis or another distributed cache
// to ensure rate limiting works across multiple server instances
const ipLimitStore = new Map<string, RateLimitRecord>();
const emailLimitStore = new Map<string, RateLimitRecord>();

// Rate limiting configuration constants
const MAX_ATTEMPTS = 5;           // Maximum number of attempts before lockout
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes sliding window in milliseconds
const LOCKOUT_MS = 30 * 60 * 1000; // 30 minutes lockout period after exceeding attempts

/**
 * Checks if a request is rate limited based on the provided identifier
 * 
 * This function implements a sliding window rate limiting algorithm with the following behavior:
 * 1. If no previous attempts exist or the window has expired, create a new record
 * 2. If max attempts have been reached, enforce a lockout period
 * 3. If lockout period has passed, reset the counter
 * 4. Otherwise, increment the counter and check if limit is reached
 * 
 * @param identifier - IP address or email to check against the rate limit
 * @param store - The Map store to use (either IP-based or email-based)
 * @returns Object containing:
 *   - limited: boolean indicating if the request should be blocked
 *   - remaining: number of attempts remaining before lockout
 *   - timeRemaining?: seconds remaining in lockout period (if limited)
 *   - message?: user-friendly message explaining the rate limit status
 */
function checkRateLimit(identifier: string, store: Map<string, RateLimitRecord>) {
  const now = Date.now();
  const record = store.get(identifier);

  // Case 1: No previous record exists or the time window has expired
  // Create a new record with count=1 and reset the window
  if (!record || (now - record.firstAttempt) > WINDOW_MS) {
    store.set(identifier, {
      count: 1,
      firstAttempt: now,
      lastAttempt: now
    });
    return { limited: false, remaining: MAX_ATTEMPTS - 1 };
  }

  // Case 2: Check if already in lockout period after exceeding max attempts
  if (record.count >= MAX_ATTEMPTS) {
    // Case 2a: If lockout period has passed, reset the record and allow the request
    if (now - record.lastAttempt > LOCKOUT_MS) {
      store.set(identifier, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now
      });
      return { limited: false, remaining: MAX_ATTEMPTS - 1 };
    }
    
    // Case 2b: Still within lockout period, calculate and return time remaining
    const timeRemaining = Math.ceil((LOCKOUT_MS - (now - record.lastAttempt)) / 1000);
    return { 
      limited: true, 
      remaining: 0, 
      timeRemaining,
      message: `Too many attempts. Please try again in ${Math.ceil(timeRemaining / 60)} minutes.`
    };
  }

  // Case 3: Within rate limit window but not yet locked out
  // Increment the counter and update last attempt timestamp
  record.count += 1;
  record.lastAttempt = now;
  store.set(identifier, record);

  // Calculate remaining attempts and determine if now limited
  const remaining = MAX_ATTEMPTS - record.count;
  return { 
    limited: remaining <= 0, 
    remaining,
    message: remaining <= 0 ? 'Too many attempts. Please try again later.' : undefined
  };
}

/**
 * Checks if an IP address has exceeded the rate limit
 * 
 * This function applies rate limiting based on the client's IP address to prevent
 * brute force attacks from a single source. It's typically used in login and
 * registration endpoints to limit the number of attempts from a specific IP.
 * 
 * @param ip - The IP address to check against the rate limit
 * @returns Rate limit status object with limited flag, remaining attempts, and optional message
 * @example
 * const ipCheck = checkIpRateLimit(clientIp);
 * if (ipCheck.limited) {
 *   return { error: ipCheck.message };
 * }
 */
export function checkIpRateLimit(ip: string) {
  return checkRateLimit(ip, ipLimitStore);
}

/**
 * Checks if an email address has exceeded the rate limit
 * 
 * This function applies rate limiting based on the email address to prevent
 * credential stuffing and account enumeration attacks. It's typically used
 * in login and registration endpoints to limit attempts on specific accounts.
 * 
 * @param email - The email address to check against the rate limit
 * @returns Rate limit status object with limited flag, remaining attempts, and optional message
 * @example
 * const emailCheck = checkEmailRateLimit(userEmail);
 * if (emailCheck.limited) {
 *   return { error: emailCheck.message };
 * }
 */
export function checkEmailRateLimit(email: string) {
  return checkRateLimit(email, emailLimitStore);
}

/**
 * Resets all rate limit counters
 * 
 * This function clears all rate limiting data from both IP and email stores.
 * It's primarily used for testing purposes or when needing to reset the rate
 * limit state in development environments.
 * 
 * WARNING: In production, this should only be called with extreme caution,
 * as it removes all rate limiting protection until new records are created.
 */
export function resetRateLimits() {
  ipLimitStore.clear();
  emailLimitStore.clear();
}