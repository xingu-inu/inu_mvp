'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { CompanionSettingsView } from '@/components/layout/profile/companion-settings-view'
import { useProfileTraits } from '@/queries/use-profile-traits'

export function ProfilePanel() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { data: traits } = useProfileTraits()
  const traitCount = traits?.length ?? 0

  return (
    <>
      {/* Desktop: always visible sidebar */}
      <aside className="hidden h-full w-[300px] shrink-0 border-r border-[var(--color-border)] lg:flex lg:flex-col">
        <div className="shrink-0 px-4 pt-4">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            나에 대한 데이터
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <CompanionSettingsView />
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
              <span className="ml-1.5 text-xs font-normal text-[var(--color-text-tertiary)]">
                {traitCount}개
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
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="max-h-[50vh] overflow-y-auto px-4 pb-4">
                <CompanionSettingsView />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
