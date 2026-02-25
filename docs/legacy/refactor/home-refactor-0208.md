# 홈 캘린더 코드 전면 정리 계획

## Context

홈 기능을 반복 수정하면서 (TaskCard→CompactTaskRow 교체, DnD 추가, 대시보드 제거 등) 이전 코드가 완전히 정리되지 않았습니다. 죽은 파일 10개+, 동일 함수 3중 복사, 중복 상수, 엉킨 조건문 등이 누적.

기능 변경 없이 **코드 정리만** 합니다.

---

## A. 죽은 파일 삭제 (11개)

아래 파일들은 어디서도 import되지 않거나, 유일한 소비자가 함께 삭제되는 죽은 코드입니다.

| #   | 파일                                                             | 근거                                                 |
| --- | ---------------------------------------------------------------- | ---------------------------------------------------- |
| 1   | `src/features/home/components/task-card.tsx`                     | `CompactTaskRow`로 교체 완료, import 0건             |
| 2   | `src/features/home/components/task-list-skeleton.tsx`            | import 0건. `home/page.tsx`가 자체 skeleton 정의     |
| 3   | `src/features/home/components/why-chain-display.tsx`             | 유일 소비자 task-card.tsx 삭제로 고아됨              |
| 4   | `src/features/home/components/ai-insight-card.tsx`               | import 0건                                           |
| 5   | `src/features/home/components/quick-add-button.tsx`              | import 0건                                           |
| 6   | `src/features/home/components/quick-add-sheet.tsx`               | 유일 소비자 quick-add-button 삭제로 고아됨           |
| 7   | `src/features/home/components/task-pill.tsx`                     | import 0건                                           |
| 8   | `src/features/home/components/home-roadmap-panel.tsx`            | import 0건 (date-task-panel이 직접 panel-modes 사용) |
| 9   | `src/features/home/components/panel-modes/home-browse-panel.tsx` | 유일 소비자 home-roadmap-panel 삭제로 고아됨         |
| 10  | `src/features/home/hooks/use-unscheduled-tasks.ts`               | import 0건                                           |
| 11  | `src/features/home/components/inline-area-task-input.tsx`        | C-5에서 InlineTaskInput으로 통합                     |

**수정**: `src/features/home/index.ts` — 삭제된 파일의 barrel export 모두 제거:

- `TaskCard`, `TaskListSkeleton`, `AIInsightCard`, `QuickAddButton`, `QuickAddSheet`, `TaskPill`, `useUnscheduledTasks`
- 외부 미사용 barrel export도 함께 정리: `useWeekTasks`, `useMonthTasks`, `MonthTasksData` (내부에서만 직접 import해서 쓰고 barrel 통과 0건)
- `src/features/home/components/panel-modes/index.ts` — `HomeBrowsePanel` export 제거

---

## B. 죽은 함수·타입·스토어 필드 정리

### B-1. `task-utils.ts` 죽은 함수

- **파일**: `src/lib/utils/task-utils.ts`

| 함수                     | 위치     | 조치                                                       |
| ------------------------ | -------- | ---------------------------------------------------------- |
| `groupTasksByTimeSlot()` | L78-100  | **삭제** (외부 import 0건)                                 |
| `isCurrentTimeSlot()`    | L169-171 | **삭제** (외부 import 0건)                                 |
| `sortTasksByPriority()`  | L122-146 | **삭제** (유일 소비자 `groupTasksByTimeSlot` dead)         |
| `getWhyChainScore()`     | L106-113 | **삭제** (유일 소비자 `sortTasksByPriority` 삭제로 고아됨) |

> **주의**: `getNextTask()`는 `date-task-panel.tsx`의 `NextTaskSpotlight`에서 사용 중이므로 **유지**.
> `sortTasksByPriority`를 삭제하면 `getNextTask` 내부 호출이 깨질 수 있으므로, `getNextTask`가 `sortTasksByPriority`를 쓰는지 확인 후 필요 시 인라인화.

### B-2. 죽은 대시보드 Action·타입·Hook

체인 삭제: `useHomeDashboard` (외부 import 0건) → `getHomeDashboard` → `HomeDashboard` 타입들 순으로 모두 dead.

- **수정**: `src/actions/home.actions.ts` — `HomeDashboardTask`, `HomeStats`, `RecentCheckIn`, `HomeDashboard` 인터페이스 + `getHomeDashboard()` 함수 삭제
- **수정**: `src/actions/index.ts` — 위 5개 export 제거
- **수정**: `src/queries/use-home.ts` — `useHomeDashboard()`, `getHomeDashboardAction` import, `HomeDashboard` re-export 삭제
- **수정**: `src/types/index.ts` — `HomeDashboard` re-export 제거

### B-3. `home.store.ts` 미사용 필드 제거

- **파일**: `src/stores/home.store.ts`
- `expandedAreaIds` 상태 + `toggleAreaExpanded` 메서드 삭제 (L17-18, L28, L60-67)
- `partialize`에서 `expandedAreaIds` 제거 (L73-75)
- **근거**: home 컴포넌트에서 전혀 안 씀 (`roadmap.store.ts`에 별도 존재)

### B-4. `useHomeState` 미사용 반환값 제거

- **파일**: `src/features/home/hooks/use-home-state.ts`
- `dateString` (L176) — 어디서도 destructure 안 됨
- `isViewingCurrentMonth` + `useMemo` (L118-120, L167) — 어디서도 안 씀

---

## C. 중복 코드 통합

### C-1. `generateAiComment()` 추출 (3중 복사 → 1개)

- **생성**: `src/lib/utils/ai-comments.ts`
- **수정** (로컬 함수 삭제 + import):
  - `src/features/home/components/compact-task-row.tsx` (L22-40)
  - `src/features/home/components/panel-modes/task-detail-panel.tsx` (L52-70)

### C-2. `REPEAT_OPTIONS` 상수 통합 (6중 정의 → 공유 상수)

현재 6곳에 각각 로컬 정의 (home 3곳 + roadmap 3곳):

| #   | 파일                                                                           | 값                                            |
| --- | ------------------------------------------------------------------------------ | --------------------------------------------- |
| 1   | `src/features/home/components/inline-task-input.tsx` (L12-16)                  | `['once', 'daily', 'weekdays']`               |
| 2   | `src/features/home/components/inline-area-task-input.tsx` (L13-17)             | 동일                                          |
| 3   | `src/features/home/components/panel-modes/task-detail-panel.tsx` (L28-33)      | `['daily', 'weekdays', 'weekends', 'weekly']` |
| 4   | `src/features/roadmap/components/panel-modes/task-edit-form.tsx` (L18-23)      | 3번과 동일                                    |
| 5   | `src/features/roadmap/components/inline-forms/inline-task-create.tsx` (L24-29) | 3번과 동일                                    |
| 6   | `src/features/roadmap/components/inline-forms/inline-task-edit.tsx` (L20-26)   | 3번과 동일                                    |

**작업**: `src/lib/constants/time-slots.ts`에 두 상수 추가, 6곳 import 교체

- `QUICK_REPEAT_OPTIONS` — `['once', 'daily', 'weekdays']` (인라인 빠른 입력용)
- `FULL_REPEAT_OPTIONS` — `['daily', 'weekdays', 'weekends', 'weekly']` (상세 편집용)

### C-3. `DURATION_OPTIONS` 중복 제거 (값 불일치 해소)

이미 `src/lib/constants/time-slots.ts` (L60-69)에 **8개** 정의됨. 그런데 4곳에서 **6개**만 로컬 재정의:

| 파일                                                                           | 옵션 수                            |
| ------------------------------------------------------------------------------ | ---------------------------------- |
| `src/lib/constants/time-slots.ts` (공식)                                       | **8개** (5~120분, 90분·2시간 포함) |
| `src/features/home/components/panel-modes/task-detail-panel.tsx` (L43-50)      | **6개** (5~60분)                   |
| `src/features/roadmap/components/panel-modes/task-edit-form.tsx` (L33-40)      | **6개** (5~60분)                   |
| `src/features/roadmap/components/inline-forms/inline-task-create.tsx` (L39-46) | **6개** (5~60분)                   |
| `src/features/roadmap/components/inline-forms/inline-task-edit.tsx` (L35-42)   | **6개** (5~60분)                   |

**작업**: DB에 90분·2시간으로 저장된 데이터가 있는지 확인 후 방향 결정:

- 데이터 없으면: `time-slots.ts`의 공식 상수를 6개로 축소, 4곳 로컬 상수 삭제 후 import 교체
- 데이터 있으면: 8개 유지, 4곳 로컬 상수를 공식 8개 상수 import으로 교체

### C-4. `TIME_SLOT_OPTIONS` 공유화 (라벨 불일치 해소)

4곳에 로컬 정의, 라벨이 미묘하게 다름:

| 파일                                                       | 라벨 예시                        |
| ---------------------------------------------------------- | -------------------------------- |
| `src/features/home/.../task-detail-panel.tsx` (L35-41)     | '새벽', '오전', '오후', '저녁'   |
| `src/features/roadmap/.../task-edit-form.tsx` (L25-31)     | '새벽 (0-6)', '오전 (6-12)', ... |
| `src/features/roadmap/.../inline-task-create.tsx` (L31-37) | '새벽', '오전', '오후', '저녁'   |
| `src/features/roadmap/.../inline-task-edit.tsx` (L27-33)   | '새벽', '오전', '오후', '저녁'   |

**작업**: `time-slots.ts`에 `TIME_SLOT_OPTIONS` 추가 (라벨은 시간 범위 없는 짧은 버전으로 통일), 4곳 import 교체

### C-5. `InlineTaskInput` / `InlineAreaTaskInput` 통합

두 파일이 ~65-70% 동일 (폼 구조, 반복 옵션 칩, submit, focus/blur):

- `src/features/home/components/inline-task-input.tsx` (107줄)
- `src/features/home/components/inline-area-task-input.tsx` (136줄)

**차이점**: area 버전은 `goals` prop → goal picker UI + `goal_id` 포함 (칩 기반 골 선택기, 단일 골 힌트 표시)

**작업**:

- `InlineTaskInput`에 optional `goals` prop 추가로 통합
- `inline-area-task-input.tsx` 삭제 (A 섹션에 포함)
- `src/features/home/components/area-task-section.tsx`, `src/features/home/components/sortable-area-section.tsx`에서 import 변경

> **대안**: 통합 시 복잡도가 과도하면, 공통 로직을 `useInlineTaskForm` 훅으로 추출하고 두 컴포넌트는 각각 유지하는 방식도 가능.

### ~~C-6. `AreaTaskSection` / `SortableAreaSection` 공통 렌더링 추출~~ (보류)

실제 코드 비교 결과 공통 부분이 ~40%에 불과:

- `AreaTaskSection` (61줄) — 단순 영역 헤더 + CompactTaskRow 렌더
- `SortableAreaSection` (113줄) — useSortable + useDroppable + SortableContext + 드래그 핸들 + isDragging/isOver 시각 피드백

DnD 래퍼 추출 시 오히려 prop 전달 복잡도가 증가하고, 두 컴포넌트의 역할이 명확히 분리되어 있으므로 **이번 리팩토링에서 제외**.

---

## D. 엉킨 로직 개선

### D-1. `DailyReflectionCard` 3중 조건 → 단순화

`src/components/layout/date-task-panel.tsx` (L150-162)에서 동일 컴포넌트가 3개의 복잡한 조건으로 렌더됨:

```tsx
// Before: 3번 작성, 조건 복잡
{
  !viewingFuture && stats.isAllDone && <DailyReflectionCard />
}
{
  !viewingFuture && !stats.isAllDone && viewingToday && hours >= 18 && rate >= 50 && (
    <DailyReflectionCard />
  )
}
;<TaskList />
{
  !viewingFuture && !stats.isAllDone && !(viewingToday && hours >= 18 && rate >= 50) && (
    <DailyReflectionCard />
  )
}

// After: 파생 변수로 단순화 + new Date() 캐싱
const currentHour = new Date().getHours()
const showReflection = !viewingFuture
const reflectionAbove =
  stats.isAllDone ||
  (viewingToday && currentHour >= EVENING_HOUR && stats.completionRate >= REFLECTION_THRESHOLD)

{
  showReflection && reflectionAbove && <DailyReflectionCard />
}
;<TaskList />
{
  showReflection && !reflectionAbove && <DailyReflectionCard />
}
```

### D-2. 매직넘버 상수화

- `18` → `EVENING_HOUR = 18`
- `50` → `REFLECTION_THRESHOLD = 50`

### D-3. 인라인 타입 import 정리

- `src/components/layout/date-task-panel.tsx` (L49): `import('@/types/entities').HomeTask` → 파일 상단 정규 import

### D-4. `home/page.tsx` import 정리

- `src/app/(main)/home/page.tsx` (L15-16): `useHomeTasks`와 `usePrefetchHomeTasks` 동일 모듈에서 각각 import → 1줄로 합치기

---

## 수정 파일 전체 목록

| 구분 | 파일                                                                  | 변경                                                 | 섹션      |
| ---- | --------------------------------------------------------------------- | ---------------------------------------------------- | --------- |
| 삭제 | `src/features/home/components/task-card.tsx`                          | 전체                                                 | A         |
| 삭제 | `src/features/home/components/task-list-skeleton.tsx`                 | 전체                                                 | A         |
| 삭제 | `src/features/home/components/why-chain-display.tsx`                  | 전체 (task-card 삭제로 고아)                         | A         |
| 삭제 | `src/features/home/components/ai-insight-card.tsx`                    | 전체                                                 | A         |
| 삭제 | `src/features/home/components/quick-add-button.tsx`                   | 전체                                                 | A         |
| 삭제 | `src/features/home/components/quick-add-sheet.tsx`                    | 전체                                                 | A         |
| 삭제 | `src/features/home/components/task-pill.tsx`                          | 전체                                                 | A         |
| 삭제 | `src/features/home/components/home-roadmap-panel.tsx`                 | 전체                                                 | A         |
| 삭제 | `src/features/home/components/panel-modes/home-browse-panel.tsx`      | 전체                                                 | A         |
| 삭제 | `src/features/home/hooks/use-unscheduled-tasks.ts`                    | 전체                                                 | A         |
| 삭제 | `src/features/home/components/inline-area-task-input.tsx`             | 전체 (C-5 통합)                                      | A+C       |
| 생성 | `src/lib/utils/ai-comments.ts`                                        | generateAiComment                                    | C-1       |
| 수정 | `src/features/home/index.ts`                                          | 죽은 export 7개 + 미사용 barrel export 3개 제거      | A         |
| 수정 | `src/features/home/components/panel-modes/index.ts`                   | HomeBrowsePanel export 제거                          | A         |
| 수정 | `src/features/home/components/compact-task-row.tsx`                   | 로컬 함수 → import                                   | C-1       |
| 수정 | `src/features/home/components/panel-modes/task-detail-panel.tsx`      | 로컬 함수·상수 → import                              | C-1,2,3,4 |
| 수정 | `src/features/home/components/inline-task-input.tsx`                  | goals prop 추가, 상수 import                         | C-2,5     |
| 수정 | `src/features/home/components/area-task-section.tsx`                  | import 변경                                          | C-5       |
| 수정 | `src/features/home/components/sortable-area-section.tsx`              | import 변경                                          | C-5       |
| 수정 | `src/features/roadmap/components/panel-modes/task-edit-form.tsx`      | 상수 3개 → import                                    | C-2,3,4   |
| 수정 | `src/features/roadmap/components/inline-forms/inline-task-create.tsx` | 상수 3개 → import                                    | C-2,3,4   |
| 수정 | `src/features/roadmap/components/inline-forms/inline-task-edit.tsx`   | 상수 3개 → import                                    | C-2,3,4   |
| 수정 | `src/lib/utils/task-utils.ts`                                         | 죽은 함수 4개 삭제 (`getNextTask` 유지)              | B-1       |
| 수정 | `src/lib/constants/time-slots.ts`                                     | REPEAT/TIME_SLOT_OPTIONS 추가, DURATION_OPTIONS 정리 | C-2,3,4   |
| 수정 | `src/actions/home.actions.ts`                                         | 죽은 타입·함수 삭제                                  | B-2       |
| 수정 | `src/actions/index.ts`                                                | 죽은 export 제거                                     | B-2       |
| 수정 | `src/queries/use-home.ts`                                             | 죽은 hook 삭제                                       | B-2       |
| 수정 | `src/types/index.ts`                                                  | HomeDashboard re-export 제거                         | B-2       |
| 수정 | `src/stores/home.store.ts`                                            | expandedAreaIds 관련 제거                            | B-3       |
| 수정 | `src/features/home/hooks/use-home-state.ts`                           | 미사용 반환값 제거                                   | B-4       |
| 수정 | `src/components/layout/date-task-panel.tsx`                           | 리플렉션 조건 단순화, 상수화, import 정리, Date 캐싱 | D         |
| 수정 | `src/app/(main)/home/page.tsx`                                        | import 정리                                          | D-4       |

총 **11개 삭제, 1개 생성, 20개 수정** (32개 파일)

---

## 구현 순서

1. A (죽은 파일 삭제) → lint+type-check
2. B (죽은 함수·타입·필드 정리) → lint+type-check
3. C (중복 통합) → lint+type-check
4. D (로직 개선) → lint+type-check
5. `npm run build` 최종 확인

## 검증

각 섹션(A→B→C→D) 완료 후:

```
npm run lint && npm run type-check
```

전체 완료 후:

```
npm run build
```
