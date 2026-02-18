'use client'

import { motion } from 'framer-motion'

import { useReducedMotion } from '@/hooks/use-reduced-motion'

interface ScrollFadeInProps {
  children: React.ReactNode
  className?: string
  delay?: number
  direction?: 'up' | 'none'
}

/**
 * Scroll-triggered fade-in animation wrapper.
 * Inspired by theoryvc.com/about staggered section reveals.
 */
export function ScrollFadeIn({
  children,
  className,
  delay = 0,
  direction = 'up',
}: ScrollFadeInProps) {
  const prefersReduced = useReducedMotion()

  if (prefersReduced) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: direction === 'up' ? 40 : 0 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{
        duration: 0.8,
        ease: [0.4, 0, 0.2, 1],
        delay,
      }}
    >
      {children}
    </motion.div>
  )
}
