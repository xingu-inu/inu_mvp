'use client'

import { useState, useCallback } from 'react'
import { Plus, X, FolderPlus, Target, BotMessageSquare } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import { Chip } from '@/components/ui/chip'
import { InlineAreaCreate } from './inline-forms/inline-area-create'
import { InlineGoalCreate } from './inline-forms/inline-goal-create'
import { useAreas } from '@/queries/use-areas'
import { useAiChatStore } from '@/stores/ai-chat.store'
import { useDemoMode } from '@/lib/demo/demo-context'
import type { AreaType } from '@/types/entities'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FAB Menu Items
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MENU_ITEMS = [
  {
    id: 'area',
    label: '영역 추가',
    icon: FolderPlus,
    color: 'var(--color-primary-500)',
    group: 'create',
  },
  {
    id: 'goal',
    label: '목표 추가',
    icon: Target,
    color: 'var(--color-primary-500)',
    group: 'create',
  },
  {
    id: 'ai-chat',
    label: '이누와 대화',
    icon: BotMessageSquare,
    color: 'var(--color-ai)',
    group: 'ai',
  },
] as const

type MenuId = (typeof MENU_ITEMS)[number]['id']

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MobileRoadmapFab
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function MobileRoadmapFab() {
  const { isDemoMode } = useDemoMode()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAreaDrawerOpen, setIsAreaDrawerOpen] = useState(false)
  const [isGoalDrawerOpen, setIsGoalDrawerOpen] = useState(false)
  const [goalDrawerAreaId, setGoalDrawerAreaId] = useState<string | null>(null)

  const handleMenuSelect = useCallback((id: MenuId) => {
    setIsMenuOpen(false)
    switch (id) {
      case 'area':
        setIsAreaDrawerOpen(true)
        break
      case 'goal':
        setGoalDrawerAreaId(null)
        setIsGoalDrawerOpen(true)
        break
      case 'ai-chat':
        useAiChatStore.getState().toggleChat()
        break
    }
  }, [])

  const handleAreaCreated = useCallback((newAreaId?: string) => {
    setIsAreaDrawerOpen(false)
    if (newAreaId) {
      // Auto-open goal creation for the new area
      setGoalDrawerAreaId(newAreaId)
      setIsGoalDrawerOpen(true)
    }
  }, [])

  const handleGoalCreated = useCallback(() => {
    setIsGoalDrawerOpen(false)
    setGoalDrawerAreaId(null)
  }, [])

  if (isDemoMode) return null

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20 lg:hidden"
            onClick={() => setIsMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* FAB + Menu Container */}
      <div className="fixed right-4 bottom-20 z-50 flex flex-col items-end gap-3 lg:hidden">
        {/* Menu Items */}
        <AnimatePresence>
          {isMenuOpen &&
            MENU_ITEMS.map((item, index) => {
              const prevItem = index > 0 ? MENU_ITEMS[index - 1] : null
              const isNewGroup = prevItem && prevItem.group !== item.group

              return (
                <motion.div key={item.id} className="flex flex-col items-end gap-1.5">
                  {isNewGroup && (
                    <div className="flex items-center gap-2 self-end pr-1">
                      <span className="text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
                        AI
                      </span>
                      <div className="h-px w-12 bg-[var(--color-border)]" />
                    </div>
                  )}
                  <motion.button
                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.8 }}
                    transition={{
                      duration: 0.2,
                      delay: (MENU_ITEMS.length - 1 - index) * 0.04,
                    }}
                    onClick={() => handleMenuSelect(item.id)}
                    className="flex items-center gap-2.5 rounded-full bg-[var(--color-bg-primary)] px-4 py-3 shadow-lg active:scale-95"
                  >
                    <item.icon className="h-5 w-5" style={{ color: item.color }} />
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                      {item.label}
                    </span>
                  </motion.button>
                </motion.div>
              )
            })}
        </AnimatePresence>

        {/* FAB Button */}
        <motion.button
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-primary-600)] shadow-[var(--color-primary-500)]/30 shadow-lg active:scale-95"
          whileTap={{ scale: 0.92 }}
        >
          <motion.div animate={{ rotate: isMenuOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
            {isMenuOpen ? (
              <X className="h-6 w-6 text-white" />
            ) : (
              <Plus className="h-6 w-6 text-white" />
            )}
          </motion.div>
        </motion.button>
      </div>

      {/* Area Creation Drawer */}
      <AreaCreateDrawer
        open={isAreaDrawerOpen}
        onOpenChange={setIsAreaDrawerOpen}
        onDone={handleAreaCreated}
      />

      {/* Goal Creation Drawer */}
      <GoalCreateDrawer
        open={isGoalDrawerOpen}
        onOpenChange={setIsGoalDrawerOpen}
        initialAreaId={goalDrawerAreaId}
        onDone={handleGoalCreated}
      />
    </>
  )
}

/** Expose openAreaDrawer for EmptyRoadmap integration */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Area Creation Drawer
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function AreaCreateDrawer({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: (newAreaId?: string) => void
}) {
  const { data: areas = [] } = useAreas()
  const existingAreaTypes = areas.filter((a) => a.is_active).map((a) => a.type) as AreaType[]

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="영역 추가"
      description="인생에서 중요한 영역을 추가하세요"
      forceMode="drawer"
    >
      <InlineAreaCreate
        existingAreaTypes={existingAreaTypes}
        onDone={(newAreaId) => {
          onDone(newAreaId)
        }}
      />
    </ResponsiveModal>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Goal Creation Drawer (Area select → Goal form)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function GoalCreateDrawer({
  open,
  onOpenChange,
  initialAreaId,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialAreaId: string | null
  onDone: () => void
}) {
  const { data: areas = [] } = useAreas()
  const activeAreas = areas.filter((a) => a.is_active)
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(initialAreaId)

  // Sync initialAreaId when drawer opens with a pre-selected area
  const effectiveAreaId = selectedAreaId ?? initialAreaId

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedAreaId(null)
    }
    onOpenChange(nextOpen)
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={handleOpenChange}
      title={effectiveAreaId ? '목표 추가' : '영역 선택'}
      description={
        effectiveAreaId ? '이 영역에 새 목표를 추가하세요' : '목표를 추가할 영역을 선택하세요'
      }
      forceMode="drawer"
    >
      {effectiveAreaId ? (
        <InlineGoalCreate
          areaId={effectiveAreaId}
          onDone={(newGoalId) => {
            if (newGoalId) {
              onDone()
            } else {
              // Cancel: go back to area selection (or close if came from area creation flow)
              if (initialAreaId) {
                onDone()
              } else {
                setSelectedAreaId(null)
              }
            }
          }}
        />
      ) : (
        <div className="space-y-3">
          {activeAreas.length === 0 ? (
            <p className="py-4 text-center text-sm text-[var(--color-text-secondary)]">
              먼저 영역을 추가해주세요
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {activeAreas.map((area) => (
                <button
                  key={area.id}
                  onClick={() => setSelectedAreaId(area.id)}
                  className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-4 py-3 transition-colors hover:bg-[var(--color-bg-secondary)] active:scale-[0.97]"
                >
                  <Chip variant="area" emoji={area.emoji} color={area.color}>
                    {area.name}
                  </Chip>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </ResponsiveModal>
  )
}
