/**
 * Simple in-memory rate limiter for API routes.
 * Uses a Map with sliding window per user.
 *
 * LIMITATION: This is in-memory and per-process. It will NOT persist across
 * serverless cold starts or share state across multiple instances.
 * For production at scale, replace with a distributed store (e.g. Upstash Redis).
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Periodic cleanup to prevent memory leaks (every 5 min)
const CLEANUP_INTERVAL = 5 * 60 * 1000

let lastCleanup = Date.now()

function cleanup(): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key)
    }
  }
}

/**
 * Check if a user has exceeded the rate limit.
 * @param key - Unique identifier (e.g. `userId:endpoint`)
 * @param limit - Max requests allowed in the window
 * @param windowMs - Time window in ms (default: 60s)
 * @returns true if rate limited, false if allowed
 */
export function isRateLimited(key: string, limit: number, windowMs: number = 60_000): boolean {
  cleanup()

  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }

  entry.count++
  return entry.count > limit
}
