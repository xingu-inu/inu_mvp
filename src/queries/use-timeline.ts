import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { getTimelineEvents } from '@/actions/timeline.actions'
import type { TimelineEvent, TimelineDateGroup } from '@/types/timeline'

async function fetchTimelineEvents(): Promise<TimelineEvent[]> {
  const response = await getTimelineEvents()
  if (!response.success) {
    throw new Error(response.error.message)
  }
  return response.data
}

function groupByDate(events: TimelineEvent[]): TimelineDateGroup[] {
  const groups = new Map<string, TimelineEvent[]>()

  for (const event of events) {
    const date = event.timestamp.split('T')[0]
    const existing = groups.get(date)
    if (existing) {
      existing.push(event)
    } else {
      groups.set(date, [event])
    }
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, evts]) => ({ date, events: evts }))
}

export function useTimelineEvents(areaId?: string) {
  const query = useQuery({
    queryKey: queryKeys.timeline.all,
    queryFn: fetchTimelineEvents,
    staleTime: STALE_TIMES.TIMELINE,
  })

  const grouped = useMemo(() => {
    if (!query.data) return undefined
    const filtered = areaId ? query.data.filter((e) => e.areaId === areaId) : query.data
    return groupByDate(filtered)
  }, [query.data, areaId])

  return { ...query, data: grouped }
}
