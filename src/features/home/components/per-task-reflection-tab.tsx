'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { PerTaskReflectionRow } from './per-task-reflection-row'
import { useUpdateCheckInNote } from '@/queries/use-update-checkin-note'
import { parseCheckInNote, serializeCheckInNote } from '@/lib/utils/checkin-note'
import type { CheckInNoteData } from '@/lib/utils/checkin-note'
import type { HomeTask } from '@/types/entities'

interface PerTaskReflectionTabProps {
  tasks: HomeTask[]
  dateString: string
  disabled?: boolean
}

export function PerTaskReflectionTab({
  tasks,
  dateString,
  disabled = false,
}: PerTaskReflectionTabProps) {
  const completedTasks = tasks.filter(
    (t) => t.todayCheckIn?.status === 'done' && t.todayCheckIn.id !== 'optimistic'
  )
  const updateNote = useUpdateCheckInNote()

  // Local form state: Map<taskId, CheckInNoteData>
  const [taskNotes, setTaskNotes] = useState<Map<string, CheckInNoteData>>(() => {
    const initial = new Map<string, CheckInNoteData>()
    for (const task of completedTasks) {
      initial.set(task.id, parseCheckInNote(task.todayCheckIn?.note ?? null))
    }
    return initial
  })

  const handleChange = useCallback((taskId: string, data: CheckInNoteData) => {
    setTaskNotes((prev) => {
      const next = new Map(prev)
      next.set(taskId, data)
      return next
    })
  }, [])

  // Check if any entry is dirty compared to server state
  const hasDirtyEntries = completedTasks.some((task) => {
    const current = taskNotes.get(task.id)
    const saved = parseCheckInNote(task.todayCheckIn?.note ?? null)
    if (!current) return false
    return current.mood !== saved.mood || current.text !== saved.text
  })

  const handleSaveAll = async () => {
    const dirtyEntries = completedTasks.filter((task) => {
      const current = taskNotes.get(task.id)
      const saved = parseCheckInNote(task.todayCheckIn?.note ?? null)
      if (!current) return false
      return current.mood !== saved.mood || current.text !== saved.text
    })

    if (dirtyEntries.length === 0) return

    const results = await Promise.allSettled(
      dirtyEntries.map((task) => {
        const data = taskNotes.get(task.id)!
        return updateNote.mutateAsync({
          checkInId: task.todayCheckIn!.id!,
          taskId: task.id,
          date: dateString,
          status: task.todayCheckIn!.status,
          note: serializeCheckInNote(data),
        })
      })
    )

    const failCount = results.filter((r) => r.status === 'rejected').length
    if (failCount === 0) {
      toast.success('태스크별 회고가 저장되었어요', { duration: 2000 })
    } else {
      toast.error(`${failCount}개 저장에 실패했어요. 다시 시도해주세요.`)
    }
  }

  if (completedTasks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <span className="text-2xl">🌱</span>
        <p className="text-sm text-[var(--color-text-tertiary)]">아직 완료한 태스크가 없어요</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--color-text-tertiary)]">
        완료한 태스크에 대해 짧은 회고를 남겨보세요 (선택이에요)
      </p>

      <div className="space-y-2">
        {completedTasks.map((task) => (
          <PerTaskReflectionRow
            key={task.id}
            task={task}
            noteData={taskNotes.get(task.id) ?? {}}
            onChange={handleChange}
            disabled={disabled || updateNote.isPending}
          />
        ))}
      </div>

      {hasDirtyEntries && (
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSaveAll}
          disabled={disabled || updateNote.isPending}
          className="gap-1.5 text-[var(--color-primary-600)]"
        >
          저장하기
        </Button>
      )}
    </div>
  )
}
