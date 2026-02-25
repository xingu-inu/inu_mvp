'use client'

import { useState } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { format, startOfWeek, addDays } from 'date-fns'
import { queryKeys } from '@/lib/query/keys'
import {
  DEMO_DIRECTION,
  DEMO_AREAS_LITE as DEMO_AREAS,
  DEMO_GOALS_LITE as DEMO_GOALS,
  DEMO_GROUPS_LITE as DEMO_GROUPS,
  DEMO_TASKS_LITE as DEMO_TASKS,
} from './data'
import { generateDemoWeekTasks, generateDemoHomeTasks } from './week-data'

function seedDemoData(qc: QueryClient) {
  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 0 })
  const weekStartStr = format(weekStart, 'yyyy-MM-dd')

  // Set staleTime to Infinity for all demo queries to prevent refetch
  // queryKeys.*.all are plain arrays (not functions) per keys.ts
  qc.setQueryDefaults(queryKeys.tasks.all, { staleTime: Infinity, gcTime: Infinity })
  qc.setQueryDefaults(queryKeys.areas.all, { staleTime: Infinity, gcTime: Infinity })
  qc.setQueryDefaults(queryKeys.goals.all, { staleTime: Infinity, gcTime: Infinity })
  qc.setQueryDefaults(queryKeys.direction.all, { staleTime: Infinity, gcTime: Infinity })
  qc.setQueryDefaults(queryKeys.reflections.all, { staleTime: Infinity, gcTime: Infinity })
  qc.setQueryDefaults(queryKeys.googleCalendar.all, { staleTime: Infinity, gcTime: Infinity })
  qc.setQueryDefaults(queryKeys.profile.me, { staleTime: Infinity, gcTime: Infinity })
  qc.setQueryDefaults(queryKeys.checkIns.all, { staleTime: Infinity, gcTime: Infinity })

  // Home tab: week tasks map
  const weekTasks = generateDemoWeekTasks(today)
  qc.setQueryData(queryKeys.tasks.homeWeek(weekStartStr), weekTasks)

  // Individual day tasks (current week + surrounding days)
  for (let i = -7; i <= 14; i++) {
    const d = addDays(today, i)
    const dateStr = format(d, 'yyyy-MM-dd')
    qc.setQueryData(queryKeys.tasks.home(dateStr), generateDemoHomeTasks(d))
  }

  // Roadmap tab: areas, goals (with groups/tasks relations), direction
  // queryKeys.areas.all = ['areas'] (plain array), queryKeys.areas.active() = function
  qc.setQueryData(queryKeys.areas.all, DEMO_AREAS)
  qc.setQueryData(queryKeys.areas.active(), DEMO_AREAS)

  const enrichedGoals = DEMO_GOALS.map((goal) => ({
    ...goal,
    groups: DEMO_GROUPS.filter((g) => g.goal_id === goal.id),
    tasks: DEMO_TASKS.filter((t) => t.goal_id === goal.id),
  }))
  qc.setQueryData(queryKeys.goals.all, enrichedGoals)
  qc.setQueryData(queryKeys.direction.all, DEMO_DIRECTION)
  qc.setQueryData(queryKeys.direction.history, [DEMO_DIRECTION])

  // Common: no Google Calendar connection
  qc.setQueryData(queryKeys.googleCalendar.connection(), null)

  // Seed null reflections for -30 to +14 days to prevent live Supabase calls
  // when ReviewPanel's JournalDayDetail calls useReflection for any date
  for (let i = -30; i <= 14; i++) {
    const d = addDays(today, i)
    const dateStr = format(d, 'yyyy-MM-dd')
    qc.setQueryData(queryKeys.reflections.byDate(dateStr), null)
  }

  // Profile: null (no logged-in user)
  qc.setQueryData(queryKeys.profile.me, null)
}

export function DemoDataSeeder({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [seeded, setSeeded] = useState(false)

  // Synchronous seeding — runs during render, before useEffect/useQuery
  if (!seeded) {
    seedDemoData(queryClient)
    setSeeded(true)
  }

  return <>{children}</>
}
