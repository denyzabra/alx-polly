'use server';

type RateLimitRecord = {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
};

// In-memory store for rate limiting
// In a production environment, this should be replaced with Redis or another distributed cache
const ipLimitStore = new Map<string, RateLimitRecord>();
const emailLimitStore = new Map<string, RateLimitRecord>();

// Configuration
const MAX_ATTEMPTS = 5; // Maximum number of attempts
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes in milliseconds
const LOCKOUT_MS = 30 * 60 * 1000; // 30 minutes lockout after too many attempts

/**
 * Check if a request is rate limited
 * @param identifier - IP address or email to check
 * @param store - The store to use (IP or email)
 * @returns Object containing whether the request is limited and remaining attempts
 */
function checkRateLimit(identifier: string, store: Map<string, RateLimitRecord>) {
  const now = Date.now();
  const record = store.get(identifier);

  // If no record exists or the window has expired, create a new record
  if (!record || (now - record.firstAttempt) > WINDOW_MS) {
    store.set(identifier, {
      count: 1,
      firstAttempt: now,
      lastAttempt: now
    });
    return { limited: false, remaining: MAX_ATTEMPTS - 1 };
  }

  // Check if in lockout period after too many attempts
  if (record.count >= MAX_ATTEMPTS) {
    // If lockout period has passed, reset the record
    if (now - record.lastAttempt > LOCKOUT_MS) {
      store.set(identifier, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now
      });
      return { limited: false, remaining: MAX_ATTEMPTS - 1 };
    }
    
    // Still in lockout period
    const timeRemaining = Math.ceil((LOCKOUT_MS - (now - record.lastAttempt)) / 1000);
    return { 
      limited: true, 
      remaining: 0, 
      timeRemaining,
      message: `Too many attempts. Please try again in ${Math.ceil(timeRemaining / 60)} minutes.`
    };
  }

  // Increment the counter
  record.count += 1;
  record.lastAttempt = now;
  store.set(identifier, record);

  // Return whether the request is now limited
  const remaining = MAX_ATTEMPTS - record.count;
  return { 
    limited: remaining <= 0, 
    remaining,
    message: remaining <= 0 ? 'Too many attempts. Please try again later.' : undefined
  };
}

/**
 * Check if an IP address is rate limited
 */
export function checkIpRateLimit(ip: string) {
  return checkRateLimit(ip, ipLimitStore);
}

/**
 * Check if an email is rate limited
 */
export function checkEmailRateLimit(email: string) {
  return checkRateLimit(email, emailLimitStore);
}

/**
 * Reset rate limit for testing purposes
 */
export function resetRateLimits() {
  ipLimitStore.clear();
  emailLimitStore.clear();
}