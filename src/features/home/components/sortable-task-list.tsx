'use client'

import { useCallback } from 'react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { AreaTaskSection } from './area-task-section'
import { DailySection } from './daily-section'
import { GCalEventSection } from './gcal-event-section'
import { SortableAreaItem } from '@/components/common'
import { useStandardSensors } from '@/lib/dnd/dnd-config'
import { useAreaDnd } from '../hooks/use-area-dnd'
import type { HomeTask } from '@/types/entities'
import type { GoogleCalendarEvent } from '@/types/google-calendar'
import type { AreaGroup } from '@/lib/utils/task-utils'

interface SortableTaskListProps {
  areaGroups: AreaGroup[]
  dailyTasks: HomeTask[]
  isReadOnly: boolean
  selectedDate: Date
  expandedTaskId?: string | null
  onToggle?: (taskId: string) => void
  onDragStart?: () => void
  enableAiSuggest?: boolean
  priorityTiers?: Record<string, number> | null
  googleEvents?: GoogleCalendarEvent[]
}

export function SortableTaskList({
  areaGroups,
  dailyTasks,
  isReadOnly,
  selectedDate,
  expandedTaskId,
  onToggle,
  onDragStart: onDragStartProp,
  enableAiSuggest,
  priorityTiers,
  googleEvents,
}: SortableTaskListProps) {
  // ── Area DnD (reorder area sections) ──
  const { areaOrder, onAreaDragEnd, onAreaDragCancel } = useAreaDnd(areaGroups, selectedDate)
  const sensors = useStandardSensors()

  const areaSortableIds = areaOrder.map((id) => `area-${id}`)

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      onAreaDragEnd(event)
    },
    [onAreaDragEnd]
  )

  return (
    <>
      {/* Area-only DndContext — task DnD is handled per-section inside each component */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        onDragCancel={onAreaDragCancel}
      >
        <SortableContext items={areaSortableIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {areaOrder.map((areaId) => {
              const group = areaGroups.find((g) => g.area.id === areaId)
              if (!group) return null

              return (
                <SortableAreaItem
                  key={areaId}
                  id={`area-${areaId}`}
                  data={{ type: 'area' as const, areaId }}
                >
                  {(dragHandleProps) => (
                    <AreaTaskSection
                      sortable
                      area={group.area}
                      goals={group.goals}
                      tasks={group.tasks}
                      stats={group.stats}
                      isReadOnly={isReadOnly}
                      selectedDate={selectedDate}
                      expandedTaskId={expandedTaskId}
                      onToggle={onToggle}
                      onDragStart={onDragStartProp}
                      enableAiSuggest={enableAiSuggest}
                      priorityTiers={priorityTiers}
                      dragHandleProps={dragHandleProps}
                    />
                  )}
                </SortableAreaItem>
              )
            })}

            <DailySection
              sortable
              tasks={dailyTasks}
              isReadOnly={isReadOnly}
              selectedDate={selectedDate}
              expandedTaskId={expandedTaskId}
              onToggle={onToggle}
              onDragStart={onDragStartProp}
              enableAiSuggest={enableAiSuggest}
              priorityTiers={priorityTiers}
            />
          </div>
        </SortableContext>
      </DndContext>

      {/* Google Calendar — outside DnD */}
      {googleEvents && <GCalEventSection events={googleEvents} />}
    </>
  )
}
