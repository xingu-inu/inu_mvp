'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Drawer } from 'vaul'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Hook: useMediaQuery
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false)

  React.useEffect(() => {
    const media = window.matchMedia(query)
    setMatches(media.matches)

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [query])

  return matches
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ResponsiveModal
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ResponsiveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  title: string
  description?: string
  /** Force a specific mode regardless of screen size */
  forceMode?: 'drawer' | 'dialog'
}

export function ResponsiveModal({
  open,
  onOpenChange,
  children,
  title,
  description,
  forceMode,
}: ResponsiveModalProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const useDialog = forceMode === 'dialog' || (forceMode !== 'drawer' && isDesktop)

  if (useDialog) {
    return (
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/40" />
          <DialogPrimitive.Content
            className={cn(
              'fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2',
              'max-h-[85vh] overflow-hidden rounded-2xl bg-[var(--color-bg-primary)] shadow-xl',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
              'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
              'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]'
            )}
          >
            <div className="max-h-[85vh] overflow-y-auto p-6">
              {/* Header */}
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <DialogPrimitive.Title className="text-lg font-semibold text-[var(--color-text-primary)]">
                    {title}
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description
                    className={
                      description ? 'mt-1 text-sm text-[var(--color-text-secondary)]' : 'sr-only'
                    }
                  >
                    {description || title}
                  </DialogPrimitive.Description>
                </div>
                <DialogPrimitive.Close className="rounded-full p-1.5 transition-colors hover:bg-[var(--color-bg-tertiary)]">
                  <X className="h-5 w-5 text-[var(--color-text-tertiary)]" />
                  <span className="sr-only">닫기</span>
                </DialogPrimitive.Close>
              </div>

              {/* Content */}
              {children}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    )
  }

  // Mobile: Drawer (Bottom Sheet)
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content className="fixed right-0 bottom-0 left-0 z-50 flex max-h-[90vh] flex-col rounded-t-[20px] bg-[var(--color-bg-primary)]">
          {/* Drag handle */}
          <div className="mx-auto mt-4 h-1.5 w-12 flex-shrink-0 rounded-full bg-[var(--color-border)]" />

          <div className="flex flex-1 flex-col overflow-y-auto p-6">
            <Drawer.Title className="text-lg font-semibold text-[var(--color-text-primary)]">
              {title}
            </Drawer.Title>
            <Drawer.Description
              className={
                description ? 'mt-1 text-sm text-[var(--color-text-secondary)]' : 'sr-only'
              }
            >
              {description || title}
            </Drawer.Description>

            {/* Content */}
            <div className="mt-5 flex-1">{children}</div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Subcomponents for consistent styling
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function ModalBody({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn('flex flex-col gap-5', className)}>{children}</div>
}

export function ModalFooter({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'pb-safe mt-6 flex gap-3 border-t border-[var(--color-border)] pt-4',
        className
      )}
    >
      {children}
    </div>
  )
}
