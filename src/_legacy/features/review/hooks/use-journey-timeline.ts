'use client'

import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { useActivityLog, type ActivityEvent, type ActivityEventType } from './use-activity-log'

// Only show meaningful lifecycle events (skip task-created/task-completed as too noisy)
const JOURNEY_EVENT_TYPES: ActivityEventType[] = [
  'goal-created',
  'goal-completed',
  'group-completed',
  'task-paused',
]

export interface MonthGroup {
  month: string // "2026.02" format
  events: ActivityEvent[]
}

export function useJourneyTimeline(areaFilter?: string | null) {
  const { data: allEvents = [], isLoading, error } = useActivityLog()

  const timeline = useMemo(() => {
    // 1. Filter to journey-relevant event types
    let filtered = allEvents.filter((e) => JOURNEY_EVENT_TYPES.includes(e.type))

    // 2. Apply area filter if set
    if (areaFilter) {
      filtered = filtered.filter((e) => e.areaId === areaFilter)
    }

    // 3. Sort newest first
    filtered.sort((a, b) => b.date.localeCompare(a.date))

    // 4. Group by month
    const monthMap = new Map<string, ActivityEvent[]>()
    for (const event of filtered) {
      const monthKey = format(parseISO(event.date), 'yyyy.MM')
      const existing = monthMap.get(monthKey) ?? []
      existing.push(event)
      monthMap.set(monthKey, existing)
    }

    // 5. Convert to sorted array
    const groups: MonthGroup[] = Array.from(monthMap.entries())
      .map(([month, events]) => ({ month, events }))
      .sort((a, b) => b.month.localeCompare(a.month))

    return groups
  }, [allEvents, areaFilter])

  // Extract unique areas for filter pills
  const availableAreas = useMemo(() => {
    const areaMap = new Map<string, { id: string; emoji: string; name: string }>()
    for (const event of allEvents) {
      if (event.areaId && event.areaEmoji) {
        if (!areaMap.has(event.areaId)) {
          areaMap.set(event.areaId, {
            id: event.areaId,
            emoji: event.areaEmoji,
            name: '', // Will be filled from roadmapData in the component
          })
        }
      }
    }
    return Array.from(areaMap.values())
  }, [allEvents])

  return { timeline, availableAreas, isLoading, error }
}
