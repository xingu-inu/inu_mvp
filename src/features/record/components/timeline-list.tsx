'use client'

import { useCallback, useMemo } from 'react'
import { Clock, Sparkles } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTimelineEvents } from '@/queries/use-timeline'
import { useTimelineObservations } from '@/queries/use-timeline-observations'
import { useHideTimelineEvent } from '@/queries/use-hide-timeline-event'
import { TimelineDateGroup } from './timeline-date-group'
import { TimelineAiCard } from './timeline-ai-card'
import type {
  TimelineDateGroup as TimelineDateGroupType,
  TimelineAiNode,
  TimelineEventType,
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

function AiObservationSkeleton() {
  return (
    <div className="relative ml-3.5 border-l border-dashed border-blue-500/30 py-2 pl-4">
      <div className="absolute top-4 -left-[calc(1rem+4.5px)] flex h-2 w-2 items-center justify-center">
        <Sparkles className="h-3 w-3 animate-pulse text-blue-500/50" />
      </div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <div className="rounded-xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 p-px">
          <div className="rounded-xl bg-[var(--color-bg-secondary)] px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3 w-3 shrink-0 animate-pulse text-blue-500/40" />
              <p className="text-[13px] text-blue-500/60">이누가 흐름을 살펴보고 있어요...</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export function TimelineList({ selectedAreaId }: TimelineListProps) {
  const { data: groups, isLoading, error } = useTimelineEvents(selectedAreaId)
  const {
    data: observationsData,
    isLoading: isObservationsLoading,
    isPlaceholderData,
  } = useTimelineObservations()
  const hideEvent = useHideTimelineEvent()

  const handleHideEvent = useCallback(
    (eventId: string, eventType: TimelineEventType) => {
      hideEvent.mutate({ eventId, eventType })
    },
    [hideEvent]
  )

  const handleHideAiNode = useCallback(
    (eventId: string) => {
      hideEvent.mutate({ eventId, eventType: 'ai_observation' })
    },
    [hideEvent]
  )

  const mergedItems = useMemo(
    () => mergeTimelineItems(groups ?? [], observationsData?.nodes, selectedAreaId),
    [groups, observationsData?.nodes, selectedAreaId]
  )

  // Show skeleton when observations are loading for the first time (cold start)
  const showAiSkeleton = isObservationsLoading && !isPlaceholderData && !observationsData

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
        {mergedItems.map((item, idx) => (
          <div key={item.kind === 'date-group' ? item.data.date : item.data.id}>
            {item.kind === 'date-group' ? (
              <>
                <TimelineDateGroup group={item.data} onHideEvent={handleHideEvent} />
                {/* Show AI skeleton after first date group on cold start */}
                {idx === 0 && showAiSkeleton && <AiObservationSkeleton />}
              </>
            ) : (
              <motion.div
                className="relative ml-3.5 border-l border-dashed border-blue-500/30 py-2 pl-4"
                exit={{ opacity: 0, x: -16, height: 0, paddingTop: 0, paddingBottom: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                {/* Sparkle icon on timeline line */}
                <div className="absolute top-4 -left-[calc(1rem+4.5px)] flex h-2 w-2 items-center justify-center">
                  <Sparkles className="h-3 w-3 text-blue-500" />
                </div>
                <TimelineAiCard node={item.data} onHide={handleHideAiNode} />
              </motion.div>
            )}
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
