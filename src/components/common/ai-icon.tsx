'use client'

import { createElement } from 'react'
import { HelpCircle, type LucideIcon } from 'lucide-react'
import { getAiIcon } from '@/lib/ai/ai-icon-map'
import { cn } from '@/lib/utils'

interface AiIconProps {
  /** kebab-case Lucide icon name from AI response */
  name: string
  className?: string
  fallback?: LucideIcon
}

/** Renders a Lucide icon from AI response icon name with fallback */
export function AiIcon({ name, className, fallback = HelpCircle }: AiIconProps) {
  const icon = getAiIcon(name) ?? fallback
  return createElement(icon, { className: cn('h-4 w-4', className), 'aria-hidden': true })
}
