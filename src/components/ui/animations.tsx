'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const PARTICLE_COUNT = 12
const CONFETTI_COUNT = 50
const CONFETTI_COLORS = ['#22c55e', '#f59e0b', '#2186ff', '#8b5cf6', '#f87171']

export function ParticleBurst({ trigger }: { trigger: boolean }) {
  const [isActive, setIsActive] = useState(false)
  const prevTrigger = useRef(trigger)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activate = useCallback(() => {
    setIsActive(true)
    timeoutRef.current = setTimeout(() => setIsActive(false), 600)
  }, [])

  useEffect(() => {
    // Only activate when trigger changes from false to true
    if (trigger && !prevTrigger.current) {
      // Use setTimeout to defer state update
      const frameId = requestAnimationFrame(activate)
      prevTrigger.current = trigger
      return () => {
        cancelAnimationFrame(frameId)
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
      }
    }
    prevTrigger.current = trigger
  }, [trigger, activate])

  const particles = useMemo(() => Array.from({ length: PARTICLE_COUNT }, (_, i) => i), [])

  if (!isActive) return null

  return (
    <AnimatePresence>
      {particles.map((i) => (
        <motion.div
          key={i}
          className="absolute h-2 w-2 rounded-full bg-[var(--color-done)]"
          initial={{ opacity: 1, scale: 0 }}
          animate={{
            opacity: 0,
            scale: 1.5,
            x: Math.cos((i * 30 * Math.PI) / 180) * 40,
            y: Math.sin((i * 30 * Math.PI) / 180) * 40,
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      ))}
    </AnimatePresence>
  )
}

interface ConfettiPiece {
  id: number
  color: string
  left: number
  duration: number
  delay: number
}

function generateConfettiPieces(): ConfettiPiece[] {
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    left: Math.random() * 100,
    duration: 2 + Math.random(),
    delay: Math.random() * 0.3,
  }))
}

export function Confetti({ trigger }: { trigger: boolean }) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([])
  const prevTrigger = useRef(trigger)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activate = useCallback(() => {
    const pieces = generateConfettiPieces()
    setConfetti(pieces)
    timeoutRef.current = setTimeout(() => setConfetti([]), 3000)
  }, [])

  useEffect(() => {
    // Only activate when trigger changes from false to true
    if (trigger && !prevTrigger.current) {
      // Use setTimeout to defer state update
      const frameId = requestAnimationFrame(activate)
      prevTrigger.current = trigger
      return () => {
        cancelAnimationFrame(frameId)
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
      }
    }
    prevTrigger.current = trigger
  }, [trigger, activate])

  return (
    <div className="pointer-events-none fixed inset-0 z-[var(--z-toast)] overflow-hidden">
      <AnimatePresence>
        {confetti.map((piece) => (
          <motion.div
            key={piece.id}
            className="absolute h-3 w-3 rounded-sm"
            style={{ backgroundColor: piece.color, left: `${piece.left}%` }}
            initial={{ y: -20, rotate: 0, opacity: 1 }}
            animate={{ y: '100vh', rotate: 720, opacity: 0 }}
            transition={{
              duration: piece.duration,
              ease: 'easeIn',
              delay: piece.delay,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  )
}
