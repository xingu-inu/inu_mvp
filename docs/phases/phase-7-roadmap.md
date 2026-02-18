# Phase 7: Roadmap Screen

> **Goal**: Implement life roadmap visualization with goals, phases, and CRUD operations

---

## 📚 Reference Documents

- `docs/plan/screens/roadmap/spec.md`
- `docs/plan/screens/roadmap/wireframe.md`
- `docs/plan/reference/features/life-roadmap.md`
- `docs/plan/reference/features/goal-lifecycle.md`
- `docs/plan/reference/features/why-chain.md`

---

## 7.1 Roadmap Page Structure

### src/app/(main)/roadmap/page.tsx

```typescript
import { Suspense } from 'react'
import { PageContainer } from '@/components/layout/page-container'
import { RoadmapHeader } from '@/features/roadmap/components/roadmap-header'
import { DirectionCard } from '@/features/roadmap/components/direction-card'
import { ViewToggle } from '@/features/roadmap/components/view-toggle'
import { GoalFilters } from '@/features/roadmap/components/goal-filters'
import { GoalList } from '@/features/roadmap/components/goal-list'
import { GoalListSkeleton } from '@/features/roadmap/components/goal-list-skeleton'
import { AddGoalButton } from '@/features/roadmap/components/add-goal-button'

export default function RoadmapPage() {
  return (
    <PageContainer>
      {/* Header */}
      <RoadmapHeader />

      {/* Direction Summary */}
      <div className="mt-6">
        <DirectionCard />
      </div>

      {/* Controls */}
      <div className="mt-6 flex items-center justify-between gap-4">
        <GoalFilters />
        <ViewToggle />
      </div>

      {/* Goal List */}
      <div className="mt-6">
        <Suspense fallback={<GoalListSkeleton />}>
          <GoalList />
        </Suspense>
      </div>

      {/* Add Goal FAB */}
      <AddGoalButton />
    </PageContainer>
  )
}
```

---

## 7.2 Roadmap Store (Zustand)

### src/stores/roadmap.store.ts

```typescript
import { create } from 'zustand'
import type { GoalStatus } from '@/types/entities'

type ViewMode = 'card' | 'tree' | 'list'

interface RoadmapState {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void

  statusFilter: GoalStatus | 'all'
  setStatusFilter: (status: GoalStatus | 'all') => void

  areaFilter: string | null
  setAreaFilter: (areaId: string | null) => void

  selectedGoalId: string | null
  setSelectedGoalId: (id: string | null) => void
}

export const useRoadmapStore = create<RoadmapState>((set) => ({
  viewMode: 'card',
  setViewMode: (mode) => set({ viewMode: mode }),

  statusFilter: 'active',
  setStatusFilter: (status) => set({ statusFilter: status }),

  areaFilter: null,
  setAreaFilter: (areaId) => set({ areaFilter: areaId }),

  selectedGoalId: null,
  setSelectedGoalId: (id) => set({ selectedGoalId: id }),
}))
```

---

## 7.3 Roadmap Header

### src/features/roadmap/components/roadmap-header.tsx

```typescript
'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRoadmapStore } from '@/stores/roadmap.store'

interface RoadmapHeaderProps {
  onAddGoal?: () => void
}

export function RoadmapHeader({ onAddGoal }: RoadmapHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold">나의 목표</h1>
        <p className="text-sm text-foreground-secondary mt-1">
          인생 로드맵을 관리하세요
        </p>
      </div>
      <Button
        size="sm"
        onClick={onAddGoal}
        className="gap-1"
      >
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">목표 추가</span>
      </Button>
    </div>
  )
}
```

---

## 7.4 View Toggle

### src/features/roadmap/components/view-toggle.tsx

```typescript
'use client'

import { useRoadmapStore } from '@/stores/roadmap.store'
import { cn } from '@/lib/utils'
import { LayoutGrid, GitBranch, List } from 'lucide-react'

const VIEW_OPTIONS = [
  { mode: 'card' as const, icon: LayoutGrid, label: '카드' },
  { mode: 'tree' as const, icon: GitBranch, label: '트리' },
  { mode: 'list' as const, icon: List, label: '리스트' },
]

export function ViewToggle() {
  const { viewMode, setViewMode } = useRoadmapStore()

  return (
    <div className="flex border border-border rounded-lg overflow-hidden">
      {VIEW_OPTIONS.map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          onClick={() => setViewMode(mode)}
          className={cn(
            'flex items-center gap-1 px-3 py-2 text-sm transition-colors',
            viewMode === mode
              ? 'bg-primary-50 text-primary-600'
              : 'text-foreground-secondary hover:bg-surface-secondary'
          )}
          aria-label={label}
          aria-pressed={viewMode === mode}
        >
          <Icon className="w-4 h-4" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}
```

---

## 7.5 Direction Card

### src/features/roadmap/components/direction-card.tsx

```typescript
'use client'

import { Card } from '@/components/ui/card'
import { useDirection } from '@/queries/use-direction'
import { Compass, Edit2 } from 'lucide-react'

export function DirectionCard() {
  const { data: direction } = useDirection()

  if (!direction) return null

  return (
    <Card variant="hero" className="relative">
      <button
        className="absolute top-4 right-4 p-2 rounded-lg hover:bg-surface-secondary transition-colors"
        aria-label="Edit direction"
      >
        <Edit2 className="w-4 h-4 text-foreground-tertiary" />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
          <Compass className="w-5 h-5 text-primary-500" />
        </div>
        <div>
          <h2 className="text-sm font-medium text-foreground-secondary mb-1">
            My Life Direction
          </h2>
          <p className="text-lg font-semibold">{direction.statement}</p>
          {direction.why && (
            <p className="text-sm text-foreground-secondary mt-2">
              {direction.why}
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
```

---

## 7.6 Goal Filters

### src/features/roadmap/components/goal-filters.tsx

```typescript
'use client'

import { useRoadmapStore } from '@/stores/roadmap.store'
import { useAreas } from '@/queries/use-areas'
import { Chip } from '@/components/ui/chip'
import type { GoalStatus } from '@/types/entities'

const STATUS_OPTIONS: { value: GoalStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'backlog', label: 'Backlog' },
  { value: 'completed', label: 'Completed' },
]

export function GoalFilters() {
  const { statusFilter, setStatusFilter, areaFilter, setAreaFilter } = useRoadmapStore()
  const { data: areas = [] } = useAreas()

  return (
    <div className="flex flex-wrap gap-2">
      {/* Status Filter */}
      {STATUS_OPTIONS.map((option) => (
        <Chip
          key={option.value}
          variant="selection"
          selected={statusFilter === option.value}
          onClick={() => setStatusFilter(option.value)}
        >
          {option.label}
        </Chip>
      ))}

      {/* Area Filter */}
      {areas.length > 0 && (
        <>
          <div className="w-px h-6 bg-border mx-1" />
          {areas.map((area) => (
            <Chip
              key={area.id}
              variant="selection"
              selected={areaFilter === area.id}
              onClick={() => setAreaFilter(areaFilter === area.id ? null : area.id)}
              emoji={area.emoji}
            >
              {area.name}
            </Chip>
          ))}
        </>
      )}
    </div>
  )
}
```

---

## 7.7 Goal Card Component

### src/features/roadmap/components/goal-card.tsx

```typescript
'use client'

import { Card } from '@/components/ui/card'
import { Chip } from '@/components/ui/chip'
import { ProgressBar, PhaseIndicator } from '@/components/ui/progress'
import { useRoadmapStore } from '@/stores/roadmap.store'
import { cn } from '@/lib/utils'
import type { Goal } from '@/types/entities'

interface GoalCardProps {
  goal: Goal
}

export function GoalCard({ goal }: GoalCardProps) {
  const { setSelectedGoalId } = useRoadmapStore()

  const completedPhases = goal.phases?.filter((p) => p.status === 'completed').length || 0
  const totalPhases = goal.phases?.length || 0
  const currentPhaseIndex = goal.phases?.findIndex((p) => p.status === 'active') ?? -1

  const completedTasks = goal.tasks?.filter((t) =>
    t.check_ins?.some((c) => c.status === 'done')
  ).length || 0
  const totalTasks = goal.tasks?.length || 0

  return (
    <Card
      className="cursor-pointer"
      onClick={() => setSelectedGoalId(goal.id)}
    >
      {/* Area Tag */}
      {goal.area && (
        <Chip
          variant="area"
          emoji={goal.area.emoji}
          color={goal.area.color}
          className="mb-3"
        >
          {goal.area.name}
        </Chip>
      )}

      {/* Goal Name */}
      <h3 className="font-semibold text-lg mb-1">{goal.name}</h3>

      {/* Why */}
      {goal.why && (
        <p className="text-sm text-foreground-secondary line-clamp-2 mb-4">
          {goal.why}
        </p>
      )}

      {/* Phase Progress */}
      {totalPhases > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-foreground-tertiary">Phases</span>
            <span className="text-xs font-medium">
              {completedPhases}/{totalPhases}
            </span>
          </div>
          <PhaseIndicator
            total={totalPhases}
            current={currentPhaseIndex}
            completed={completedPhases}
          />
        </div>
      )}

      {/* Task Progress */}
      {totalTasks > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-foreground-tertiary">Tasks completed today</span>
            <span className="text-xs font-medium">
              {completedTasks}/{totalTasks}
            </span>
          </div>
          <ProgressBar value={completedTasks} max={totalTasks} />
        </div>
      )}

      {/* Status Badge */}
      <div className="mt-4 pt-4 border-t border-border">
        <span
          className={cn(
            'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
            goal.status === 'active' && 'bg-primary-50 text-primary-600',
            goal.status === 'backlog' && 'bg-surface-tertiary text-foreground-secondary',
            goal.status === 'completed' && 'bg-done-bg text-done',
            goal.status === 'paused' && 'bg-streak-bg text-streak'
          )}
        >
          {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
        </span>
      </div>
    </Card>
  )
}
```

---

## 7.8 Goal List Component

### src/features/roadmap/components/goal-list.tsx

```typescript
'use client'

import { useGoals } from '@/queries/use-goals'
import { useAreas } from '@/queries/use-areas'
import { useRoadmapStore } from '@/stores/roadmap.store'
import { GoalCard } from './goal-card'
import { TreeView } from './tree-view'
import { EmptyGoals } from './empty-goals'
import type { Goal, GoalStatus } from '@/types/entities'

export function GoalList() {
  const { viewMode, statusFilter, areaFilter } = useRoadmapStore()
  const { data: goals = [] } = useGoals(statusFilter === 'all' ? undefined : statusFilter as GoalStatus)
  const { data: areas = [] } = useAreas()

  // Filter by area if selected
  const filteredGoals = areaFilter
    ? goals.filter((g) => g.area_id === areaFilter)
    : goals

  if (filteredGoals.length === 0) {
    return <EmptyGoals />
  }

  // Tree view - 계층 구조 표시
  if (viewMode === 'tree') {
    return <TreeView goals={filteredGoals} areas={areas} />
  }

  // Card view - Area별 그룹핑
  if (viewMode === 'card') {
    const groupedByArea = areas.reduce((acc, area) => {
      const areaGoals = filteredGoals.filter((g) => g.area_id === area.id)
      if (areaGoals.length > 0) {
        acc[area.id] = { area, goals: areaGoals }
      }
      return acc
    }, {} as Record<string, { area: typeof areas[0]; goals: Goal[] }>)

    return (
      <div className="space-y-8">
        {Object.values(groupedByArea).map(({ area, goals }) => (
          <section key={area.id}>
            <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
              <span>{area.emoji}</span>
              <span>{area.name}</span>
              <span className="text-foreground-tertiary font-normal">
                ({goals.length})
              </span>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {goals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
            </div>
          </section>
        ))}
      </div>
    )
  }

  // List view - 단순 리스트
  return (
    <div className="space-y-3">
      {filteredGoals.map((goal) => (
        <GoalCard key={goal.id} goal={goal} />
      ))}
    </div>
  )
}
```

---

## 7.9 Tree View Component

### src/features/roadmap/components/tree-view.tsx

```typescript
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Target, CheckCircle2 } from 'lucide-react'
import { useRoadmapStore } from '@/stores/roadmap.store'
import { PhaseIndicator } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { Goal, Area, Phase, Task } from '@/types/entities'

interface TreeViewProps {
  goals: Goal[]
  areas: Area[]
}

export function TreeView({ goals, areas }: TreeViewProps) {
  return (
    <div className="space-y-4">
      {areas.map((area) => {
        const areaGoals = goals.filter((g) => g.area_id === area.id)
        if (areaGoals.length === 0) return null

        return (
          <AreaTreeNode key={area.id} area={area} goals={areaGoals} />
        )
      })}
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Area Node
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface AreaTreeNodeProps {
  area: Area
  goals: Goal[]
}

function AreaTreeNode({ area, goals }: AreaTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const activeCount = goals.filter((g) => g.status === 'active').length
  const backlogCount = goals.filter((g) => g.status === 'backlog').length

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Area Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-surface-secondary hover:bg-surface-tertiary transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-foreground-tertiary" />
          ) : (
            <ChevronRight className="w-4 h-4 text-foreground-tertiary" />
          )}
          <span className="text-lg">{area.emoji}</span>
          <span className="font-semibold">{area.name}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-foreground-secondary">
          {activeCount > 0 && (
            <span className="px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full">
              Active {activeCount}
            </span>
          )}
          {backlogCount > 0 && (
            <span className="px-2 py-0.5 bg-surface-tertiary rounded-full">
              BL {backlogCount}
            </span>
          )}
        </div>
      </button>

      {/* Goals */}
      {isExpanded && (
        <div className="border-t border-border">
          {goals.map((goal) => (
            <GoalTreeNode key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Goal Node
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface GoalTreeNodeProps {
  goal: Goal
}

function GoalTreeNode({ goal }: GoalTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(goal.status === 'active')
  const { setSelectedGoalId } = useRoadmapStore()

  const hasChildren = (goal.phases?.length ?? 0) > 0 || (goal.tasks?.length ?? 0) > 0
  const completedPhases = goal.phases?.filter((p) => p.status === 'completed').length || 0
  const totalPhases = goal.phases?.length || 0
  const currentPhaseIndex = goal.phases?.findIndex((p) => p.status === 'active') ?? -1

  // 기한까지 남은 일수
  const daysLeft = goal.deadline
    ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="border-b border-border last:border-b-0">
      {/* Goal Row */}
      <div className="flex items-center gap-2 p-3 pl-8 hover:bg-surface-secondary transition-colors">
        {/* Expand Toggle */}
        {hasChildren ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 -ml-6"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-foreground-tertiary" />
            ) : (
              <ChevronRight className="w-4 h-4 text-foreground-tertiary" />
            )}
          </button>
        ) : (
          <div className="w-6" />
        )}

        {/* Goal Info */}
        <button
          onClick={() => setSelectedGoalId(goal.id)}
          className="flex-1 flex items-center gap-3 text-left"
        >
          <Target className="w-4 h-4 text-primary-500" />
          <span className="font-medium">{goal.name}</span>
        </button>

        {/* Phase Indicator */}
        {totalPhases > 0 && (
          <div className="hidden sm:block w-32">
            <PhaseIndicator
              total={totalPhases}
              current={currentPhaseIndex}
              completed={completedPhases}
            />
          </div>
        )}

        {/* D-Day */}
        {daysLeft !== null && (
          <span
            className={cn(
              'text-sm font-medium',
              daysLeft <= 7 ? 'text-miss' : 'text-foreground-secondary'
            )}
          >
            D-{daysLeft}
          </span>
        )}
      </div>

      {/* Phases & Tasks */}
      {isExpanded && hasChildren && (
        <div className="bg-surface-secondary/50">
          {/* Phases */}
          {goal.phases?.map((phase) => (
            <PhaseTreeNode key={phase.id} phase={phase} goal={goal} />
          ))}

          {/* Direct Tasks (Phase 없는 경우) */}
          {(!goal.phases || goal.phases.length === 0) &&
            goal.tasks?.map((task) => (
              <TaskTreeNode key={task.id} task={task} />
            ))}
        </div>
      )}
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Phase Node
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface PhaseTreeNodeProps {
  phase: Phase
  goal: Goal
}

function PhaseTreeNode({ phase, goal }: PhaseTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(phase.status === 'active')
  const phaseTasks = goal.tasks?.filter((t) => t.phase_id === phase.id) || []

  const isActive = phase.status === 'active'
  const isCompleted = phase.status === 'completed'

  return (
    <div>
      {/* Phase Row */}
      <div
        className={cn(
          'flex items-center gap-2 p-2 pl-12',
          isActive && 'bg-primary-50/50'
        )}
      >
        {phaseTasks.length > 0 ? (
          <button onClick={() => setIsExpanded(!isExpanded)} className="p-1">
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-foreground-tertiary" />
            ) : (
              <ChevronRight className="w-3 h-3 text-foreground-tertiary" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}

        <div
          className={cn(
            'w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium',
            isCompleted && 'bg-done text-white',
            isActive && 'bg-primary-500 text-white',
            !isCompleted && !isActive && 'bg-border text-foreground-tertiary'
          )}
        >
          {phase.order}
        </div>

        <span
          className={cn(
            'text-sm',
            isCompleted && 'line-through text-foreground-tertiary',
            isActive && 'font-medium'
          )}
        >
          {phase.name}
        </span>

        {isActive && (
          <span className="ml-auto text-xs text-primary-600 font-medium">
            현재
          </span>
        )}
      </div>

      {/* Tasks */}
      {isExpanded && phaseTasks.length > 0 && (
        <div>
          {phaseTasks.map((task) => (
            <TaskTreeNode key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Task Node
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface TaskTreeNodeProps {
  task: Task
}

function TaskTreeNode({ task }: TaskTreeNodeProps) {
  const todayCheckin = task.check_ins?.find(
    (c) => c.date === new Date().toISOString().split('T')[0]
  )
  const isDone = todayCheckin?.status === 'done'

  return (
    <div className="flex items-center gap-2 p-2 pl-20 text-sm">
      <CheckCircle2
        className={cn(
          'w-4 h-4',
          isDone ? 'text-done' : 'text-foreground-tertiary'
        )}
      />
      <span className={isDone ? 'line-through text-foreground-tertiary' : ''}>
        {task.name}
      </span>
      {task.streak_count > 0 && (
        <span className="ml-auto text-xs">🔥 {task.streak_count}</span>
      )}
    </div>
  )
}
```

---

## 7.10 Empty Goals State

### src/features/roadmap/components/empty-goals.tsx

```typescript
'use client'

import { Target, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyGoalsProps {
  onAddGoal?: () => void
}

export function EmptyGoals({ onAddGoal }: EmptyGoalsProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-surface-secondary flex items-center justify-center mb-6">
        <Target className="w-8 h-8 text-foreground-tertiary" />
      </div>

      {/* Text */}
      <h3 className="text-lg font-semibold mb-2">아직 목표가 없어요</h3>
      <p className="text-foreground-secondary mb-6 max-w-xs">
        인생의 첫 목표를 추가하고
        <br />
        로드맵을 시작해보세요
      </p>

      {/* CTA */}
      <Button onClick={onAddGoal} className="gap-2">
        <Plus className="w-4 h-4" />
        첫 목표 추가하기
      </Button>
    </div>
  )
}
```

---

## 7.11 Add Goal Button (FAB)

### src/features/roadmap/components/add-goal-button.tsx

```typescript
'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { CreateGoalForm } from './create-goal-form'

export function AddGoalButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Floating Action Button */}
      <Button
        size="lg"
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full shadow-lg z-40"
        onClick={() => setIsOpen(true)}
        aria-label="새 목표 추가"
      >
        <Plus className="w-6 h-6" />
      </Button>

      {/* Create Goal Sheet */}
      <BottomSheet
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="새 목표 추가"
      >
        <CreateGoalForm onSuccess={() => setIsOpen(false)} />
      </BottomSheet>
    </>
  )
}
```

---

## 7.12 Goal List Skeleton

### src/features/roadmap/components/goal-list-skeleton.tsx

```typescript
export function GoalListSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Area Section Skeleton */}
      {[1, 2].map((areaIndex) => (
        <div key={areaIndex}>
          {/* Area Header */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded bg-surface-tertiary" />
            <div className="h-5 w-24 rounded bg-surface-tertiary" />
          </div>

          {/* Goal Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2].map((goalIndex) => (
              <div
                key={goalIndex}
                className="p-4 rounded-xl border border-border"
              >
                {/* Area Tag */}
                <div className="h-6 w-16 rounded-full bg-surface-tertiary mb-3" />

                {/* Goal Name */}
                <div className="h-6 w-3/4 rounded bg-surface-tertiary mb-2" />

                {/* Why */}
                <div className="h-4 w-full rounded bg-surface-tertiary mb-1" />
                <div className="h-4 w-2/3 rounded bg-surface-tertiary mb-4" />

                {/* Phase Indicator */}
                <div className="h-2 w-full rounded-full bg-surface-tertiary mb-4" />

                {/* Status */}
                <div className="pt-4 border-t border-border">
                  <div className="h-6 w-16 rounded-full bg-surface-tertiary" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

---

## 7.13 Goal Detail Bottom Sheet

### src/features/roadmap/components/goal-detail-sheet.tsx

```typescript
'use client'

import { useEffect } from 'react'
import { useGoal, useUpdateGoal, useDeleteGoal } from '@/queries/use-goals'
import { useRoadmapStore } from '@/stores/roadmap.store'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { PhaseIndicator, ProgressBar } from '@/components/ui/progress'
import { Edit2, Trash2, Plus, ChevronRight } from 'lucide-react'
import type { GoalStatus } from '@/types/entities'

const STATUS_OPTIONS: { value: GoalStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Active', color: 'bg-primary-500' },
  { value: 'backlog', label: 'Backlog', color: 'bg-foreground-tertiary' },
  { value: 'paused', label: 'Paused', color: 'bg-streak' },
  { value: 'completed', label: 'Completed', color: 'bg-done' },
]

export function GoalDetailSheet() {
  const { selectedGoalId, setSelectedGoalId } = useRoadmapStore()
  const { data: goal, isLoading } = useGoal(selectedGoalId || '')
  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()

  const isOpen = !!selectedGoalId

  const handleClose = () => setSelectedGoalId(null)

  const handleStatusChange = (status: GoalStatus) => {
    if (goal) {
      updateGoal.mutate({ id: goal.id, input: { status } })
    }
  }

  const handleDelete = () => {
    if (goal && confirm('Are you sure you want to delete this goal?')) {
      deleteGoal.mutate(goal.id, {
        onSuccess: () => handleClose(),
      })
    }
  }

  if (!goal && !isLoading) return null

  return (
    <BottomSheet open={isOpen} onClose={handleClose}>
      {goal && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {goal.area && (
                <Chip
                  variant="area"
                  emoji={goal.area.emoji}
                  color={goal.area.color}
                  className="mb-2"
                >
                  {goal.area.name}
                </Chip>
              )}
              <h2 className="text-xl font-bold">{goal.name}</h2>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" aria-label="Edit">
                <Edit2 className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                aria-label="Delete"
              >
                <Trash2 className="w-5 h-5 text-miss" />
              </Button>
            </div>
          </div>

          {/* Why */}
          {goal.why && (
            <div>
              <h3 className="text-sm font-medium text-foreground-secondary mb-1">
                Why this goal?
              </h3>
              <p className="text-foreground">{goal.why}</p>
            </div>
          )}

          {/* Vision */}
          {goal.vision && (
            <div>
              <h3 className="text-sm font-medium text-foreground-secondary mb-1">
                Vision
              </h3>
              <p className="text-foreground">{goal.vision}</p>
            </div>
          )}

          {/* Status Change */}
          <div>
            <h3 className="text-sm font-medium text-foreground-secondary mb-2">
              Status
            </h3>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  variant="selection"
                  selected={goal.status === option.value}
                  onClick={() => handleStatusChange(option.value)}
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          </div>

          {/* Phases */}
          {goal.phases && goal.phases.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-foreground-secondary">
                  Phases
                </h3>
                <Button variant="ghost" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Phase
                </Button>
              </div>
              <div className="space-y-2">
                {goal.phases.map((phase, index) => (
                  <div
                    key={phase.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-surface-secondary"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                          phase.status === 'completed'
                            ? 'bg-done text-white'
                            : phase.status === 'active'
                            ? 'bg-primary-500 text-white'
                            : 'bg-border text-foreground-tertiary'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <span className={phase.status === 'completed' ? 'line-through opacity-60' : ''}>
                        {phase.name}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-foreground-tertiary" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks */}
          {goal.tasks && goal.tasks.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-foreground-secondary">
                  Tasks ({goal.tasks.length})
                </h3>
                <Button variant="ghost" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Task
                </Button>
              </div>
              <div className="space-y-2">
                {goal.tasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-surface-secondary"
                  >
                    <span>{task.name}</span>
                    <span className="text-sm text-foreground-tertiary">
                      🔥 {task.streak_count}
                    </span>
                  </div>
                ))}
                {goal.tasks.length > 5 && (
                  <Button variant="ghost" className="w-full">
                    View all {goal.tasks.length} tasks
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  )
}
```

---

## 7.14 Create Goal Form

### src/features/roadmap/components/create-goal-form.tsx

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Chip } from '@/components/ui/chip'
import { useAreas } from '@/queries/use-areas'
import { useCreateGoal } from '@/queries/use-goals'
import { createGoalSchema, type CreateGoalSchema } from '@/lib/validations'

interface CreateGoalFormProps {
  onSuccess?: () => void
}

export function CreateGoalForm({ onSuccess }: CreateGoalFormProps) {
  const { data: areas = [] } = useAreas()
  const createGoal = useCreateGoal()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateGoalSchema>({
    resolver: zodResolver(createGoalSchema),
  })

  const selectedAreaId = watch('area_id')

  const onSubmit = (data: CreateGoalSchema) => {
    createGoal.mutate(data, {
      onSuccess: () => onSuccess?.(),
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Area Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">Area</label>
        <div className="flex flex-wrap gap-2">
          {areas.map((area) => (
            <Chip
              key={area.id}
              variant="selection"
              selected={selectedAreaId === area.id}
              onClick={() => setValue('area_id', area.id)}
              emoji={area.emoji}
            >
              {area.name}
            </Chip>
          ))}
        </div>
        {errors.area_id && (
          <p className="mt-1 text-sm text-miss">{errors.area_id.message}</p>
        )}
      </div>

      {/* Goal Name */}
      <div>
        <label className="block text-sm font-medium mb-2">Goal Name</label>
        <Input
          {...register('name')}
          placeholder="e.g., Run a marathon"
          error={errors.name?.message}
        />
      </div>

      {/* Why */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Why is this important? (optional)
        </label>
        <Textarea
          {...register('why')}
          placeholder="e.g., To prove I can commit to challenging goals"
        />
      </div>

      {/* Vision */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Vision - How will achieving this feel? (optional)
        </label>
        <Textarea
          {...register('vision')}
          placeholder="e.g., Crossing the finish line with my family cheering"
        />
      </div>

      {/* Target Date */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Target Date (optional)
        </label>
        <Input type="date" {...register('target_date')} />
      </div>

      {/* Submit */}
      <Button type="submit" className="w-full" isLoading={createGoal.isPending}>
        Create Goal
      </Button>
    </form>
  )
}
```

---

## 7.15 Tree Reorder (Fractional Indexing)

드래그 앤 드롭으로 Goal, Phase, Task 순서를 변경할 때 효율적인 정렬을 위한 Fractional Indexing을 구현합니다.

### Why: 정수 order의 문제

```
┌─────────────────────────────────────────────────────────────────┐
│  정수 order의 문제                                               │
│                                                                 │
│  Goal A (order: 1)                                              │
│  Goal B (order: 2)  ← 여기 사이에 삽입하려면?                     │
│  Goal C (order: 3)                                              │
│                                                                 │
│  → B, C 모두 업데이트 필요 (order: 3, 4로 변경)                   │
│  → N개 항목이면 최악의 경우 N번 업데이트                          │
│  → 드래그 앤 드롭이 많으면 서버 요청 폭발 💥                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Fractional Indexing 해결책                                      │
│                                                                 │
│  Goal A (order: "a")                                            │
│  Goal D (order: "aV")  ← 새 항목 (A와 B 사이)                    │
│  Goal B (order: "b")                                            │
│  Goal C (order: "c")                                            │
│                                                                 │
│  generateKeyBetween("a", "b") = "aV"                            │
│  → 1개만 업데이트! 🎉                                            │
│  → 어디로 이동하든 항상 1개만 업데이트                            │
└─────────────────────────────────────────────────────────────────┘
```

### 드래그 앤 드롭 통신 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│  사용자: Goal을 드래그하여 다른 위치로 이동                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Optimistic Update (즉시 - 0ms)                              │
│                                                                 │
│  - 새 order 계산 (fractional indexing)                          │
│  - 캐시 즉시 업데이트                                            │
│  - UI 즉시 반영                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Debounce (300ms)                                            │
│                                                                 │
│  ┌─────┐ ┌─────┐ ┌─────┐         ┌──────┐                      │
│  │Move1│→│Move2│→│Move3│ ─300ms─►│ Send │                      │
│  └─────┘ └─────┘ └─────┘         └──────┘                      │
│    무시    무시   마지막만 전송                                   │
│                                                                 │
│  → 빠른 연속 드래그 시 요청 최소화                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Server Action                                               │
│                                                                 │
│  await moveNode({                                               │
│    nodeId: 'goal-123',                                          │
│    nodeType: 'goal',                                            │
│    newParentId: 'area-456',  // 부모 변경 시 (선택)              │
│    newOrder: 'aV',           // fractional index                │
│  });                                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                성공 ✅              실패 ❌
                    │                   │
                    ▼                   ▼
             캐시 유지            롤백 + 토스트
```

### Fractional Index 유틸리티

```typescript
// src/lib/fractional-index.ts
import { generateKeyBetween } from 'fractional-indexing'

/**
 * 두 아이템 사이의 새 order 값 생성
 */
export function getNewOrderBetween(beforeOrder: string | null, afterOrder: string | null): string {
  return generateKeyBetween(beforeOrder, afterOrder)
}

/**
 * 아이템 이동 시 새 order 계산
 */
export function getNewOrder<T extends { order: string }>(
  items: T[],
  fromIndex: number,
  toIndex: number
): string {
  // 이동할 위치의 앞뒤 아이템
  const targetIndex = fromIndex < toIndex ? toIndex : toIndex - 1

  const beforeItem = items[targetIndex] // 이동 위치 바로 앞
  const afterItem = items[targetIndex + 1] // 이동 위치 바로 뒤

  // 맨 앞으로 이동
  if (toIndex === 0) {
    return generateKeyBetween(null, items[0]?.order ?? null)
  }

  // 맨 뒤로 이동
  if (toIndex >= items.length - 1) {
    return generateKeyBetween(items[items.length - 1]?.order ?? null, null)
  }

  // 중간으로 이동
  return generateKeyBetween(beforeItem?.order ?? null, afterItem?.order ?? null)
}

/**
 * 초기 order 값 생성 (새 아이템 추가 시)
 */
export function getInitialOrder<T extends { order: string }>(items: T[]): string {
  if (items.length === 0) {
    return generateKeyBetween(null, null) // 첫 아이템: "a"
  }

  const lastItem = items[items.length - 1]
  return generateKeyBetween(lastItem.order, null)
}
```

### useTreeReorder Hook

```typescript
// src/hooks/use-tree-reorder.ts
import { useRef, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDebouncedCallback } from 'use-debounce'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query/keys'
import { getNewOrder } from '@/lib/fractional-index'
import { moveNode } from '@/actions/tree.actions'
import type { MoveNodeInput } from '@/types/api'

type NodeType = 'direction' | 'area' | 'goal' | 'phase' | 'task'

interface UseTreeReorderOptions {
  nodeType: NodeType
  queryKey: string[]
  parentKey?: string // 부모 변경 시 사용 (e.g., area_id for goals)
}

export function useTreeReorder<T extends { id: string; order: string }>({
  nodeType,
  queryKey,
  parentKey,
}: UseTreeReorderOptions) {
  const queryClient = useQueryClient()
  const previousRef = useRef<T[] | null>(null)

  // Server mutation
  const mutation = useMutation({
    mutationFn: moveNode,
    onError: () => {
      // 롤백
      if (previousRef.current) {
        queryClient.setQueryData(queryKey, previousRef.current)
      }
      toast.error('이동에 실패했어요. 다시 시도해주세요.')
    },
    onSettled: () => {
      // 서버와 동기화
      queryClient.invalidateQueries({ queryKey })
    },
  })

  // 300ms 디바운스로 서버 요청 최소화
  const debouncedMutate = useDebouncedCallback(
    (input: MoveNodeInput) => mutation.mutate(input),
    300
  )

  const handleReorder = useCallback(
    (itemId: string, fromIndex: number, toIndex: number, newParentId?: string) => {
      // 같은 위치면 무시
      if (fromIndex === toIndex) return

      const items = queryClient.getQueryData<T[]>(queryKey)
      if (!items) return

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // Step 1: 이전 상태 저장 (롤백용)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      previousRef.current = [...items]

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // Step 2: 새 order 계산
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const newOrder = getNewOrder(items, fromIndex, toIndex)

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // Step 3: Optimistic Update
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const updated = [...items]
      const [movedItem] = updated.splice(fromIndex, 1)

      // order 업데이트
      const updatedItem = {
        ...movedItem,
        order: newOrder,
        ...(parentKey && newParentId ? { [parentKey]: newParentId } : {}),
      }

      updated.splice(toIndex, 0, updatedItem)

      // 캐시 업데이트
      queryClient.setQueryData(queryKey, updated)

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // Step 4: 디바운스된 서버 요청
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      debouncedMutate({
        nodeId: itemId,
        nodeType,
        newOrder,
        newParentId,
      })
    },
    [queryKey, nodeType, parentKey, queryClient, debouncedMutate]
  )

  return {
    handleReorder,
    isLoading: mutation.isPending,
  }
}
```

### Server Action: moveNode

```typescript
// src/actions/tree.actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse } from '@/lib/api/response'
import { ErrorCode } from '@/lib/api/errors'
import type { ApiResponse } from '@/types/api'

export interface MoveNodeInput {
  nodeId: string
  nodeType: 'direction' | 'area' | 'goal' | 'phase' | 'task'
  newOrder: string
  newParentId?: string
}

export async function moveNode(input: MoveNodeInput): Promise<ApiResponse<void>> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return errorResponse(ErrorCode.AUTH_REQUIRED, '로그인이 필요합니다.')
    }

    const tableName = getTableName(input.nodeType)
    const parentColumn = getParentColumn(input.nodeType)

    // 업데이트 데이터 구성
    const updateData: Record<string, unknown> = {
      sort_order: input.newOrder,
    }

    // 부모 변경이 있으면 추가
    if (input.newParentId && parentColumn) {
      updateData[parentColumn] = input.newParentId
    }

    const { error } = await supabase.from(tableName).update(updateData).eq('id', input.nodeId)

    if (error) {
      return errorResponse(ErrorCode.DATABASE_ERROR, '이동에 실패했습니다.')
    }

    // 캐시 무효화
    revalidatePath('/roadmap')

    return successResponse(undefined)
  } catch (error) {
    return errorResponse(ErrorCode.INTERNAL_ERROR, '서버 오류가 발생했습니다.')
  }
}

function getTableName(nodeType: string): string {
  const map: Record<string, string> = {
    direction: 'directions',
    area: 'areas',
    goal: 'goals',
    phase: 'phases',
    task: 'tasks',
  }
  return map[nodeType]
}

function getParentColumn(nodeType: string): string | null {
  const map: Record<string, string | null> = {
    direction: null,
    area: null,
    goal: 'area_id',
    phase: 'goal_id',
    task: 'goal_id',
  }
  return map[nodeType]
}
```

### DnD 컴포넌트 통합

```typescript
// src/features/roadmap/components/sortable-goal-list.tsx
'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useGoals } from '@/queries/use-goals'
import { useTreeReorder } from '@/hooks/use-tree-reorder'
import { queryKeys } from '@/lib/query/keys'
import { SortableGoalCard } from './sortable-goal-card'
import type { Goal } from '@/types/entities'

export function SortableGoalList() {
  const { data: goals = [] } = useGoals()
  const { handleReorder } = useTreeReorder<Goal>({
    nodeType: 'goal',
    queryKey: queryKeys.goals.all,
    parentKey: 'area_id',
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = goals.findIndex((g) => g.id === active.id)
      const newIndex = goals.findIndex((g) => g.id === over.id)

      handleReorder(active.id as string, oldIndex, newIndex)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={goals.map((g) => g.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {goals.map((goal) => (
            <SortableGoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
```

```typescript
// src/features/roadmap/components/sortable-goal-card.tsx
'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { GoalCard } from './goal-card'
import type { Goal } from '@/types/entities'

interface SortableGoalCardProps {
  goal: Goal
}

export function SortableGoalCard({ goal }: SortableGoalCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: goal.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute left-2 top-1/2 -translate-y-1/2 p-1 cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4 text-foreground-tertiary" />
      </button>

      {/* Card Content */}
      <div className="pl-8">
        <GoalCard goal={goal} />
      </div>
    </div>
  )
}
```

### 설치 필요 패키지

```bash
pnpm add fractional-indexing @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities use-debounce
```

---

## 7.16 Phase 관리 컴포넌트

Goal 내에서 Phase와 Task를 관리하기 위한 컴포넌트들입니다.

### CreatePhaseForm

```typescript
// src/features/roadmap/components/create-phase-form.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { useCreatePhase } from '@/queries/use-phases'

const createPhaseSchema = z.object({
  name: z.string().min(1, 'Phase 이름을 입력해주세요').max(100, '100자 이내로 입력해주세요'),
  why: z.string().max(500, '500자 이내로 입력해주세요').optional(),
})

type CreatePhaseSchema = z.infer<typeof createPhaseSchema>

interface CreatePhaseFormProps {
  goalId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function CreatePhaseForm({ goalId, onSuccess, onCancel }: CreatePhaseFormProps) {
  const createPhase = useCreatePhase()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreatePhaseSchema>({
    resolver: zodResolver(createPhaseSchema),
  })

  const nameValue = watch('name', '')

  const onSubmit = (data: CreatePhaseSchema) => {
    createPhase.mutate(
      { goal_id: goalId, ...data },
      { onSuccess: () => onSuccess?.() }
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Phase Name */}
      <div>
        <div className="flex justify-between mb-1">
          <label className="text-sm font-medium">Phase 이름</label>
          <span className="text-xs text-foreground-tertiary">
            {nameValue.length}/100
          </span>
        </div>
        <Input
          {...register('name')}
          placeholder="예: 기초 체력 만들기"
          error={errors.name?.message}
        />
      </div>

      {/* Why (Optional) */}
      <div>
        <label className="block text-sm font-medium mb-1">
          이 단계를 왜 먼저 해야 하나요? (선택)
        </label>
        <Textarea
          {...register('why')}
          placeholder="예: 기본기 없이 뛰면 부상 위험이 있어서"
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
            취소
          </Button>
        )}
        <Button
          type="submit"
          className="flex-1"
          isLoading={isSubmitting || createPhase.isPending}
        >
          Phase 추가
        </Button>
      </div>
    </form>
  )
}
```

### PhaseDetailSheet

```typescript
// src/features/roadmap/components/phase-detail-sheet.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Chip } from '@/components/ui/chip'
import { useUpdatePhase, useDeletePhase } from '@/queries/use-phases'
import { Edit2, Trash2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Phase } from '@/types/entities'

const updatePhaseSchema = z.object({
  name: z.string().min(1, 'Phase 이름을 입력해주세요').max(100),
  why: z.string().max(500).optional(),
})

type UpdatePhaseSchema = z.infer<typeof updatePhaseSchema>

interface PhaseDetailSheetProps {
  phase: Phase | null
  open: boolean
  onClose: () => void
}

export function PhaseDetailSheet({ phase, open, onClose }: PhaseDetailSheetProps) {
  const [isEditing, setIsEditing] = useState(false)
  const updatePhase = useUpdatePhase()
  const deletePhase = useDeletePhase()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdatePhaseSchema>({
    resolver: zodResolver(updatePhaseSchema),
    values: phase ? { name: phase.name, why: phase.why || '' } : undefined,
  })

  const handleClose = () => {
    setIsEditing(false)
    reset()
    onClose()
  }

  const handleStatusChange = (status: 'pending' | 'active' | 'completed') => {
    if (phase) {
      updatePhase.mutate(
        { id: phase.id, input: { status } },
        { onSuccess: () => toast.success('상태가 변경되었어요') }
      )
    }
  }

  const handleDelete = () => {
    if (phase && confirm('이 Phase를 삭제하시겠습니까? 연결된 Task들은 Goal에 직접 연결됩니다.')) {
      deletePhase.mutate(phase.id, {
        onSuccess: () => {
          toast.success('Phase가 삭제되었어요')
          handleClose()
        },
      })
    }
  }

  const onSubmit = (data: UpdatePhaseSchema) => {
    if (phase) {
      updatePhase.mutate(
        { id: phase.id, input: data },
        {
          onSuccess: () => {
            setIsEditing(false)
            toast.success('Phase가 수정되었어요')
          },
        }
      )
    }
  }

  if (!phase) return null

  return (
    <BottomSheet open={open} onClose={handleClose} title={isEditing ? 'Phase 수정' : phase.name}>
      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Phase 이름</label>
            <Input {...register('name')} error={errors.name?.message} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Why (선택)</label>
            <Textarea {...register('why')} rows={2} />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} className="flex-1">
              취소
            </Button>
            <Button type="submit" className="flex-1" isLoading={updatePhase.isPending}>
              저장
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 text-miss" />
            </Button>
          </div>

          {/* Why */}
          {phase.why && (
            <div>
              <h3 className="text-sm font-medium text-foreground-secondary mb-1">
                왜 이 단계를 먼저 해야 하나요?
              </h3>
              <p>{phase.why}</p>
            </div>
          )}

          {/* Status */}
          <div>
            <h3 className="text-sm font-medium text-foreground-secondary mb-2">상태</h3>
            <div className="flex gap-2">
              <Chip
                variant="selection"
                selected={phase.status === 'pending'}
                onClick={() => handleStatusChange('pending')}
              >
                대기
              </Chip>
              <Chip
                variant="selection"
                selected={phase.status === 'active'}
                onClick={() => handleStatusChange('active')}
              >
                진행 중
              </Chip>
              <Chip
                variant="selection"
                selected={phase.status === 'completed'}
                onClick={() => handleStatusChange('completed')}
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                완료
              </Chip>
            </div>
          </div>
        </div>
      )}
    </BottomSheet>
  )
}
```

### TaskWithinGoalForm

```typescript
// src/features/roadmap/components/task-within-goal-form.tsx
'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Chip } from '@/components/ui/chip'
import { useCreateTask } from '@/queries/use-tasks'
import type { Phase } from '@/types/entities'

const createTaskSchema = z.object({
  name: z.string().min(1, 'Task 이름을 입력해주세요').max(100),
  why: z.string().max(500).optional(),
  phase_id: z.string().optional(),
  repeat_type: z.enum(['daily', 'weekdays', 'weekly', 'custom']),
  duration_minutes: z.number().min(1).max(480).optional(),
})

type CreateTaskSchema = z.infer<typeof createTaskSchema>

interface TaskWithinGoalFormProps {
  goalId: string
  phases?: Phase[]
  defaultPhaseId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

const REPEAT_OPTIONS = [
  { value: 'daily' as const, label: '매일' },
  { value: 'weekdays' as const, label: '평일' },
  { value: 'weekly' as const, label: '매주' },
]

export function TaskWithinGoalForm({
  goalId,
  phases = [],
  defaultPhaseId,
  onSuccess,
  onCancel,
}: TaskWithinGoalFormProps) {
  const createTask = useCreateTask()

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateTaskSchema>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      phase_id: defaultPhaseId,
      repeat_type: 'daily',
    },
  })

  const nameValue = watch('name', '')

  const onSubmit = (data: CreateTaskSchema) => {
    createTask.mutate(
      { goal_id: goalId, ...data },
      { onSuccess: () => onSuccess?.() }
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Task Name */}
      <div>
        <div className="flex justify-between mb-1">
          <label className="text-sm font-medium">Task 이름</label>
          <span className="text-xs text-foreground-tertiary">
            {nameValue.length}/100
          </span>
        </div>
        <Input
          {...register('name')}
          placeholder="예: 30분 러닝"
          error={errors.name?.message}
        />
      </div>

      {/* Phase Selection (if phases exist) */}
      {phases.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-2">Phase (선택)</label>
          <Controller
            name="phase_id"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                <Chip
                  variant="selection"
                  selected={!field.value}
                  onClick={() => field.onChange(undefined)}
                >
                  없음
                </Chip>
                {phases.map((phase) => (
                  <Chip
                    key={phase.id}
                    variant="selection"
                    selected={field.value === phase.id}
                    onClick={() => field.onChange(phase.id)}
                  >
                    {phase.name}
                  </Chip>
                ))}
              </div>
            )}
          />
        </div>
      )}

      {/* Repeat Type */}
      <div>
        <label className="block text-sm font-medium mb-2">반복</label>
        <Controller
          name="repeat_type"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {REPEAT_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  variant="selection"
                  selected={field.value === option.value}
                  onClick={() => field.onChange(option.value)}
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          )}
        />
      </div>

      {/* Duration */}
      <div>
        <label className="block text-sm font-medium mb-1">
          예상 소요 시간 (분, 선택)
        </label>
        <Input
          type="number"
          {...register('duration_minutes', { valueAsNumber: true })}
          placeholder="30"
          min={1}
          max={480}
        />
      </div>

      {/* Why */}
      <div>
        <label className="block text-sm font-medium mb-1">
          이 행동이 왜 효과적인가요? (선택)
        </label>
        <Textarea
          {...register('why')}
          placeholder="예: 유산소 운동이 심폐 기능 향상에 도움"
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
            취소
          </Button>
        )}
        <Button
          type="submit"
          className="flex-1"
          isLoading={isSubmitting || createTask.isPending}
        >
          Task 추가
        </Button>
      </div>
    </form>
  )
}
```

---

## 7.17 Responsive Handling

모바일과 데스크톱에서 Goal 클릭 시 다르게 동작합니다.

### src/hooks/use-media-query.ts

```typescript
import { useState, useEffect } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    setMatches(media.matches)

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches)
    media.addEventListener('change', listener)

    return () => media.removeEventListener('change', listener)
  }, [query])

  return matches
}

// Preset hooks
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)')
export const useIsMobile = () => useMediaQuery('(max-width: 767px)')
```

### Goal 클릭 핸들링

```typescript
// src/features/roadmap/hooks/use-goal-navigation.ts
import { useRouter } from 'next/navigation'
import { useIsDesktop } from '@/hooks/use-media-query'
import { useRoadmapStore } from '@/stores/roadmap.store'

export function useGoalNavigation() {
  const router = useRouter()
  const isDesktop = useIsDesktop()
  const { setSelectedGoalId } = useRoadmapStore()

  const navigateToGoal = (goalId: string) => {
    if (isDesktop) {
      // 데스크톱: 우측 패널에 상세 표시
      setSelectedGoalId(goalId)
    } else {
      // 모바일: 별도 페이지로 이동
      router.push(`/roadmap/${goalId}`)
    }
  }

  return { navigateToGoal }
}
```

### 모바일 Goal 상세 페이지

```typescript
// src/app/(main)/roadmap/[goalId]/page.tsx
import { GoalDetailPage } from '@/features/roadmap/components/goal-detail-page'

interface Props {
  params: { goalId: string }
}

export default function GoalPage({ params }: Props) {
  return <GoalDetailPage goalId={params.goalId} />
}
```

```typescript
// src/features/roadmap/components/goal-detail-page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useGoal, useUpdateGoal, useDeleteGoal } from '@/queries/use-goals'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { PageContainer } from '@/components/layout/page-container'
import { ArrowLeft, Edit2, Trash2, Plus } from 'lucide-react'
import type { GoalStatus } from '@/types/entities'

interface GoalDetailPageProps {
  goalId: string
}

export function GoalDetailPage({ goalId }: GoalDetailPageProps) {
  const router = useRouter()
  const { data: goal, isLoading } = useGoal(goalId)
  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()

  if (isLoading) {
    return <GoalDetailSkeleton />
  }

  if (!goal) {
    return <GoalNotFound />
  }

  const handleStatusChange = (status: GoalStatus) => {
    updateGoal.mutate({ id: goal.id, input: { status } })
  }

  const handleDelete = () => {
    if (confirm('정말 이 목표를 삭제하시겠습니까?')) {
      deleteGoal.mutate(goal.id, {
        onSuccess: () => router.push('/roadmap'),
      })
    }
  }

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          {goal.area && (
            <Chip
              variant="area"
              emoji={goal.area.emoji}
              color={goal.area.color}
            >
              {goal.area.name}
            </Chip>
          )}
        </div>
        <Button variant="ghost" size="icon" aria-label="Edit">
          <Edit2 className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleDelete} aria-label="Delete">
          <Trash2 className="w-5 h-5 text-miss" />
        </Button>
      </div>

      {/* Goal Name */}
      <h1 className="text-2xl font-bold mb-2">{goal.name}</h1>

      {/* Deadline */}
      {goal.deadline && (
        <p className="text-sm text-foreground-secondary mb-6">
          기한: {new Date(goal.deadline).toLocaleDateString('ko-KR')}
        </p>
      )}

      {/* Why */}
      {goal.why && (
        <section className="mb-6">
          <h2 className="text-sm font-medium text-foreground-secondary mb-2">
            왜 이 목표가 중요한가요?
          </h2>
          <p className="text-foreground">{goal.why}</p>
        </section>
      )}

      {/* Vision */}
      {goal.vision && (
        <section className="mb-6">
          <h2 className="text-sm font-medium text-foreground-secondary mb-2">
            비전
          </h2>
          <p className="text-foreground">{goal.vision}</p>
        </section>
      )}

      {/* Status */}
      <section className="mb-6">
        <h2 className="text-sm font-medium text-foreground-secondary mb-2">
          상태
        </h2>
        <div className="flex flex-wrap gap-2">
          {(['active', 'backlog', 'paused', 'completed'] as GoalStatus[]).map((status) => (
            <Chip
              key={status}
              variant="selection"
              selected={goal.status === status}
              onClick={() => handleStatusChange(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Chip>
          ))}
        </div>
      </section>

      {/* Phases */}
      {goal.phases && goal.phases.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-foreground-secondary">
              Phases
            </h2>
            <Button variant="ghost" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              추가
            </Button>
          </div>
          <div className="space-y-2">
            {goal.phases.map((phase, index) => (
              <div
                key={phase.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-surface-secondary"
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    phase.status === 'completed'
                      ? 'bg-done text-white'
                      : phase.status === 'active'
                      ? 'bg-primary-500 text-white'
                      : 'bg-border text-foreground-tertiary'
                  }`}
                >
                  {index + 1}
                </div>
                <span className={phase.status === 'completed' ? 'line-through opacity-60' : ''}>
                  {phase.name}
                </span>
                {phase.status === 'active' && (
                  <span className="ml-auto text-xs text-primary-600 font-medium">현재</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tasks */}
      {goal.tasks && goal.tasks.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-foreground-secondary">
              Tasks ({goal.tasks.length})
            </h2>
            <Button variant="ghost" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              추가
            </Button>
          </div>
          <div className="space-y-2">
            {goal.tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 rounded-lg bg-surface-secondary"
              >
                <span>{task.name}</span>
                {task.streak_count > 0 && (
                  <span className="text-sm">🔥 {task.streak_count}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </PageContainer>
  )
}

function GoalDetailSkeleton() {
  return (
    <PageContainer>
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-1/2 bg-surface-tertiary rounded" />
        <div className="h-4 w-1/3 bg-surface-tertiary rounded" />
        <div className="h-24 bg-surface-tertiary rounded" />
      </div>
    </PageContainer>
  )
}

function GoalNotFound() {
  const router = useRouter()

  return (
    <PageContainer>
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h2 className="text-lg font-semibold mb-2">목표를 찾을 수 없어요</h2>
        <p className="text-foreground-secondary mb-4">
          삭제되었거나 존재하지 않는 목표입니다
        </p>
        <Button onClick={() => router.push('/roadmap')}>
          로드맵으로 돌아가기
        </Button>
      </div>
    </PageContainer>
  )
}
```

### 데스크톱 레이아웃 (우측 패널)

```typescript
// src/app/(main)/roadmap/layout.tsx
'use client'

import { useIsDesktop } from '@/hooks/use-media-query'
import { useRoadmapStore } from '@/stores/roadmap.store'
import { GoalDetailSheet } from '@/features/roadmap/components/goal-detail-sheet'
import { GoalDetailPanel } from '@/features/roadmap/components/goal-detail-panel'

interface RoadmapLayoutProps {
  children: React.ReactNode
}

export default function RoadmapLayout({ children }: RoadmapLayoutProps) {
  const isDesktop = useIsDesktop()
  const { selectedGoalId } = useRoadmapStore()

  if (isDesktop) {
    return (
      <div className="flex h-full">
        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>

        {/* Side Panel */}
        {selectedGoalId && (
          <div className="w-[400px] border-l border-border overflow-auto">
            <GoalDetailPanel goalId={selectedGoalId} />
          </div>
        )}
      </div>
    )
  }

  // 모바일: 바텀시트 사용
  return (
    <>
      {children}
      <GoalDetailSheet />
    </>
  )
}
```

---

## 7.18 에러 처리 및 롤백

Phase 6 Today처럼 모든 mutation에 대해 상세한 에러 처리와 낙관적 업데이트를 적용합니다.

### 에러 처리 패턴

```typescript
// src/queries/use-goals.ts (보강)
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query/keys'
import type { Goal, UpdateGoalInput } from '@/types/entities'

export function useUpdateGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateGoalInput }) => {
      const res = await fetch(`/api/goals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error('Failed to update goal')
      return res.json()
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Optimistic Update
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    onMutate: async ({ id, input }) => {
      // 진행 중인 쿼리 취소
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.all })
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.detail(id) })

      // 이전 값 저장 (롤백용)
      const previousGoals = queryClient.getQueryData<Goal[]>(queryKeys.goals.all)
      const previousGoal = queryClient.getQueryData<Goal>(queryKeys.goals.detail(id))

      // 캐시 즉시 업데이트
      if (previousGoals) {
        queryClient.setQueryData<Goal[]>(
          queryKeys.goals.all,
          previousGoals.map((g) => (g.id === id ? { ...g, ...input } : g))
        )
      }

      if (previousGoal) {
        queryClient.setQueryData<Goal>(queryKeys.goals.detail(id), {
          ...previousGoal,
          ...input,
        })
      }

      return { previousGoals, previousGoal }
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Error - 롤백
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    onError: (error, { id }, context) => {
      // 이전 값으로 롤백
      if (context?.previousGoals) {
        queryClient.setQueryData(queryKeys.goals.all, context.previousGoals)
      }
      if (context?.previousGoal) {
        queryClient.setQueryData(queryKeys.goals.detail(id), context.previousGoal)
      }

      // 에러 토스트
      toast.error('목표 수정에 실패했어요', {
        description: '잠시 후 다시 시도해주세요',
        action: {
          label: '재시도',
          onClick: () => {
            // 재시도 로직
          },
        },
      })
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Success
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    onSuccess: () => {
      toast.success('목표가 수정되었어요')
    },

    // 항상 서버와 동기화
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.detail(id) })
    },
  })
}

export function useDeleteGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/goals/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete goal')
      return res.json()
    },

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.all })

      const previousGoals = queryClient.getQueryData<Goal[]>(queryKeys.goals.all)

      if (previousGoals) {
        queryClient.setQueryData<Goal[]>(
          queryKeys.goals.all,
          previousGoals.filter((g) => g.id !== id)
        )
      }

      return { previousGoals }
    },

    onError: (error, id, context) => {
      if (context?.previousGoals) {
        queryClient.setQueryData(queryKeys.goals.all, context.previousGoals)
      }

      toast.error('목표 삭제에 실패했어요', {
        description: '잠시 후 다시 시도해주세요',
      })
    },

    onSuccess: () => {
      toast.success('목표가 삭제되었어요')
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
    },
  })
}
```

### 삭제 확인 대화상자

```typescript
// src/features/roadmap/components/delete-goal-dialog.tsx
'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface DeleteGoalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  goalName: string
  isLoading?: boolean
}

export function DeleteGoalDialog({
  open,
  onOpenChange,
  onConfirm,
  goalName,
  isLoading,
}: DeleteGoalDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>"{goalName}"</strong> 목표와 관련된 모든 Phase, Task가 함께 삭제됩니다.
            이 작업은 되돌릴 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-miss hover:bg-miss/90"
          >
            {isLoading ? '삭제 중...' : '삭제'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

### 에러 시 카드 흔들림 애니메이션

```typescript
// src/features/roadmap/components/goal-card.tsx (보강)
import { motion } from 'framer-motion'

const shakeAnimation = {
  shake: {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.4 },
  },
}

export function GoalCard({ goal, hasError }: GoalCardProps) {
  return (
    <motion.div
      variants={shakeAnimation}
      animate={hasError ? 'shake' : undefined}
    >
      <Card>{/* ... */}</Card>
    </motion.div>
  )
}
```

---

## 7.19 접근성 (A11y)

Phase 5, 6과 일관된 접근성 패턴을 적용합니다.

### TreeView 키보드 네비게이션

```typescript
// src/features/roadmap/hooks/use-tree-keyboard-nav.ts
import { useCallback, useRef } from 'react'

interface TreeNode {
  id: string
  isExpanded?: boolean
  children?: TreeNode[]
}

export function useTreeKeyboardNav(
  nodes: TreeNode[],
  onToggle: (id: string) => void,
  onSelect: (id: string) => void
) {
  const focusedIdRef = useRef<string | null>(null)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, nodeId: string, isExpanded: boolean, hasChildren: boolean) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          // 이전 노드로 포커스 이동
          moveFocusToPrevious(nodeId)
          break

        case 'ArrowDown':
          e.preventDefault()
          // 다음 노드로 포커스 이동
          moveFocusToNext(nodeId)
          break

        case 'ArrowRight':
          e.preventDefault()
          if (hasChildren && !isExpanded) {
            // 펼치기
            onToggle(nodeId)
          } else if (hasChildren && isExpanded) {
            // 첫 자식으로 이동
            moveFocusToFirstChild(nodeId)
          }
          break

        case 'ArrowLeft':
          e.preventDefault()
          if (hasChildren && isExpanded) {
            // 접기
            onToggle(nodeId)
          } else {
            // 부모로 이동
            moveFocusToParent(nodeId)
          }
          break

        case 'Enter':
        case ' ':
          e.preventDefault()
          onSelect(nodeId)
          break

        case 'Home':
          e.preventDefault()
          // 첫 노드로 이동
          moveFocusToFirst()
          break

        case 'End':
          e.preventDefault()
          // 마지막 노드로 이동
          moveFocusToLast()
          break
      }
    },
    [onToggle, onSelect]
  )

  // 포커스 이동 헬퍼 함수들...
  const moveFocusToPrevious = (currentId: string) => {
    /* ... */
  }
  const moveFocusToNext = (currentId: string) => {
    /* ... */
  }
  const moveFocusToFirstChild = (currentId: string) => {
    /* ... */
  }
  const moveFocusToParent = (currentId: string) => {
    /* ... */
  }
  const moveFocusToFirst = () => {
    /* ... */
  }
  const moveFocusToLast = () => {
    /* ... */
  }

  return { handleKeyDown, focusedIdRef }
}
```

### GoalCard ARIA 속성

```typescript
// src/features/roadmap/components/goal-card.tsx (보강)
export function GoalCard({ goal }: GoalCardProps) {
  const labelId = `goal-${goal.id}-label`
  const descriptionId = `goal-${goal.id}-desc`

  return (
    <Card
      role="article"
      aria-labelledby={labelId}
      aria-describedby={goal.why ? descriptionId : undefined}
      tabIndex={0}
    >
      {/* Area Tag */}
      {goal.area && (
        <Chip aria-label={`영역: ${goal.area.name}`}>
          {goal.area.emoji} {goal.area.name}
        </Chip>
      )}

      {/* Goal Name */}
      <h3 id={labelId} className="font-semibold text-lg mb-1">
        {goal.name}
      </h3>

      {/* Why */}
      {goal.why && (
        <p id={descriptionId} className="text-sm text-foreground-secondary">
          {goal.why}
        </p>
      )}

      {/* Phase Progress - 스크린 리더 친화적 */}
      {totalPhases > 0 && (
        <div aria-label={`${totalPhases}개 Phase 중 ${completedPhases}개 완료`}>
          <PhaseIndicator
            total={totalPhases}
            current={currentPhaseIndex}
            completed={completedPhases}
          />
        </div>
      )}

      {/* Status Badge */}
      <span
        role="status"
        aria-label={`상태: ${goal.status}`}
        className={/* ... */}
      >
        {goal.status}
      </span>
    </Card>
  )
}
```

### 스크린 리더 라이브 리전

```typescript
// src/features/roadmap/components/roadmap-announcer.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRoadmapStore } from '@/stores/roadmap.store'

export function RoadmapAnnouncer() {
  const [announcement, setAnnouncement] = useState('')
  const { viewMode, statusFilter, areaFilter } = useRoadmapStore()

  useEffect(() => {
    // 뷰 모드 변경 시 알림
    const viewModeNames = {
      card: '카드 뷰',
      tree: '트리 뷰',
      list: '리스트 뷰',
    }
    setAnnouncement(`${viewModeNames[viewMode]}로 전환되었습니다`)
  }, [viewMode])

  useEffect(() => {
    // 필터 변경 시 알림
    if (statusFilter === 'all') {
      setAnnouncement('모든 목표를 표시합니다')
    } else {
      setAnnouncement(`${statusFilter} 상태의 목표만 표시합니다`)
    }
  }, [statusFilter])

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  )
}
```

### useFocusManagement 훅

```typescript
// src/hooks/use-focus-management.ts
import { useRef, useCallback } from 'react'

export function useFocusManagement() {
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // 모달/시트 열 때 포커스 저장
  const saveFocus = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement
  }, [])

  // 모달/시트 닫을 때 포커스 복원
  const restoreFocus = useCallback(() => {
    if (previousFocusRef.current) {
      previousFocusRef.current.focus()
      previousFocusRef.current = null
    }
  }, [])

  // 특정 요소로 포커스 이동
  const focusElement = useCallback((selector: string) => {
    const element = document.querySelector<HTMLElement>(selector)
    element?.focus()
  }, [])

  return { saveFocus, restoreFocus, focusElement }
}
```

---

## 7.20 애니메이션 명세

Phase 6의 애니메이션 패턴을 적용합니다.

### ANIMATION_CONFIG

```typescript
// src/features/roadmap/constants/animation.ts
export const ANIMATION_CONFIG = {
  // Goal 카드
  card: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.2 },
  },

  // 상태 변경 (Active → Completed 등)
  statusChange: {
    scale: [1, 1.02, 1],
    transition: { duration: 0.3 },
  },

  // Phase 진행 인디케이터
  phaseProgress: {
    initial: { scaleX: 0 },
    animate: { scaleX: 1 },
    transition: { duration: 0.5, ease: 'easeOut' },
  },

  // TreeView 펼침/접힘
  treeExpand: {
    initial: { height: 0, opacity: 0 },
    animate: { height: 'auto', opacity: 1 },
    exit: { height: 0, opacity: 0 },
    transition: { duration: 0.2 },
  },

  // DnD 드래그
  drag: {
    dragging: {
      scale: 1.02,
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      zIndex: 50,
    },
    transition: { duration: 0.15 },
  },

  // 에러 시 흔들림
  shake: {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.4 },
  },

  // 스트릭 배지
  streak: {
    initial: { scale: 0.8 },
    animate: { scale: 1 },
    transition: { type: 'spring', stiffness: 500, damping: 15 },
  },
} as const
```

### useReducedMotion 훅

```typescript
// src/hooks/use-reduced-motion.ts
import { useState, useEffect } from 'react'

export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReduced(mediaQuery.matches)

    const listener = (e: MediaQueryListEvent) => setPrefersReduced(e.matches)
    mediaQuery.addEventListener('change', listener)

    return () => mediaQuery.removeEventListener('change', listener)
  }, [])

  return prefersReduced
}
```

### 애니메이션 적용 예시

```typescript
// src/features/roadmap/components/goal-card.tsx (애니메이션 적용)
'use client'

import { motion } from 'framer-motion'
import { ANIMATION_CONFIG } from '../constants/animation'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

export function GoalCard({ goal }: GoalCardProps) {
  const prefersReducedMotion = useReducedMotion()

  const cardVariants = prefersReducedMotion
    ? {} // 모션 비활성화 시 애니메이션 없음
    : ANIMATION_CONFIG.card

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover={prefersReducedMotion ? {} : { y: -2 }}
      layout
    >
      <Card>{/* ... */}</Card>
    </motion.div>
  )
}
```

### DnD 드래그 피드백

```typescript
// src/features/roadmap/components/sortable-goal-card.tsx (애니메이션 보강)
import { motion } from 'framer-motion'
import { ANIMATION_CONFIG } from '../constants/animation'

export function SortableGoalCard({ goal }: SortableGoalCardProps) {
  const { isDragging, ... } = useSortable({ id: goal.id })
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      animate={
        isDragging && !prefersReducedMotion
          ? ANIMATION_CONFIG.drag.dragging
          : {}
      }
      transition={ANIMATION_CONFIG.drag.transition}
    >
      {/* Drag Handle */}
      <button className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4" />
      </button>

      <GoalCard goal={goal} />
    </motion.div>
  )
}
```

---

## 7.21 에지 케이스 처리

| 케이스               | UI 처리                            | 컴포넌트              |
| -------------------- | ---------------------------------- | --------------------- |
| Goal 0개             | EmptyGoals 표시                    | `empty-goals.tsx`     |
| Area 0개             | "영역부터 추가하세요" 안내         | `no-areas-prompt.tsx` |
| 긴 Goal 이름 (50자+) | 말줄임표 + 툴팁                    | GoalCard              |
| 긴 Why 텍스트        | 2줄 말줄임 + 상세에서 전체 보기    | GoalCard              |
| Phase 0개인 Goal     | Phase 섹션 숨김, Task만 표시       | GoalDetailSheet       |
| Task 0개인 Goal      | "Task를 추가해보세요" 안내         | GoalDetailSheet       |
| 네트워크 오류        | 토스트 + 재시도 버튼               | useGoals              |
| 삭제 확인            | confirm 대화상자                   | DeleteGoalDialog      |
| 동시 수정 충돌       | 서버 값으로 리프레시 + 토스트 알림 | useGoals              |
| 오프라인 상태        | 읽기 전용 모드 + 배너              | RoadmapPage           |

### Area 0개 상태 안내

```typescript
// src/features/roadmap/components/no-areas-prompt.tsx
'use client'

import { FolderPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export function NoAreasPrompt() {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-surface-secondary flex items-center justify-center mb-6">
        <FolderPlus className="w-8 h-8 text-foreground-tertiary" />
      </div>

      <h3 className="text-lg font-semibold mb-2">먼저 영역을 만들어주세요</h3>
      <p className="text-foreground-secondary mb-6 max-w-xs">
        목표는 영역(건강, 커리어 등) 안에 속해요.
        <br />
        온보딩에서 영역을 설정하거나 직접 추가할 수 있어요.
      </p>

      <Button onClick={() => router.push('/onboarding/areas')}>
        영역 설정하러 가기
      </Button>
    </div>
  )
}
```

### 긴 텍스트 처리

```typescript
// src/features/roadmap/components/goal-card.tsx
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function GoalCard({ goal }: GoalCardProps) {
  const isLongName = goal.name.length > 50

  return (
    <Card>
      {isLongName ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <h3 className="font-semibold text-lg mb-1 truncate">
              {goal.name}
            </h3>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            {goal.name}
          </TooltipContent>
        </Tooltip>
      ) : (
        <h3 className="font-semibold text-lg mb-1">{goal.name}</h3>
      )}

      {goal.why && (
        <p className="text-sm text-foreground-secondary line-clamp-2">
          {goal.why}
        </p>
      )}
    </Card>
  )
}
```

---

## 7.22 성능 최적화

### Goal 목록 가상화 (50개+ Goal)

```typescript
// src/features/roadmap/components/virtualized-goal-list.tsx
'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
import { GoalCard } from './goal-card'
import type { Goal } from '@/types/entities'

interface VirtualizedGoalListProps {
  goals: Goal[]
}

export function VirtualizedGoalList({ goals }: VirtualizedGoalListProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: goals.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 180, // 예상 카드 높이
    overscan: 5, // 뷰포트 밖에 미리 렌더링할 아이템 수
  })

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <GoalCard goal={goals[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

### GoalCard memo 적용

```typescript
// src/features/roadmap/components/goal-card.tsx
import { memo } from 'react'

function GoalCardComponent({ goal }: GoalCardProps) {
  // ...컴포넌트 내용
}

export const GoalCard = memo(GoalCardComponent, (prev, next) => {
  // 커스텀 비교 함수
  return (
    prev.goal.id === next.goal.id &&
    prev.goal.name === next.goal.name &&
    prev.goal.status === next.goal.status &&
    prev.goal.updated_at === next.goal.updated_at
  )
})
```

### TreeView 노드 memo 적용

```typescript
// src/features/roadmap/components/tree-view.tsx
import { memo } from 'react'

const AreaTreeNodeComponent = ({ area, goals }: AreaTreeNodeProps) => {
  // ...컴포넌트 내용
}

export const AreaTreeNode = memo(AreaTreeNodeComponent)

const GoalTreeNodeComponent = ({ goal }: GoalTreeNodeProps) => {
  // ...컴포넌트 내용
}

export const GoalTreeNode = memo(GoalTreeNodeComponent)
```

### GPU 가속 애니메이션

```css
/* src/features/roadmap/styles/animations.css */
.goal-card {
  /* GPU 가속을 위해 transform 사용 */
  will-change: transform, opacity;
  transform: translateZ(0);
}

.goal-card-dragging {
  /* 드래그 중 GPU 레이어 생성 */
  transform: translate3d(0, 0, 0) scale(1.02);
}

.tree-expand {
  /* height 애니메이션 대신 transform 사용 */
  transform-origin: top;
}
```

### 설치 필요 패키지

```bash
pnpm add @tanstack/react-virtual
```

---

## 7.23 테스트 요구사항

Phase 5, 6과 일관된 테스트 구조를 적용합니다.

### 유닛 테스트

```typescript
// src/stores/__tests__/roadmap.store.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useRoadmapStore } from '../roadmap.store'

describe('useRoadmapStore', () => {
  beforeEach(() => {
    // 스토어 초기화
    useRoadmapStore.setState({
      viewMode: 'card',
      statusFilter: 'active',
      areaFilter: null,
      selectedGoalId: null,
    })
  })

  it('초기 상태가 올바르다', () => {
    const state = useRoadmapStore.getState()
    expect(state.viewMode).toBe('card')
    expect(state.statusFilter).toBe('active')
  })

  it('viewMode를 변경할 수 있다', () => {
    const { setViewMode } = useRoadmapStore.getState()
    setViewMode('tree')
    expect(useRoadmapStore.getState().viewMode).toBe('tree')
  })

  it('statusFilter를 변경할 수 있다', () => {
    const { setStatusFilter } = useRoadmapStore.getState()
    setStatusFilter('backlog')
    expect(useRoadmapStore.getState().statusFilter).toBe('backlog')
  })

  it('areaFilter를 토글할 수 있다', () => {
    const { setAreaFilter } = useRoadmapStore.getState()
    setAreaFilter('area-1')
    expect(useRoadmapStore.getState().areaFilter).toBe('area-1')
    setAreaFilter(null)
    expect(useRoadmapStore.getState().areaFilter).toBeNull()
  })
})
```

```typescript
// src/lib/__tests__/fractional-index.test.ts
import { describe, it, expect } from 'vitest'
import { getNewOrderBetween, getNewOrder, getInitialOrder } from '../fractional-index'

describe('fractional-index', () => {
  describe('getNewOrderBetween', () => {
    it('두 값 사이에 새 order를 생성한다', () => {
      const result = getNewOrderBetween('a', 'b')
      expect(result > 'a').toBe(true)
      expect(result < 'b').toBe(true)
    })

    it('맨 앞에 order를 생성한다', () => {
      const result = getNewOrderBetween(null, 'a')
      expect(result < 'a').toBe(true)
    })

    it('맨 뒤에 order를 생성한다', () => {
      const result = getNewOrderBetween('z', null)
      expect(result > 'z').toBe(true)
    })
  })

  describe('getNewOrder', () => {
    const items = [
      { id: '1', order: 'a' },
      { id: '2', order: 'b' },
      { id: '3', order: 'c' },
    ]

    it('아이템을 다른 위치로 이동한다', () => {
      const newOrder = getNewOrder(items, 0, 2)
      expect(newOrder > 'b').toBe(true)
      expect(newOrder < 'c').toBe(true)
    })
  })

  describe('getInitialOrder', () => {
    it('빈 배열에서 첫 order를 생성한다', () => {
      const result = getInitialOrder([])
      expect(result).toBe('a')
    })

    it('기존 아이템 뒤에 order를 생성한다', () => {
      const items = [{ id: '1', order: 'a' }]
      const result = getInitialOrder(items)
      expect(result > 'a').toBe(true)
    })
  })
})
```

### 통합 테스트

```typescript
// src/features/roadmap/components/__tests__/goal-card.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GoalCard } from '../goal-card'

const mockGoal = {
  id: 'goal-1',
  name: '10km 달리기 완주',
  status: 'active' as const,
  why: '체력 향상을 위해',
  area: {
    id: 'area-1',
    name: '건강',
    emoji: '💪',
    color: '#22c55e',
  },
  phases: [
    { id: 'phase-1', name: 'Phase 1', status: 'completed' },
    { id: 'phase-2', name: 'Phase 2', status: 'active' },
  ],
  tasks: [],
}

describe('GoalCard', () => {
  it('Goal 정보를 렌더링한다', () => {
    render(<GoalCard goal={mockGoal} />)

    expect(screen.getByText('10km 달리기 완주')).toBeInTheDocument()
    expect(screen.getByText('체력 향상을 위해')).toBeInTheDocument()
    expect(screen.getByText('건강')).toBeInTheDocument()
  })

  it('ARIA 속성이 올바르다', () => {
    render(<GoalCard goal={mockGoal} />)

    const card = screen.getByRole('article')
    expect(card).toHaveAttribute('aria-labelledby')
  })

  it('클릭 시 상세 시트가 열린다', async () => {
    const user = userEvent.setup()
    render(<GoalCard goal={mockGoal} />)

    const card = screen.getByRole('article')
    await user.click(card)

    // selectedGoalId가 설정되었는지 확인
    // (Zustand 스토어 모킹 필요)
  })
})
```

```typescript
// src/features/roadmap/components/__tests__/tree-view.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TreeView } from '../tree-view'

const mockAreas = [
  { id: 'area-1', name: '건강', emoji: '💪', color: '#22c55e' },
]

const mockGoals = [
  {
    id: 'goal-1',
    name: '10km 달리기',
    status: 'active',
    area_id: 'area-1',
    phases: [
      { id: 'phase-1', name: 'Phase 1', status: 'active' },
    ],
  },
]

describe('TreeView', () => {
  it('Area와 Goal을 계층 구조로 렌더링한다', () => {
    render(<TreeView goals={mockGoals} areas={mockAreas} />)

    expect(screen.getByText('건강')).toBeInTheDocument()
    expect(screen.getByText('10km 달리기')).toBeInTheDocument()
  })

  it('펼침/접힘이 동작한다', async () => {
    const user = userEvent.setup()
    render(<TreeView goals={mockGoals} areas={mockAreas} />)

    // Area 헤더 클릭하여 접기
    const areaHeader = screen.getByRole('button', { name: /건강/i })
    await user.click(areaHeader)

    // Goal이 숨겨졌는지 확인
    expect(screen.queryByText('10km 달리기')).not.toBeVisible()
  })

  it('키보드 네비게이션이 동작한다', async () => {
    const user = userEvent.setup()
    render(<TreeView goals={mockGoals} areas={mockAreas} />)

    const areaHeader = screen.getByRole('button', { name: /건강/i })
    areaHeader.focus()

    // ArrowDown으로 다음 노드로 이동
    await user.keyboard('{ArrowDown}')

    // Goal에 포커스가 이동했는지 확인
  })
})
```

```typescript
// src/features/roadmap/components/__tests__/create-goal-form.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateGoalForm } from '../create-goal-form'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('CreateGoalForm', () => {
  it('필수 필드 없이 제출하면 에러가 표시된다', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()

    render(<CreateGoalForm onSuccess={onSuccess} />, { wrapper })

    const submitButton = screen.getByRole('button', { name: /create goal/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/area/i)).toBeInTheDocument()
    })

    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('유효한 데이터로 제출하면 성공한다', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()

    render(<CreateGoalForm onSuccess={onSuccess} />, { wrapper })

    // Area 선택
    await user.click(screen.getByText('건강'))

    // Goal 이름 입력
    await user.type(screen.getByLabelText(/goal name/i), '10km 달리기')

    // 제출
    const submitButton = screen.getByRole('button', { name: /create goal/i })
    await user.click(submitButton)

    // onSuccess 호출 확인
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
  })
})
```

### E2E 테스트

```typescript
// e2e/roadmap.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Roadmap Screen', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인 및 테스트 데이터 설정
    await page.goto('/roadmap')
  })

  test('Goal CRUD 전체 플로우', async ({ page }) => {
    // 1. Goal 생성
    await page.click('[aria-label="새 목표 추가"]')
    await page.click('text=건강')
    await page.fill('[name="name"]', 'E2E 테스트 Goal')
    await page.click('button:has-text("Create Goal")')

    // 생성 확인
    await expect(page.locator('text=E2E 테스트 Goal')).toBeVisible()

    // 2. Goal 상세 보기
    await page.click('text=E2E 테스트 Goal')
    await expect(page.locator('[role="dialog"]')).toBeVisible()

    // 3. Goal 수정
    await page.click('[aria-label="Edit"]')
    await page.fill('[name="name"]', 'E2E 테스트 Goal (수정됨)')
    await page.click('button:has-text("저장")')

    // 수정 확인
    await expect(page.locator('text=E2E 테스트 Goal (수정됨)')).toBeVisible()

    // 4. Goal 삭제
    await page.click('[aria-label="Delete"]')
    await page.click('button:has-text("삭제")')

    // 삭제 확인
    await expect(page.locator('text=E2E 테스트 Goal (수정됨)')).not.toBeVisible()
  })

  test('Tree 뷰 펼침/접힘', async ({ page }) => {
    // Tree 뷰로 전환
    await page.click('[aria-label="트리"]')

    // Area 헤더 클릭하여 접기
    const areaHeader = page.locator('button:has-text("건강")')
    await areaHeader.click()

    // Goal이 숨겨졌는지 확인
    await expect(page.locator('.goal-tree-node')).not.toBeVisible()

    // 다시 펼치기
    await areaHeader.click()
    await expect(page.locator('.goal-tree-node')).toBeVisible()
  })

  test('DnD 재정렬', async ({ page }) => {
    // 드래그 핸들 찾기
    const dragHandle = page.locator('[aria-label="Drag to reorder"]').first()
    const targetCard = page.locator('.goal-card').nth(2)

    // 드래그 앤 드롭
    await dragHandle.dragTo(targetCard)

    // 순서 변경 확인 (토스트 메시지 또는 순서 검증)
    await expect(page.locator('text=이동됨')).toBeVisible()
  })
})
```

---

## 🤖 AI Testing Verification

Phase 완료 후 Claude가 Playwright MCP로 직접 검증합니다:

```
1. pnpm dev 실행
2. browser_navigate("http://localhost:3000/roadmap")
3. Roadmap 화면 전체 테스트

검증 항목:
- [ ] DirectionCard 인생 방향 표시 확인
- [ ] ViewToggle (Card/Tree/List) 전환 테스트
- [ ] GoalFilters Area 필터 동작
- [ ] GoalFilters Status 필터 (Active/Paused/Completed)
- [ ] GoalCard 렌더링 (Area Chip, Phase 진행률)
- [ ] GoalCard 클릭 → GoalDetailSheet 열림
- [ ] EmptyGoals 상태 (목표 없을 때)
- [ ] AddGoalButton FAB 클릭 → 목표 추가 폼

뷰 모드 테스트:
1. Card 뷰 → 카드 그리드 확인
2. Tree 뷰 클릭 → 계층 구조 확인
3. List 뷰 클릭 → 리스트 형태 확인

Goal CRUD 플로우:
1. "+" 버튼 → 목표 생성 폼
2. 목표 입력 → 저장
3. GoalCard 클릭 → 상세 시트
4. "Edit" → 수정 → 저장
```

---

## ✅ Completion Checklist

### 기본 컴포넌트

- [x] Roadmap page structure (7.1)
- [x] Roadmap store (view mode, filters) (7.2)
- [x] RoadmapHeader (7.3)
- [ ] ViewToggle (7.4) ⚠️ 리스트 뷰만 구현됨
- [x] DirectionCard (7.5)
- [x] GoalFilters (7.6)
- [x] GoalCard (7.7)
- [x] GoalList with grouping (7.8)
- [ ] TreeView (7.9) ⚠️ 미구현
- [x] EmptyGoals (7.10)
- [x] AddGoalButton FAB (7.11)
- [x] GoalListSkeleton (7.12)
- [x] GoalDetailSheet (7.13)
- [x] CreateGoalForm (7.14)

### Tree Reorder (7.15)

- [ ] Fractional Indexing 유틸리티 ⚠️ 미구현
- [ ] useTreeReorder hook ⚠️ 미구현
- [ ] moveNode Server Action ⚠️ 미구현
- [ ] DnD 컴포넌트 (SortableGoalList, SortableGoalCard) ⚠️ 미구현
- [ ] Debounce 적용 (300ms)

### Phase 관리 컴포넌트 (7.16)

- [x] CreatePhaseForm
- [ ] PhaseDetailSheet ⚠️ 미구현
- [ ] TaskWithinGoalForm ⚠️ 미구현

### Responsive Handling (7.17)

- [x] useMediaQuery hook
- [x] useGoalNavigation hook
- [x] Mobile Goal Detail Page
- [x] Desktop Side Panel Layout

### 에러 처리 및 롤백 (7.18)

- [x] useCreateGoal 에러 처리 + 토스트
- [x] useUpdateGoal 낙관적 업데이트 + 롤백
- [x] useDeleteGoal 확인 대화상자 + 롤백
- [x] DeleteGoalDialog 컴포넌트
- [x] 에러 시 카드 흔들림 애니메이션

### 접근성 (7.19)

- [ ] TreeView 키보드 네비게이션 (Arrow keys) ⚠️ TreeView 미구현
- [x] GoalCard ARIA 속성 (role, aria-labelledby)
- [x] 스크린 리더 라이브 리전 (RoadmapAnnouncer)
- [x] useFocusManagement 훅

### 애니메이션 (7.20)

- [x] ANIMATION_CONFIG 상수
- [x] useReducedMotion 훅 적용
- [x] GoalCard 애니메이션
- [ ] DnD 드래그 피드백 ⚠️ DnD 미구현

### 에지 케이스 (7.21)

- [x] Area 0개 상태 안내 (NoAreasPrompt)
- [x] 긴 Goal 이름 말줄임표 + 툴팁
- [x] 긴 Why 텍스트 2줄 말줄임
- [x] 네트워크 오류 재시도

### 성능 최적화 (7.22)

- [ ] Goal 목록 가상화 (50개+ - VirtualizedGoalList)
- [x] GoalCard memo 적용
- [ ] TreeView 노드 memo 적용 ⚠️ TreeView 미구현
- [x] GPU 가속 애니메이션

### 테스트 (7.23)

- [ ] roadmap.store.test.ts
- [ ] fractional-index.test.ts
- [ ] goal-card.test.tsx
- [ ] tree-view.test.tsx
- [ ] create-goal-form.test.tsx
- [ ] E2E: Goal CRUD 플로우
- [ ] E2E: Tree 뷰 펼침/접힘
- [ ] E2E: DnD 재정렬

### 기타

- [x] Goal CRUD operations
- [x] Phase management
- [ ] Task management within goals ⚠️ TaskWithinGoalForm 미구현

---

## 🔗 Navigation

← [Phase 6: Today Screen](./phase-6-today.md)
→ [Phase 8: Calendar Screen](./phase-8-calendar.md)

---

_Version: 1.0 | Last Updated: 2026-02-03_
