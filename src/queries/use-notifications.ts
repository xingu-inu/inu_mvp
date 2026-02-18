'use client'

import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { computeNotifications, countActionableNotifications } from '@/lib/notifications'
import { unwrapListResponse } from '@/lib/api'
import { mapApiTasksToEntities } from '@/lib/utils/task-utils'
import { getHomeTasks } from '@/actions/home.actions'
import { getGoals } from '@/actions/goal.actions'
import type { AppNotification } from '@/types/entities'

async function fetchNotifications(): Promise<AppNotification[]> {
  const today = new Date()
  const dateStr = format(today, 'yyyy-MM-dd')

  const [tasksResponse, goalsResponse] = await Promise.all([getHomeTasks(dateStr), getGoals()])

  const apiTasks = unwrapListResponse(tasksResponse)
  const todayTasks = mapApiTasksToEntities(apiTasks)

  const activeGoals = goalsResponse.success
    ? goalsResponse.data.filter((g) => g.status === 'active')
    : []

  return computeNotifications(todayTasks, activeGoals, today)
}

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications.today(),
    queryFn: fetchNotifications,
    staleTime: STALE_TIMES.NOTIFICATIONS,
  })
}

export function useNotificationCount() {
  const { data: notifications = [] } = useNotifications()
  return countActionableNotifications(notifications)
}
