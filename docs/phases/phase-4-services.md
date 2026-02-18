# Phase 4: Types, Schemas & Query Hooks

> **Goal**: TypeScript 엔티티 타입, Zod 스키마, Query Keys, TanStack Query Hooks 정의
>
> **Note**: 이 Phase에서는 **타입과 클라이언트 측 hooks만** 정의합니다.
> 실제 데이터 접근(Repositories)과 Server Actions는 **Phase 4.5**에서 구현합니다.

---

## 📚 Reference Documents

- `docs/plan/core/data-model.md`
- `docs/code-architecture.md` (Services, Queries sections)

---

## 데이터 흐름 (Architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│                        Phase 4 (이 문서)                         │
│  ┌──────────────────┐    ┌──────────────────────────────────┐  │
│  │   Types (4.1)    │    │   Zod Schemas (4.2)              │  │
│  │  entities.ts     │    │   validations/*.ts               │  │
│  └──────────────────┘    └──────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────┐    ┌──────────────────────────────────┐  │
│  │ Query Keys (4.3) │    │   Query Hooks (4.4-4.12)         │  │
│  │   keys.ts        │    │   use-*.ts                       │  │
│  └──────────────────┘    └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ queryFn에서 호출
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Phase 4.5 (다음 문서)                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Server Actions                         │  │
│  │  (src/actions/*.ts)                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Repositories                           │  │
│  │  (src/repositories/*.ts)                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      Supabase                             │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**핵심**: Phase 4의 hooks는 Phase 4.5의 Server Actions를 호출합니다.
클라이언트에서 직접 Supabase를 호출하지 않습니다.

---

## 4.1 TypeScript Entity Types

### src/types/entities.ts

```typescript
// ============================================
// Base Types
// ============================================
export interface BaseEntity {
  id: string
  created_at: string
  updated_at: string
}

// ============================================
// Enums (matching database)
// ============================================
export type AreaType =
  | 'health'
  | 'career'
  | 'finance'
  | 'relationships'
  | 'hobbies'
  | 'mental'
  | 'learning'
  | 'daily'
  | 'custom'

export type GoalStatus = 'active' | 'backlog' | 'completed' | 'maintenance' | 'paused' | 'archived'

export type PhaseStatus = 'pending' | 'active' | 'completed'

export type RepeatType = 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom'

export type TimeSlot =
  | 'early_morning' // 5-7
  | 'morning' // 7-9
  | 'late_morning' // 9-12
  | 'afternoon' // 12-18
  | 'evening' // 18-21
  | 'night' // 21-24
  | 'anytime'

export type CheckInStatus = 'done' | 'skip' | 'miss'

export type MoodLevel = 'terrible' | 'bad' | 'neutral' | 'good' | 'great'

export type MessageType = 'celebration' | 'encouragement' | 'insight' | 'suggestion' | 'reminder'

// ============================================
// Entities
// ============================================
export interface Profile extends BaseEntity {
  email: string
  name: string | null
  avatar_url: string | null
  timezone: string
  onboarding_completed: boolean
}

export interface Direction extends BaseEntity {
  user_id: string
  statement: string
  why: string | null
}

export interface Area extends BaseEntity {
  user_id: string
  name: string
  type: AreaType
  emoji: string
  color: string
  why: string | null
  sort_order: string // Fractional indexing (TEXT in DB)
  is_active: boolean
}

export interface Goal extends BaseEntity {
  user_id: string
  area_id: string
  name: string
  why: string | null
  vision: string | null
  status: GoalStatus
  target_date: string | null
  completed_at: string | null
  sort_order: string // Fractional indexing (TEXT in DB)
  // Relations (optional, for joined queries)
  area?: Area
  phases?: Phase[]
  tasks?: Task[]
}

export interface Phase extends BaseEntity {
  goal_id: string
  name: string
  description: string | null
  status: PhaseStatus
  sort_order: string // Fractional indexing (TEXT in DB)
  completed_at: string | null
}

export interface Task extends BaseEntity {
  user_id: string
  goal_id: string | null
  phase_id: string | null
  name: string
  why: string | null
  repeat_type: RepeatType
  repeat_days: number[] | null
  duration_minutes: number
  time_slot: TimeSlot
  specific_time: string | null
  streak_count: number
  best_streak: number
  last_check_in_date: string | null
  is_active: boolean
  sort_order: string // Fractional indexing (TEXT in DB)
  // Relations
  goal?: Goal
  check_ins?: CheckIn[]
}

export interface CheckIn {
  id: string
  task_id: string
  user_id: string
  date: string
  status: CheckInStatus
  note: string | null
  created_at: string
}

export interface DailyReflection extends Omit<BaseEntity, 'updated_at'> {
  user_id: string
  date: string
  mood: MoodLevel | null
  summary: string | null
  updated_at: string
}

export interface AIMessage {
  id: string
  user_id: string
  type: MessageType
  title: string
  content: string
  is_read: boolean
  related_goal_id: string | null
  related_task_id: string | null
  created_at: string
}

// ============================================
// Result Types (for RPC/mutation responses)
// ============================================
export interface CheckInResult {
  checkinId: string
  newStreak: number
  bestStreak: number
}

export interface OnboardingResult {
  directionId: string
  firstAreaId: string
  firstGoalId: string | null
}

// ============================================
// Dashboard Types (for RPC responses)
// ============================================
export interface TodayDashboard {
  tasks: TodayTask[]
  stats: {
    completedToday: number
    totalToday: number
    currentStreak: number
  }
  recentCheckins: Array<{
    id: string
    taskId: string
    status: CheckInStatus
    note: string | null
    createdAt: string
  }>
}

export interface TodayTask extends Task {
  todayCheckIn: {
    id?: string
    status: CheckInStatus
    note: string | null
    createdAt?: string
  } | null
  goal: {
    id: string
    name: string
    areaId: string
    area: {
      id: string
      name: string
      emoji: string
      color: string
    }
  } | null
  phase: {
    id: string
    name: string
  } | null
}

// ============================================
// Input Types (for mutations)
// ============================================
export interface CreateDirectionInput {
  statement: string
  why?: string
}

export interface UpdateDirectionInput {
  statement?: string
  why?: string
}

export interface CreateAreaInput {
  name: string
  type?: AreaType
  emoji: string
  color: string
  why?: string
}

export interface UpdateAreaInput {
  name?: string
  type?: AreaType
  emoji?: string
  color?: string
  why?: string
  is_active?: boolean
  sort_order?: number
}

export interface CreateGoalInput {
  area_id: string
  name: string
  why?: string
  vision?: string
  status?: GoalStatus
  target_date?: string
}

export interface UpdateGoalInput {
  name?: string
  why?: string
  vision?: string
  status?: GoalStatus
  target_date?: string
  sort_order?: number
}

export interface CreatePhaseInput {
  goal_id: string
  name: string
  description?: string
}

export interface UpdatePhaseInput {
  name?: string
  description?: string
  status?: PhaseStatus
  sort_order?: number
}

export interface CreateTaskInput {
  goal_id?: string
  phase_id?: string
  name: string
  why?: string
  repeat_type?: RepeatType
  repeat_days?: number[]
  duration_minutes?: number
  time_slot?: TimeSlot
  specific_time?: string
}

export interface UpdateTaskInput {
  name?: string
  why?: string
  repeat_type?: RepeatType
  repeat_days?: number[]
  duration_minutes?: number
  time_slot?: TimeSlot
  specific_time?: string
  is_active?: boolean
  sort_order?: number
}

export interface CreateCheckInInput {
  task_id: string
  date: string
  status: CheckInStatus
  note?: string
}

export interface CreateReflectionInput {
  date: string
  mood?: MoodLevel
  summary?: string
}

export interface UpdateReflectionInput {
  mood?: MoodLevel
  summary?: string
}

export interface UpdateProfileInput {
  name?: string
  timezone?: string
}
```

---

## 4.2 Zod Validation Schemas

### 문자 수 제한 기준

| 필드                    | 제한   | 이유                                                  |
| ----------------------- | ------ | ----------------------------------------------------- |
| **Area.name**           | 50자   | 짧은 레이블 (예: "건강", "커리어", "재정 관리")       |
| **Goal.name**           | 100자  | 구체적인 목표 문장 (예: "10km 달리기 완주하기")       |
| **Task.name**           | 100자  | 실행 가능한 행동 문장 (예: "매일 아침 30분 조깅하기") |
| **Phase.name**          | 100자  | 중간 이정표 문장 (예: "기초 체력 만들기")             |
| **why 필드들**          | 500자  | 이유 설명 (1-3문장)                                   |
| **Direction.statement** | 500자  | 인생 방향 문장                                        |
| **vision**              | 1000자 | 상세한 비전 설명                                      |

### src/lib/validations/index.ts

```typescript
import { z } from 'zod'

// ============================================
// Common Schemas
// ============================================
export const uuidSchema = z.string().uuid()

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')

export const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)')

// ============================================
// Direction Schemas
// ============================================
export const createDirectionSchema = z.object({
  statement: z.string().min(1, 'Required').max(500, 'Max 500 characters'),
  why: z.string().max(1000).optional(),
})

export const updateDirectionSchema = z.object({
  statement: z.string().min(1).max(500).optional(),
  why: z.string().max(1000).optional(),
})

export type CreateDirectionSchema = z.infer<typeof createDirectionSchema>
export type UpdateDirectionSchema = z.infer<typeof updateDirectionSchema>

// ============================================
// Area Schemas
// ============================================
export const areaTypeSchema = z.enum([
  'health',
  'career',
  'finance',
  'relationships',
  'hobbies',
  'mental',
  'learning',
  'daily',
  'custom',
])

export const createAreaSchema = z.object({
  name: z.string().min(1, 'Required').max(50, 'Max 50 characters'),
  type: areaTypeSchema.optional().default('custom'),
  emoji: z.string().min(1).max(4),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  why: z.string().max(500).optional(),
})

export const updateAreaSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  type: areaTypeSchema.optional(),
  emoji: z.string().min(1).max(4).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  why: z.string().max(500).optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
})

export type CreateAreaSchema = z.infer<typeof createAreaSchema>
export type UpdateAreaSchema = z.infer<typeof updateAreaSchema>

// ============================================
// Goal Schemas
// ============================================
export const goalStatusSchema = z.enum([
  'active',
  'backlog',
  'completed',
  'maintenance',
  'paused',
  'archived',
])

export const createGoalSchema = z.object({
  area_id: uuidSchema,
  name: z.string().min(1, 'Required').max(100, 'Max 100 characters'),
  why: z.string().max(500).optional(),
  vision: z.string().max(1000).optional(),
  status: goalStatusSchema.optional().default('active'),
  target_date: dateSchema.optional(),
})

export const updateGoalSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  why: z.string().max(500).optional(),
  vision: z.string().max(1000).optional(),
  status: goalStatusSchema.optional(),
  target_date: dateSchema.optional().nullable(),
  sort_order: z.number().int().min(0).optional(),
})

export type CreateGoalSchema = z.infer<typeof createGoalSchema>
export type UpdateGoalSchema = z.infer<typeof updateGoalSchema>

// ============================================
// Phase Schemas
// ============================================
export const phaseStatusSchema = z.enum(['pending', 'active', 'completed'])

export const createPhaseSchema = z.object({
  goal_id: uuidSchema,
  name: z.string().min(1, 'Required').max(100, 'Max 100 characters'),
  description: z.string().max(500).optional(),
})

export const updatePhaseSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  status: phaseStatusSchema.optional(),
  sort_order: z.number().int().min(0).optional(),
})

export type CreatePhaseSchema = z.infer<typeof createPhaseSchema>
export type UpdatePhaseSchema = z.infer<typeof updatePhaseSchema>

// ============================================
// Task Schemas
// ============================================
export const repeatTypeSchema = z.enum(['daily', 'weekdays', 'weekends', 'weekly', 'custom'])

export const timeSlotSchema = z.enum([
  'early_morning',
  'morning',
  'late_morning',
  'afternoon',
  'evening',
  'night',
  'anytime',
])

export const createTaskSchema = z.object({
  goal_id: uuidSchema.optional(),
  phase_id: uuidSchema.optional(),
  name: z.string().min(1, 'Required').max(100, 'Max 100 characters'),
  why: z.string().max(500).optional(),
  repeat_type: repeatTypeSchema.optional().default('daily'),
  repeat_days: z.array(z.number().int().min(0).max(6)).optional(),
  duration_minutes: z.number().int().min(1).max(480).optional().default(15),
  time_slot: timeSlotSchema.optional().default('anytime'),
  specific_time: timeSchema.optional(),
})

export const updateTaskSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  why: z.string().max(500).optional(),
  repeat_type: repeatTypeSchema.optional(),
  repeat_days: z.array(z.number().int().min(0).max(6)).optional(),
  duration_minutes: z.number().int().min(1).max(480).optional(),
  time_slot: timeSlotSchema.optional(),
  specific_time: timeSchema.optional().nullable(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
})

export type CreateTaskSchema = z.infer<typeof createTaskSchema>
export type UpdateTaskSchema = z.infer<typeof updateTaskSchema>

// ============================================
// Check-in Schemas
// ============================================
export const checkinStatusSchema = z.enum(['done', 'skip', 'miss'])

export const createCheckInSchema = z.object({
  task_id: uuidSchema,
  date: dateSchema,
  status: checkinStatusSchema,
  note: z.string().max(500).optional(),
})

export type CreateCheckInSchema = z.infer<typeof createCheckInSchema>

// ============================================
// Reflection Schemas
// ============================================
export const moodLevelSchema = z.enum(['terrible', 'bad', 'neutral', 'good', 'great'])

export const createReflectionSchema = z.object({
  date: dateSchema,
  mood: moodLevelSchema.optional(),
  summary: z.string().max(1000).optional(),
})

export const updateReflectionSchema = z.object({
  mood: moodLevelSchema.optional(),
  summary: z.string().max(1000).optional(),
})

export type CreateReflectionSchema = z.infer<typeof createReflectionSchema>
export type UpdateReflectionSchema = z.infer<typeof updateReflectionSchema>

// ============================================
// Profile Schemas
// ============================================
export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  timezone: z.string().optional(),
})

export type UpdateProfileSchema = z.infer<typeof updateProfileSchema>
```

---

## 4.3 Query Keys & Stale Times

### src/lib/query/keys.ts

```typescript
/**
 * Query Keys Factory
 * - 타입 안전한 쿼리 키 생성
 * - 관련 쿼리 일괄 무효화에 활용
 */
export const queryKeys = {
  // ============================================
  // Profile
  // ============================================
  profile: {
    me: ['profile', 'me'] as const,
  },

  // ============================================
  // Direction
  // ============================================
  direction: {
    all: ['direction'] as const,
  },

  // ============================================
  // Areas
  // ============================================
  areas: {
    all: ['areas'] as const,
    active: () => [...queryKeys.areas.all, 'active'] as const,
    detail: (id: string) => [...queryKeys.areas.all, id] as const,
  },

  // ============================================
  // Goals
  // ============================================
  goals: {
    all: ['goals'] as const,
    byStatus: (status: string) => [...queryKeys.goals.all, { status }] as const,
    byArea: (areaId: string) => [...queryKeys.goals.all, { areaId }] as const,
    detail: (id: string) => [...queryKeys.goals.all, 'detail', id] as const,
  },

  // ============================================
  // Phases
  // ============================================
  phases: {
    all: ['phases'] as const,
    byGoal: (goalId: string) => [...queryKeys.phases.all, { goalId }] as const,
    detail: (id: string) => [...queryKeys.phases.all, 'detail', id] as const,
  },

  // ============================================
  // Tasks
  // ============================================
  tasks: {
    all: ['tasks'] as const,
    today: (date: string) => [...queryKeys.tasks.all, 'today', date] as const,
    byGoal: (goalId: string) => [...queryKeys.tasks.all, { goalId }] as const,
    byPhase: (phaseId: string) => [...queryKeys.tasks.all, { phaseId }] as const,
    detail: (id: string) => [...queryKeys.tasks.all, 'detail', id] as const,
  },

  // ============================================
  // Check-ins
  // ============================================
  checkIns: {
    all: ['check-ins'] as const,
    byDate: (date: string) => [...queryKeys.checkIns.all, { date }] as const,
    byTask: (taskId: string, start: string, end: string) =>
      [...queryKeys.checkIns.all, { taskId, start, end }] as const,
  },

  // ============================================
  // Reflections
  // ============================================
  reflections: {
    all: ['reflections'] as const,
    byDate: (date: string) => [...queryKeys.reflections.all, { date }] as const,
    byRange: (start: string, end: string) =>
      [...queryKeys.reflections.all, { start, end }] as const,
  },

  // ============================================
  // Dashboard (RPC 기반)
  // ============================================
  dashboard: {
    today: ['dashboard', 'today'] as const,
    roadmap: ['dashboard', 'roadmap'] as const,
  },

  // ============================================
  // AI Messages
  // ============================================
  aiMessages: {
    all: ['ai-messages'] as const,
    unread: () => [...queryKeys.aiMessages.all, 'unread'] as const,
  },
} as const

export type QueryKeys = typeof queryKeys
```

### src/lib/query/stale-times.ts

```typescript
/**
 * Stale Time 상수
 * - 데이터 변경 빈도에 따라 차등 설정
 * - staleTime 동안은 캐시된 데이터 사용 (네트워크 요청 X)
 */
export const STALE_TIMES = {
  // ═══════════════════════════════════════════════════
  // 거의 변경 안 됨 (10분) - 월 1-2회 수정
  // ═══════════════════════════════════════════════════
  DIRECTION: 10 * 60 * 1000, // 인생 방향 - 거의 안 바뀜
  AREA: 10 * 60 * 1000, // 인생 영역 - 거의 안 바뀜
  PROFILE: 10 * 60 * 1000, // 프로필 - 거의 안 바뀜

  // ═══════════════════════════════════════════════════
  // 가끔 변경 (3분) - 주 1-2회 수정
  // ═══════════════════════════════════════════════════
  GOAL: 3 * 60 * 1000, // 목표 - 주 1-2회 수정
  PHASE: 3 * 60 * 1000, // 단계 - 주 1-2회 수정

  // ═══════════════════════════════════════════════════
  // 자주 변경 (1분) - 일 3-5회 수정
  // ═══════════════════════════════════════════════════
  TASK: 60 * 1000, // 태스크 - 매일 수정 가능

  // ═══════════════════════════════════════════════════
  // 매우 자주 변경 (30초) - 일 10회+
  // ═══════════════════════════════════════════════════
  CHECKIN: 30 * 1000, // 체크인 - 하루 여러 번
  TODAY_TASKS: 30 * 1000, // 오늘 할 일 - 자주 갱신
  STATS: 30 * 1000, // 통계 - 체크인마다 변경

  // ═══════════════════════════════════════════════════
  // 실시간 필요 (즉시) - Realtime 구독 대상
  // ═══════════════════════════════════════════════════
  AI_MESSAGES: 0, // AI 메시지 - 즉시 반영 필요
} as const

export type StaleTimeKey = keyof typeof STALE_TIMES
```

### src/lib/query/config.ts

```typescript
import { QueryClient, type QueryClientConfig } from '@tanstack/react-query'
import { STALE_TIMES } from './stale-times'

/**
 * 에러 타입 판별 함수
 */
function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('JWT') ||
      error.message.includes('auth') ||
      error.message.includes('401')
    )
  }
  return false
}

function isValidationError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('validation') || error.message.includes('invalid')
  }
  return false
}

/**
 * QueryClient 설정
 */
export const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      // 기본 stale time (1분)
      staleTime: STALE_TIMES.TASK,

      // Garbage collection time (30분)
      gcTime: 30 * 60 * 1000,

      // 재시도 전략
      retry: (failureCount, error) => {
        // 인증 에러는 재시도 안 함
        if (isAuthError(error)) return false
        // 유효성 에러는 재시도 안 함
        if (isValidationError(error)) return false
        // 네트워크/서버 에러는 2회 재시도
        return failureCount < 2
      },

      // 지수 백오프 (1초, 2초, 4초... 최대 10초)
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),

      // 윈도우 포커스 시 refetch (staleTime 지난 경우만)
      refetchOnWindowFocus: true,

      // 네트워크 재연결 시 refetch
      refetchOnReconnect: true,
    },
    mutations: {
      // Mutation은 재시도 안 함 (Optimistic Update 충돌 방지)
      retry: false,
    },
  },
}

/**
 * QueryClient 인스턴스 생성
 */
export function createQueryClient(): QueryClient {
  return new QueryClient(queryClientConfig)
}
```

---

## 4.4 useQuery 패턴 가이드라인

### queryFn 인자 전달 규칙

| 상황          | 패턴                         | 예시                                    |
| ------------- | ---------------------------- | --------------------------------------- |
| **인자 없음** | 함수 참조 직접 전달          | `queryFn: getProfile`                   |
| **인자 있음** | 클로저(화살표 함수)로 감싸기 | `queryFn: () => getTodayTasks(dateStr)` |

```typescript
// ✅ 인자 없는 경우 - 함수 참조 직접 전달
export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile.me,
    queryFn: getProfile, // 직접 전달
  })
}

// ✅ 인자 있는 경우 - 클로저로 감싸기
export function useTodayTasks(date: Date = new Date()) {
  const dateStr = format(date, 'yyyy-MM-dd')
  return useQuery({
    queryKey: queryKeys.tasks.today(dateStr),
    queryFn: () => getTodayTasks(dateStr), // 클로저
  })
}

// ❌ 잘못된 예 - 인자 있는 함수를 직접 전달
export function useTodayTasks(date: string) {
  return useQuery({
    queryKey: queryKeys.tasks.today(date),
    queryFn: getTodayTasks, // ❌ date 인자가 전달되지 않음!
  })
}
```

**이유**: TanStack Query의 `queryFn`은 `QueryFunctionContext`를 첫 번째 인자로 받습니다. 커스텀 인자를 전달하려면 클로저로 감싸야 합니다.

---

## 4.5 useProfile Hook

### src/queries/use-profile.ts

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { getProfile, updateProfile, updateAvatar } from '@/actions/profile.actions'
import type { UpdateProfileInput } from '@/types/entities'

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile.me,
    queryFn: getProfile,
    staleTime: STALE_TIMES.PROFILE,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateProfileInput) => updateProfile(input),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.profile.me, data)
    },
  })
}

export function useUpdateAvatar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (formData: FormData) => updateAvatar(formData),
    onSuccess: (avatarUrl, variables) => {
      queryClient.setQueryData(queryKeys.profile.me, (old: Profile | undefined) => {
        if (!old) return old
        return { ...old, avatar_url: avatarUrl }
      })
    },
  })
}
```

---

## 4.6 useDirection Hook

### src/queries/use-direction.ts

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { getDirection, createDirection, updateDirection } from '@/actions/direction.actions'
import type { CreateDirectionInput, UpdateDirectionInput } from '@/types/entities'

export function useDirection() {
  return useQuery({
    queryKey: queryKeys.direction.all,
    queryFn: getDirection,
    staleTime: STALE_TIMES.DIRECTION,
  })
}

export function useCreateDirection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateDirectionInput) => createDirection(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.direction.all })
    },
  })
}

export function useUpdateDirection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDirectionInput }) =>
      updateDirection(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.direction.all })
    },
  })
}
```

---

## 4.7 useAreas Hook

### src/queries/use-areas.ts

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import {
  getAreas,
  getActiveAreas,
  createArea,
  updateArea,
  deleteArea,
  reorderAreas,
} from '@/actions/area.actions'
import type { Area, CreateAreaInput, UpdateAreaInput } from '@/types/entities'

export function useAreas() {
  return useQuery({
    queryKey: queryKeys.areas.all,
    queryFn: getAreas,
    staleTime: STALE_TIMES.AREA,
  })
}

export function useActiveAreas() {
  return useQuery({
    queryKey: queryKeys.areas.active(),
    queryFn: getActiveAreas,
    staleTime: STALE_TIMES.AREA,
  })
}

export function useCreateArea() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateAreaInput) => createArea(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.areas.all })
    },
  })
}

export function useUpdateArea() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAreaInput }) => updateArea(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.areas.all })
    },
  })
}

export function useDeleteArea() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteArea(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.areas.all })
    },
  })
}

export function useReorderAreas() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ids: string[]) => reorderAreas(ids),
    onMutate: async (newOrder) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.areas.all })
      const previous = queryClient.getQueryData<Area[]>(queryKeys.areas.all)

      // Optimistic reorder
      if (previous) {
        queryClient.setQueryData<Area[]>(
          queryKeys.areas.all,
          newOrder.map((id) => previous.find((a) => a.id === id)!).filter(Boolean)
        )
      }

      return { previous }
    },
    onError: (err, vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.areas.all, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.areas.all })
    },
  })
}
```

---

## 4.8 useGoals Hook

### src/queries/use-goals.ts

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import {
  getGoals,
  getGoalsByStatus,
  getGoalsByArea,
  getGoalDetail,
  createGoal,
  updateGoal,
  deleteGoal,
} from '@/actions/goal.actions'
import type { Goal, GoalStatus, CreateGoalInput, UpdateGoalInput } from '@/types/entities'

export function useGoals(status?: GoalStatus) {
  return useQuery({
    queryKey: status ? queryKeys.goals.byStatus(status) : queryKeys.goals.all,
    queryFn: () => (status ? getGoalsByStatus(status) : getGoals()),
    staleTime: STALE_TIMES.GOAL,
  })
}

export function useGoalsByArea(areaId: string) {
  return useQuery({
    queryKey: queryKeys.goals.byArea(areaId),
    queryFn: () => getGoalsByArea(areaId),
    enabled: !!areaId,
    staleTime: STALE_TIMES.GOAL,
  })
}

export function useGoal(id: string) {
  return useQuery({
    queryKey: queryKeys.goals.detail(id),
    queryFn: () => getGoalDetail(id),
    enabled: !!id,
    staleTime: STALE_TIMES.GOAL,
  })
}

export function useCreateGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateGoalInput) => createGoal(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
    },
  })
}

export function useUpdateGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateGoalInput }) => updateGoal(id, input),
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.detail(id) })
    },
  })
}

export function useDeleteGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
    },
  })
}
```

---

## 4.9 usePhases Hook

### src/queries/use-phases.ts

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import {
  getPhasesByGoal,
  createPhase,
  updatePhase,
  activatePhase,
  completePhase,
  deletePhase,
  reorderPhases,
} from '@/actions/phase.actions'
import type { Phase, CreatePhaseInput, UpdatePhaseInput } from '@/types/entities'

export function usePhasesByGoal(goalId: string) {
  return useQuery({
    queryKey: queryKeys.phases.byGoal(goalId),
    queryFn: () => getPhasesByGoal(goalId),
    enabled: !!goalId,
    staleTime: STALE_TIMES.PHASE,
  })
}

export function useCreatePhase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreatePhaseInput) => createPhase(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.phases.byGoal(data.goal_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.detail(data.goal_id) })
    },
  })
}

export function useUpdatePhase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input, goalId }: { id: string; input: UpdatePhaseInput; goalId: string }) =>
      updatePhase(id, input),
    onSuccess: (data, { goalId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.phases.byGoal(goalId) })
    },
  })
}

export function useActivatePhase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, goalId }: { id: string; goalId: string }) => activatePhase(id),
    onSuccess: (data, { goalId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.phases.byGoal(goalId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.detail(goalId) })
    },
  })
}

export function useCompletePhase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, goalId }: { id: string; goalId: string }) => completePhase(id),
    onSuccess: (data, { goalId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.phases.byGoal(goalId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.detail(goalId) })
    },
  })
}

export function useDeletePhase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, goalId }: { id: string; goalId: string }) => deletePhase(id),
    onSuccess: (data, { goalId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.phases.byGoal(goalId) })
    },
  })
}

export function useReorderPhases() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ goalId, ids }: { goalId: string; ids: string[] }) => reorderPhases(goalId, ids),
    onMutate: async ({ goalId, ids }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.phases.byGoal(goalId) })
      const previous = queryClient.getQueryData<Phase[]>(queryKeys.phases.byGoal(goalId))

      if (previous) {
        queryClient.setQueryData<Phase[]>(
          queryKeys.phases.byGoal(goalId),
          ids.map((id) => previous.find((p) => p.id === id)!).filter(Boolean)
        )
      }

      return { previous, goalId }
    },
    onError: (err, vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.phases.byGoal(context.goalId), context.previous)
      }
    },
    onSettled: (data, err, { goalId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.phases.byGoal(goalId) })
    },
  })
}
```

---

## 4.10 useTasks Hook

### src/queries/use-tasks.ts

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import {
  getTasks,
  getTodayTasks,
  getTasksByGoal,
  createTask,
  updateTask,
  deleteTask,
} from '@/actions/task.actions'
import type { Task, CreateTaskInput, UpdateTaskInput } from '@/types/entities'

export function useTasks() {
  return useQuery({
    queryKey: queryKeys.tasks.all,
    queryFn: getTasks,
    staleTime: STALE_TIMES.TASK,
  })
}

export function useTodayTasks(date: Date = new Date()) {
  const dateStr = format(date, 'yyyy-MM-dd')

  return useQuery({
    queryKey: queryKeys.tasks.today(dateStr),
    queryFn: () => getTodayTasks(dateStr),
    staleTime: STALE_TIMES.TODAY_TASKS,
  })
}

export function useTasksByGoal(goalId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.byGoal(goalId),
    queryFn: () => getTasksByGoal(goalId),
    enabled: !!goalId,
    staleTime: STALE_TIMES.TASK,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
      if (data.goal_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byGoal(data.goal_id) })
      }
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) => updateTask(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all })
      const previous = queryClient.getQueryData<Task[]>(queryKeys.tasks.all)

      if (previous) {
        queryClient.setQueryData<Task[]>(
          queryKeys.tasks.all,
          previous.map((task) =>
            task.id === id ? { ...task, ...input, updated_at: new Date().toISOString() } : task
          )
        )
      }

      return { previous }
    },
    onError: (err, vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.tasks.all, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.today })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all })
      const previous = queryClient.getQueryData<Task[]>(queryKeys.tasks.all)

      if (previous) {
        queryClient.setQueryData<Task[]>(
          queryKeys.tasks.all,
          previous.filter((task) => task.id !== id)
        )
      }

      return { previous }
    },
    onError: (err, vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.tasks.all, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
    },
  })
}
```

---

## 4.11 useCheckIn Hook

### src/queries/use-checkin.ts

```typescript
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query/keys'
import { createCheckIn, undoCheckIn } from '@/actions/checkin.actions'
import type {
  CreateCheckInInput,
  TodayDashboard,
  CheckInStatus,
  CheckInResult,
} from '@/types/entities'

// CheckInResult 타입 정의 (entities.ts에 추가)
// export interface CheckInResult {
//   checkinId: string
//   newStreak: number
//   bestStreak: number
// }

export function useCheckIn(): UseMutationResult<CheckInResult, Error, CreateCheckInInput> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateCheckInInput) => createCheckIn(input),

    onMutate: async (newCheckIn) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.dashboard.today })

      // Snapshot previous value
      const previousData = queryClient.getQueryData<TodayDashboard>(queryKeys.dashboard.today)

      // Optimistically update
      if (previousData) {
        queryClient.setQueryData<TodayDashboard>(queryKeys.dashboard.today, {
          ...previousData,
          tasks: previousData.tasks.map((task) =>
            task.id === newCheckIn.task_id
              ? {
                  ...task,
                  todayCheckIn: {
                    status: newCheckIn.status,
                    note: newCheckIn.note,
                  },
                  streakCount:
                    newCheckIn.status === 'done' ? task.streakCount + 1 : task.streakCount,
                }
              : task
          ),
          stats: {
            ...previousData.stats,
            completedToday:
              previousData.stats.completedToday + (newCheckIn.status === 'done' ? 1 : 0),
          },
        })
      }

      return { previousData }
    },

    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.dashboard.today, context.previousData)
      }
      toast.error('체크인에 실패했어요. 다시 시도해주세요.')
    },

    onSettled: () => {
      // Refetch to sync with server
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.today })
    },
  })
}

export function useUndoCheckIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (checkInId: string) => undoCheckIn(checkInId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.today })
      toast.success('체크인이 취소되었어요.')
    },
    onError: () => {
      toast.error('취소에 실패했어요.')
    },
  })
}
```

---

## 4.12 useReflection Hook

### src/queries/use-reflection.ts

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import {
  getReflection,
  getReflectionsByRange,
  createReflection,
  updateReflection,
} from '@/actions/reflection.actions'
import type { CreateReflectionInput, UpdateReflectionInput } from '@/types/entities'

export function useReflection(date: string) {
  return useQuery({
    queryKey: queryKeys.reflections.byDate(date),
    queryFn: () => getReflection(date),
    staleTime: STALE_TIMES.STATS,
  })
}

export function useReflectionRange(start: string, end: string) {
  return useQuery({
    queryKey: queryKeys.reflections.byRange(start, end),
    queryFn: () => getReflectionsByRange(start, end),
    staleTime: STALE_TIMES.STATS,
  })
}

export function useCreateReflection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateReflectionInput) => createReflection(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reflections.byDate(data.date) })
    },
  })
}

export function useUpdateReflection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input, date }: { id: string; input: UpdateReflectionInput; date: string }) =>
      updateReflection(id, input),
    onSuccess: (data, { date }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reflections.byDate(date) })
    },
  })
}
```

---

## 4.13 useAIMessages Hook

### src/queries/use-ai-messages.ts

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import {
  getAllMessages,
  getUnreadMessages,
  markAsRead,
  markAllAsRead,
} from '@/actions/ai-message.actions'
import type { AIMessage } from '@/types/entities'

export function useAIMessages() {
  return useQuery({
    queryKey: queryKeys.aiMessages.all,
    queryFn: getAllMessages,
    staleTime: STALE_TIMES.AI_MESSAGES,
  })
}

export function useUnreadMessages() {
  return useQuery({
    queryKey: queryKeys.aiMessages.unread(),
    queryFn: getUnreadMessages,
    staleTime: STALE_TIMES.AI_MESSAGES,
  })
}

export function useMarkAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => markAsRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.aiMessages.all })

      const previousAll = queryClient.getQueryData<AIMessage[]>(queryKeys.aiMessages.all)
      const previousUnread = queryClient.getQueryData<AIMessage[]>(queryKeys.aiMessages.unread())

      // Optimistic update
      if (previousAll) {
        queryClient.setQueryData<AIMessage[]>(
          queryKeys.aiMessages.all,
          previousAll.map((msg) => (msg.id === id ? { ...msg, is_read: true } : msg))
        )
      }
      if (previousUnread) {
        queryClient.setQueryData<AIMessage[]>(
          queryKeys.aiMessages.unread(),
          previousUnread.filter((msg) => msg.id !== id)
        )
      }

      return { previousAll, previousUnread }
    },
    onError: (err, vars, context) => {
      if (context?.previousAll) {
        queryClient.setQueryData(queryKeys.aiMessages.all, context.previousAll)
      }
      if (context?.previousUnread) {
        queryClient.setQueryData(queryKeys.aiMessages.unread(), context.previousUnread)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiMessages.all })
    },
  })
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: markAllAsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.aiMessages.all })

      const previousAll = queryClient.getQueryData<AIMessage[]>(queryKeys.aiMessages.all)

      // Optimistic: 모든 메시지를 읽음 처리
      if (previousAll) {
        queryClient.setQueryData<AIMessage[]>(
          queryKeys.aiMessages.all,
          previousAll.map((msg) => ({ ...msg, is_read: true }))
        )
      }
      queryClient.setQueryData(queryKeys.aiMessages.unread(), [])

      return { previousAll }
    },
    onError: (err, vars, context) => {
      if (context?.previousAll) {
        queryClient.setQueryData(queryKeys.aiMessages.all, context.previousAll)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiMessages.all })
    },
  })
}
```

---

## 4.14 QueryBoundary Component

### src/components/common/query-boundary.tsx

```typescript
'use client'

import { UseQueryResult } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorCard } from '@/components/ui/error-card'
import { ReactNode } from 'react'

interface QueryBoundaryProps<T> {
  query: UseQueryResult<T>
  loadingFallback?: ReactNode
  errorFallback?: (error: Error) => ReactNode
  emptyFallback?: ReactNode
  children: (data: NonNullable<T>) => ReactNode
}

export function QueryBoundary<T>({
  query,
  loadingFallback,
  errorFallback,
  emptyFallback,
  children,
}: QueryBoundaryProps<T>) {
  if (query.isLoading) {
    return <>{loadingFallback || <Skeleton className="h-20 w-full" />}</>
  }

  if (query.isError) {
    return <>{errorFallback?.(query.error) || <ErrorCard error={query.error} />}</>
  }

  if (query.data == null) {
    return <>{emptyFallback || null}</>
  }

  // Handle empty arrays
  if (Array.isArray(query.data) && query.data.length === 0) {
    return <>{emptyFallback || null}</>
  }

  return <>{children(query.data)}</>
}

// 사용 예시:
// <QueryBoundary
//   query={goalsQuery}
//   loadingFallback={<GoalsSkeleton />}
//   emptyFallback={<EmptyGoals />}
// >
//   {(goals) => <GoalList goals={goals} />}
// </QueryBoundary>
```

### src/components/ui/error-card.tsx

```typescript
'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface ErrorCardProps {
  error: Error
  onRetry?: () => void
}

export function ErrorCard({ error, onRetry }: ErrorCardProps) {
  return (
    <Card className="p-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-miss-bg flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-miss" />
        </div>
        <div>
          <h3 className="font-semibold mb-1">문제가 발생했어요</h3>
          <p className="text-sm text-foreground-secondary">
            {error.message || '잠시 후 다시 시도해주세요.'}
          </p>
        </div>
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            <RefreshCw className="w-4 h-4 mr-2" />
            다시 시도
          </Button>
        )}
      </div>
    </Card>
  )
}
```

---

## ✅ Completion Checklist

### Types & Schemas

- [x] Entity types 정의 (`types/entities.ts`)
- [x] Input types 정의 (`CreateXInput`, `UpdateXInput`)
- [x] Zod validation schemas (`lib/validations/index.ts`)

### Query Infrastructure

- [x] Query keys factory (`lib/query/keys.ts`)
- [x] Stale times 상수 (`lib/query/stale-times.ts`)
- [x] QueryClient config (`lib/query/config.ts`)

### Query Hooks

- [x] **useProfile** (4.4)
- [x] **useDirection** (4.5)
- [x] **useAreas** + reorder (4.6)
- [x] **useGoals** (4.7)
- [x] **usePhases** (4.8)
- [x] **useTasks** (4.9)
- [x] **useCheckIn** + undo (4.10)
- [x] **useReflection** (4.11)
- [x] **useAIMessages** (4.12)

### Common Components

- [x] **QueryBoundary** (4.13)
- [x] **ErrorCard** (4.13)

---

## 🔗 Navigation

← [Phase 3: Supabase Backend](./phase-3-supabase.md)
→ [Phase 4.5: API Design & Server Actions](./phase-4.5-api-design.md)

---

_Version: 1.0 | Last Updated: 2026-02-03_
