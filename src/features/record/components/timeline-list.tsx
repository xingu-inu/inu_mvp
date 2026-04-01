'use client'

import { useMemo } from 'react'
import { Clock, Sparkles } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { useTimelineEvents } from '@/queries/use-timeline'
import { useTimelineObservations } from '@/queries/use-timeline-observations'
import { TimelineDateGroup } from './timeline-date-group'
import { TimelineAiCard } from './timeline-ai-card'
import type {
  TimelineDateGroup as TimelineDateGroupType,
  TimelineAiNode,
  TimelineItem,
} from '@/types/timeline'

function mergeTimelineItems(
  groups: TimelineDateGroupType[],
  aiNodes: TimelineAiNode[] | undefined,
  selectedAreaId: string | undefined
): TimelineItem[] {
  const items: TimelineItem[] = []

  const filtered =
    aiNodes?.filter((n) => !selectedAreaId || n.relatedAreaIds.includes(selectedAreaId)) ?? []

  const nodesByDate = new Map<string, TimelineAiNode[]>()
  for (const node of filtered) {
    const list = nodesByDate.get(node.afterDate) ?? []
    list.push(node)
    nodesByDate.set(node.afterDate, list)
  }

  for (const group of groups) {
    items.push({ kind: 'date-group', data: group })
    for (const node of nodesByDate.get(group.date) ?? []) {
      items.push({ kind: 'ai-node', data: node })
    }
  }

  return items
}

interface TimelineListProps {
  selectedAreaId: string | undefined
}

export function TimelineList({ selectedAreaId }: TimelineListProps) {
  const { data: groups, isLoading, error } = useTimelineEvents(selectedAreaId)
  const { data: observationsData } = useTimelineObservations()

  const mergedItems = useMemo(
    () => mergeTimelineItems(groups ?? [], observationsData?.nodes, selectedAreaId),
    [groups, observationsData?.nodes, selectedAreaId]
  )

  if (isLoading) {
    return (
      <div className="space-y-6 pt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 w-32 rounded bg-[var(--color-bg-tertiary)]" />
            <div className="mt-3 ml-3.5 space-y-3 border-l border-[var(--color-border)] pl-4">
              {[1, 2].map((j) => (
                <div key={j} className="flex gap-3">
                  <div className="h-7 w-7 rounded-full bg-[var(--color-bg-tertiary)]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 rounded bg-[var(--color-bg-tertiary)]" />
                    <div className="h-3 w-48 rounded bg-[var(--color-bg-tertiary)]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-[var(--color-text-tertiary)]">타임라인을 불러올 수 없습니다</p>
      </div>
    )
  }

  if (!groups || groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Clock className="mb-3 h-10 w-10 text-[var(--color-text-tertiary)] opacity-40" />
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">
          아직 기록이 없습니다
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
          목표나 프로필을 변경하면 여기에 흐름이 쌓입니다
        </p>
      </div>
    )
  }

  return (
    <div className="pb-8">
      <AnimatePresence>
        {mergedItems.map((item) =>
          item.kind === 'date-group' ? (
            <TimelineDateGroup key={item.data.date} group={item.data} />
          ) : (
            <div
              key={item.data.id}
              className="relative ml-3.5 border-l border-dashed border-blue-500/30 py-2 pl-4"
            >
              {/* Sparkle icon on timeline line */}
              <div className="absolute top-4 -left-[calc(1rem+4.5px)] flex h-2 w-2 items-center justify-center">
                <Sparkles className="h-3 w-3 text-blue-500" />
              </div>
              <TimelineAiCard node={item.data} />
            </div>
          )
        )}
      </AnimatePresence>
    </div>
  )
}
