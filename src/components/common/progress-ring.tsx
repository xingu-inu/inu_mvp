'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ProgressRingProps {
  size: number
  strokeWidth: number
  rate: number
  className?: string
}

export function ProgressRing({ size, strokeWidth, rate, className }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const isZero = rate === 0
  const offset = circumference * (1 - rate / 100)

  return (
    <div className={cn('relative flex shrink-0 items-center justify-center', className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-bg-tertiary)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isZero ? 'var(--color-bg-tertiary)' : 'var(--color-primary-500)'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: isZero ? circumference : offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
        />
      </svg>
      <span
        className={cn(
          'absolute font-mono text-2xl font-extrabold',
          isZero ? 'text-[var(--color-text-tertiary)]' : 'text-[var(--color-text-primary)]'
        )}
      >
        {rate}
        <span className="text-sm font-semibold text-[var(--color-text-tertiary)]">%</span>
      </span>
    </div>
  )
}
