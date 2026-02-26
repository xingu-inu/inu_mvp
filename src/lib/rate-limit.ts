/**
 * Rate limiter with Upstash Redis support.
 * - Production: Uses Upstash Redis (distributed, persists across instances)
 * - Development: Falls back to in-memory Map (single process)
 *
 * Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to enable Redis.
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ---------------------------------------------------------------------------
// In-memory fallback (development / no Redis configured)
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number
  resetAt: number
}

const memoryStore = new Map<string, RateLimitEntry>()

const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanup(): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of memoryStore) {
    if (now > entry.resetAt) {
      memoryStore.delete(key)
    }
  }
}

function isRateLimitedMemory(key: string, limit: number, windowMs: number): boolean {
  cleanup()
  const now = Date.now()
  const entry = memoryStore.get(key)

  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }

  entry.count++
  return entry.count > limit
}

// ---------------------------------------------------------------------------
// Upstash Redis rate limiter — per-config cache
// ---------------------------------------------------------------------------

const configCache = new Map<string, Ratelimit>()

function getRatelimitForConfig(limit: number, windowSec: number): Ratelimit {
  const cacheKey = `${limit}:${windowSec}`
  const cached = configCache.get(cacheKey)
  if (cached) return cached

  const url = process.env.UPSTASH_REDIS_REST_URL!
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!
  const redis = new Redis({ url, token })

  const rl = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
    analytics: false,
    prefix: 'inu:rl',
  })

  configCache.set(cacheKey, rl)
  return rl
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check if a request should be rate limited.
 * @param key - Unique identifier (e.g. `userId:endpoint` or `ip:addr:endpoint`)
 * @param limit - Max requests allowed in the window
 * @param windowMs - Time window in ms (default: 60s)
 * @returns true if rate limited, false if allowed
 */
export async function isRateLimited(
  key: string,
  limit: number,
  windowMs: number = 60_000
): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    // Redis 미설정 시 in-memory fallback 사용.
    // 프로덕션에서 Redis를 설정하면 분산 rate limit이 적용됩니다.
    // .env.example: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
    return isRateLimitedMemory(key, limit, windowMs)
  }

  const windowSec = Math.ceil(windowMs / 1000)
  const rl = getRatelimitForConfig(limit, windowSec)
  const { success } = await rl.limit(key)
  return !success
}
