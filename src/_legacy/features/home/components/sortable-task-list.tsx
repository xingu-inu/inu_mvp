'use client'

import { useCallback } from 'react'
import { DndContext, DragOverlay, type DragStartEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { AreaTaskSection } from './area-task-section'
import { DailySection } from './daily-section'
import { GCalEventSection } from './gcal-event-section'
import { CompactTaskRow } from './compact-task-row'
import { SortableAreaItem, DragOverlayCard } from '@/components/common'
import { useStandardSensors, DROP_ANIMATION } from '@/lib/dnd/dnd-config'
import { useUnifiedHomeDnd, DAILY_CONTAINER_ID } from '../hooks/use-unified-home-dnd'
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
  const sensors = useStandardSensors()
  const {
    areaOrder,
    getTasksForContainer,
    activeType,
    activeTask,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    collisionDetection,
  } = useUnifiedHomeDnd({ areaGroups, dailyTasks, selectedDate })

  const areaSortableIds = areaOrder.map((id) => `area-${id}`)

  const wrappedDragStart = useCallback(
    (event: DragStartEvent) => {
      onDragStartProp?.()
      handleDragStart(event)
    },
    [onDragStartProp, handleDragStart]
  )

  return (
    <>
      {/* Single unified DndContext — area reorder + cross-section task DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={wrappedDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
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
                      containerId={areaId}
                      area={group.area}
                      goals={group.goals}
                      tasks={getTasksForContainer(areaId)}
                      stats={group.stats}
                      isReadOnly={isReadOnly}
                      selectedDate={selectedDate}
                      expandedTaskId={expandedTaskId}
                      onToggle={onToggle}
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
              containerId={DAILY_CONTAINER_ID}
              tasks={getTasksForContainer(DAILY_CONTAINER_ID)}
              isReadOnly={isReadOnly}
              selectedDate={selectedDate}
              expandedTaskId={expandedTaskId}
              onToggle={onToggle}
              enableAiSuggest={enableAiSuggest}
              priorityTiers={priorityTiers}
            />
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={DROP_ANIMATION}>
          {activeType === 'task' && activeTask ? (
            <DragOverlayCard>
              <CompactTaskRow task={activeTask} isReadOnly selectedDate={selectedDate} />
            </DragOverlayCard>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Google Calendar — outside DnD */}
      {googleEvents && <GCalEventSection events={googleEvents} />}
    </>
  )
}
