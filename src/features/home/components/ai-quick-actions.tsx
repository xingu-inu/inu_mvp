'use client'

import { ListOrdered } from 'lucide-react'
import { PriorityRankModal } from './priority-rank-modal'
import { useHomeStore } from '@/stores/home.store'
import type { HomeTask } from '@/types/entities'

interface AiQuickActionsProps {
  tasks: HomeTask[]
  selectedDate: Date
}

export function AiQuickActions({
  tasks: _tasks,
  selectedDate: _selectedDate,
}: AiQuickActionsProps) {
  void _tasks // kept for interface compatibility
  void _selectedDate

  const setIsPriorityRankOpen = useHomeStore((s) => s.setIsPriorityRankOpen)

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setIsPriorityRankOpen(true)}
        className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-ai)] px-3 py-2 text-xs font-medium text-white shadow-sm transition-[opacity,transform] hover:opacity-90 active:scale-[0.97]"
      >
        <ListOrdered className="h-3.5 w-3.5" />
        우선순위 정리
      </button>

      {/* Priority rank modal */}
      <PriorityRankModal />
    </div>
  )
}
