'use client'

import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { LegalSection } from '../types'

interface LegalTableOfContentsProps {
  sections: LegalSection[]
}

export function LegalTableOfContents({ sections }: LegalTableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        }
      },
      { rootMargin: '-100px 0px -60% 0px' }
    )

    for (const section of sections) {
      const el = document.getElementById(section.id)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [sections])

  const tocItems = sections.map((s) => ({
    id: s.id,
    label: `제${s.articleNumber}조 (${s.title})`,
  }))

  return (
    <nav className="mb-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-sm font-semibold text-[var(--color-text-primary)] lg:pointer-events-none"
      >
        목차
        <ChevronDown
          className={`size-4 transition-transform lg:hidden ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <ul
        className={`mt-3 space-y-1.5 overflow-hidden transition-all ${
          isOpen
            ? 'max-h-[1000px] opacity-100'
            : 'max-h-0 opacity-0 lg:max-h-[1000px] lg:opacity-100'
        }`}
      >
        {tocItems.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={() => setIsOpen(false)}
              className={`block rounded-lg px-3 py-1.5 text-sm transition-colors ${
                activeId === item.id
                  ? 'bg-[var(--color-primary-50)] font-medium text-[var(--color-primary-500)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
