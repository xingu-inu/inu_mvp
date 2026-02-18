# Task 상태 관리 개선 + Phase→Group 전환

## 개요

두 가지 축의 개선:

1. **Task 상태 시스템**: `is_active` boolean → `task_status` enum (active/completed/paused) + 일회성 Task 날짜 지정
2. **Phase → Group**: 순서 강제하는 "단계" 개념 → 순수 폴더/그룹으로 전환 + 전체 리네임

### 핵심 원칙

- 생성 방식 불변 (Task 인라인 입력, Group 생성 기존 그대로)
- 변경은 상태 관리 + 네이밍에 집중

### 설계 결정 (리서치 기반)

| 결정                                                  | 근거                                                                                                                |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **`completed`는 일회성 Task 전용**                    | 반복 Task는 active/paused만 허용. Things 3, Streaks 등 업계 표준. "습관 마스터" = paused + 사유("목표 달성")로 처리 |
| **과거 미완료 일회성 Task → 오늘에서만 Overdue 표시** | Todoist 패턴. 오늘 화면에서만 표시하여 노이즈 최소화. 미래 날짜 조회 시 미포함                                      |
| **일회성 vs 반복 Task 시각적 구분**                   | 사용자가 한눈에 구분할 수 있어야 함 (repeat 아이콘 / calendar 아이콘)                                               |
| **마이그레이션 2단계 분리**                           | Task 상태(축 1) 먼저 배포 → Phase→Group(축 2) 별도 배포. 위험 감소                                                  |
| **Group에 `is_completed` boolean 유지**               | sequential activation은 제거하되 선택적 완료 마킹은 남김. 진행 추적 가능                                            |
| **Task pause는 경량 Popover**                         | Goal보다 가벼운 엔티티 → pause가 빈번할 수 있으므로 마찰 최소화. InlineStatusTransition 대신 Popover                |
| **완료된 once Task를 홈에서 유지**                    | 취소선+체크로 해당 날짜에 남겨둠. 사라지면 성취감 손실 (Google Tasks 패턴)                                          |

### 구현 순서

**Phase A**: 축 1 (Task 상태 시스템) — 먼저 배포
**Phase B**: 축 2 (Phase → Group 전환) — 별도 배포

---

## 축 1: Task 상태 시스템

### 1-1. DB 마이그레이션

**파일**: `supabase/migrations/YYYYMMDD_task_status_system.sql`

```sql
-- 1) task_status enum
CREATE TYPE task_status AS ENUM ('active', 'completed', 'paused');

-- 2) tasks 테이블 컬럼 추가
ALTER TABLE public.tasks
  ADD COLUMN status task_status NOT NULL DEFAULT 'active',
  ADD COLUMN scheduled_date DATE,
  ADD COLUMN completed_at TIMESTAMPTZ,
  ADD COLUMN paused_at TIMESTAMPTZ,
  ADD COLUMN status_change_reason TEXT,
  ADD COLUMN status_change_note TEXT;

-- 3) 기존 데이터 마이그레이션
UPDATE public.tasks SET status = CASE
  WHEN is_active = TRUE THEN 'active'::task_status
  WHEN repeat_type = 'once' THEN 'completed'::task_status
  ELSE 'paused'::task_status
END;

-- 4) 기존 once Task에 scheduled_date 설정 (fallback: 생성일)
UPDATE public.tasks
SET scheduled_date = created_at::date
WHERE repeat_type = 'once' AND scheduled_date IS NULL;

-- 5) is_active ↔ status 동기화 trigger
CREATE OR REPLACE FUNCTION sync_task_is_active()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_active = (NEW.status = 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_sync_is_active
  BEFORE INSERT OR UPDATE OF status ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION sync_task_is_active();

-- 6) 인덱스
CREATE INDEX idx_tasks_status ON public.tasks(user_id, status) WHERE status = 'active';
CREATE INDEX idx_tasks_scheduled_date ON public.tasks(scheduled_date) WHERE repeat_type = 'once';
```

**후속 마이그레이션 (Phase A 안정화 후)**: 모든 RPC/query가 `status` 사용으로 전환 완료 후 `is_active` 컬럼 + trigger 제거.

### 1-2. RPC 업데이트

**파일**: `supabase/migrations/YYYYMMDD_update_rpcs_task_status.sql`

**get_today_tasks 변경 (get_week_tasks도 동일 패턴):**

현재 WHERE:

```sql
AND t.is_active = TRUE
AND (
  t.repeat_type = 'daily'
  OR t.repeat_type = 'once'                    -- 버그: 모든 날짜에 표시
  ...
)
```

변경 후:

```sql
AND t.status = 'active'                         -- is_active → status
AND (
  (t.repeat_type != 'once' AND (                -- 반복 Task: 기존 패턴
    t.repeat_type = 'daily'
    OR (t.repeat_type = 'weekdays' AND EXTRACT(DOW FROM p_date) BETWEEN 1 AND 5)
    OR (t.repeat_type = 'weekends' AND EXTRACT(DOW FROM p_date) IN (0, 6))
    OR (t.repeat_type = 'weekly' AND EXTRACT(DOW FROM p_date) = ANY(t.repeat_days))
    OR (t.repeat_type = 'custom' AND EXTRACT(DOW FROM p_date) = ANY(t.repeat_days))
  ))
  OR (t.repeat_type = 'once' AND t.scheduled_date = p_date)  -- 일회성: 해당 날짜만
  -- ★ Overdue: 오늘에서만 표시 (미래 날짜 조회 시 미포함)
  OR (t.repeat_type = 'once' AND t.scheduled_date < p_date AND p_date = CURRENT_DATE)
)
```

또한 JSON 출력에 추가:

```sql
'scheduledDate', t.scheduled_date,
'taskStatus', t.status,
'isOverdue', (t.repeat_type = 'once' AND t.scheduled_date < p_date AND p_date = CURRENT_DATE)
```

그리고 `phases` → `groups` 리네임 반영 (축 2와 동시 배포 시):

```sql
-- 기존
'phase', (SELECT ... FROM phases p WHERE p.id = t.phase_id)
-- 변경
'group', (SELECT ... FROM groups g WHERE g.id = t.group_id)
```

**create_checkin_with_streak 변경:**

```sql
-- 체크인 생성 후, once Task이면 자동 완료
IF (SELECT repeat_type FROM tasks WHERE id = p_task_id) = 'once'
   AND p_status = 'done' THEN
  UPDATE tasks SET
    status = 'completed',
    completed_at = NOW()
  WHERE id = p_task_id;
END IF;
-- once Task는 스트릭 로직 스킵
```

**undo_checkin_with_streak 변경:**

```sql
-- 체크인 취소 후, once Task이면 active로 복원
IF (SELECT repeat_type FROM tasks WHERE id = v_task_id) = 'once' THEN
  UPDATE tasks SET
    status = 'active',
    completed_at = NULL
  WHERE id = v_task_id;
END IF;
```

**reset_missed_streaks 변경:**

```sql
-- once Task 제외
WHERE is_active = TRUE
  AND repeat_type != 'once'
  AND last_check_in_date < CURRENT_DATE - INTERVAL '1 day';
```

### 1-3. TypeScript 타입

**파일**: `src/types/entities.ts`

```typescript
// 추가
export type TaskStatus = 'active' | 'completed' | 'paused'

// Task 인터페이스 변경
export interface Task extends BaseEntity {
  // ... 기존 필드 ...
  status: TaskStatus // 추가
  scheduled_date: string | null // 추가 (YYYY-MM-DD)
  completed_at: string | null // 추가
  paused_at: string | null // 추가
  status_change_reason: string | null // 추가
  status_change_note: string | null // 추가
  is_active: boolean // 유지 (trigger로 동기화, 후속 마이그레이션에서 제거)
}

// HomeTask 추가 필드
export interface HomeTask extends Omit<Task, 'goal' | 'phase'> {
  // ... 기존 ...
  isOverdue: boolean // 추가
  scheduledDate: string | null // 추가
  taskStatus: TaskStatus // 추가
}

// CreateTaskInput 변경
export interface CreateTaskInput {
  // ... 기존 필드 ...
  scheduled_date?: string // 추가 (once일 때 필수)
}

// UpdateTaskInput 변경
export interface UpdateTaskInput {
  // ... 기존 필드 ...
  status?: TaskStatus // 추가
  scheduled_date?: string // 추가
  status_change_reason?: string // 추가
  status_change_note?: string // 추가
}
```

**삭제**: `PhaseStatus` 타입, `Phase` 인터페이스 (→ Group으로 대체, 축 2 참조)

### 1-4. Zod 스키마

**파일**: `src/lib/validations/index.ts`

```typescript
// 추가
export const taskStatusSchema = z.enum(['active', 'completed', 'paused'])

// createTaskSchema 변경
export const createTaskSchema = z
  .object({
    // ... 기존 ...
    scheduled_date: dateSchema.optional(),
  })
  .refine((data) => data.repeat_type !== 'once' || data.scheduled_date, {
    message: '1회 할일은 날짜를 선택해주세요',
    path: ['scheduled_date'],
  })

// updateTaskSchema 변경
// 주의: 반복 Task에 completed 방지 (일회성 전용)
export const updateTaskSchema = z
  .object({
    // ... 기존 ...
    status: taskStatusSchema.optional(),
    scheduled_date: dateSchema.optional(),
    status_change_reason: z.string().max(100).optional(),
    status_change_note: z.string().max(500).optional(),
  })
  .refine(
    (data) => !(data.status === 'completed' && data.repeat_type && data.repeat_type !== 'once'),
    { message: '반복 할일은 완료 처리할 수 없습니다. 일시 정지를 사용하세요.', path: ['status'] }
  )
```

**삭제**: `phaseStatusSchema`, `createPhaseSchema`, `updatePhaseSchema` (→ Group용으로 대체)

### 1-5. Repository

**파일**: `src/repositories/task.repository.ts`

**create 변경** (L127-155):

```typescript
// insert 객체에 추가:
scheduled_date: input.scheduled_date ?? null,
// status는 DB default 'active' 사용
```

**update 변경** (L161-185):

```typescript
// input에 status, scheduled_date, status_change_reason, status_change_note 포함 가능
// completed_at / paused_at 자동 설정:
const updateData: Record<string, unknown> = { ...input, updated_at: now() }
if (input.status === 'completed') updateData.completed_at = now()
if (input.status === 'paused') updateData.paused_at = now()
if (input.status === 'active') {
  updateData.paused_at = null
  updateData.completed_at = null
}
```

**toggleActive 제거** (L190-215): status 기반으로 대체됨

### 1-6. Actions

**파일**: `src/actions/task.actions.ts` — 변경 없음 (pass-through)

**파일**: `src/actions/checkin.actions.ts`

**createCheckIn 변경** (L49-58): 클라이언트측 once Task 자동 비활성화 로직 제거 (RPC에서 처리)

```typescript
// 삭제:
// if (taskData?.repeat_type === 'once') {
//   await supabase.from('tasks').update({ is_active: false }).eq('id', taskId)
// }
```

### 1-7. Query Layer

**파일**: `src/queries/use-tasks.ts`

**useCreateTask** (L89-169): optimistic Task에 새 필드 추가:

```typescript
const tempTask: Task = {
  // ... 기존 ...
  status: 'active',
  scheduled_date: input.scheduled_date ?? null,
  completed_at: null,
  paused_at: null,
  status_change_reason: null,
  status_change_note: null,
}
```

### 1-8. 상수

**파일**: `src/lib/constants/time-slots.ts`

```typescript
// FULL_REPEAT_OPTIONS에 once 추가 (L83-88)
export const FULL_REPEAT_OPTIONS: Array<{ value: RepeatType; label: string }> = [
  { value: 'once', label: '1회' }, // 추가
  { value: 'daily', label: '매일' },
  { value: 'weekdays', label: '평일' },
  { value: 'weekends', label: '주말' },
  { value: 'weekly', label: '매주' },
]
```

### 1-9. Task 상태 설정 상수

**파일**: `src/lib/task-status.ts` (신규)

Goal의 `src/lib/goal-status.ts` 패턴 재사용:

```typescript
import type { TaskStatus } from '@/types/entities'

export const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string }> = {
  active: { label: '진행 중' },
  completed: { label: '완료' },
  paused: { label: '일시 정지' },
}

// 일시정지 사유 태그 (Goal의 STATUS_CHANGE_REASONS 재사용 가능)
export const TASK_PAUSE_REASONS = [
  { value: 'time', label: '시간 부족' },
  { value: 'interest', label: '흥미 감소' },
  { value: 'priority', label: '다른 우선순위' },
  { value: 'difficulty', label: '난이도 조절 필요' },
  { value: 'health', label: '건강/컨디션' },
] as const

export const TASK_STATUS_MESSAGES: Partial<Record<TaskStatus, string>> = {
  active: '다시 시작하는 것도 용기예요',
  paused: '쉬는 것도 과정의 일부예요. 준비되면 언제든 돌아오세요',
  completed: '해냈어요!',
}
```

### 1-10. UI — overflow 메뉴 확장

**파일**: 각 Task가 렌더되는 컴포넌트 (roadmap의 task item, goal-expanded-content 등)

현재 `OverflowMenu`에 수정/삭제만 있음. 상태 옵션 추가:

```typescript
const taskMenuItems: OverflowMenuItem[] = [
  // 기존: 수정, 삭제
  // 추가 (task.status에 따라 조건부):
  ...(task.status === 'active' ? [
    { label: '일시 정지', icon: <Pause />, onClick: () => handlePause(task) },
    // "완료"는 일회성 Task에만 표시 (반복 Task는 active/paused만)
    ...(task.repeat_type === 'once' ? [
      { label: '완료', icon: <CheckCircle />, onClick: () => handleComplete(task) },
    ] : []),
  ] : []),
  ...(task.status === 'paused' ? [
    { label: '다시 시작', icon: <Play />, onClick: () => handleResume(task) },
  ] : []),
]
```

### 1-11. UI — 일시정지 사유 (경량 Popover)

**신규**: `src/features/roadmap/components/shared/task-pause-popover.tsx`

Goal의 InlineStatusTransition은 인라인 폼 교체 방식이라 무거움. Task는 더 빈번하게 pause할 수 있으므로 **경량 Popover** 사용:

```tsx
// TaskPausePopover — Radix Popover 기반
interface TaskPausePopoverProps {
  taskName: string
  onConfirm: (reason?: string, note?: string) => void
  onCancel: () => void
  trigger: React.ReactNode
}

// 내부 구조:
// - 타이틀: "일시 정지할까요?"
// - 사유 태그 칩 (TASK_PAUSE_REASONS) — 선택적
// - 메모 한 줄 입력 — 선택적
// - [취소] [확인] 버튼
// 폼 교체 없이 Popover로 열고 닫힘 → 마찰 최소화
```

**비교:**
| | Goal (InlineStatusTransition) | Task (TaskPausePopover) |
|--|------|------|
| UI 방식 | 인라인 폼 교체 | Popover (오버레이) |
| 사유 입력 | 태그 + 커스텀 입력 | 태그만 (선택적) |
| 메모 | textarea | 한 줄 input (선택적) |
| 마찰 수준 | 중 | 저 |

### 1-12. UI — 일회성 Task 날짜 선택

**파일**: `src/features/roadmap/components/shared/task-form-fields.tsx`

repeat_type이 `once`일 때만 날짜 picker 표시:

```tsx
{
  selectedRepeat === 'once' && (
    <div>
      <Label>날짜</Label>
      <Input
        type="date"
        value={form.watch('scheduled_date') ?? format(new Date(), 'yyyy-MM-dd')}
        onChange={(e) => form.setValue('scheduled_date', e.target.value)}
      />
    </div>
  )
}
```

**파일**: `src/features/home/components/inline-task-input.tsx`

"오늘만" 선택 시 자동으로 `scheduled_date = panelDate(선택된 날짜)`:

```typescript
// createTask 호출 시:
const input = {
  ...formData,
  scheduled_date: formData.repeat_type === 'once' ? selectedDate : undefined,
}
```

### 1-13. UI — Group 진행률 표시

**파일**: `src/features/roadmap/components/panel-modes/goal-expanded-content.tsx`

Group 헤더에 일회성 Task 완료 현황:

```tsx
const onceTasks = groupTasks.filter((t) => t.repeat_type === 'once')
const completedOnce = allGroupTasks.filter(
  (t) => t.repeat_type === 'once' && t.status === 'completed'
)
// 표시: "3/5 완료"
```

완료된 일회성 Task는 로드맵에서 취소선 + 체크 표시:

```tsx
<span
  className={cn(task.status === 'completed' && 'text-[var(--color-text-tertiary)] line-through')}
>
  {task.name}
</span>
```

### 1-14. UI — 일회성 vs 반복 Task 시각적 구분

사용자가 한눈에 Task 유형을 구분할 수 있어야 함.

**아이콘 구분:**

```tsx
import { Repeat, CalendarCheck } from 'lucide-react'

// Task 이름 앞에 표시
{
  task.repeat_type === 'once' ? (
    <CalendarCheck className="size-3.5 text-[var(--color-text-tertiary)]" />
  ) : (
    <Repeat className="size-3.5 text-[var(--color-text-tertiary)]" />
  )
}
```

**적용 위치:**

- `goal-expanded-content.tsx` (로드맵 Task 목록)
- `week-task-block.tsx` (홈 캘린더 블록)
- `compact-task-row.tsx` (홈 Task 목록)

### 1-15. UI — 완료된 once Task 홈 표시

완료된 일회성 Task는 홈에서 사라지지 않고, **해당 scheduled_date의 칼럼에 취소선+체크로 남겨둠** (성취감 유지).

**Week Grid / Task List:**

```tsx
// completed once Task 스타일
<div className={cn(task.taskStatus === 'completed' && 'opacity-50')}>
  <CheckCircle className="size-3.5 text-[var(--color-done)]" />
  <span className="text-[var(--color-text-tertiary)] line-through">{task.name}</span>
</div>
```

- 연한 opacity + line-through + 체크 아이콘
- 클릭 시 task detail panel에서 완료 상태 확인 가능
- RPC에서 completed once Task도 해당 scheduled_date에 포함시키되 `taskStatus: 'completed'` 플래그

### 1-16. UI — Overdue 일회성 Task 표시 (오늘만)

과거 `scheduled_date`의 미완료 일회성 Task를 **오늘 화면에서만** 표시.

**HomeDailyPanel / task-list.tsx:**

```tsx
// 오늘 Task 목록에서 overdue 분리
const overdueTasks = todayTasks.filter((t) => t.isOverdue)
const normalTasks = todayTasks.filter((t) => !t.isOverdue)

// overdue 섹션을 상단에 표시
{
  overdueTasks.length > 0 && (
    <div className="rounded-xl bg-[var(--color-miss)]/10 p-3">
      <p className="mb-2 text-xs font-medium text-[var(--color-miss)]">지연된 할일</p>
      {overdueTasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          badge={`D+${differenceInDays(today, task.scheduledDate)}`}
        />
      ))}
    </div>
  )
}
```

**스타일:**

- 배경: `var(--color-miss)` 10% opacity
- 라벨: "지연된 할일" (연한 빨강)
- 각 Task에 "D+N" 배지 (며칠 지연)
- 클릭 시: 날짜 변경 또는 완료/삭제 처리 가능

**WeekViewGrid에서:**

- Overdue Task는 오늘 열의 "종일" 행에 표시
- 일반 Task와 시각적으로 구분 (border-left: `var(--color-miss)`)
- 미래 날짜 열에서는 overdue 미표시 (오늘만)

---

## 축 2: Phase → Group 전환

### 2-1. DB 마이그레이션

**파일**: `supabase/migrations/YYYYMMDD_phase_to_group.sql`

```sql
-- 1) 테이블 리네임
ALTER TABLE public.phases RENAME TO groups;

-- 2) 외래키 리네임 (tasks 테이블)
ALTER TABLE public.tasks RENAME COLUMN phase_id TO group_id;

-- 3) is_completed boolean 추가 (선택적 완료 마킹)
ALTER TABLE public.groups ADD COLUMN is_completed BOOLEAN DEFAULT FALSE;

-- 4) 기존 completed 데이터 마이그레이션
UPDATE public.groups SET is_completed = TRUE WHERE status = 'completed';

-- 5) status enum 컬럼 삭제 (sequential activation 제거)
ALTER TABLE public.groups DROP COLUMN status;

-- 6) phase_status enum 삭제
DROP TYPE phase_status;

-- 7) completed_at 유지 (is_completed = true 시점 기록)
-- ALTER TABLE public.groups DROP COLUMN completed_at; ← 삭제하지 않음

-- 8) 인덱스 리네임
ALTER INDEX IF EXISTS phases_pkey RENAME TO groups_pkey;
```

**주의**: phases 테이블의 RLS 정책도 groups로 리네임 필요. 초기 스키마에서 RLS 정책 이름 확인 후 ALTER.

### 2-2. TypeScript 타입

**파일**: `src/types/entities.ts`

```typescript
// 삭제
// export type PhaseStatus = 'pending' | 'active' | 'completed'
// export interface Phase extends BaseEntity { ... }

// 추가
export interface Group extends BaseEntity {
  goal_id: string
  name: string
  why: string | null
  description: string | null
  sort_order: string
  is_completed: boolean // 선택적 완료 마킹
  completed_at: string | null // 완료 시점 기록
}

// Input 타입
export interface CreateGroupInput {
  goal_id: string
  name: string
  why?: string
  description?: string
}

export interface UpdateGroupInput {
  name?: string
  why?: string
  description?: string
  sort_order?: string
  is_completed?: boolean // 완료 토글
}
```

**Task, Goal 인터페이스에서도 변경:**

```typescript
// Task
phase_id → group_id
phase? → group?

// Goal
phases? → groups?
```

### 2-3. Zod 스키마

**파일**: `src/lib/validations/index.ts`

```typescript
// 삭제: phaseStatusSchema, createPhaseSchema, updatePhaseSchema

// 추가
export const createGroupSchema = z.object({
  goal_id: uuidSchema,
  name: z.string().trim().min(1, 'Required').max(100),
  why: z.string().trim().max(300).optional(),
  description: z.string().trim().max(500).optional(),
})

export const updateGroupSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  why: z.string().trim().max(300).optional(),
  description: z.string().trim().max(500).optional(),
  sort_order: z.string().optional(),
  is_completed: z.boolean().optional(),
})
```

### 2-4. Repository

**파일**: `src/repositories/phase.repository.ts` → `src/repositories/group.repository.ts`

**제거하는 메서드:**

- `activate` (exclusive activation 삭제)
- `complete` → `toggleComplete`로 대체 (is_completed boolean 토글)

**추가하는 메서드:**

```typescript
async toggleComplete(supabase, id: string): Promise<Group> {
  // 현재 is_completed 조회 후 반전
  const group = await this.getById(supabase, id)
  const newCompleted = !group.is_completed
  const { data, error } = await supabase
    .from('groups')
    .update({
      is_completed: newCompleted,
      completed_at: newCompleted ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select().single()
  ...
}
```

**단순화되는 create:**

```typescript
// 기존: 첫 번째면 active, 아니면 pending → status 로직 제거
async create(supabase, input: CreateGroupInput): Promise<Group> {
  const { data, error } = await supabase
    .from('groups')
    .insert({
      goal_id: input.goal_id,
      name: input.name,
      why: input.why ?? null,
      description: input.description ?? null,
      sort_order: newSortOrder,
      // status 없음, is_completed default false
    })
    .select().single()
  ...
}
```

**`enableGroups` 단순화:**

- 기존: 첫 Phase를 active로 생성 → 단순히 그룹 생성만 (status 없음)

**나머지 메서드** (getByGoal, getById, update, delete, reorder): 테이블명만 `phases` → `groups`

### 2-5. Actions

**파일**: `src/actions/phase.actions.ts` → `src/actions/group.actions.ts`

**제거하는 액션:**

- `activatePhase`
- `completePhase`

**추가하는 액션:**

- `toggleGroupComplete` (is_completed 토글)

**리네임하는 액션:**

- `getPhasesByGoal` → `getGroupsByGoal`
- `createPhase` → `createGroup`
- `updatePhase` → `updateGroup`
- `deletePhase` → `deleteGroup`
- `enableGoalPhases` → `enableGoalGroups`
- `disableGoalPhases` → `disableGoalGroups`
- `reorderPhases` → `reorderGroups`

**에러 메시지 변경:**

- "단계를 찾을 수 없습니다" → "그룹을 찾을 수 없습니다"

### 2-6. Queries

**파일**: `src/queries/use-phases.ts` → `src/queries/use-groups.ts`

**제거하는 훅:**

- `useActivatePhase`
- `useCompletePhase`

**추가하는 훅:**

- `useToggleGroupComplete` (is_completed 토글, optimistic update)

**리네임하는 훅:**

- `usePhasesByGoal` → `useGroupsByGoal`
- `useCreatePhase` → `useCreateGroup`
- `useUpdatePhase` → `useUpdateGroup`
- `useDeletePhase` → `useDeleteGroup`
- `useReorderPhases` → `useReorderGroups`
- `useEnableGoalPhases` → `useEnableGoalGroups`
- `useDisableGoalPhases` → `useDisableGoalGroups`
- `updateGoalPhases` 헬퍼 → `updateGoalGroups`

**queryKeys 변경** (`src/lib/query/keys.ts`):

- `queryKeys.phases` → `queryKeys.groups`

**toast 메시지 변경:**

- "단계가 추가되었습니다" → "그룹이 추가되었습니다"
- "단계가 수정되었습니다" → "그룹이 수정되었습니다" 등

### 2-7. 컴포넌트 리네임

**인라인 폼:**

- `inline-phase-create.tsx` → `inline-group-create.tsx`
- `inline-phase-edit.tsx` → `inline-group-edit.tsx`
- 내부: status 칩 선택 UI 제거, is_completed 체크박스 추가 (edit에서만)

**패널:**

- `phase-edit-form.tsx` → `group-edit-form.tsx` (있다면)
- handleStatusChange 제거

**기타 참조:**

- `goal-expanded-content.tsx`: phase 관련 변수명/로직 → group
  - Phase 헤더의 pending/active/completed 배지 → 완료 체크박스만
  - Active phase의 파란 왼쪽 보더 → 제거 (모든 그룹 동등)
  - "현재" 배지 → 제거
  - 완료된 그룹: 체크마크 + 연한 opacity
- `goal-accordion-item.tsx`: phase 참조 → group
- `tree-node.tsx`, `tree-node-card.tsx`: phase 메타/표시 → group
  - Phase의 isActive 분기 → 제거
  - is_completed일 때 완료 스타일 유지 (체크 + 연한 색)
- `goal-browse-panel.tsx`: phase 관련 → group

### 2-8. UI 라벨 변경

모든 사용자 노출 텍스트:

- "단계" → "그룹"
- "단계 관리" → "그룹 관리"
- "단계 추가" → "그룹 추가"
- "1단계" (enablePhases 기본값) → "그룹 1" 또는 사용자 입력

### 2-9. data-model.md 업데이트

**파일**: `docs/plan/core/data-model.md`

Phase 섹션을 Group으로 변경. 5단계 구조 설명에서 Phase → Group (선택적 그룹).

---

## 엣지 케이스

| 케이스                          | 처리                                                                                    |
| ------------------------------- | --------------------------------------------------------------------------------------- |
| 일회성 Task 체크인 취소         | task status → active 복원, completed_at → null                                          |
| repeat_type 변경 (once↔daily)   | once→daily: scheduled_date 클리어. daily→once: scheduled_date 필수                      |
| 과거 날짜의 미완료 일회성 Task  | **오늘 화면에서만 Overdue로 표시** (isOverdue 플래그). D+N 배지. 미래 날짜에서는 미표시 |
| 반복 Task에 completed 시도      | Zod refine에서 차단. "일시 정지를 사용하세요" 메시지                                    |
| 반복 Task "영구 종료"           | paused + 사유("목표 달성" 또는 "흥미 감소"). completed 아님                             |
| Goal 없는 독립 Task (Home 생성) | "오늘만" → scheduled_date = panelDate(선택 날짜). 나머지 동일                           |
| 기존 once Task 마이그레이션     | scheduled_date = created_at::date (fallback)                                            |
| Group 삭제 시 소속 Task         | group_id → null (ON DELETE SET NULL 유지)                                               |
| Overdue Task 처리 방법          | 날짜 변경(오늘로), 완료 처리, 또는 삭제                                                 |
| 완료된 once Task 홈 표시        | 해당 scheduled_date에 취소선+체크로 남겨둠 (성취감 유지)                                |
| Group 완료 토글                 | is_completed boolean 토글. completed_at 기록/제거. 소속 Task 상태 변경 없음             |

---

## 검증

### Phase A (Task 상태 — 먼저 배포)

1. `supabase db push` — 마이그레이션 적용
2. `npm run db:types` — 타입 재생성
3. `npm run lint && npm run type-check` — 빌드 확인
4. 수동 테스트:
   - 일회성 Task 생성 (1회 + 날짜) → 해당 날짜 캘린더에만 표시
   - done 체크 → Task 자동 completed → 취소선+체크로 남아있음 → 로드맵에서도 취소선
   - 체크인 취소 → Task active 복원 → 캘린더 재표시
   - 반복 Task 일시정지 (Popover에서 사유 선택) → 캘린더 미표시 → 다시 시작 → 재표시
   - **반복 Task에 "완료" 옵션 없음 확인** (overflow 메뉴에 비표시)
   - **과거 일회성 미완료 Task → 오늘 화면에서만 "지연된 할일" Overdue로 표시 확인**
   - **미래 날짜에서는 overdue 미표시 확인**
   - **일회성/반복 Task 아이콘 구분 확인** (CalendarCheck vs Repeat)
   - Group 진행률 "3/5 완료" 표시 확인

### Phase B (Phase → Group — 별도 배포)

1. 마이그레이션 적용 + 타입 재생성
2. `npm run lint && npm run type-check` — 모든 phase 참조 → group 전환 확인
3. 수동 테스트:
   - Group 생성/수정/삭제 → 기존 Phase 기능과 동일하되 status enum 없음
   - **Group 완료 토글** — 체크박스 클릭 → is_completed 전환 → completed_at 기록
   - **여러 Group의 Task 동시 표시** (sequential activation 없음)
   - UI 라벨 "단계" → "그룹" 전환 확인
   - Task의 group_id 연결 정상 동작 확인
