# 타임라인 항목 숨기기 (Hide Timeline Events)

## Context

기록 > 나의 흐름 타임라인은 현재 완전히 read-only. 사용자가 불필요하거나 노이즈인 항목을 정리할 방법이 없다. 모든 종류의 타임라인 항목(상태 변경, 프로필, 방향, AI 관찰/질문)에 대해 숨기기 기능을 추가한다.

## 결정 사항

- **Soft delete**: DB에 남기고 UI에서만 숨김 (복원 가능성 확보)
- **별도 테이블**: 기존 history 테이블 스키마 변경 없이 `hidden_timeline_events` 테이블 하나로 처리
- **UI**: 카드 호버 시 X 버튼 표시
- **대상**: 이벤트 카드 + AI 관찰/질문 카드 모두

## DB 스키마

### `hidden_timeline_events` 테이블

```sql
CREATE TABLE hidden_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  hidden_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- RLS
ALTER TABLE hidden_timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own hidden events"
  ON hidden_timeline_events FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index
CREATE INDEX idx_hidden_timeline_user ON hidden_timeline_events(user_id);
```

**컬럼 설명:**

- `event_id`: 기존 타임라인 composite ID 그대로 사용
  - 이벤트: `goal-{uuid}`, `task-{uuid}`, `trait-created-{uuid}`, `trait-history-{uuid}-{idx}`, `dir-{uuid}`
  - AI 노드: `ai-{node.id}`
- `event_type`: `goal_status` | `task_status` | `profile_trait` | `direction_change` | `ai_observation`

## 파일 변경 목록

### 새 파일

| 파일                                                      | 설명                                 |
| --------------------------------------------------------- | ------------------------------------ |
| `supabase/migrations/2026XXXX_hidden_timeline_events.sql` | 마이그레이션                         |
| `src/repositories/hidden-timeline.repository.ts`          | Repository (getByUser, hide, unhide) |
| `src/actions/hidden-timeline.actions.ts`                  | Server action (hideTimelineEvent)    |
| `src/queries/use-hide-timeline-event.ts`                  | Mutation hook + optimistic update    |

### 수정 파일

| 파일                                                     | 변경 내용                                     |
| -------------------------------------------------------- | --------------------------------------------- |
| `src/actions/timeline.actions.ts`                        | hidden set 조회 후 이벤트 필터링              |
| `src/queries/use-timeline.ts`                            | queryKey에 hidden 의존성 없음 (서버에서 필터) |
| `src/features/record/components/timeline-event-card.tsx` | group hover X 버튼 추가                       |
| `src/features/record/components/timeline-ai-card.tsx`    | group hover X 버튼 추가                       |
| `src/types/database.ts`                                  | `npm run db:types`로 재생성                   |

## Repository

```typescript
// src/repositories/hidden-timeline.repository.ts
export const hiddenTimelineRepository = {
  async getByUser(supabase, userId): Promise<Set<string>> {
    // SELECT event_id FROM hidden_timeline_events WHERE user_id = ?
    // Return as Set<string> for O(1) lookup
  },

  async hide(supabase, userId, eventId, eventType): Promise<void> {
    // INSERT INTO hidden_timeline_events (user_id, event_id, event_type)
    // ON CONFLICT (user_id, event_id) DO NOTHING
  },

  async unhide(supabase, userId, eventId): Promise<void> {
    // DELETE FROM hidden_timeline_events WHERE user_id = ? AND event_id = ?
  },
}
```

## Server Action

```typescript
// src/actions/hidden-timeline.actions.ts
export const hideTimelineEvent = authAction(
  'hideTimelineEvent',
  async ({ supabase, user }, { eventId, eventType }) => {
    await hiddenTimelineRepository.hide(supabase, user.id, eventId, eventType)
    return successResponse(null)
  }
)
```

## getTimelineEvents 변경

`src/actions/timeline.actions.ts`의 `getTimelineEvents`:

- hidden set을 병렬로 함께 조회
- 이벤트 매핑 후 `events.filter(e => !hiddenSet.has(e.id))`

AI 관찰 노드도 동일하게:

- `/api/ai/timeline-observations` 또는 프론트에서 hidden set으로 필터

## Mutation Hook (Optimistic Update)

```typescript
// src/queries/use-hide-timeline-event.ts
export function useHideTimelineEvent() {
  return useMutation({
    mutationFn: ({ eventId, eventType }) => hideTimelineEvent({ eventId, eventType }),
    onMutate: async ({ eventId }) => {
      // 1. Cancel timeline queries
      // 2. Snapshot previous data
      // 3. Optimistically remove event from cache
    },
    onError: (err, vars, context) => {
      // Rollback to snapshot
    },
    onSettled: () => {
      // Invalidate timeline queries
    },
  })
}
```

## UI 변경

### TimelineEventCard

```tsx
// 카드 wrapper에 group 추가 + relative 포지션
<div className="group relative flex gap-3 py-2.5">
  {/* 기존 내용 */}

  {/* X 버튼 - 호버 시 표시 */}
  <button
    onClick={() => onHide(event.id, event.type)}
    className="absolute top-1 right-0 opacity-0 group-hover:opacity-100 ..."
  >
    <X className="h-3 w-3" />
  </button>
</div>
```

### TimelineAiCard

동일 패턴. 기존 "대화 →" 버튼 옆 또는 카드 우측 상단에 X 버튼.

## 검증 방법

1. 마이그레이션 실행 후 `npm run db:types`
2. `npm run type-check` 통과
3. `npm run lint` 통과
4. 브라우저에서 /record 이동:
   - 이벤트 카드 호버 → X 버튼 노출 확인
   - AI 카드 호버 → X 버튼 노출 확인
   - X 클릭 → 카드 즉시 사라짐 (optimistic)
   - 페이지 새로고침 → 숨긴 카드 여전히 안 보임
