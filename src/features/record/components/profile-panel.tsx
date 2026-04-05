'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { CharacterEntryPanel } from './pokedex'
import { useProfileTraits } from '@/queries/use-profile-traits'

export function ProfilePanel() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { data: traits } = useProfileTraits()
  const traitCount = traits?.length ?? 0
  const dexNumber = String(traitCount).padStart(3, '0')

  return (
    <>
      {/* Desktop: always visible sidebar */}
      <aside className="hidden h-full w-[40%] max-w-[50%] min-w-[380px] shrink-0 border-r border-[var(--color-border)] lg:flex lg:flex-col">
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <CharacterEntryPanel />
        </div>
      </aside>

      {/* Mobile: collapsible top section */}
      <div className="border-b border-[var(--color-border)] lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex w-full items-center justify-between px-4 py-3"
        >
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">
            나에 대한 데이터
            {traitCount > 0 && (
              <span className="ml-1.5 font-mono text-xs font-normal text-[var(--color-text-tertiary)]">
                #{dexNumber}
              </span>
            )}
          </span>
          {mobileOpen ? (
            <ChevronUp className="h-4 w-4 text-[var(--color-text-tertiary)]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[var(--color-text-tertiary)]" />
          )}
        </button>
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
              animate={{ height: 'auto', opacity: 1, overflow: 'visible' }}
              exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
              transition={{ duration: 0.2 }}
            >
              <div className="max-h-[60vh] overflow-y-auto px-4 pb-4">
                <CharacterEntryPanel />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
