'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { AnimatedCollapse } from './animated-collapse'

interface CollapsibleSectionProps {
  children: React.ReactNode
  label: string
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

export function CollapsibleSection({
  children,
  label,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  className,
}: CollapsibleSectionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const isOpen = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  return (
    <>
      <button
        type="button"
        className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)]"
        onClick={() => setOpen(!isOpen)}
      >
        {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        {label}
      </button>
      <AnimatePresence>
        {isOpen && <AnimatedCollapse className={className}>{children}</AnimatedCollapse>}
      </AnimatePresence>
    </>
  )
}
