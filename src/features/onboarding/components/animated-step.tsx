'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface AnimatedStepProps {
  children: ReactNode
  direction?: 'forward' | 'backward'
  stepKey: string
}

const variants = {
  enter: (direction: 'forward' | 'backward') => ({
    x: direction === 'forward' ? 50 : -50,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: 'forward' | 'backward') => ({
    x: direction === 'forward' ? -50 : 50,
    opacity: 0,
  }),
}

export function AnimatedStep({ children, direction = 'forward', stepKey }: AnimatedStepProps) {
  return (
    <motion.div
      key={stepKey}
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 },
      }}
      className="flex flex-1 flex-col"
    >
      {children}
    </motion.div>
  )
}
