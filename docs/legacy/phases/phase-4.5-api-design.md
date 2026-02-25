# Phase 4.5: API Design & Server Actions

> **Goal**: API 전략 수립, Server Actions 구현, 응답 표준화

**예상 소요 시간**: 1.5 ~ 2일

---

## Reference Documents

- [Data Model](../plan/core/data-model.md)
- [Code Architecture](../code-architecture.md)
- [Phase 3: Supabase](./phase-3-supabase.md)
- [Phase 4: Services](./phase-4-services.md)

---

## 4.5.1 Server Actions vs API Routes 사용 기준

### 판단 기준표

| 기준                        | Server Actions          | API Routes            |
| --------------------------- | ----------------------- | --------------------- |
| **데이터 변경 (Mutation)**  | 권장                    | 외부 시스템 연동 시   |
| **클라이언트 직접 호출**    | React 컴포넌트에서 직접 | fetch/axios 필요      |
| **Progressive Enhancement** | 지원 (JS 없어도 동작)   | 미지원                |
| **외부 Webhook 수신**       | 불가                    | 필수                  |
| **인증 콜백**               | 불가                    | 필수 (OAuth redirect) |
| **파일 업로드**             | 가능 (FormData)         | 대용량 시 권장        |
| **Cron Job / 스케줄링**     | 불가                    | 필수 (Vercel Cron)    |
| **외부 API 프록시**         | 가능하나 비권장         | 권장                  |
| **타입 안전성**             | 완벽 (end-to-end)       | 수동 타입 정의 필요   |
| **캐싱/재검증**             | revalidatePath/Tag      | 수동 캐시 제어        |

### inu 프로젝트 적용

```
Server Actions 사용:
├── 모든 CRUD 작업 (Direction, Area, Goal, Phase, Task, CheckIn)
├── 체크인 (Done/Skip)
├── 온보딩 데이터 저장
├── 프로필 업데이트
└── AI 메시지 읽음 처리

API Routes 사용:
├── 인증 콜백 (/api/auth/callback)
├── Webhook 수신 (/api/webhooks/*)
├── Google Calendar 연동 (/api/calendar/*)
├── 결제 Webhook (/api/payments/*)
├── Cron Jobs (/api/cron/*)
└── 외부 AI API 프록시 (/api/ai/*)
```

---

## 4.5.2 디렉토리 구조

```
src/
├── actions/                     # Server Actions (인증, 검증, 캐시 무효화)
│   ├── auth.actions.ts
│   ├── direction.actions.ts
│   ├── area.actions.ts
│   ├── goal.actions.ts
│   ├── phase.actions.ts
│   ├── task.actions.ts
│   ├── checkin.actions.ts
│   ├── reflection.actions.ts
│   ├── ai-message.actions.ts
│   ├── profile.actions.ts
│   ├── stats.actions.ts
│   └── onboarding.actions.ts
│
├── repositories/                # 데이터 접근 레이어 (Supabase 호출)
│   ├── base.repository.ts       # 공통 CRUD 로직
│   ├── direction.repository.ts
│   ├── area.repository.ts
│   ├── goal.repository.ts
│   ├── phase.repository.ts
│   ├── task.repository.ts
│   ├── checkin.repository.ts
│   ├── reflection.repository.ts
│   ├── ai-message.repository.ts
│   ├── profile.repository.ts
│   └── stats.repository.ts
│
├── lib/
│   └── api/                     # API 유틸리티
│       ├── response.ts          # 응답 헬퍼
│       ├── errors.ts            # 에러 클래스/타입
│       └── auth.ts              # 인증 헬퍼
│
└── app/api/                     # API Routes
    ├── health/
    │   └── route.ts
    ├── auth/
    │   ├── callback/
    │   │   └── route.ts
    │   └── signout/
    │       └── route.ts
    ├── webhooks/
    │   └── stripe/
    │       └── route.ts
    ├── ai/
    │   └── chat/
    │       └── route.ts
    └── cron/
        ├── daily-miss/
        │   └── route.ts
        └── streak-reminder/
            └── route.ts
```

---

## 4.5.3 API 응답 표준화

### 타입 정의

```typescript
// src/types/api.ts

// 성공 응답
export interface ApiSuccessResponse<T> {
  success: true
  data: T
  meta?: {
    timestamp: string
    requestId?: string
  }
}

// 목록 응답 (페이지네이션)
export interface ApiListResponse<T> {
  success: true
  data: T[]
  pagination?: {
    total: number
    page: number
    pageSize: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  meta?: {
    timestamp: string
  }
}

// 에러 응답
export interface ApiErrorResponse {
  success: false
  error: {
    code: ErrorCode
    message: string // 사용자 친화적 메시지
    details?: string // 개발자용 상세 정보 (dev only)
    field?: string // 유효성 검사 실패 필드
    validationErrors?: Array<{
      field: string
      message: string
    }>
  }
  meta?: {
    timestamp: string
    requestId?: string
  }
}

// 통합 응답 타입
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse
```

### 에러 코드 체계

```typescript
// src/lib/api/errors.ts

export enum ErrorCode {
  // 인증 에러 (1xxx)
  AUTH_REQUIRED = 'AUTH_REQUIRED', // 1001: 로그인 필요
  AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN', // 1002: 토큰 무효
  AUTH_EXPIRED = 'AUTH_EXPIRED', // 1003: 토큰 만료
  AUTH_FORBIDDEN = 'AUTH_FORBIDDEN', // 1004: 권한 없음

  // 유효성 검사 에러 (2xxx)
  VALIDATION_ERROR = 'VALIDATION_ERROR', // 2001: 입력값 오류
  VALIDATION_REQUIRED = 'VALIDATION_REQUIRED', // 2002: 필수값 누락
  VALIDATION_FORMAT = 'VALIDATION_FORMAT', // 2003: 형식 오류

  // 리소스 에러 (3xxx)
  NOT_FOUND = 'NOT_FOUND', // 3001: 리소스 없음
  ALREADY_EXISTS = 'ALREADY_EXISTS', // 3002: 이미 존재
  CONFLICT = 'CONFLICT', // 3003: 충돌

  // 비즈니스 로직 에러 (4xxx)
  CHECKIN_ALREADY_EXISTS = 'CHECKIN_ALREADY_EXISTS', // 4001: 오늘 이미 체크인
  GOAL_LIMIT_EXCEEDED = 'GOAL_LIMIT_EXCEEDED', // 4002: Active Goal 한도 초과
  AI_QUOTA_EXCEEDED = 'AI_QUOTA_EXCEEDED', // 4003: AI 사용량 초과

  // 서버 에러 (5xxx)
  INTERNAL_ERROR = 'INTERNAL_ERROR', // 5001: 서버 내부 오류
  DATABASE_ERROR = 'DATABASE_ERROR', // 5002: DB 오류
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR', // 5003: 외부 API 오류

  // 네트워크 에러 (6xxx) - 클라이언트 측
  NETWORK_OFFLINE = 'NETWORK_OFFLINE', // 6001: 오프라인
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT', // 6002: 타임아웃
}
```

### 응답 헬퍼 함수

```typescript
// src/lib/api/response.ts

import type { ApiSuccessResponse, ApiListResponse, ApiErrorResponse } from '@/types/api'
import { ErrorCode } from './errors'

export function successResponse<T>(data: T, meta?: Record<string, unknown>): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  }
}

export function listResponse<T>(
  data: T[],
  pagination?: {
    total: number
    page: number
    pageSize: number
  }
): ApiListResponse<T> {
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1

  return {
    success: true,
    data,
    pagination: pagination
      ? {
          ...pagination,
          totalPages,
          hasNext: pagination.page < totalPages,
          hasPrev: pagination.page > 1,
        }
      : undefined,
    meta: {
      timestamp: new Date().toISOString(),
    },
  }
}

export function errorResponse(
  code: ErrorCode,
  message: string,
  details?: Partial<ApiErrorResponse['error']>
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...details,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  }
}
```

---

## 4.5.4 계층 구조

### 데이터 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐    ┌──────────────────────────────────┐  │
│  │  React Component │────│  TanStack Query Hooks            │  │
│  │                  │    │  (useGoals, useTodayTasks, etc.) │  │
│  └──────────────────┘    └──────────────────────────────────┘  │
│           │                           │                         │
│           ▼                           ▼                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Server Actions                         │  │
│  │  (src/actions/*.ts)                                       │  │
│  │  - 인증 확인 (getUser)                                    │  │
│  │  - 입력값 검증 (Zod)                                      │  │
│  │  - 캐시 무효화 (revalidatePath/Tag)                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
└────────────────────────────│────────────────────────────────────┘
                             │
┌────────────────────────────│────────────────────────────────────┐
│                        Server                                   │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Repository Layer                         │  │
│  │  (src/repositories/*.ts)                                  │  │
│  │  - Supabase 쿼리 호출                                     │  │
│  │  - RPC 함수 호출                                          │  │
│  │  - 데이터 변환 (DB → Application 타입)                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      Supabase                             │  │
│  │  - PostgreSQL Database                                    │  │
│  │  - Row Level Security (RLS)                               │  │
│  │  - RPC Functions (Phase 3에서 정의)                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 레이어별 책임

| 레이어                   | 책임                               | 예시                                             |
| ------------------------ | ---------------------------------- | ------------------------------------------------ |
| **TanStack Query Hooks** | 캐싱, 상태 관리, Optimistic Update | `useGoals()` - Server Action 호출 + 캐시 관리    |
| **Server Actions**       | 인증, 검증, 캐시 무효화            | `createCheckIn()` - user 확인 후 repository 호출 |
| **Repositories**         | 데이터 접근, 쿼리 조합             | `checkInRepository.create()` - Supabase insert   |
| **Supabase RPC**         | 복잡한 트랜잭션                    | `create_checkin_with_streak()` - 원자적 처리     |

### Server Action 예시

> **패턴**: Server Action은 인증 확인 → 입력 검증 → Repository 호출 → 캐시 무효화 순서로 처리합니다.

```typescript
// src/actions/checkin.actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { checkInRepository } from '@/repositories/checkin.repository'
import { createCheckInSchema } from '@/lib/validations'
import { errorResponse, successResponse } from '@/lib/api/response'
import { ErrorCode } from '@/lib/api/errors'

import type { CreateCheckInInput, CheckIn } from '@/types/entities'
import type { ApiResponse } from '@/types/api'

export async function createCheckIn(input: CreateCheckInInput): Promise<ApiResponse<CheckIn>> {
  try {
    // 1. 인증 확인 (Server Action 책임)
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return errorResponse(ErrorCode.AUTH_REQUIRED, '로그인이 필요합니다.')
    }

    // 2. 입력값 검증 (Server Action 책임)
    const validated = createCheckInSchema.safeParse(input)
    if (!validated.success) {
      return errorResponse(ErrorCode.VALIDATION_ERROR, '입력값을 확인해주세요.', {
        validationErrors: validated.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      })
    }

    // 3. Repository 호출 (데이터 접근은 Repository 책임)
    const checkIn = await checkInRepository.create(supabase, {
      ...validated.data,
      user_id: user.id,
    })

    // 4. 캐시 무효화 (Server Action 책임)
    revalidatePath('/today')
    revalidatePath('/review')

    // 5. 성공 응답
    return successResponse(checkIn)
  } catch (error) {
    console.error('createCheckIn error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, '체크인 처리 중 오류가 발생했습니다.')
  }
}

export async function undoCheckIn(checkInId: string): Promise<ApiResponse<void>> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return errorResponse(ErrorCode.AUTH_REQUIRED, '로그인이 필요합니다.')
    }

    await checkInRepository.delete(supabase, checkInId, user.id)

    revalidatePath('/today')

    return successResponse(undefined)
  } catch (error) {
    return errorResponse(ErrorCode.INTERNAL_ERROR, '취소 처리 중 오류가 발생했습니다.')
  }
}
```

---

## 4.5.5 API Routes 목록

### MVP API Routes

| 경로                   | 메서드 | 용도                                  |
| ---------------------- | ------ | ------------------------------------- |
| `/api/health`          | GET    | 헬스 체크                             |
| `/api/auth/callback`   | GET    | OAuth 콜백 (Google, Email Magic Link) |
| `/api/auth/signout`    | POST   | 로그아웃 (쿠키 정리)                  |
| `/api/cron/daily-miss` | POST   | 매일 자정 - Miss 처리                 |

### Phase 2+ API Routes

| 경로                               | 메서드 | 용도                        |
| ---------------------------------- | ------ | --------------------------- |
| `/api/ai/chat`                     | POST   | AI 대화 (LLM API 프록시)    |
| `/api/calendar/auth`               | GET    | Google OAuth 시작           |
| `/api/calendar/callback`           | GET    | Google OAuth 콜백           |
| `/api/calendar/events`             | GET    | 일정 조회 (프록시)          |
| `/api/webhooks/stripe`             | POST   | Stripe 결제 Webhook         |
| `/api/cron/weekly-review-reminder` | POST   | 일요일 - 주간 리뷰 알림     |
| `/api/cron/streak-reminder`        | POST   | 매일 저녁 - 스트릭 리마인더 |

### API Route 구현 예시

```typescript
// src/app/api/health/route.ts

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    },
  })
}
```

```typescript
// src/app/api/cron/daily-miss/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function POST(request: NextRequest) {
  // Vercel Cron 인증 확인
  const headersList = await headers()
  const authHeader = headersList.get('authorization')

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { success: false, error: { code: 'AUTH_FORBIDDEN', message: 'Unauthorized' } },
      { status: 401 }
    )
  }

  try {
    // Miss 처리 로직
    // 어제 날짜의 체크인이 없는 active task들을 miss로 처리

    return NextResponse.json({
      success: true,
      data: { processed: 0 }, // 처리된 수
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Processing failed' } },
      { status: 500 }
    )
  }
}
```

---

## 4.5.6 인증 프록시 확장

> **Note**: Next.js 16+에서는 `middleware.ts` 대신 `proxy.ts`를 사용합니다.

### 확장된 프록시

```typescript
// src/proxy.ts

import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const ROUTE_CONFIG = {
  // 인증 필요 없음
  public: ['/', '/landing', '/login', '/signup', '/api/health'],

  // 로그인한 사용자만
  protected: [
    '/today',
    '/roadmap',
    '/calendar',
    '/review',
    '/inbox',
    '/search',
    '/profile',
    '/ai-hub',
  ],

  // 온보딩 완료 필요
  requiresOnboarding: ['/today', '/roadmap', '/calendar', '/review'],

  // 로그인 사용자는 접근 불가
  authOnly: ['/login', '/signup'],
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 정적 파일 스킵
  if (shouldSkipProxy(pathname)) {
    return NextResponse.next()
  }

  // Supabase 세션 갱신
  const response = await updateSession(request)

  // 사용자 정보 가져오기
  const user = await getUserFromSession(request)

  // API 라우트 처리
  if (pathname.startsWith('/api')) {
    return handleApiRoute(request, response, user)
  }

  // 인증 페이지 (로그인한 사용자는 리다이렉트)
  if (isAuthRoute(pathname) && user) {
    return redirectTo('/today', request)
  }

  // 보호된 라우트 (비로그인 시 리다이렉트)
  if (isProtectedRoute(pathname) && !user) {
    return redirectTo('/login', request, pathname)
  }

  // 온보딩 필요 라우트
  if (requiresOnboarding(pathname) && user && !user.onboarding_completed) {
    return redirectTo('/onboarding', request)
  }

  return response
}

function shouldSkipProxy(pathname: string): boolean {
  return pathname.startsWith('/_next') || pathname.startsWith('/static') || pathname.includes('.')
}

function isAuthRoute(pathname: string): boolean {
  return ROUTE_CONFIG.authOnly.some((route) => pathname.startsWith(route))
}

function isProtectedRoute(pathname: string): boolean {
  return ROUTE_CONFIG.protected.some((route) => pathname.startsWith(route))
}

function requiresOnboarding(pathname: string): boolean {
  return ROUTE_CONFIG.requiresOnboarding.some((route) => pathname.startsWith(route))
}

function redirectTo(path: string, request: NextRequest, returnTo?: string): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = path
  if (returnTo) {
    url.searchParams.set('returnTo', returnTo)
  }
  return NextResponse.redirect(url)
}

async function handleApiRoute(
  request: NextRequest,
  response: NextResponse,
  user: unknown
): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  // 공개 API
  const publicApis = ['/api/health', '/api/auth/callback', '/api/webhooks']
  if (publicApis.some((api) => pathname.startsWith(api))) {
    return response
  }

  // 인증 필요 API
  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'AUTH_REQUIRED', message: '인증이 필요합니다.' },
      },
      { status: 401 }
    )
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

---

## 4.5.7 Rate Limiting

### MVP Rate Limiting 설정

| 엔드포인트      | 한도             | 이유            |
| --------------- | ---------------- | --------------- |
| `/api/auth/*`   | 5 req/min/IP     | 브루트포스 방지 |
| `createCheckIn` | 60 req/min/user  | 어뷰징 방지     |
| `createGoal`    | 20 req/hour/user | 스팸 방지       |

### 구현 (Upstash + Vercel KV)

```typescript
// src/lib/api/rateLimit.ts

import { Ratelimit } from '@upstash/ratelimit'
import { kv } from '@vercel/kv'

export const authRateLimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 requests per minute
  analytics: true,
})

export const checkInRateLimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(60, '1 m'), // 60 requests per minute
  analytics: true,
})

export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const { success, limit, remaining, reset } = await limiter.limit(identifier)
  return { success, remaining, reset }
}
```

---

## 4.5.8 Server Actions 전체 목록

### auth.actions.ts

```typescript
export async function signInWithEmail(email: string, password: string)
export async function signInWithGoogle()
export async function signUpWithEmail(email: string, password: string)
export async function resetPassword(email: string)
```

### direction.actions.ts

```typescript
export async function getDirection()
export async function createDirection(input: CreateDirectionInput)
export async function updateDirection(id: string, input: UpdateDirectionInput)
```

### area.actions.ts

```typescript
export async function getAreas()
export async function getActiveAreas()
export async function createArea(input: CreateAreaInput)
export async function updateArea(id: string, input: UpdateAreaInput)
export async function deleteArea(id: string)
export async function reorderAreas(ids: string[])
```

### goal.actions.ts

```typescript
export async function getGoals()
export async function getGoalsByStatus(status: GoalStatus)
export async function getGoalsByArea(areaId: string)
export async function getGoalDetail(id: string)
export async function createGoal(input: CreateGoalInput)
export async function updateGoal(id: string, input: UpdateGoalInput)
export async function updateGoalStatus(id: string, status: GoalStatus)
export async function deleteGoal(id: string)
```

### phase.actions.ts

```typescript
export async function getPhasesByGoal(goalId: string)
export async function createPhase(input: CreatePhaseInput)
export async function updatePhase(id: string, input: UpdatePhaseInput)
export async function activatePhase(id: string)
export async function completePhase(id: string)
export async function deletePhase(id: string)
export async function reorderPhases(goalId: string, ids: string[])
```

### task.actions.ts

```typescript
export async function getTasks()
export async function getTodayTasks(date?: string) // date 파라미터 추가
export async function getTasksByGoal(goalId: string)
export async function getTasksByPhase(phaseId: string)
export async function createTask(input: CreateTaskInput)
export async function updateTask(id: string, input: UpdateTaskInput)
export async function toggleTaskActive(id: string)
export async function deleteTask(id: string)
```

#### getTodayTasks 구현 (get_today_tasks RPC 호출)

```typescript
// src/actions/task.actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import type { Task } from '@/types/entities'

export async function getTodayTasks(date?: string): Promise<Task[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await supabase.rpc('get_today_tasks', {
    p_user_id: user.id,
    p_date: date || new Date().toISOString().split('T')[0],
  })

  if (error) throw new Error(error.message)
  return data as Task[]
}
```

### today.actions.ts (대시보드 전체)

```typescript
export async function getTodayDashboard() // get_today_dashboard RPC 호출
```

#### getTodayDashboard 구현

```typescript
// src/actions/today.actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import type { TodayDashboard } from '@/types/entities'

export async function getTodayDashboard(): Promise<TodayDashboard> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await supabase.rpc('get_today_dashboard', {
    p_user_id: user.id,
  })

  if (error) throw new Error(error.message)
  return data as TodayDashboard
}
```

### checkin.actions.ts

```typescript
export async function getCheckInsByDate(date: string)
export async function getCheckInsByTask(taskId: string)
export async function createCheckIn(input: CreateCheckInInput)
export async function undoCheckIn(id: string)
export async function getStreakInfo(taskId: string)
```

### reflection.actions.ts

```typescript
export async function getDailyReflection(date: string)
export async function getReflectionsByDateRange(startDate: string, endDate: string)
export async function createReflection(input: CreateReflectionInput)
export async function updateReflection(id: string, input: UpdateReflectionInput)
export async function deleteReflection(id: string)
```

### ai-message.actions.ts

```typescript
export async function getUnreadMessages()
export async function getAllMessages()
export async function markAsRead(id: string)
export async function markAllAsRead()
export async function generateRuleBasedMessage(trigger: AiMessageTrigger)
```

### profile.actions.ts

```typescript
export async function getProfile()
export async function updateProfile(input: UpdateProfileInput)
export async function updateAvatar(file: FormData)
export async function completeOnboarding()
```

### stats.actions.ts

```typescript
export async function getWeeklyStats(weekStart: string)
export async function getMonthlyStats(month: string)
export async function getStreakLeaderboard()
export async function getAreaBalance()
```

### onboarding.actions.ts

```typescript
export async function saveValues(values: string[])
export async function saveDirection(input: DirectionInput)
export async function saveFirstGoal(input: FirstGoalInput)
export async function completeOnboarding(input: CompleteOnboardingInput): Promise<OnboardingResult>
```

#### completeOnboarding 전체 구현

Phase 3에 정의된 `complete_onboarding` RPC를 호출하여 Direction, Areas, First Goal을 트랜잭션으로 생성합니다.

```typescript
// src/actions/onboarding.actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { OnboardingResult } from '@/types/entities'

export interface CompleteOnboardingInput {
  direction: {
    statement: string
    why?: string
  }
  areas: Array<{
    name: string
    type: string
    emoji: string
    color: string
    sort_order: number
  }>
  firstGoal?: {
    name: string
    why?: string
  }
}

export async function completeOnboarding(
  input: CompleteOnboardingInput
): Promise<OnboardingResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await supabase.rpc('complete_onboarding', {
    p_user_id: user.id,
    p_direction: input.direction,
    p_areas: input.areas,
    p_first_goal: input.firstGoal || null,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/')
  return data as OnboardingResult
}
```

---

## 4.5.9 Optimistic Update 패턴

사용자 액션에 즉각적인 피드백을 제공하기 위한 Optimistic Update 전략입니다.

### Why: 체감 성능 개선

```
┌─────────────────────────────────────────────────────────────────┐
│  WITHOUT Optimistic Update (일반적인 방식)                       │
│                                                                 │
│  사용자 클릭 ─────────────────────────────────────► UI 업데이트  │
│       │                                                │        │
│       └────► Server Request ───────► Response ─────────┘        │
│                    │                    │                       │
│                   300-500ms            체감 느림                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  WITH Optimistic Update (권장 방식)                              │
│                                                                 │
│  사용자 클릭 ──► UI 즉시 업데이트 (0ms)                          │
│       │              │                                          │
│       └────► Server Request ───────► Response                   │
│                    │                    │                       │
│                 백그라운드           성공: 유지 / 실패: 롤백     │
└─────────────────────────────────────────────────────────────────┘
```

### Optimistic Update 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│                      사용자 액션                                  │
│                    (체크인, 수정, 삭제)                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: 진행 중인 쿼리 취소                                     │
│  await queryClient.cancelQueries({ queryKey });                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: 이전 상태 저장 (롤백용)                                 │
│  const previous = queryClient.getQueryData(queryKey);           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: Optimistic Update (즉시 UI 반영)                        │
│  queryClient.setQueryData(queryKey, optimisticNewData);         │
│  → 사용자는 0ms 지연으로 결과를 봄                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 4: Server 요청 (백그라운드)                                 │
│  await serverAction(data);                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
               성공 ✅              실패 ❌
                    │                   │
                    ▼                   ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│  Step 5a: 캐시 무효화    │  │  Step 5b: 롤백          │
│  invalidateQueries()    │  │  setQueryData(previous) │
│  서버 데이터로 동기화    │  │  toast.error('실패')    │
└─────────────────────────┘  └─────────────────────────┘
```

### 체크인 Mutation (핵심 예시)

```typescript
// src/hooks/mutations/use-checkin-mutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query/keys'
import { createCheckIn } from '@/actions/checkin.actions'
import type { TodayDashboard, CheckInStatus } from '@/types/entities'

interface CheckInInput {
  taskId: string
  status: CheckInStatus
  note?: string
}

export function useCheckInMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CheckInInput) => createCheckIn(input),

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // onMutate: Optimistic Update 실행
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    onMutate: async (newCheckIn) => {
      // 1. 진행 중인 쿼리 취소 (경쟁 상태 방지)
      await queryClient.cancelQueries({
        queryKey: queryKeys.dashboard.today,
      })

      // 2. 이전 상태 저장 (롤백용)
      const previousData = queryClient.getQueryData<TodayDashboard>(queryKeys.dashboard.today)

      // 3. Optimistic Update 적용
      if (previousData) {
        queryClient.setQueryData<TodayDashboard>(queryKeys.dashboard.today, {
          ...previousData,
          tasks: previousData.tasks.map((task) =>
            task.id === newCheckIn.taskId
              ? {
                  ...task,
                  todayCheckIn: {
                    status: newCheckIn.status,
                    note: newCheckIn.note,
                  },
                  // 스트릭 낙관적 업데이트
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

      // 4. 롤백용 컨텍스트 반환
      return { previousData }
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // onError: 실패 시 롤백
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    onError: (error, variables, context) => {
      // 이전 상태로 롤백
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.dashboard.today, context.previousData)
      }

      // 사용자에게 알림
      toast.error('체크인에 실패했어요. 다시 시도해주세요.')
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // onSettled: 성공/실패 관계없이 항상 실행
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    onSettled: () => {
      // 서버 데이터로 최종 동기화
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.today,
      })
    },
  })
}
```

### 태스크 업데이트 Mutation

```typescript
// src/hooks/mutations/use-task-mutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query/keys'
import { updateTask } from '@/actions/task.actions'
import type { Task, UpdateTaskInput } from '@/types/entities'

export function useUpdateTaskMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) => updateTask(id, input),

    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.tasks.all,
      })

      const previousTasks = queryClient.getQueryData<Task[]>(queryKeys.tasks.all)

      // Optimistic Update
      if (previousTasks) {
        queryClient.setQueryData<Task[]>(
          queryKeys.tasks.all,
          previousTasks.map((task) =>
            task.id === id ? { ...task, ...input, updated_at: new Date().toISOString() } : task
          )
        )
      }

      return { previousTasks }
    },

    onError: (error, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(queryKeys.tasks.all, context.previousTasks)
      }
      toast.error('태스크 수정에 실패했어요.')
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.today })
    },
  })
}
```

### 삭제 Mutation (Optimistic Delete)

```typescript
// src/hooks/mutations/use-delete-mutation.ts
export function useDeleteTaskMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),

    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all })

      const previousTasks = queryClient.getQueryData<Task[]>(queryKeys.tasks.all)

      // Optimistic Delete - 목록에서 즉시 제거
      if (previousTasks) {
        queryClient.setQueryData<Task[]>(
          queryKeys.tasks.all,
          previousTasks.filter((task) => task.id !== taskId)
        )
      }

      return { previousTasks }
    },

    onError: (error, variables, context) => {
      // 롤백 - 삭제된 항목 복원
      if (context?.previousTasks) {
        queryClient.setQueryData(queryKeys.tasks.all, context.previousTasks)
      }
      toast.error('삭제에 실패했어요.')
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
    },
  })
}
```

### Optimistic Update 적용 기준

**의사결정 체크리스트:**

1. 일일 호출 빈도가 높은가? (10회 이상/일)
2. 실패 시 사용자 경험 영향이 큰가? (작업 손실, 혼란)
3. 클라이언트에서 결과를 예측할 수 있는가?
4. 서버 생성 ID가 필요한가?

| 액션                   | Optimistic | 빈도               | 실패 영향          | 이유                           |
| ---------------------- | ---------- | ------------------ | ------------------ | ------------------------------ |
| **체크인 (Done/Skip)** | ✅ 적용    | 매우 높음 (50+/일) | 낮음 (롤백 OK)     | 핵심 루프, 즉각 피드백 필수    |
| **태스크 완료 토글**   | ✅ 적용    | 높음 (20+/일)      | 낮음 (롤백 OK)     | Today 화면 핵심 상호작용       |
| **드래그 앤 드롭**     | ✅ 적용    | 중간 (5+/일)       | 낮음 (롤백 OK)     | 0ms 반응 없으면 UX 최악        |
| **태스크 수정**        | ✅ 적용    | 중간 (3-5/일)      | 낮음 (재입력 가능) | 폼 저장 시 즉시 반영 기대      |
| **태스크 삭제**        | ✅ 적용    | 낮음 (1-2/일)      | 중간 (복구 어려움) | Undo 토스트로 안전망 제공      |
| **Goal 생성**          | ❌ 미적용  | 낮음 (<1/일)       | 높음 (ID 필요)     | 서버 UUID 필요, 후속 작업 의존 |
| **Goal 삭제**          | ⚠️ 선택적  | 매우 낮음          | 높음 (복구 불가)   | 삭제 확인 모달 + 리다이렉트    |
| **프로필 수정**        | ❌ 미적용  | 매우 낮음 (<1/주)  | 중간               | 확실한 저장 확인 필요          |

**일반 규칙:**

- ✅ 적용: 빈도 높음 + 실패 영향 낮음 + 결과 예측 가능
- ❌ 미적용: 서버 ID 필요 OR 빈도 매우 낮음 OR 실패 시 복구 어려움
- ⚠️ 선택적: 케이스별 판단 (확인 UI로 대체 가능)

---

## 4.5.10 Testing Requirements

### Unit Tests

| 파일                  | 테스트 파일        | 커버리지 목표 |
| --------------------- | ------------------ | ------------- |
| `lib/api/response.ts` | `response.test.ts` | 100%          |
| `lib/api/errors.ts`   | `errors.test.ts`   | 100%          |
| `repositories/*.ts`   | `*.test.ts`        | 80%           |

### Integration Tests

| 대상           | 테스트 파일         | 테스트 케이스        |
| -------------- | ------------------- | -------------------- |
| Server Actions | `*.actions.test.ts` | 인증, 유효성, CRUD   |
| API Routes     | `route.test.ts`     | 응답 포맷, 에러 처리 |

### Completion Checklist

- [ ] API 응답 타입 정의 완료 (`src/types/api.ts`)
- [ ] 에러 코드 enum 정의 완료 (`src/lib/api/errors.ts`)
- [ ] 응답 헬퍼 함수 구현 및 테스트 (`src/lib/api/response.ts`)
- [ ] 핵심 Server Actions 구현 (auth, checkin, task)
- [ ] MVP API Routes 구현 (health, auth/callback, cron/daily-miss)
- [ ] 프록시 확장 완료 (인증, 온보딩 체크) - `src/proxy.ts`
- [ ] **Optimistic Update Mutation Hooks (4.5.9)**
  - [ ] useCheckInMutation
  - [ ] useUpdateTaskMutation
  - [ ] useDeleteTaskMutation
- [ ] Unit 테스트 커버리지 >= 80%

---

## 4.5.11 Repository Layer

### Repository 패턴 설명

Repository는 데이터 접근 로직을 캡슐화하는 레이어입니다. Server Action과 Supabase 사이에 위치하여:

- DB 쿼리 로직을 한 곳에 집중
- 테스트 용이성 향상 (mocking 가능)
- 쿼리 재사용

### Base Repository

```typescript
// src/repositories/base.repository.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

export type TypedSupabaseClient = SupabaseClient<Database>

// 공통 에러 처리
export function handleSupabaseError(error: unknown): never {
  console.error('Supabase error:', error)
  throw new Error('데이터베이스 오류가 발생했습니다.')
}
```

### Direction Repository

```typescript
// src/repositories/direction.repository.ts
import type { TypedSupabaseClient } from './base.repository'
import { handleSupabaseError } from './base.repository'
import type { Direction, CreateDirectionInput, UpdateDirectionInput } from '@/types/entities'

export const directionRepository = {
  async get(supabase: TypedSupabaseClient, userId: string): Promise<Direction | null> {
    const { data, error } = await supabase
      .from('directions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows
      handleSupabaseError(error)
    }

    return data
  },

  async create(
    supabase: TypedSupabaseClient,
    input: CreateDirectionInput & { user_id: string }
  ): Promise<Direction> {
    const { data, error } = await supabase.from('directions').insert(input).select().single()

    if (error) handleSupabaseError(error)
    return data!
  },

  async update(
    supabase: TypedSupabaseClient,
    id: string,
    input: UpdateDirectionInput
  ): Promise<Direction> {
    const { data, error } = await supabase
      .from('directions')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data!
  },
}
```

### Area Repository

```typescript
// src/repositories/area.repository.ts
import type { TypedSupabaseClient } from './base.repository'
import { handleSupabaseError } from './base.repository'
import type { Area, CreateAreaInput, UpdateAreaInput } from '@/types/entities'

export const areaRepository = {
  async getAll(supabase: TypedSupabaseClient, userId: string): Promise<Area[]> {
    const { data, error } = await supabase
      .from('areas')
      .select('*')
      .eq('user_id', userId)
      .order('order', { ascending: true })

    if (error) handleSupabaseError(error)
    return data ?? []
  },

  async getActive(supabase: TypedSupabaseClient, userId: string): Promise<Area[]> {
    const { data, error } = await supabase
      .from('areas')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('order', { ascending: true })

    if (error) handleSupabaseError(error)
    return data ?? []
  },

  async create(
    supabase: TypedSupabaseClient,
    input: CreateAreaInput & { user_id: string }
  ): Promise<Area> {
    const { data, error } = await supabase.from('areas').insert(input).select().single()

    if (error) handleSupabaseError(error)
    return data!
  },

  async update(supabase: TypedSupabaseClient, id: string, input: UpdateAreaInput): Promise<Area> {
    const { data, error } = await supabase
      .from('areas')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data!
  },

  async delete(supabase: TypedSupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from('areas').delete().eq('id', id)

    if (error) handleSupabaseError(error)
  },

  async reorder(supabase: TypedSupabaseClient, userId: string, ids: string[]): Promise<void> {
    // 트랜잭션이 필요한 경우 RPC 사용
    const updates = ids.map((id, index) => ({
      id,
      order: index,
      updated_at: new Date().toISOString(),
    }))

    for (const update of updates) {
      const { error } = await supabase
        .from('areas')
        .update({ order: update.order, updated_at: update.updated_at })
        .eq('id', update.id)
        .eq('user_id', userId)

      if (error) handleSupabaseError(error)
    }
  },
}
```

### Goal Repository

```typescript
// src/repositories/goal.repository.ts
import type { TypedSupabaseClient } from './base.repository'
import { handleSupabaseError } from './base.repository'
import type { Goal, GoalStatus, CreateGoalInput, UpdateGoalInput } from '@/types/entities'

export const goalRepository = {
  async getAll(supabase: TypedSupabaseClient, userId: string): Promise<Goal[]> {
    const { data, error } = await supabase
      .from('goals')
      .select(
        `
        *,
        area:areas(id, name, emoji, color)
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) handleSupabaseError(error)
    return data ?? []
  },

  async getByStatus(
    supabase: TypedSupabaseClient,
    userId: string,
    status: GoalStatus
  ): Promise<Goal[]> {
    const { data, error } = await supabase
      .from('goals')
      .select(
        `
        *,
        area:areas(id, name, emoji, color)
      `
      )
      .eq('user_id', userId)
      .eq('status', status)
      .order('created_at', { ascending: false })

    if (error) handleSupabaseError(error)
    return data ?? []
  },

  async getByArea(supabase: TypedSupabaseClient, areaId: string): Promise<Goal[]> {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('area_id', areaId)
      .order('created_at', { ascending: false })

    if (error) handleSupabaseError(error)
    return data ?? []
  },

  async getById(supabase: TypedSupabaseClient, id: string): Promise<Goal | null> {
    const { data, error } = await supabase
      .from('goals')
      .select(
        `
        *,
        area:areas(id, name, emoji, color),
        phases:phases(*)
      `
      )
      .eq('id', id)
      .single()

    if (error && error.code !== 'PGRST116') {
      handleSupabaseError(error)
    }

    return data
  },

  async create(
    supabase: TypedSupabaseClient,
    input: CreateGoalInput & { user_id: string }
  ): Promise<Goal> {
    const { data, error } = await supabase.from('goals').insert(input).select().single()

    if (error) handleSupabaseError(error)
    return data!
  },

  async update(supabase: TypedSupabaseClient, id: string, input: UpdateGoalInput): Promise<Goal> {
    const { data, error } = await supabase
      .from('goals')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data!
  },

  async updateStatus(supabase: TypedSupabaseClient, id: string, status: GoalStatus): Promise<Goal> {
    const { data, error } = await supabase
      .from('goals')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data!
  },

  async delete(supabase: TypedSupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from('goals').delete().eq('id', id)

    if (error) handleSupabaseError(error)
  },
}
```

### Phase Repository

```typescript
// src/repositories/phase.repository.ts
import type { TypedSupabaseClient } from './base.repository'
import { handleSupabaseError } from './base.repository'
import type { Phase, CreatePhaseInput, UpdatePhaseInput } from '@/types/entities'

export const phaseRepository = {
  async getByGoal(supabase: TypedSupabaseClient, goalId: string): Promise<Phase[]> {
    const { data, error } = await supabase
      .from('phases')
      .select('*')
      .eq('goal_id', goalId)
      .order('order', { ascending: true })

    if (error) handleSupabaseError(error)
    return data ?? []
  },

  async create(supabase: TypedSupabaseClient, input: CreatePhaseInput): Promise<Phase> {
    const { data, error } = await supabase.from('phases').insert(input).select().single()

    if (error) handleSupabaseError(error)
    return data!
  },

  async update(supabase: TypedSupabaseClient, id: string, input: UpdatePhaseInput): Promise<Phase> {
    const { data, error } = await supabase
      .from('phases')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data!
  },

  async activate(supabase: TypedSupabaseClient, goalId: string, phaseId: string): Promise<Phase> {
    // 1. 현재 Goal의 모든 Phase를 비활성화
    await supabase.from('phases').update({ is_active: false }).eq('goal_id', goalId)

    // 2. 선택한 Phase만 활성화
    const { data, error } = await supabase
      .from('phases')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', phaseId)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data!
  },

  async complete(supabase: TypedSupabaseClient, id: string): Promise<Phase> {
    const { data, error } = await supabase
      .from('phases')
      .update({
        is_completed: true,
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data!
  },

  async delete(supabase: TypedSupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from('phases').delete().eq('id', id)

    if (error) handleSupabaseError(error)
  },

  async reorder(supabase: TypedSupabaseClient, goalId: string, ids: string[]): Promise<void> {
    for (let i = 0; i < ids.length; i++) {
      const { error } = await supabase
        .from('phases')
        .update({ order: i, updated_at: new Date().toISOString() })
        .eq('id', ids[i])
        .eq('goal_id', goalId)

      if (error) handleSupabaseError(error)
    }
  },
}
```

### Task Repository

```typescript
// src/repositories/task.repository.ts
import type { TypedSupabaseClient } from './base.repository'
import { handleSupabaseError } from './base.repository'
import type { Task, CreateTaskInput, UpdateTaskInput } from '@/types/entities'

export const taskRepository = {
  async getAll(supabase: TypedSupabaseClient, userId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select(
        `
        *,
        goal:goals(id, name, area_id),
        phase:phases(id, name)
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) handleSupabaseError(error)
    return data ?? []
  },

  async getToday(supabase: TypedSupabaseClient, userId: string, date: string): Promise<Task[]> {
    // 오늘 해야 할 Task 조회 (repeat_type과 repeat_days 기반)
    // RPC 함수 사용 권장 (Phase 3에서 정의한 get_today_tasks)
    const { data, error } = await supabase.rpc('get_today_tasks', {
      p_user_id: userId,
      p_date: date,
    })

    if (error) handleSupabaseError(error)
    return data ?? []
  },

  async getByGoal(supabase: TypedSupabaseClient, goalId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('goal_id', goalId)
      .order('created_at', { ascending: false })

    if (error) handleSupabaseError(error)
    return data ?? []
  },

  async getByPhase(supabase: TypedSupabaseClient, phaseId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('phase_id', phaseId)
      .order('created_at', { ascending: false })

    if (error) handleSupabaseError(error)
    return data ?? []
  },

  async create(
    supabase: TypedSupabaseClient,
    input: CreateTaskInput & { user_id: string }
  ): Promise<Task> {
    const { data, error } = await supabase.from('tasks').insert(input).select().single()

    if (error) handleSupabaseError(error)
    return data!
  },

  async update(supabase: TypedSupabaseClient, id: string, input: UpdateTaskInput): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data!
  },

  async toggleActive(supabase: TypedSupabaseClient, id: string): Promise<Task> {
    // 현재 상태를 가져와서 토글
    const { data: current, error: fetchError } = await supabase
      .from('tasks')
      .select('is_active')
      .eq('id', id)
      .single()

    if (fetchError) handleSupabaseError(fetchError)

    const { data, error } = await supabase
      .from('tasks')
      .update({
        is_active: !current!.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data!
  },

  async delete(supabase: TypedSupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from('tasks').delete().eq('id', id)

    if (error) handleSupabaseError(error)
  },
}
```

### CheckIn Repository

```typescript
// src/repositories/checkin.repository.ts
import type { TypedSupabaseClient } from './base.repository'
import { handleSupabaseError } from './base.repository'
import type { CheckIn, CheckInStatus, CreateCheckInInput } from '@/types/entities'

export const checkInRepository = {
  async getByDate(supabase: TypedSupabaseClient, userId: string, date: string): Promise<CheckIn[]> {
    const { data, error } = await supabase
      .from('checkins')
      .select(
        `
        *,
        task:tasks(id, name, goal_id)
      `
      )
      .eq('user_id', userId)
      .eq('date', date)

    if (error) handleSupabaseError(error)
    return data ?? []
  },

  async getByTask(supabase: TypedSupabaseClient, taskId: string, limit = 30): Promise<CheckIn[]> {
    const { data, error } = await supabase
      .from('checkins')
      .select('*')
      .eq('task_id', taskId)
      .order('date', { ascending: false })
      .limit(limit)

    if (error) handleSupabaseError(error)
    return data ?? []
  },

  async create(
    supabase: TypedSupabaseClient,
    input: CreateCheckInInput & { user_id: string }
  ): Promise<CheckIn> {
    // RPC 사용하여 스트릭 계산과 함께 생성 (원자적 처리)
    const { data, error } = await supabase.rpc('create_checkin_with_streak', {
      p_task_id: input.task_id,
      p_user_id: input.user_id,
      p_date: input.date,
      p_status: input.status,
      p_note: input.note,
    })

    if (error) handleSupabaseError(error)
    return data
  },

  async delete(supabase: TypedSupabaseClient, id: string, userId: string): Promise<void> {
    const { error } = await supabase.from('checkins').delete().eq('id', id).eq('user_id', userId)

    if (error) handleSupabaseError(error)
  },

  async getStreakInfo(
    supabase: TypedSupabaseClient,
    taskId: string
  ): Promise<{ current: number; longest: number }> {
    const { data, error } = await supabase.rpc('get_streak_info', { p_task_id: taskId })

    if (error) handleSupabaseError(error)
    return data ?? { current: 0, longest: 0 }
  },
}
```

### Reflection Repository

```typescript
// src/repositories/reflection.repository.ts
import type { TypedSupabaseClient } from './base.repository'
import { handleSupabaseError } from './base.repository'
import type {
  DailyReflection,
  CreateReflectionInput,
  UpdateReflectionInput,
} from '@/types/entities'

export const reflectionRepository = {
  async getByDate(
    supabase: TypedSupabaseClient,
    userId: string,
    date: string
  ): Promise<DailyReflection | null> {
    const { data, error } = await supabase
      .from('daily_reflections')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .single()

    if (error && error.code !== 'PGRST116') {
      handleSupabaseError(error)
    }

    return data
  },

  async getByDateRange(
    supabase: TypedSupabaseClient,
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<DailyReflection[]> {
    const { data, error } = await supabase
      .from('daily_reflections')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })

    if (error) handleSupabaseError(error)
    return data ?? []
  },

  async create(
    supabase: TypedSupabaseClient,
    input: CreateReflectionInput & { user_id: string }
  ): Promise<DailyReflection> {
    const { data, error } = await supabase.from('daily_reflections').insert(input).select().single()

    if (error) handleSupabaseError(error)
    return data!
  },

  async update(
    supabase: TypedSupabaseClient,
    id: string,
    input: UpdateReflectionInput
  ): Promise<DailyReflection> {
    const { data, error } = await supabase
      .from('daily_reflections')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data!
  },

  async delete(supabase: TypedSupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from('daily_reflections').delete().eq('id', id)

    if (error) handleSupabaseError(error)
  },
}
```

### AI Message Repository

```typescript
// src/repositories/ai-message.repository.ts
import type { TypedSupabaseClient } from './base.repository'
import { handleSupabaseError } from './base.repository'
import type { AIMessage, AiMessageTrigger } from '@/types/entities'

export const aiMessageRepository = {
  async getAll(supabase: TypedSupabaseClient, userId: string): Promise<AIMessage[]> {
    const { data, error } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) handleSupabaseError(error)
    return data ?? []
  },

  async getUnread(supabase: TypedSupabaseClient, userId: string): Promise<AIMessage[]> {
    const { data, error } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })

    if (error) handleSupabaseError(error)
    return data ?? []
  },

  async create(
    supabase: TypedSupabaseClient,
    input: { user_id: string; trigger: AiMessageTrigger; content: string }
  ): Promise<AIMessage> {
    const { data, error } = await supabase
      .from('ai_messages')
      .insert({
        user_id: input.user_id,
        trigger: input.trigger,
        content: input.content,
        is_read: false,
      })
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data!
  },

  async markAsRead(supabase: TypedSupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from('ai_messages').update({ is_read: true }).eq('id', id)

    if (error) handleSupabaseError(error)
  },

  async markAllAsRead(supabase: TypedSupabaseClient, userId: string): Promise<void> {
    const { error } = await supabase
      .from('ai_messages')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) handleSupabaseError(error)
  },
}
```

### Profile Repository

```typescript
// src/repositories/profile.repository.ts
import type { TypedSupabaseClient } from './base.repository'
import { handleSupabaseError } from './base.repository'
import type { Profile, UpdateProfileInput } from '@/types/entities'

export const profileRepository = {
  async get(supabase: TypedSupabaseClient, userId: string): Promise<Profile | null> {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()

    if (error && error.code !== 'PGRST116') {
      handleSupabaseError(error)
    }

    return data
  },

  async update(
    supabase: TypedSupabaseClient,
    userId: string,
    input: UpdateProfileInput
  ): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data!
  },

  async completeOnboarding(supabase: TypedSupabaseClient, userId: string): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data!
  },
}
```

### Stats Repository

```typescript
// src/repositories/stats.repository.ts
import type { TypedSupabaseClient } from './base.repository'
import { handleSupabaseError } from './base.repository'
import type { WeeklyStats, MonthlyStats, AreaBalance } from '@/types/entities'

export const statsRepository = {
  async getWeeklyStats(
    supabase: TypedSupabaseClient,
    userId: string,
    weekStart: string
  ): Promise<WeeklyStats> {
    const { data, error } = await supabase.rpc('get_weekly_stats', {
      p_user_id: userId,
      p_week_start: weekStart,
    })

    if (error) handleSupabaseError(error)
    return data
  },

  async getMonthlyStats(
    supabase: TypedSupabaseClient,
    userId: string,
    month: string // YYYY-MM
  ): Promise<MonthlyStats> {
    const { data, error } = await supabase.rpc('get_monthly_stats', {
      p_user_id: userId,
      p_month: month,
    })

    if (error) handleSupabaseError(error)
    return data
  },

  async getAreaBalance(supabase: TypedSupabaseClient, userId: string): Promise<AreaBalance[]> {
    const { data, error } = await supabase.rpc('get_area_balance', { p_user_id: userId })

    if (error) handleSupabaseError(error)
    return data ?? []
  },

  async getStreakLeaderboard(
    supabase: TypedSupabaseClient,
    userId: string
  ): Promise<Array<{ task_id: string; task_name: string; streak: number }>> {
    const { data, error } = await supabase.rpc('get_streak_leaderboard', { p_user_id: userId })

    if (error) handleSupabaseError(error)
    return data ?? []
  },
}
```

---

## 🔗 Navigation

← [Phase 4: Types & Services](./phase-4-services.md)
→ [Phase 4.75: Landing & Authentication](./phase-4.75-auth.md)

---

_Version: 1.0 | Last Updated: 2026-02-03_
