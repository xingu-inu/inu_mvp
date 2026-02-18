'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { CONFETTI_CONFIG } from '@/lib/constants/animations'

interface ConfettiPiece {
  id: number
  x: number
  y: number
  rotation: number
  color: string
  size: number
  delay: number
  wobble: number
}

interface ConfettiProps {
  /** Animation key - increment to trigger new confetti */
  animationKey: number
  /** Custom colors for confetti */
  colors?: readonly string[]
  /** Number of confetti pieces */
  count?: number
}

function createPieces(colors: readonly string[], count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100, // percentage across screen
    y: -10, // start above screen
    rotation: Math.random() * 360,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: Math.random() * 8 + 6, // 6-14px
    delay: Math.random() * 0.5, // stagger start
    wobble: Math.random() * 40 - 20, // horizontal drift
  }))
}

/**
 * Confetti animation component
 * Creates falling confetti pieces from the top of the screen
 * Used for milestone celebrations (streak 5, 10, 15, etc.)
 *
 * Usage: Increment animationKey to trigger new confetti
 */
export function Confetti({
  animationKey,
  colors = CONFETTI_CONFIG.COLORS,
  count = CONFETTI_CONFIG.COUNT,
}: ConfettiProps) {
  const prefersReducedMotion = useReducedMotion()

  // Generate pieces - changes when animationKey changes
  const pieces = useMemo(() => {
    if (animationKey === 0) return []
    return createPieces(colors, count)
  }, [animationKey, colors, count])

  if (prefersReducedMotion || animationKey === 0) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <AnimatePresence mode="wait">
        <div key={animationKey}>
          {pieces.map((piece) => (
            <motion.div
              key={piece.id}
              className="absolute"
              style={{
                left: `${piece.x}%`,
                width: piece.size,
                height: piece.size * 0.6, // slightly flat
                backgroundColor: piece.color,
                borderRadius: 2,
              }}
              initial={{
                y: '-10vh',
                x: 0,
                rotate: piece.rotation,
                opacity: 1,
              }}
              animate={{
                y: '110vh',
                x: [0, piece.wobble, -piece.wobble, piece.wobble * 0.5, 0],
                rotate: piece.rotation + 720,
                opacity: [1, 1, 1, 0.8, 0],
              }}
              transition={{
                duration: CONFETTI_CONFIG.DURATION / 1000,
                delay: piece.delay,
                ease: 'easeIn',
                x: {
                  duration: CONFETTI_CONFIG.DURATION / 1000,
                  ease: 'easeInOut',
                  repeat: 2,
                },
              }}
            />
          ))}
        </div>
      </AnimatePresence>
    </div>
  )
}
