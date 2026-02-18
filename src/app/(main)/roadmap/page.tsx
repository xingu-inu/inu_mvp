import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import getQueryClient from '@/lib/query/get-query-client'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { unwrapListResponse } from '@/lib/api'
import { getGoals } from '@/actions/goal.actions'
import { getAreas } from '@/actions/area.actions'
import { getDirection } from '@/actions/direction.actions'
import RoadmapContent from './roadmap-content'

export default async function RoadmapPage() {
  const queryClient = getQueryClient()

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.goals.all,
      queryFn: () => getGoals().then(unwrapListResponse),
      staleTime: STALE_TIMES.GOAL,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.areas.all,
      queryFn: () => getAreas().then(unwrapListResponse),
      staleTime: STALE_TIMES.AREA,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.direction.all,
      queryFn: async () => {
        const response = await getDirection()
        if (!response.success) throw new Error(response.error.message)
        return response.data
      },
      staleTime: STALE_TIMES.DIRECTION,
    }),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <RoadmapContent />
    </HydrationBoundary>
  )
}
