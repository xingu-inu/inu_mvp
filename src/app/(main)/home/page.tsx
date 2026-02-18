import { format, startOfWeek } from 'date-fns'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import getQueryClient from '@/lib/query/get-query-client'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { unwrapResponse, unwrapListResponse } from '@/lib/api'
import { getWeekHomeTasks, getHomeTasks } from '@/actions/home.actions'
import HomeContentPage from './home-content'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date } = await searchParams
  const targetDate = date ? new Date(date) : new Date()
  const weekStart = startOfWeek(targetDate, { weekStartsOn: 0 })
  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  const weekEndStr = format(new Date(weekStart.getTime() + 6 * 86400000), 'yyyy-MM-dd')
  const todayStr = format(targetDate, 'yyyy-MM-dd')

  const queryClient = getQueryClient()

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.tasks.homeWeek(weekStartStr),
      queryFn: () => getWeekHomeTasks(weekStartStr, weekEndStr).then(unwrapResponse),
      staleTime: STALE_TIMES.HOME_TASKS,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.tasks.home(todayStr),
      queryFn: () => getHomeTasks(todayStr).then(unwrapListResponse),
      staleTime: STALE_TIMES.HOME_TASKS,
    }),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HomeContentPage />
    </HydrationBoundary>
  )
}
