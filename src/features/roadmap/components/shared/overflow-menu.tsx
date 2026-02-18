'use client'

import { memo, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface OverflowMenuItem {
  label: string
  icon: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'danger'
}

interface OverflowMenuProps {
  items: OverflowMenuItem[]
  /** CSS group name for hover reveal (e.g. 'group-hover/task') */
  hoverGroupClass?: string
  /** Always show the trigger button (skip hover-reveal). Default: false */
  alwaysVisible?: boolean
  /** Trigger button size. Default: 'h-6 w-6' */
  triggerClassName?: string
  /** Trigger icon size. Default: 'h-3.5 w-3.5' */
  iconClassName?: string
  /** PopoverContent width. Default: 'w-36' */
  contentWidth?: string
  align?: 'start' | 'center' | 'end'
}

export const OverflowMenu = memo(function OverflowMenu({
  items,
  hoverGroupClass = 'group-hover/task:opacity-100',
  alwaysVisible = false,
  triggerClassName = 'h-6 w-6',
  iconClassName = 'h-3.5 w-3.5',
  contentWidth = 'w-36',
  align = 'end',
}: OverflowMenuProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            'flex shrink-0 cursor-pointer items-center justify-center rounded-md text-[var(--color-text-tertiary)] transition-opacity hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]',
            !alwaysVisible &&
              `[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:${hoverGroupClass}`,
            triggerClassName
          )}
          title="더보기"
        >
          <MoreHorizontal className={iconClassName} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(contentWidth, 'p-1')}
        align={align}
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((item) => (
          <button
            key={item.label}
            className={cn(
              'flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[var(--color-bg-secondary)]',
              item.variant === 'danger' && 'text-[var(--color-miss)]'
            )}
            onClick={() => {
              setOpen(false)
              // Delay to let the closing popover fully unmount before
              // opening another popover (avoids Radix dismiss conflicts)
              setTimeout(() => item.onClick(), 100)
            }}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
})
