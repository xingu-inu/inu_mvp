# 로드맵 전면 코드 정리 및 리팩터링 — 종합 개선안

> 작성일: 2026-02-08
> 대상: `src/features/roadmap/`, `src/stores/roadmap.store.ts`, `src/actions/`
> 분석 범위: 44개 컴포넌트, 13개 액션/리포지토리, 3개 스토어, 쿼리 훅, CSS/접근성/성능 전수 조사

## Context

수차례 UI 개선을 거치면서 로드맵 기능에 dead code, 중복 로직, 성능 병목, 접근성 문제, 타입 안전성 이슈가 누적됨.
전체 코드 품질을 체계적으로 개선하는 종합 리팩터링 플랜.

---

## Phase 1: Dead Code 삭제 (위험도: Zero)

### 1-1. 컴포넌트 파일 삭제 (6개)

| 파일                                                     | 이유                                                  |
| -------------------------------------------------------- | ----------------------------------------------------- |
| `src/features/roadmap/components/goal-detail-panel.tsx`  | 미사용. `[goalId]/page.tsx`가 동일 라우팅을 직접 처리 |
| `src/features/roadmap/components/area-section.tsx`       | GoalAccordionItem + TreeView로 대체됨                 |
| `src/features/roadmap/components/direction-card.tsx`     | GoalBrowsePanel 내 인라인 표시로 대체됨               |
| `src/features/roadmap/components/goal-card.tsx`          | area-section, sortable-goal-card만 사용 (둘 다 dead)  |
| `src/features/roadmap/components/sortable-goal-list.tsx` | 외부 import 없음                                      |
| `src/features/roadmap/components/sortable-goal-card.tsx` | sortable-goal-list에서만 사용 (dead)                  |

### 1-2. 액션 파일/함수 삭제

| 대상                                  | 위치                          | 이유                                                                                                                                            |
| ------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/actions/roadmap.actions.ts` 전체 | 파일 삭제                     | 개별 entity 쿼리로 대체됨. ⚠️ `getRoadmapData`가 `actions/index.ts`에서 public API export 중 — 삭제 전 서버 컴포넌트 등 실제 호출처 재확인 필요 |
| `toggleTaskActive()`                  | `src/actions/task.actions.ts` | 호출처 없음                                                                                                                                     |
| `getTasksByPhase()`                   | `src/actions/task.actions.ts` | 호출처 없음                                                                                                                                     |

### 1-3. Barrel export 정리

**`src/features/roadmap/index.ts`** — 삭제:

- `DirectionCard`, `GoalCard`, `AreaSection`, `SortableGoalList`, `SortableGoalCard`

**`src/actions/index.ts`** — 삭제:

- `getRoadmapData` + 관련 타입 4개 (lines 12-18)
- `getTasksByPhase` (line 78), `toggleTaskActive` (line 81)

### 1-4. 스토어 dead state 삭제

| 파일                                | 필드                           | 이유                                             |
| ----------------------------------- | ------------------------------ | ------------------------------------------------ |
| `src/stores/roadmap.store.ts:37-38` | `areaFilter` + `setAreaFilter` | 정의만 되고 UI에서 한 번도 사용 안 됨. 기능 잔재 |

### 1-5. 미사용 props 제거

| 파일                         | prop           | 이유                                    |
| ---------------------------- | -------------- | --------------------------------------- |
| `goal-accordion-item.tsx:76` | `onCancelEdit` | `_onCancelEdit`로 접두사. 사용하지 않음 |
| `goal-browse-panel.tsx:25`   | `onAreaSelect` | 선언만 되고 의미있는 호출 없음          |

---

## Phase 2: 버그 수정 (위험도: Low)

### 2-1. `[goalId]/page.tsx` cleanup 효과 수정

**파일**: `src/app/(main)/roadmap/[goalId]/page.tsx:30`

```typescript
// Before (버그): goal null인데 panelMode가 'view' → 불일치
setPanelMode('view')
// After
setPanelMode('browse')
```

### 2-2. form-dialog.tsx에 `edit-task` 케이스 추가

**파일**: `src/features/roadmap/components/form-dialog.tsx`

모바일에서 task 선택 시 `panelMode: 'edit-task'`가 되지만 해당 케이스 없음.

- `TaskEditForm` import + `'edit-task': '할 일 수정'` + switch case 추가

### 2-3. badge.tsx 하드코딩 컬러 수정

**파일**: `src/components/ui/badge.tsx:25-30`

다크모드 깨짐. `bg-orange-100`, `text-orange-600`, `ring-amber-200` → CSS 변수로 교체:

```typescript
// Before
'bg-orange-100 text-orange-600'
// After
'bg-[var(--color-streak-high-bg)] text-[var(--color-streak-high)]'
```

(CSS 변수가 없으면 새로 정의 필요)

### 2-4. inline style → Tailwind 클래스

**파일**: `goal-accordion-item.tsx:195`, `:779` (2곳)

```typescript
// Before
style={{ overflow: 'hidden' }}
// After
className="overflow-hidden"
```

---

## Phase 3: 스토어 단순화 (위험도: Medium)

### 현재 문제

9개 선택 관련 필드 + 10개 setter/action 함수. selector 패턴 미사용(bare hook call)으로 불필요한 리렌더링.

### 개선: Discriminated Union + Selector 패턴

```typescript
type Selection =
  | { type: 'none' }
  | { type: 'direction'; id: string }
  | { type: 'area'; id: string }
  | { type: 'goal'; id: string }
  | { type: 'phase'; id: string; goalId: string }
  | { type: 'task'; id: string; goalId: string }
```

**Before** 9 필드 + 10 함수 → **After** 2 필드 + 2 함수:

```
selection: Selection       ← 통합 선택 상태
focusedGoalId: string|null ← 데스크톱 전용 (panelMode 변경 안함)
select(sel)                ← 선택 + panelMode 자동 매핑
clearSelection()
```

### Selector 패턴 도입 (성능 핵심)

모든 컴포넌트에서 selector 미사용(bare hook call) → 개별 selector 함수 전달로 전환:

```typescript
// Before (selector 미사용 — 어떤 store 필드가 변해도 리렌더링)
const { selectedGoalId, setPanelMode, inlineMode } = useRoadmapStore()

// After (해당 필드 변경 시에만 리렌더링)
const selection = useRoadmapStore((s) => s.selection)
const setPanelMode = useRoadmapStore((s) => s.setPanelMode)
const inlineMode = useRoadmapStore((s) => s.inlineMode)
```

### 마이그레이션 전략 (13개 파일 동시 변경 방지)

13개 파일을 한 번에 변경하면 중간 빌드 불가. 단계적으로 진행:

1. **Step 1**: `roadmap.store.ts`에 새 `Selection` 타입 + `select()` 함수 **추가** (기존 필드 유지, 공존 상태)
2. **Step 2**: 각 컴포넌트를 **하나씩** 새 API(`select()`, selector 패턴)로 전환. 전환할 때마다 빌드 확인.
3. **Step 3**: 모든 컴포넌트 전환 완료 후 기존 개별 필드(`selectedGoalId`, `selectedPhaseId` 등) 삭제

→ 중간 상태에서도 항상 빌드 가능.

### 수정 대상 파일 (13개)

| 파일                                                                  | 변경                              |
| --------------------------------------------------------------------- | --------------------------------- |
| `src/stores/roadmap.store.ts`                                         | Selection union + selector export |
| `src/features/roadmap/components/visual-tree/visual-tree.tsx`         | selector 패턴                     |
| `src/features/roadmap/components/panel-modes/goal-browse-panel.tsx`   | selector 패턴                     |
| `src/features/roadmap/components/form-dialog.tsx`                     | selection 기반                    |
| `src/features/roadmap/components/panel-modes/goal-view-mode.tsx`      | selector 패턴                     |
| `src/features/roadmap/components/panel-modes/goal-edit-form.tsx`      | selector 패턴                     |
| `src/features/roadmap/components/panel-modes/phase-edit-form.tsx`     | selection 기반                    |
| `src/features/roadmap/components/panel-modes/phase-create-form.tsx`   | selection 기반                    |
| `src/features/roadmap/components/panel-modes/task-edit-form.tsx`      | selection 기반                    |
| `src/features/roadmap/components/panel-modes/area-edit-form.tsx`      | selection 기반                    |
| `src/features/roadmap/components/goal-list.tsx`                       | select() 사용                     |
| `src/app/(main)/roadmap/[goalId]/page.tsx`                            | select() 사용                     |
| `src/features/roadmap/components/panel-modes/goal-accordion-item.tsx` | selector 패턴                     |

---

## Phase 4: 성능 최적화 (위험도: Medium)

### 4-1. CRITICAL: GoalExpandedContent 메모이제이션

**파일**: `goal-accordion-item.tsx:453`

`GoalExpandedContent`가 memo 없이 정의되어 부모 리렌더 시 전체 리렌더링 cascade 발생.

```typescript
// Before: 일반 함수 컴포넌트
function GoalExpandedContent({ goal, area, ... }) { ... }

// After: memo 래핑
const GoalExpandedContent = memo(function GoalExpandedContent({ goal, area, ... }) { ... })
```

### 4-2. HIGH: 내부 서브 컴포넌트 메모이제이션

`goal-accordion-item.tsx` 내부에 memo 없는 컴포넌트 5개:

| 컴포넌트             | 줄   | 문제                                       |
| -------------------- | ---- | ------------------------------------------ |
| `PhaseStatusBadge`   | :289 | mutation hook을 매 렌더마다 재생성         |
| `TaskListWithDelete` | :379 | state + mutation hook을 매 렌더마다 재생성 |
| `TaskRow`            | :223 | 모든 task마다 리렌더링                     |
| `SortablePhaseItem`  | :332 | DnD 리렌더링                               |
| `SortableTaskItem`   | :352 | DnD 리렌더링                               |

→ 전부 `memo()` 래핑 또는 별도 파일로 추출하면서 memo 적용

### 4-3. MEDIUM: 콜백 함수 메모이제이션

**`goal-browse-panel.tsx`에서 useCallback 누락**:

| 함수               | 줄   | 수정               |
| ------------------ | ---- | ------------------ |
| `toggleGoal`       | :155 | `useCallback` 래핑 |
| `toggleArea`       | :169 | `useCallback` 래핑 |
| `toggleAreaDetail` | :181 | `useCallback` 래핑 |
| `handleEditGoal`   | :193 | `useCallback` 래핑 |

**`goal-view-mode.tsx`에서 useCallback 누락**:

| 함수               | 줄   | 수정               |
| ------------------ | ---- | ------------------ |
| `handlePhaseClick` | :706 | `useCallback` 래핑 |
| `handleTaskClick`  | :715 | `useCallback` 래핑 |

### 4-4. MEDIUM: 인라인 연산 메모이제이션

`goal-accordion-item.tsx:485-488`과 `goal-view-mode.tsx:264-267`에서 매 렌더마다 반복 계산:

```typescript
const completedPhases = phases.filter((p) => p.status === 'completed').length
const currentPhaseIndex = phases.findIndex((p) => p.status === 'active')
const activeTasks = tasks.filter((t) => t.is_active)
```

→ `useMemo`로 래핑 (phases/tasks dependency)

### ~~4-5. LOW: 컴포넌트 외부로 상수 이동~~ (이미 외부)

> 검증 결과: `goal-accordion-item.tsx:59-66`의 `REPEAT_LABELS`는 이미 모듈 최상단(컴포넌트 함수 바깥)에 정의되어 있음. 이동 불필요.

---

## Phase 5: 공통 훅 추출 (위험도: Low)

### 5-1. `useDragReorder` 훅

**현재**: `goal-accordion-item.tsx`의 `handlePhaseDragEnd`와 `handleTaskDragEnd`가 90% 동일

**새 파일**: `src/features/roadmap/hooks/use-drag-reorder.ts`

```typescript
export function useDragReorder<T extends { id: string }>(
  items: T[],
  onReorder: (ids: string[]) => void
) {
  return useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const ids = items.map((item) => item.id)
      const from = ids.indexOf(active.id as string)
      const to = ids.indexOf(over.id as string)
      if (from === -1 || to === -1) return
      onReorder(arrayMove(ids, from, to))
    },
    [items, onReorder]
  )
}
```

### 5-2. `useDeleteConfirm` 훅

**현재**: goal-view-mode에서 `deletingPhaseId`, `deletingTaskId`, `deleteDialogOpen` 등 삭제 관련 상태가 산재

**새 파일**: `src/features/roadmap/hooks/use-delete-confirm.ts`

```typescript
export function useDeleteConfirm() {
  const [target, setTarget] = useState<{ type: string; id: string } | null>(null)
  return {
    target,
    confirm: (type: string, id: string) => setTarget({ type, id }),
    cancel: () => setTarget(null),
    isConfirming: (type: string, id: string) => target?.type === type && target?.id === id,
  }
}
```

### 5-3. `useGoalCompletion` 훅

**현재**: `goal-completion-dialog.tsx`와 `inline-goal-completion.tsx`에서 90% 동일 로직

**새 파일**: `src/features/roadmap/hooks/use-goal-completion.ts`

CHOICES 배열, 선택 상태, 제출 로직 공통화. dialog/inline은 UI wrapper만 유지.

---

## Phase 6: 대형 파일 분해 (위험도: Medium)

### 6-1. `goal-view-mode.tsx` (878줄) → ~400줄 + 4 서브컴포넌트

| 추출 컴포넌트      | 현재 줄             | 설명                                           |
| ------------------ | ------------------- | ---------------------------------------------- |
| `GoalViewHeader`   | ~300-380            | Goal 이름, 상태 배지, Area 칩, 액션 버튼       |
| `GoalPhaseSection` | ~434-755            | Phase ON/OFF 분기 + Phase 리스트 + Task 리스트 |
| `GoalTaskItem`     | ~493-528 (2번 반복) | Task 행 + 삭제 확인 → **공유 컴포넌트**        |
| `GoalAiSection`    | ~760-830            | AI 분해/리뷰 버튼 + Preview                    |

**핵심**: `GoalTaskItem`은 flat list(~493)와 nested list(~698)에서 동일 코드가 반복 → 하나로 통합

### 6-2. `goal-accordion-item.tsx` (893줄) → ~350줄 + 3 서브컴포넌트

| 추출 컴포넌트         | 설명                                            |
| --------------------- | ----------------------------------------------- |
| `AccordionGoalHeader` | 아코디언 헤더 (Goal 이름 + 상태 + Phase 진행률) |
| `AccordionPhaseList`  | Phase 리스트 + DnD + 인라인 폼                  |
| `AccordionTaskList`   | Task 리스트 + DnD + Quick Input                 |

### 6-3. `GoalTaskItem` 공유 컴포넌트

**새 파일**: `src/features/roadmap/components/shared/goal-task-item.tsx`

goal-view-mode와 goal-accordion-item 모두에서 사용:

```typescript
export function GoalTaskItem({ task, onClick, onDelete, isDeleting, compact }: GoalTaskItemProps)
```

### 6-4. 트리 빌더 로직 공통화

**현재**: `tree-view.tsx`의 `buildTreeData()`와 `visual-tree.tsx`의 `buildVisualTreeData()`가 동일한 Direction→Area→Goal→Phase→Task 트리 구축 로직을 각각 구현

- 둘 다 goals를 area별로 그룹핑
- 둘 다 phase/task 노드를 동일하게 빌드
- 둘 다 today 계산 + streak/isDone 체크 동일

**새 파일**: `src/features/roadmap/utils/build-tree-data.ts`

공통 트리 구조 빌더를 추출하고, tree-view와 visual-tree 각각이 자신의 노드 타입으로 매핑:

```typescript
export function buildRoadmapTree(direction, areas, goals, phases, tasks) {
  // 공통 그룹핑 + 필터링 + 정렬 로직
  return { directionNode, areaNodes, goalNodes, ... }
}
```

---

## Phase 7: 폼 중복 제거 (위험도: Medium)

### 7-1. Task 폼 필드 공통화

**현재 3곳에서 동일 상수 + 필드 렌더링 반복**:

- `inline-forms/inline-task-create.tsx` (405줄)
- `inline-forms/inline-task-edit.tsx` (300줄)
- `panel-modes/task-edit-form.tsx` (296줄)

**새 파일**: `src/features/roadmap/components/shared/task-form-fields.tsx`

```typescript
export const REPEAT_OPTIONS = [...]   // 3곳에서 중복
export const TIME_SLOT_OPTIONS = [...] // 3곳에서 중복
export const DURATION_OPTIONS = [...]  // 3곳에서 중복

export function TaskFormFields({ form, compact }: Props) {
  // name, why, repeat_type, duration_minutes, time_slot 필드
}
```

⚠️ **통합 시 주의사항**:

- `DURATION_OPTIONS`: `src/lib/constants/time-slots.ts`에 이미 8개짜리 export 존재 (90분/120분 포함). 폼 3곳은 6개만 정의. 어느 기준으로 통일할지 결정 필요.
- `TIME_SLOT_OPTIONS`: `task-edit-form.tsx`는 시간 범위 포함 ("새벽 (0-6)"), `inline-task-create/edit.tsx`는 미포함 ("새벽"). 라벨 형식 통일 필요.

### 7-2. Phase 폼 필드 공통화

**새 파일**: `src/features/roadmap/components/shared/phase-form-fields.tsx`

`inline-phase-create.tsx`와 `inline-phase-edit.tsx`의 80% 중복 해소.

### ~~7-3. 상태 전환 로직 공통화~~ (제거됨)

> 검증 결과: `TRANSITION_CONFIG`는 `inline-status-transition.tsx`에만 존재. `goal-status-popover.tsx`는 `GOAL_STATUS_CONFIG`(다른 상수)를 사용. 중복 아님.

### 7-4. `CompletionChoice` 타입 통합

**현재**: `goal-completion-dialog.tsx:10`과 `inline-goal-completion.tsx`에서 각각 정의

→ `src/features/roadmap/types.ts`로 추출하거나 `useGoalCompletion` 훅에서 export

---

## Phase 8: 접근성 개선 (위험도: Low)

### 8-1. 터치 타겟 44px 미만 수정 (Apple HIG 위반)

| 파일                      | 줄         | 현재             | 수정                                                  |
| ------------------------- | ---------- | ---------------- | ----------------------------------------------------- |
| `goal-browse-panel.tsx`   | :325-360   | `h-7 w-7` (28px) | `h-7 w-7` 유지 + `min-h-[44px] min-w-[44px] p-2` 래퍼 |
| `goal-accordion-item.tsx` | :156       | `h-7 w-7` (28px) | 동일 방식                                             |
| `goal-accordion-item.tsx` | :363, :750 | `h-6 w-6` (24px) | 동일 방식                                             |
| `visual-tree-wrapper.tsx` | :138-159   | `p-1.5` (≈26px)  | `min-h-[44px] min-w-[44px]`                           |

### 8-2. aria-expanded 누락 추가

| 파일                      | 요소                    | 줄   |
| ------------------------- | ----------------------- | ---- |
| `goal-browse-panel.tsx`   | Direction 아코디언 버튼 | :575 |
| `goal-accordion-item.tsx` | Goal 토글 버튼          | :128 |
| `goal-accordion-item.tsx` | Phase 토글 버튼         | :704 |

### 8-3. 레이블 없는 textarea에 aria-label 추가

| 파일                           | 줄   |
| ------------------------------ | ---- |
| `goal-completion-dialog.tsx`   | :142 |
| `inline-goal-completion.tsx`   | :213 |
| `inline-status-transition.tsx` | :223 |

### 8-4. tree-node-card 키보드 지원

**파일**: `visual-tree/tree-node-card.tsx:55`

`role="button"` 있지만 키보드 핸들러 없음:

```typescript
// 추가
onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.() } }}
tabIndex={0}
```

---

## Phase 9: 코드 품질 소소한 개선 (위험도: Low)

### 9-1. 이벤트 핸들러 네이밍 통일

**`goal-browse-panel.tsx`**: `toggleGoal`, `toggleArea` → `handleToggleGoal`, `handleToggleArea`로 통일
(나머지 파일은 이미 `handle` 접두사 사용 중)

### 9-2. 하드코딩 한국어 상수 추출

**`inline-goal-create.tsx:70-72`**:

```typescript
const phaseNames = ['시작하기', '심화하기', '마무리하기']
```

→ `src/lib/constants/defaults.ts`로 추출

### 9-3. `as` 타입 단언 중 위험한 것 타입 가드로 교체

특히 `as AreaType` 패턴 (6곳):

```typescript
// Before
area?.type as AreaType
// After
isAreaType(area?.type) ? area.type : 'custom'
```

### 9-4. 리뷰 기능 export 일관성

**`src/features/review/index.ts`**: `InlineReflectionForm`이 메인 barrel에서 누락 → 추가

### 9-5. 미사용 리뷰 컴포넌트 문서화

의도적 미사용 (향후 패널 확장용)인 컴포넌트에 JSDoc 주석 추가:

- `ReviewPanelBreadcrumb`, `CompactReviewStats`, `ReviewAreaSection`

### 9-6. 미사용 `Skeleton` UI 컴포넌트

**`src/components/ui/skeleton.tsx`** — export되지만 프로젝트 전체에서 한 번도 사용 안 됨.
각 feature가 자체 skeleton을 `animate-pulse` div로 직접 구현함 (예: `goal-list-skeleton.tsx`).
→ 기존 skeleton을 활용하도록 전환하거나, 미사용 컴포넌트 삭제

### 9-7. visual-tree 하드코딩 상수 추출

**`visual-tree-wrapper.tsx:13-16`**:

```typescript
const MIN_ZOOM = 0.25
const MAX_ZOOM = 1.5
const ZOOM_STEP = 0.1
const DEFAULT_ZOOM = 1.0
```

→ `src/lib/constants/visual-tree.ts`로 추출 (향후 사용자 설정 확장 대비)

### 9-8. 삭제 확인 메시지 중복

`goal-accordion-item.tsx:449`과 `goal-view-mode.tsx:855`에서 유사한 한국어 삭제 경고 문구:

```
"연결된 단계와 할 일도 함께 삭제됩니다. 삭제 대신 중지로 기록을 보존할 수도 있어요."
```

→ `src/features/roadmap/constants/messages.ts`로 추출

---

## 실행 순서

| Phase                    | 위험도 | 파일 수         | 의존성                                                              |
| ------------------------ | ------ | --------------- | ------------------------------------------------------------------- |
| 1. Dead Code 삭제        | Zero   | 8 삭제 + 2 수정 | 없음                                                                |
| 2. 버그 수정             | Low    | 4               | Phase 1 후                                                          |
| 3. 스토어 단순화         | Medium | 13              | Phase 1 후                                                          |
| 4. 성능 최적화           | Medium | 5               | Phase 3 후 권장 (memo 래핑 시 prop 구조가 Phase 3에서 바뀔 수 있음) |
| 5. 공통 훅 추출          | Low    | 3 신규 + 4 수정 | Phase 1 후                                                          |
| 6. 대형 파일 분해        | Medium | 2 분해 + 7 신규 | Phase 4, 5 후                                                       |
| 7. 폼 중복 제거          | Medium | 3 신규 + 8 수정 | Phase 6과 독립                                                      |
| 8. 접근성 개선           | Low    | 6               | 독립                                                                |
| 9. 코드 품질 소소한 개선 | Low    | 5               | 독립                                                                |

---

## 검증 방법

각 Phase 완료 후:

```bash
npm run lint && npm run type-check && npm run build
```

> `npm run build` 필수 — Next.js RSC 관련 이슈는 `type-check`로 못 잡고 빌드 시에만 드러나는 경우 있음.

전체 완료 후 수동 검증:

- 데스크톱: 비주얼 트리 노드 클릭 → 우측 패널 전환 (리렌더링 감소 확인)
- 데스크톱: GoalBrowsePanel 아코디언 인라인 편집 (goal/phase/task CRUD)
- 데스크톱: DnD phase/task 순서 변경
- 모바일: TreeView goal 선택 → `[goalId]` 상세 페이지
- 모바일: 상세 페이지 뒤로가기 → panelMode browse 복귀
- 모바일: form-dialog edit-task 모달
- 모바일: goal 완료 세레모니 (dialog + inline)
- 다크모드: badge 색상 정상 표시
- 접근성: 키보드로 아코디언 + 트리 노드 탐색
- 접근성: 44px 이상 터치 타겟 확인

---

## 예상 효과

| 지표                          | Before                | After                            |
| ----------------------------- | --------------------- | -------------------------------- |
| Dead code 파일                | 7개                   | 0개                              |
| Dead 액션/함수                | 3개                   | 0개                              |
| Dead 스토어 필드              | 1개 (`areaFilter`)    | 0개                              |
| 스토어 선택 필드              | 9개 + 10 함수         | 2개 + 2 함수                     |
| goal-view-mode.tsx            | 878줄                 | ~400줄 + 4 서브컴포넌트          |
| goal-accordion-item.tsx       | 893줄                 | ~350줄 + 3 서브컴포넌트          |
| Task 폼 상수 중복             | 3곳                   | 1곳 (공유)                       |
| ~~TRANSITION_CONFIG 중복~~    | ~~2곳~~               | 검증 결과 중복 아님 (1곳만 존재) |
| CompletionChoice 타입 중복    | 2곳                   | 1곳                              |
| 트리 빌더 로직 중복           | 2곳                   | 1곳 (공유 util)                  |
| 삭제 메시지 중복              | 2곳                   | 1곳 (상수)                       |
| 불필요 리렌더 컴포넌트        | 5+ (memo 없음)        | 0 (전부 memo)                    |
| Store selector 미사용         | 전체 (bare hook call) | 전체 selector 패턴               |
| 44px 미달 터치 타겟           | 6+                    | 0                                |
| aria-expanded 누락            | 3곳                   | 0                                |
| 레이블 없는 textarea          | 3곳                   | 0                                |
| 키보드 미지원 role="button"   | 1곳                   | 0                                |
| 하드코딩 컬러 (다크모드 깨짐) | 1곳                   | 0                                |
| `as` 타입 단언 (위험)         | 6곳                   | 0 (타입 가드)                    |

---

## 추가 발견 사항 (2차 리뷰)

> 코드베이스 전수 조사로 추가 발견된 이슈. 기존 Phase에 맞춰 삽입.

### Phase 1 추가 — Barrel export 정리 확장

**1-3 확장: 외부에서 barrel 우회 import 정리**

| 파일                                       | 현재 (직접 import)                   | 수정                                                         |
| ------------------------------------------ | ------------------------------------ | ------------------------------------------------------------ |
| `src/app/(main)/roadmap/page.tsx`          | `VisualTreeWrapper` 깊은 경로 import | `@/features/roadmap`에서 이미 export 중 — import 경로만 변경 |
| `src/app/(main)/roadmap/[goalId]/page.tsx` | `GoalViewMode` 직접 import           | barrel 경유로 변경                                           |

> ~~`src/components/layout/date-task-panel.tsx`~~: 검증 결과 이미 barrel 경유 (`@/features/roadmap/components/panel-modes`). 수정 불필요.

`src/features/roadmap/index.ts`에 `RoadmapFormDialog` export 추가. (`VisualTreeWrapper`는 이미 export 중)

---

### Phase 2 추가 — 버그 수정

#### 2-5. Action 소유권 검증 누락 (보안)

**파일**: `goal.actions.ts`, `phase.actions.ts`, `task.actions.ts`, `area.actions.ts`

모든 mutation action이 인증만 확인하고 리소스 소유권 미확인:

```typescript
// Before
const {
  data: { user },
} = await supabase.auth.getUser()
if (!user) return errorResponse(ErrorCode.AUTH_REQUIRED)
const goal = await goalRepository.update(supabase, id, input)

// After — ownership 체크 추가 (RLS 보완)
const existing = await goalRepository.getById(supabase, id)
if (!existing || existing.user_id !== user.id) {
  return errorResponse(ErrorCode.FORBIDDEN, '권한이 없습니다.')
}
```

※ RLS가 있더라도 방어적 검증 권장. Goal/Area는 직접 `user_id` 확인, Phase/Task는 부모 Goal 경유 확인.

#### ~~2-6. AI 분해 미리보기 에러 핸들링 누락~~ (이미 구현됨)

> 검증 결과: `ai-decompose-preview.tsx`의 `handleApply`에는 이미 try/catch가 존재하며, 에러 시 다음 phase로 skip하는 graceful degradation이 구현되어 있음. 추가 수정 불필요.
> 다만 유저에게 에러 토스트를 보여주는 부분은 보강 검토 가능.

#### 2-7. 하드코딩 컬러 확장 (다크모드)

**파일**: `tree-node-card.tsx`

Phase 2-3의 badge.tsx 외에 추가 발견:

- line 102, 207, 233: `text-white` 하드코딩
- line 192: `bg-white/20`

**파일**: `inline-area-create.tsx:83` — `bg-white`

→ CSS 변수 또는 시맨틱 클래스로 교체.

---

### Phase 3 추가 — 스토어 단순화

#### 3-추가1. GoalBrowsePanel 확장 상태 충돌

**파일**: `goal-browse-panel.tsx:40-44`

두 가지 상반된 확장 패턴 공존:

- `expandedAreaId` (단일 ID) — `toggleAreaDetail`에서 사용
- `collapsedAreaIds` (Set, 반전 로직) — `toggleArea`에서 사용

→ Phase 3 스토어 리팩터 시 하나의 패턴으로 통일.

#### 3-추가2. GoalBrowsePanel store 구독 누수

**파일**: `goal-browse-panel.tsx:68-132`

```typescript
useEffect(() => {
  const unsub = useRoadmapStore.subscribe(...)
  return unsub
}, [goals])  // ← goals 변경 시마다 구독 재생성
```

→ `goals` dependency 제거, store selector 패턴으로 전환 (Phase 3 selector 도입과 함께).

#### 3-추가3. visual-tree setState + rAF 경쟁 조건

**파일**: `visual-tree.tsx:55-75`

동기 `setState` 후 `requestAnimationFrame`으로 `setInlineMode` → 중간 렌더.
→ 단일 atomic `setState`로 통합.

#### 3-추가4. 트리↔아코디언 양방향 동기화

아코디언에서 goal 확장 → 트리 하이라이트 미반영.
→ `toggleGoal`에서 `highlightNode('goal', goalId)` 호출 추가.

---

### Phase 4 추가 — 성능 최적화

#### 4-7. 핵심 뮤테이션 Optimistic Update

**파일**: `use-goals.ts`, `use-phases.ts`

`useUpdateGoal`, `useCreatePhase`, `useDeletePhase` 등에 `onMutate` 추가.
현재는 `useReorderPhases`, `useReorderAreas`, `useUpdateTask`만 optimistic.

#### 4-8. Waterfall 쿼리 패턴 (TODO)

`goal-view-mode.tsx`에서 goal/phases/tasks 3개 쿼리 순차 실행.
→ 장기적으로 Supabase RPC 하나로 통합 고려.

---

### Phase 7 추가 — 폼 중복 제거

#### 7-5. 폼 검증 일관성

- 공백 문자열 허용 → Zod `.trim()` 추가
- Color 필드 hex 형식 미검증 → `.regex(/^#[0-9a-fA-F]{6}$/)` 추가
- `area-edit-form.tsx:42` 기본 색상 `'#6366f1'` → 상수 추출

---

### Phase 9 추가 — 코드 품질

#### 9-9. 쿼리 에러 시 빈 상태 조용히 표시

**파일**: `goal-accordion-item.tsx`, `goal-view-mode.tsx`

`{ data: phases = [] }` 패턴에서 `isError` 미확인.
→ 에러 시 최소한 토스트 또는 에러 메시지 표시.

#### 9-10. Action 에러 핸들링 문자열 비교

```typescript
if (error instanceof Error && error.message === 'NOT_FOUND') { ... }
```

→ 커스텀 에러 클래스 도입 권장.

#### 9-11. Area 삭제 시 expandedAreas 미정리

`roadmap.store.ts`의 persist된 `expandedAreas`에서 삭제된 area ID 잔류.

#### 9-12. store persistence 전략 주석 추가

`partialize`로 3개 필드만 persist하는 이유 문서화.

#### 9-13. 완료 다이얼로그 하드코딩 경로

`router.push('/roadmap')` → 콜백 또는 pathname 상수 사용.

#### 9-14. 로드맵 페이지 metadata 누락

`src/app/(main)/roadmap/page.tsx`에 `export const metadata` 추가.

#### 9-15. native button vs Button 컴포넌트 혼용

`inline-area-create.tsx`, `area-edit-form.tsx`의 프리셋/컬러 버튼 → `Button` 통일.

---

## 수정된 실행 순서

| Phase             | 위험도     | 파일 수         | 의존성          | 추가 항목                                            |
| ----------------- | ---------- | --------------- | --------------- | ---------------------------------------------------- |
| 1. Dead Code 삭제 | Zero       | 8 삭제 + 2 수정 | 없음            | +barrel 정리 확장                                    |
| 2. 버그 수정      | Low-Medium | 4 → **6**       | Phase 1 후      | +소유권 검증, 다크모드 확장 (AI 에러는 이미 구현됨)  |
| 3. 스토어 단순화  | Medium     | 13 → **17**     | Phase 1 후      | +확장상태 통일, 구독누수, rAF, 양방향동기화          |
| 4. 성능 최적화    | Medium     | 5 → **7**       | Phase 3 후 권장 | +optimistic, waterfall(TODO) (index key는 이미 정상) |
| 5. 공통 훅 추출   | Low        | 3 신규 + 4 수정 | Phase 1 후      | 변동 없음                                            |
| 6. 대형 파일 분해 | Medium     | 2 분해 + 7 신규 | Phase 4, 5 후   | 변동 없음                                            |
| 7. 폼 중복 제거   | Medium     | 3 신규 + 8 수정 | Phase 6과 독립  | +검증 일관성                                         |
| 8. 접근성 개선    | Low        | 6               | 독립            | 변동 없음                                            |
| 9. 코드 품질      | Low        | 5 → **12**      | 독립            | +쿼리에러, 에러클래스, 기타 7건                      |

---

## 수정된 검증 방법

기존 검증 항목에 추가:

- 보안: RLS + action 소유권 검증 → 타 유저 데이터 수정 불가 확인
- AI 분해: 의도적 네트워크 에러 시 에러 토스트 + 부분 생성 처리 확인
- 트리↔아코디언: 아코디언 goal 확장 시 트리 하이라이트 동기화 확인
- 다크모드: tree-node-card Direction 노드 + inline-area-create 색상 확인

---

## 수정된 예상 효과

기존 효과에 추가:

| 지표                          | Before         | After                |
| ----------------------------- | -------------- | -------------------- |
| 하드코딩 컬러 (다크모드 깨짐) | 1곳 → **6+곳** | 0                    |
| Action 소유권 검증            | 0개            | 전체 mutation        |
| Barrel 우회 import            | 2곳            | 0                    |
| 확장 상태 패턴 충돌           | 2개 패턴 공존  | 1개 통일             |
| Store 구독 재생성             | goals 변경마다 | 안정 (deps 제거)     |
| Optimistic update             | 3곳만          | 핵심 mutation 전체   |
| 폼 검증 미비                  | 4곳+           | 0 (trim, regex 추가) |
| 쿼리 에러 무시                | 5곳+           | 0 (에러 표시)        |

---

## 확인 완료 — 문제 없는 영역

- TypeScript strict: `any` 타입 0건
- 순환 의존성: 0건
- 미사용 query hook: 0건
- 폼 유효성 검사: 전부 중앙 Zod 스키마 사용 (검증 항목 보강 필요 → Phase 7-5)
- 에러 핸들링: 모든 mutation에 `toast.error` 패턴 일관 (쿼리 에러 표시 보강 필요 → Phase 9-9)
- 'use client' 표기: 전체 정확
- 삭제 파일 잔여 참조: 0건
- 번들 사이즈: import 최적화 양호 (tree-shaking 정상)
- 애니메이션: Framer Motion 일관 사용, duration 통일
- 아이콘: lucide-react 단일 소스, 크기 일관
- CSS 변수: `tokens.css` 중앙 관리
- 반응형 breakpoint: `lg:` 일관 사용
- ResponsiveModal 패턴: 6곳 일관
- query key: roadmap 관련 stale key 없음
- 패키지 의존성: 미사용 의존성 없음
