'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { PanelRightClose } from 'lucide-react'
import { useRoadmapStore, selectIsFloatingPanelOpen } from '@/stores/roadmap.store'
import { DateTaskPanel } from '@/components/layout/date-task-panel'

export function FloatingPanel() {
  const isOpen = useRoadmapStore(selectIsFloatingPanelOpen)
  const toggle = useRoadmapStore((s) => s.toggleFloatingPanel)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="glass-3 absolute top-3 right-3 bottom-3 z-50 flex w-[480px] flex-col overflow-hidden rounded-xl shadow-lg shadow-black/5"
        >
          <button
            onClick={toggle}
            className="absolute top-2 right-2 z-10 rounded-md p-1 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-secondary)]"
            title="패널 닫기 (])"
          >
            <PanelRightClose className="h-4 w-4" />
          </button>
          <DateTaskPanel />
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
