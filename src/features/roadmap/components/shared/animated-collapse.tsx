'use client'

import { motion, type Easing } from 'framer-motion'

interface AnimatedCollapseProps {
  children: React.ReactNode
  duration?: number
  ease?: Easing
  className?: string
}

export function AnimatedCollapse({
  children,
  duration = 0.15,
  ease,
  className,
}: AnimatedCollapseProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration, ...(ease ? { ease } : {}) }}
      style={{ overflow: 'hidden' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
