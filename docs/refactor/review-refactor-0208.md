# Review 기능 전면 리팩토링 플랜 (2026-02-08)

## Context

리뷰 기능이 여러 차례 개편되면서 다음 문제들이 누적됨:

- 레거시 컴포넌트 13개가 barrel export에만 존재하고 실제 미사용
- 동일 로직이 10+ 곳에 인라인 반복 (calculateCheckInRate, MiniDot, 인라인 ProgressBar, 완료율 색상)
- 중복 데이터 페칭 — `ReviewHomePanel` 하나에서 **5개 Supabase 쿼리** 발생 (useReviewStats + useCheckInHistory + useMoodHistory + useReviewRoadmapData + useReviewPeriod×2)
- 구 스타일링 컨벤션과 신 CSS 변수 방식 혼재 (4개 활성 파일, 16건)
- 실제 버그 2건 (goal-detail에서 active 아닌 goal 못 찾음, generate-prompts 주중/주말 판별)
- 미사용 hook/export가 barrel을 통해 공개 API처럼 보임
- store에 dead action 존재 (`setPanelMode` 정의만 있고 호출 없음)
- `<ProgressBar>` UI 컴포넌트가 있는데 4곳에서 인라인 구현 사용
- Zustand store wholesale destructure로 불필요한 re-render 발생 (4개 컴포넌트)
- `useMemo` dependency가 매 렌더 새 배열 → memo 무효 (`review-progress-view.tsx`)
- 활성 컴포넌트에서 Supabase 쿼리 error 상태 미처리 (CLAUDE.md 규칙 위반)

---

## A. 죽은 파일 삭제 (13개)

barrel export에만 존재하고 **어디서도 실제 import 없는** 파일들:

| 삭제 대상                             | 비고                                                   |
| ------------------------------------- | ------------------------------------------------------ |
| `components/review-header.tsx`        | 미사용                                                 |
| `components/overview-stats.tsx`       | 미사용                                                 |
| `components/checkin-chart.tsx`        | 미사용                                                 |
| `components/area-breakdown.tsx`       | 미사용                                                 |
| `components/mood-trend.tsx`           | 미사용                                                 |
| `components/goal-progress.tsx`        | 미사용                                                 |
| `components/compact-review-stats.tsx` | 미사용                                                 |
| `components/no-data-section.tsx`      | 미사용                                                 |
| `components/review-area-section.tsx`  | review-goal-card만 사용 → 둘 다 미사용                 |
| `components/review-goal-card.tsx`     | review-area-section/review-task-row만 사용 → 미사용    |
| `components/review-task-row.tsx`      | review-goal-card만 사용 → 미사용                       |
| `components/journey-summary.tsx`      | review-overview.tsx의 이전 버전. 완전한 복사본, 미사용 |
| `components/weekly-reflection.tsx`    | reflection-step-form.tsx으로 대체된 구버전, 미사용     |

**수정 파일**:

- `components/index.ts` — 삭제 파일 export 제거
- `index.ts` — 삭제 파일 export 제거

---

## B. 버그 수정

### B-1. Goal Detail Panel — active 외 goal 못 찾는 버그

**문제**: `goal-detail-panel.tsx:19`에서 `useGoals('active')` 사용. 하지만 `useReviewRoadmapData`는 `VISIBLE_STATUSES = ['active', 'backlog', 'paused', 'completed']`로 모든 상태의 goal을 표시함.

`AreaDeepDivePanel` → goal 클릭 → `selectGoal()` → `ReviewGoalDetailPanel` → **active가 아닌 goal이면 "목표를 찾을 수 없어요" 표시됨**

**수정**: `useGoals('active')` → `useGoals()` (전체 goal 조회)

### B-2. generate-prompts.ts — 주중/주말 판별 버그

**문제**: `generate-prompts.ts:91-94` — `history.slice(0, 5)` / `history.slice(5)`로 주중/주말 분류. `checkInHistory`는 체크인이 있는 날짜만 포함하므로 월/화 체크인이 없으면 수요일이 첫 원소가 되어 분류가 완전히 틀어짐.

**수정**: `getDay(parseISO(d.date))`로 실제 요일 기반 분류

---

## C. 중복 로직 통합

### C-1. MOOD_EMOJIS 중복 제거

- **정본**: `review-utils.ts:36-42`
- **중복**: `review-overview.tsx:17-23` (로컬 재선언)
- **수정**: `review-overview.tsx`에서 로컬 삭제, `import { MOOD_EMOJIS } from '../utils/review-utils'` 추가

### C-2. getGrowthMessage 3중 중복 — 이름 명확화

같은 이름 `getGrowthMessage`가 3곳에 다른 시그니처로 존재:

- `day-breakdown-panel.tsx:289` — `(completed, total, missed)` → **`getDayGrowthMessage`**
- `area-deep-dive-panel.tsx:255` — `(rate, topGoal, areaName)` → **`getAreaGrowthMessage`**
- `review-task-detail-panel.tsx:192` — `(rate, streak)` → **`getTaskGrowthMessage`**

### C-3. completionRate 인라인 계산 → `calculateCheckInRate` 유틸 활용

`Math.round((done / total) * 100)` 패턴이 **8곳**에서 인라인 반복. 이미 존재하는 `review-utils.ts:calculateCheckInRate`은 **어디서도 사용 안 됨**.

| 파일                          | 라인             |
| ----------------------------- | ---------------- |
| `use-review-stats.ts`         | :31              |
| `use-area-stats.ts`           | :55              |
| `use-area-goal-stats.ts`      | :60              |
| `use-goal-checkin-history.ts` | :59              |
| `use-review-roadmap-data.ts`  | :123, :143, :166 |
| `day-breakdown-panel.tsx`     | :93              |

### C-4. MiniDot 컴포넌트 3중 구현 → 공유 컴포넌트 추출

동일한 체크인 상태 도트가 **3개** 활성 파일에서 별도 구현:

- `review-progress-view.tsx:284-294` — `h-2 w-2`, date 없음
- `goal-detail-panel.tsx:230-241` — `h-3 w-3`, date tooltip 있음
- `area-deep-dive-panel.tsx:233-245` — `h-2.5 w-2.5`, date 없음 (인라인, 함수 아님)

**수정**: `StatusDot` 공유 컴포넌트 추출 (size prop + optional date tooltip):

```typescript
function StatusDot({
  status,
  size = 'sm',
  date,
}: {
  status: CheckInStatus
  size?: 'xs' | 'sm' | 'md'
  date?: string
})
// xs = h-2 w-2, sm = h-2.5 w-2.5, md = h-3 w-3
```

### C-5. 인라인 Progress Bar 4곳 → 공유 `<ProgressBar>` 사용

`@/components/ui/progress`에 `<ProgressBar>` 컴포넌트가 이미 존재하고 `color` prop도 지원. 하지만 4곳에서 인라인 구현 사용:

| 파일                           | 라인                                   |
| ------------------------------ | -------------------------------------- |
| `review-home-panel.tsx`        | :135-143                               |
| `review-task-detail-panel.tsx` | :130-135                               |
| `area-deep-dive-panel.tsx`     | :87-95 (영역 전체), :218-226 (GoalRow) |

반면 `review-progress-view.tsx:166`은 올바르게 `<ProgressBar>` 사용 중.

**수정**: 4곳 모두 `<ProgressBar value={rate} color={color} />` 로 교체. 높이가 다른 경우 `size` prop 필요 시 ProgressBar에 추가.

### C-6. 완료율 색상 로직 5곳 반복 → 유틸 추출

`>= 80 → done, >= 50 → primary, else secondary` 패턴이 5곳에서 동일하게 반복:

| 파일                           | 라인     | else 분기                    |
| ------------------------------ | -------- | ---------------------------- |
| `review-task-detail-panel.tsx` | :120-124 | `text-secondary`             |
| `review-home-panel.tsx`        | :148-152 | `text-secondary`             |
| `area-deep-dive-panel.tsx`     | :77-81   | **`text-primary`** (불일치!) |
| `area-deep-dive-panel.tsx`     | :203-207 | `text-secondary`             |
| `goal-detail-panel.tsx`        | :186-190 | `text-secondary`             |

> **주의**: `area-deep-dive-panel.tsx:81`만 else에서 `text-[var(--color-text-primary)]` 사용. 나머지 4곳은 `text-secondary`. 통합 시 `text-secondary`로 통일.

**수정**: `review-utils.ts`에 추가:

```typescript
export function getCompletionColorClass(rate: number): string {
  if (rate >= 80) return 'text-[var(--color-done)]'
  if (rate >= 50) return 'text-[var(--color-primary-500)]'
  return 'text-[var(--color-text-secondary)]'
}
```

### C-7. `generate-narrative.ts` → `generate-insight.ts` 통합

- `generate-narrative.ts`: `generateGreeting` 1개 함수만 export. 유일한 활성 사용처는 `review-overview.tsx`.
- `generate-insight.ts`: `generateInsightText`, `generateGrowthSummary` export. 사용처는 `review-home-panel.tsx`.
- 둘 다 "성장 마인드셋 메시징" 유틸리티. 파일 2개로 나눌 이유 없음.

**수정**: `generateGreeting`을 `generate-insight.ts`로 이동, `generate-narrative.ts` 삭제. utils barrel도 정리.

---

## D. 데이터 페칭 최적화

### D-1. `useReviewPeriod()` 이중 호출 제거

**문제**: `review-home-panel.tsx:18,23` — 같은 컴포넌트에서 같은 훅 2번 호출

```typescript
const { periodLabel, isWeek, startDate, endDate } = useReviewPeriod() // 1번
const { getDateRange } = useReviewPeriod() // 2번
```

**수정**: 한 번의 호출로 통합

### D-2. `useAreaStats` + `useReviewRoadmapData` 중복 쿼리 통합

**문제**: 두 훅이 거의 같은 Supabase 쿼리 수행.
`ReviewHomePanel`에서 **둘 다** 호출 → 중복 네트워크 요청.
`useReflectionPrompts`도 내부에서 `useAreaStats` 호출.

**수정**: `review-utils.ts`에 `deriveAreaStats(roadmapData)` 추가.
`ReviewHomePanel`과 `useReflectionPrompts`에서 `useAreaStats` 대신 `useReviewRoadmapData` + `deriveAreaStats` 사용.

### D-3. `useReviewStats` + `useReviewRoadmapData` 중복 쿼리 통합

**문제**: `useReviewStats`는 2개의 별도 Supabase 쿼리 실행:

1. `check_ins` 테이블 → `checkInRate`, `completedTasks`, `totalTasks` 계산
2. `tasks` 테이블 → `currentStreak`, `bestStreak` 계산

`useReviewRoadmapData`도 동일한 데이터를 이미 포함:

- 모든 task의 `streak_count`, `best_streak` → streaks 파생 가능
- 모든 task의 check_ins → completion rate 파생 가능

`ReviewHomePanel`에서 **둘 다** 호출 → 3개 중복 쿼리.

**수정**: `review-utils.ts`에 `deriveReviewStats(roadmapData)` 추가.
`ReviewHomePanel`에서 `useReviewStats` 제거, `useReviewRoadmapData` + `deriveReviewStats` 사용.
`page.tsx`의 loading 체크와 `review-overview.tsx`의 narrative 생성에서는 `useReviewStats` 유지 (해당 컴포넌트는 roadmapData를 이미 로드하지 않으므로).

### D-4. `useReviewRoadmapData`에서 비활성 태스크 필터링 누락

**문제**: `use-review-roadmap-data.ts:102` — `is_active` 무시. 비활성 태스크도 완료율 계산에 포함.

**수정**: `.filter(t => t.is_active)` 추가

---

## E. 스타일링 컨벤션 통일

구 Tailwind 클래스명을 CSS 변수 방식으로 통일. **4개 활성 파일, 16건**:

| 파일                        | 건수 | 예시                                                               |
| --------------------------- | ---- | ------------------------------------------------------------------ |
| `review-skeleton.tsx`       | 12건 | `bg-surface-tertiary` → `bg-[var(--color-bg-tertiary)]`            |
| `empty-review.tsx`          | 1건  | `text-foreground-secondary` → `text-[var(--color-text-secondary)]` |
| `review-error-boundary.tsx` | 1건  | `text-foreground-secondary` → `text-[var(--color-text-secondary)]` |
| `period-selector.tsx`       | 2건  | `bg-primary-50 text-primary-600` → CSS var 방식                    |

---

## F. 타입 안전성 강화

### F-1. `use-area-stats.ts:54` — unsafe 이중 캐스팅

```typescript
why: ((area as Record<string, unknown>).why as string | null) ?? null,
```

**수정**: `(area.why as string | null) ?? null`

### F-2. `goal-detail-panel.tsx` — 불필요/unsafe 인라인 타입 어노테이션 (4곳)

```typescript
// :23 — 불필요
goals.find((g: { id: string }) => g.id === selectedGoalId)
// :37 — 불필요
phases.filter((p: { status: string }) => p.status === 'completed')
// :39 — 불필요
phases.findIndex((p: { status: string }) => p.status === 'active')
// :100 — unsafe (status: string → PhaseStatus여야 함)
phases.map((phase: { id: string; name: string; status: string }) => ...)
```

**수정**: `useGoals()` 리턴이 `Goal[]`, `GoalReviewData.phases`가 `Array<{ status: PhaseStatus }>` 타입이므로 인라인 전부 불필요 → 제거

### F-3. `day-breakdown-panel.tsx:152` — unsafe mood 캐스팅

```typescript
{
  MOOD_EMOJIS[reflection.mood as MoodLevel]
}
```

**수정**: `{reflection.mood && MOOD_EMOJIS[reflection.mood]}`

---

## G. 미사용 코드 정리

### G-1. `ChartSkeleton` — 미사용 컴포넌트

- 정의: `review-skeleton.tsx:53-60`
- 사용처: **없음**
- **수정**: 함수 삭제 + barrel export 제거

### G-2. `useMonthlyReflection` / `useSaveMonthlyReflection` — UI 없는 premature hook

- 정의: `use-monthly-reflection.ts`
- 사용처: **없음** (barrel export에만 존재)
- **수정**: barrel export에서만 제거 (파일 유지)

### G-3. `getCurrentWeekStart` — 이중 정의

- `stats.actions.ts:53-59` (서버 async, AI chat에서 간접 사용)
- `use-weekly-reflection.ts:13-15` (클라이언트 sync, 실제 사용)
- **수정**: `actions/index.ts`에서 `getCurrentWeekStart` re-export 제거 + `hooks/index.ts:9`에서도 export 제거 + review barrel에서도 제거

### G-4. `setPanelMode` — dead store action

- 정의: `review.store.ts:26,65` — interface + implementation
- 사용처: **없음** — 모든 패널 모드 전환은 `selectDay/selectArea/selectGoal/selectTask/clearSelection`으로 처리
- (참고: roadmap store와 home store의 `setPanelMode`는 정상 사용 중)
- **수정**: interface에서 `setPanelMode` 제거, implementation에서도 제거

### G-5. Barrel export 대폭 정리 — 미사용 외부 API 제거

`index.ts` 분석: 외부에서 import하는 곳은 `page.tsx` **딱 1곳**뿐.

현재 page.tsx에서 실제 import하는 것:

```typescript
import { PeriodSelector, ReviewSkeleton, ReviewErrorBoundary, EmptyReview } from '@/features/review'
import { useReviewStats, useReviewPeriod } from '@/features/review'
```

나머지 barrel export는 **외부에서 전혀 사용되지 않음**:

- 모든 type export (`ReviewPeriod`, `ReviewStats`, `DayHistory` 등 8개) — 외부 사용 0건
- utils export (`calculateCheckInRate`, `MOOD_VALUES` 등 7개) — 외부 사용 0건
- 대부분의 hook export — 외부 사용 없음 (내부 컴포넌트는 직접 import)

**수정**: barrel을 page.tsx가 필요한 것만으로 축소:

```typescript
// Components
export { ReviewOverview } from './components/review-overview'
export { PeriodSelector } from './components/period-selector'
export { ReviewSkeleton } from './components/review-skeleton'
export { EmptyReview } from './components/empty-review'
export { ReviewErrorBoundary } from './components/review-error-boundary'
export { ReviewProgressView } from './components/review-progress-view'
export { ReviewDetailPanel } from './components/review-detail-panel'
export { ReflectionStepForm } from './components/reflection-step-form'
export { ReflectionStatusCard } from './components/reflection-status-card'
export { MobileReflectionDrawer } from './components/mobile-reflection-drawer'
export { InlineReflectionForm } from './components/inline-reflection-form'

// Hooks (page.tsx에서 사용)
export { useReviewPeriod } from './hooks/use-review-period'
export { useReviewStats } from './hooks/use-review-stats'
```

> **주의**: `InlineReflectionForm`이 기존 제안에서 누락되어 있었음. `page.tsx:13`에서 직접 import 중이므로 barrel에 반드시 포함.

---

## H. `generate-narrative.ts` — 월간 미지원 + 통합

### H-1. generateGreeting이 "한 주"만 하드코딩

**문제**: `generate-narrative.ts:17-24`에서 월간 뷰에서도 "한 주" 표시

**수정**: `period` 파라미터 추가 후 `generate-insight.ts`로 이동 (C-7과 합산).
호출부 `review-overview.tsx`에서 `isWeek ? 'week' : 'month'` 전달.

---

## I. Store 정리

### I-1. `useReviewStore` selectX 리셋 반복

**문제**: `review.store.ts:67-104` — `selectDay/Area/Goal/Task` + `clearSelection` 5개 모두 동일한 null 리셋 패턴 반복

**수정**: 내부 상수 추출 (G-4의 setPanelMode 삭제와 함께):

```typescript
const CLEAR_SELECTIONS = {
  selectedDate: null, selectedAreaId: null,
  selectedGoalId: null, selectedTaskId: null,
}

selectDay: (date) => {
  usePanelDateStore.getState().setSelectedDate(parseISO(date))
  set({ ...CLEAR_SELECTIONS, panelMode: 'day-breakdown', selectedDate: date })
},
```

---

## J-a. Zustand selector 패턴 통일 → 불필요 re-render 제거

### J-a-1. wholesale destructure → 개별 selector

**문제**: 여러 컴포넌트에서 `useReviewStore()` wholesale destructure 사용.
Zustand에서 selector 없이 호출하면 store의 **모든** 상태 변화에 re-render가 발생함.

**가장 심한 케이스** — `review-progress-view.tsx:18-19`:

```typescript
const { selectGoal, selectTask, selectArea, clearSelection } = useReviewStore() // 전체 구독!
const selectedAreaId = useReviewStore((s) => s.selectedAreaId) // 개별 구독
```

→ 첫 줄 때문에 어떤 리뷰 상태가 바뀌어도 전체 AreaCard grid가 re-render됨.

| 파일                           | 라인   | 현재 패턴                  |
| ------------------------------ | ------ | -------------------------- |
| `review-progress-view.tsx`     | :18-19 | wholesale + selector 혼용  |
| `goal-detail-panel.tsx`        | :18    | wholesale 전체 destructure |
| `area-deep-dive-panel.tsx`     | :17    | wholesale 전체 destructure |
| `review-task-detail-panel.tsx` | :19    | wholesale 전체 destructure |

**수정**: action 함수도 개별 selector로 추출:

```typescript
// Before
const { selectGoal, selectTask, selectArea, clearSelection } = useReviewStore()

// After
const selectGoal = useReviewStore((s) => s.selectGoal)
const selectTask = useReviewStore((s) => s.selectTask)
const selectArea = useReviewStore((s) => s.selectArea)
const clearSelection = useReviewStore((s) => s.clearSelection)
```

### J-a-2. `review-progress-view.tsx` — useMemo dependency 무효

**문제**: `review-progress-view.tsx:78,87`:

```typescript
const activeGoals = goals.filter((g) => g.goal.status === 'active') // 매번 새 배열 생성

const activeDays = useMemo(() => {
  // ... 계산 ...
}, [activeGoals]) // activeGoals가 매 렌더 새 참조 → useMemo 무효
```

**수정**: `activeGoals`도 `useMemo`로 감싸기:

```typescript
const activeGoals = useMemo(() => goals.filter((g) => g.goal.status === 'active'), [goals])
```

---

## J-b. error 상태 처리 추가

**문제**: CLAUDE.md 규칙 "Supabase 쿼리: loading/error 상태 필수 처리"를 위반하는 활성 컴포넌트들.
TanStack Query가 `isError`/`error`를 리턴하지만 컴포넌트에서 무시 → 쿼리 실패 시 빈 화면.

| 파일                          | 사용 훅                                                                                                 | 현재 처리          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------ |
| `review-home-panel.tsx:19-22` | `useReviewStats()` + `useCheckInHistory()` + `useMoodHistory()` + `useReviewRoadmapData()` — **4개 훅** | `isError` **전무** |
| `review-progress-view.tsx:17` | `useReviewRoadmapData()`                                                                                | `isLoading`만      |
| `review-overview.tsx`         | `useReviewStats()` + `useMoodHistory()`                                                                 | `isLoading`만      |
| `area-deep-dive-panel.tsx`    | `useAreaGoalStats()` + `useGoalCheckInHistory()`                                                        | 부분적             |

**수정**: 각 컴포넌트에서 `isError` destructure + 에러 시 간단한 fallback UI:

```typescript
const { data: areas, isLoading, isError } = useReviewRoadmapData()

if (isError) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12">
      <p className="text-sm text-[var(--color-text-tertiary)]">데이터를 불러오지 못했어요</p>
    </div>
  )
}
```

---

## J. Import 일관성 정리

### J-1. `review/page.tsx` — barrel vs 직접 import 혼용

**현재**: 일부 `@/features/review`, 일부 `@/features/review/components/*`
**수정**: barrel export 축소(G-5) 후 page.tsx는 barrel만 사용하도록 통일

### J-2. `use-monthly-reflection.ts` vs `use-weekly-reflection.ts` — import 경로 불일치

- weekly: `from '@/actions'` (barrel)
- monthly: `from '@/actions/monthly-reflection.actions'` (직접)
  **수정**: 둘 다 직접 import으로 통일

---

## K. 추가 발견 사항

### K-1. Reflection 훅 staleTime 누락

**문제**: 다른 모든 review 훅(`useReviewStats`, `useCheckInHistory`, `useMoodHistory`, `useAreaStats`, `useAreaGoalStats`, `useGoalCheckInHistory`, `useReviewRoadmapData`)은 `staleTime: STALE_TIMES.STATS`를 설정하는데, reflection 훅 2개만 빠져있음.

| 파일                              | staleTime |
| --------------------------------- | --------- |
| `use-weekly-reflection.ts:24-33`  | **없음**  |
| `use-monthly-reflection.ts:14-25` | **없음**  |

**수정**: 두 훅 모두 `staleTime: STALE_TIMES.STATS` 추가

### K-2. `VISIBLE_STATUSES`에 'maintenance' 누락

**문제**: `use-review-roadmap-data.ts:61` — `['active', 'backlog', 'paused', 'completed']`

데이터 모델 정의상 Maintenance = "달성 후 유지 모드, 유지 Habit만 표시". Maintenance goal은 활성 체크인이 있는 상태이므로 리뷰에서 보여야 함. 현재는 maintenance goal의 태스크 체크인 기록이 리뷰에서 완전히 누락됨.

**수정**: `VISIBLE_STATUSES`에 `'maintenance'` 추가

```typescript
const VISIBLE_STATUSES: GoalStatus[] = ['active', 'backlog', 'paused', 'completed', 'maintenance']
```

### K-3. 매직넘버 `7` → 상수 추출

**문제**: 최근 체크인 7일 표시를 위한 `.slice(0, 7)`이 하드코딩:

| 파일                          | 라인 |
| ----------------------------- | ---- |
| `use-review-roadmap-data.ts`  | :111 |
| `use-goal-checkin-history.ts` | :50  |

**수정**: `review-utils.ts`에 상수 추가 후 2곳에서 사용:

```typescript
export const RECENT_CHECKINS_LIMIT = 7
```

---

## 수정 대상 파일 종합

| 파일                                       | 액션                                                                                                            | 관련 섹션                      |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| **삭제**                                   |                                                                                                                 |                                |
| 레거시 컴포넌트 13개                       | **삭제**                                                                                                        | A                              |
| `utils/generate-narrative.ts`              | **삭제** (→ generate-insight.ts로 이동)                                                                         | C-7                            |
| **수정 — Store/Actions**                   |                                                                                                                 |                                |
| `src/stores/review.store.ts`               | setPanelMode 삭제 + 리셋 패턴 추출                                                                              | G-4, I-1                       |
| `src/actions/index.ts`                     | `getCurrentWeekStart` re-export 제거                                                                            | G-3                            |
| **수정 — Barrel exports**                  |                                                                                                                 |                                |
| `components/index.ts`                      | 죽은 export 제거                                                                                                | A                              |
| `hooks/index.ts`                           | monthly hook export 제거 + `getCurrentWeekStart` export 제거                                                    | G-2, G-3                       |
| `utils/index.ts`                           | generate-narrative 제거, generateGreeting 추가                                                                  | C-7                            |
| `index.ts` (feature)                       | 대폭 축소 — 실제 사용되는 것만                                                                                  | G-5                            |
| **수정 — Utils**                           |                                                                                                                 |                                |
| `utils/review-utils.ts`                    | `deriveAreaStats`, `deriveReviewStats`, `getCompletionColorClass`, `RECENT_CHECKINS_LIMIT` 추가                 | C-6, D-2, D-3, K-3             |
| `utils/generate-insight.ts`                | `generateGreeting` 이동 + period 지원                                                                           | C-7, H-1                       |
| `utils/generate-prompts.ts`                | weekday/weekend 버그 수정                                                                                       | B-2                            |
| **수정 — Hooks**                           |                                                                                                                 |                                |
| `hooks/use-review-stats.ts`                | `calculateCheckInRate` 활용                                                                                     | C-3                            |
| `hooks/use-area-stats.ts`                  | 타입 단순화 + `calculateCheckInRate`                                                                            | C-3, F-1                       |
| `hooks/use-area-goal-stats.ts`             | `calculateCheckInRate`                                                                                          | C-3                            |
| `hooks/use-goal-checkin-history.ts`        | `calculateCheckInRate` + 매직넘버 상수화                                                                        | C-3, K-3                       |
| `hooks/use-review-roadmap-data.ts`         | `calculateCheckInRate` + `is_active` 필터 + `maintenance` 추가 + 매직넘버 상수화                                | C-3, D-4, K-2, K-3             |
| `hooks/use-reflection-prompts.ts`          | `deriveAreaStats` 사용 (useAreaStats 제거)                                                                      | D-2                            |
| `hooks/use-weekly-reflection.ts`           | import 경로 통일 + staleTime 추가                                                                               | J-2, K-1                       |
| `hooks/use-monthly-reflection.ts`          | import 경로 통일 + staleTime 추가                                                                               | J-2, K-1                       |
| **수정 — Components**                      |                                                                                                                 |                                |
| `components/review-overview.tsx`           | MOOD_EMOJIS import + period 전달                                                                                | C-1, H-1                       |
| `components/review-skeleton.tsx`           | 구 클래스 → CSS 변수 + ChartSkeleton 삭제                                                                       | E, G-1                         |
| `components/empty-review.tsx`              | 구 클래스 → CSS 변수                                                                                            | E                              |
| `components/review-error-boundary.tsx`     | 구 클래스 → CSS 변수                                                                                            | E                              |
| `components/period-selector.tsx`           | 구 클래스 → CSS 변수                                                                                            | E                              |
| `components/review-progress-view.tsx`      | MiniDot → 공유 StatusDot + selector 통일 + useMemo 수정 + error 처리                                            | C-4, J-a-1, J-a-2, J-b         |
| `components/review-overview.tsx`           | error 처리 추가                                                                                                 | J-b                            |
| **수정 — Panel modes**                     |                                                                                                                 |                                |
| `panel-modes/goal-detail-panel.tsx`        | useGoals() 전체 조회 + 인라인 타입 제거(:23,:37,:39,:100) + MiniDot→StatusDot + completionColor + selector 통일 | B-1, F-2, C-4, C-6, J-a-1      |
| `panel-modes/day-breakdown-panel.tsx`      | calculateCheckInRate + 함수명 + mood 캐스팅                                                                     | C-2, C-3, F-3                  |
| `panel-modes/area-deep-dive-panel.tsx`     | 함수명 + ProgressBar + completionColor(:81 수정) + selector 통일 + error 처리 + 인라인 MiniDot→StatusDot        | C-2, C-4, C-5, C-6, J-a-1, J-b |
| `panel-modes/review-task-detail-panel.tsx` | 함수명 + ProgressBar + completionColor + selector 통일                                                          | C-2, C-5, C-6, J-a-1           |
| `panel-modes/review-home-panel.tsx`        | useReviewPeriod 통합 + useReviewStats→derive + ProgressBar + completionColor + error 처리                       | D-1, D-3, C-5, C-6, J-b        |
| **수정 — Page**                            |                                                                                                                 |                                |
| `src/app/(main)/review/page.tsx`           | import 정리 (barrel 사용 통일)                                                                                  | J-1                            |

---

## Verification

1. `npm run type-check` — 타입 에러 없음 확인
2. `npm run lint` — 미사용 import/변수 경고 없음 확인
3. `npm run build` — 빌드 성공 확인
4. 브라우저 `/review` 접속:
   - 주간/월간 전환 정상 + 내러티브가 "한 주"/"한 달" 올바르게 표시
   - 일별 클릭 → day-breakdown 패널 정상
   - 영역 클릭 → area-deep-dive → **backlog/paused goal 클릭 시에도** goal-detail 정상 (B-1 검증)
   - 태스크 드릴다운 정상
   - 주간 리플렉션 폼 (데스크톱 + 모바일) 작성/저장 정상
   - Empty state / Loading skeleton 스타일 정상 (CSS 변수 반영)
   - 성장 메시지가 모든 패널에서 표시
5. 개발자 도구 Network 탭:
   - ReviewHomePanel에서 area 관련 쿼리가 3개→1개로 줄었는지 확인 (D-2, D-3)
   - Stats 관련 별도 쿼리 없어졌는지 확인 (D-3)
6. React DevTools Profiler:
   - ReviewProgressView에서 AreaCard를 클릭했을 때, 다른 AreaCard들이 re-render되지 않는지 확인 (J-a-1)
7. 에러 상태 확인:
   - 개발자 도구 Network 탭에서 Supabase 요청을 block/offline 처리 후 `/review` 접속 → 에러 fallback UI 표시 확인 (J-b)
