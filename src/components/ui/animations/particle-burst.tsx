'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { PARTICLE_CONFIG } from '@/lib/constants/animations'

interface Particle {
  id: number
  x: number
  y: number
  size: number
  color: string
  angle: number
  distance: number
}

interface ParticleBurstProps {
  /** Animation key - increment to trigger a new burst */
  animationKey: number
  /** Center position X (optional, defaults to center) */
  x?: number
  /** Center position Y (optional, defaults to center) */
  y?: number
  /** Custom colors for particles */
  colors?: string[]
}

const DEFAULT_COLORS = ['var(--color-done)', 'var(--color-primary-500)', 'var(--color-streak)']

function createParticles(x: number, y: number, colors: string[]): Particle[] {
  const { COUNT, MIN_DISTANCE, MAX_DISTANCE, SIZE } = PARTICLE_CONFIG
  return Array.from({ length: COUNT }, (_, i) => ({
    id: i,
    x,
    y,
    size: Math.random() * (SIZE.MAX - SIZE.MIN) + SIZE.MIN,
    color: colors[Math.floor(Math.random() * colors.length)],
    angle: (i * 360) / COUNT + Math.random() * 30 - 15,
    distance: Math.random() * (MAX_DISTANCE - MIN_DISTANCE) + MIN_DISTANCE,
  }))
}

/**
 * Particle burst animation component
 * Creates a burst of particles from a center point
 * Used for "Done" check-in celebration
 *
 * Usage: Increment animationKey to trigger a new burst
 */
export function ParticleBurst({
  animationKey,
  x = 0,
  y = 0,
  colors = DEFAULT_COLORS,
}: ParticleBurstProps) {
  const prefersReducedMotion = useReducedMotion()

  // Generate particles - changes when animationKey changes
  const particles = useMemo(() => {
    if (animationKey === 0) return []
    return createParticles(x, y, colors)
  }, [animationKey, x, y, colors])

  if (prefersReducedMotion || animationKey === 0) return null

  return (
    <AnimatePresence mode="wait">
      <div key={animationKey}>
        {particles.map((particle) => {
          const radians = (particle.angle * Math.PI) / 180
          const endX = Math.cos(radians) * particle.distance
          const endY = Math.sin(radians) * particle.distance

          return (
            <motion.div
              key={particle.id}
              className="pointer-events-none absolute rounded-full"
              style={{
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color,
                left: particle.x,
                top: particle.y,
                transform: 'translate(-50%, -50%)',
              }}
              initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
              animate={{
                scale: [0, 1, 0.5],
                x: endX,
                y: endY,
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: PARTICLE_CONFIG.DURATION / 1000,
                ease: 'easeOut',
              }}
            />
          )
        })}
      </div>
    </AnimatePresence>
  )
}
