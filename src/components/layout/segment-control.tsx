'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SegmentItem {
  href: string
  label: string
}

interface SegmentControlProps {
  items: SegmentItem[]
  className?: string
}

export function SegmentControl({ items, className }: SegmentControlProps) {
  const pathname = usePathname()

  const activeIndex = items.findIndex(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  )

  return (
    <nav
      className={cn(
        'flex items-center gap-1 rounded-full bg-[var(--color-bg-tertiary)] p-1',
        className
      )}
      aria-label="메인 네비게이션"
    >
      {items.map((item, index) => {
        const isActive = index === activeIndex

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'text-white'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            )}
          >
            {isActive && (
              <motion.span
                layoutId="segment-indicator"
                className="absolute inset-0 rounded-full bg-[var(--color-primary-500)]"
                transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
              />
            )}
            <span className="relative z-10">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
