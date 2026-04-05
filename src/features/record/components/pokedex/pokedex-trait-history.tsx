'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { History } from 'lucide-react'
import type { TraitHistoryEntry } from '@/types/entities'

interface PokedexTraitHistoryProps {
  currentValue: string
  history: TraitHistoryEntry[]
}

function formatDate(isoStr: string): string {
  const d = new Date(isoStr)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${year}.${month}`
}

export function PokedexTraitHistory({ currentValue, history }: PokedexTraitHistoryProps) {
  const [open, setOpen] = useState(false)

  if (!history || history.length === 0) return null

  // oldest first
  const sorted = [...history].sort(
    (a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
  )

  return (
    <div className="mt-1.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[10px] text-[var(--color-text-disabled)] transition-colors hover:text-[var(--color-text-tertiary)]"
      >
        <History className="h-3 w-3" />
        <span>{history.length}번 변화</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="relative mt-2 ml-1.5 border-l border-[var(--color-border)] pl-3">
              {sorted.map((entry) => (
                <div key={entry.changed_at} className="relative mb-1.5 last:mb-0">
                  {/* dot */}
                  <span
                    className="absolute top-[5px] -left-[15px] h-1.5 w-1.5 rounded-full"
                    style={{ background: 'var(--color-border)' }}
                  />
                  <p className="text-[10px] text-[var(--color-text-disabled)]">
                    {formatDate(entry.changed_at)}
                    <span className="mx-1">·</span>
                    <span className="text-[var(--color-text-tertiary)]">{entry.value}</span>
                  </p>
                </div>
              ))}
              {/* current value highlighted */}
              <div className="relative">
                <span
                  className="absolute top-[5px] -left-[15px] h-1.5 w-1.5 rounded-full"
                  style={{ background: 'var(--color-primary-400)' }}
                />
                <p className="text-[10px] font-medium">
                  <span className="text-[var(--color-text-disabled)]">현재</span>
                  <span className="mx-1">·</span>
                  <span className="text-[var(--color-text-primary)]">{currentValue}</span>
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
