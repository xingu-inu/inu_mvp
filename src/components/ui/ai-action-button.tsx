import { type ReactNode } from 'react'

interface AiActionButtonProps {
  onClick: () => void
  icon: ReactNode
  children: ReactNode
}

/** Gradient AI action button used in panel headers */
export function AiActionButton({ onClick, icon, children }: AiActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-ai)] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-[opacity,transform] hover:opacity-90 active:scale-[0.97]"
    >
      {icon}
      {children}
    </button>
  )
}
