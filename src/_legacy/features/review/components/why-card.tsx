'use client'

interface WhyCardProps {
  label?: string
  text: string
}

export function WhyCard({ label = '왜?', text }: WhyCardProps) {
  return (
    <div className="rounded-lg bg-[var(--color-bg-secondary)] px-3 py-2.5">
      <span className="mb-1 block text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
        {label}
      </span>
      <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{text}</p>
    </div>
  )
}
