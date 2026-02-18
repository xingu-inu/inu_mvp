'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { AnimatedCollapse } from './animated-collapse'

interface FormSectionProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  preview?: React.ReactNode
  defaultOpen?: boolean
  bgClassName?: string
  children: React.ReactNode
}

export function FormSection({
  icon: Icon,
  label,
  preview,
  defaultOpen = false,
  bgClassName = 'bg-[var(--color-bg-secondary)]',
  children,
}: FormSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center justify-between transition-colors hover:text-[var(--color-text-secondary)]"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="flex items-center gap-1.5 text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
          <Icon className="h-3 w-3" />
          {label}
        </span>
        {isOpen ? (
          <ChevronUp className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
        )}
      </button>

      {!isOpen && preview && (
        <div className="mt-1 truncate text-[11px] text-[var(--color-text-tertiary)]">{preview}</div>
      )}

      <AnimatePresence>
        {isOpen && (
          <AnimatedCollapse>
            <div className={`mt-2 rounded-lg ${bgClassName} px-3 py-2.5`}>{children}</div>
          </AnimatedCollapse>
        )}
      </AnimatePresence>
    </div>
  )
}
