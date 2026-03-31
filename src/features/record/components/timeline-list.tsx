'use client'

import { Clock } from 'lucide-react'
import { useTimelineEvents } from '@/queries/use-timeline'
import { TimelineDateGroup } from './timeline-date-group'

interface TimelineListProps {
  selectedAreaId: string | undefined
}

export function TimelineList({ selectedAreaId }: TimelineListProps) {
  const { data: groups, isLoading, error } = useTimelineEvents(selectedAreaId)

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
      {groups.map((group) => (
        <TimelineDateGroup key={group.date} group={group} />
      ))}
    </div>
  )
}
