/**
 * Animation timing constants
 * Used across the app for consistent animation behavior
 */
export const ANIMATION_DURATION = {
  /** Quick interactions (50-100ms) */
  INSTANT: 50,
  FAST: 100,

  /** Standard interactions (150-300ms) */
  DEFAULT: 200,
  MEDIUM: 300,

  /** Complex animations (400-600ms) */
  SLOW: 400,
  PARTICLE: 600,

  /** Celebration animations (1000-3000ms) */
  CONFETTI: 2000,
  CELEBRATION: 3000,
} as const

/**
 * Easing functions for animations
 */
export const ANIMATION_EASING = {
  /** Default ease */
  DEFAULT: [0.4, 0, 0.2, 1],
  /** For entering elements */
  EASE_OUT: [0, 0, 0.2, 1],
  /** For exiting elements */
  EASE_IN: [0.4, 0, 1, 1],
  /** Bouncy feel */
  SPRING: { type: 'spring', stiffness: 300, damping: 20 },
  /** Extra bouncy */
  BOUNCY: { type: 'spring', stiffness: 400, damping: 15 },
} as const

/**
 * Particle burst configuration
 */
export const PARTICLE_CONFIG = {
  /** Number of particles */
  COUNT: 12,
  /** Animation duration in ms */
  DURATION: 600,
  /** Maximum distance particles travel */
  MAX_DISTANCE: 80,
  /** Minimum distance particles travel */
  MIN_DISTANCE: 40,
  /** Particle sizes */
  SIZE: {
    MIN: 4,
    MAX: 8,
  },
} as const

/**
 * Confetti configuration
 */
export const CONFETTI_CONFIG = {
  /** Number of confetti pieces */
  COUNT: 50,
  /** Animation duration in ms */
  DURATION: 2000,
  /** Spread angle in degrees */
  SPREAD: 180,
  /** Colors for confetti */
  COLORS: [
    'var(--color-done)',
    'var(--color-primary-500)',
    'var(--color-streak)',
    '#FFD700',
    '#FF6B6B',
    '#4ECDC4',
  ],
} as const

/**
 * Streak milestones that trigger confetti
 */
export const STREAK_MILESTONES = [5, 10, 15, 20, 25, 30, 50, 75, 100] as const

/**
 * Check if a streak value is a milestone
 */
export function isStreakMilestone(streak: number): boolean {
  return STREAK_MILESTONES.includes(streak as (typeof STREAK_MILESTONES)[number])
}

/**
 * Get reduced motion animation config
 * Returns minimal/no animation when user prefers reduced motion
 */
export function getReducedMotionConfig(prefersReducedMotion: boolean) {
  return {
    duration: prefersReducedMotion ? 0 : ANIMATION_DURATION.DEFAULT,
    transition: prefersReducedMotion ? { duration: 0 } : undefined,
  }
}
