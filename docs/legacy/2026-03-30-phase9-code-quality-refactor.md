# Phase 9: 코드 품질 & 아키텍처 리팩토링

> 날짜: 2026-03-30
> 이전: Phase 1~8 (레거시 격리, 네비게이션 2페이지화, AI 통합, 타입 정리)

## Context

Phase 1~8에서 레거시 격리, 네비게이션 2페이지화, AI 통합, 타입 정리를 완료했다.
이제 남은 코드 품질 이슈를 해결할 차례: 대형 컴포넌트 분할, 중복 제거, `any` 타입 제거, 스토어 분리.

현재 코드베이스 핵심 수치:

- `goal-view-mode.tsx` 861 LOC, `goal-expanded-content.tsx` 787 LOC (둘 다 cross-link 렌더링 3회 중복)
- `roadmap.store.ts` 258 LOC, 17+ state 프로퍼티 (god store)
- 비레거시 `any` 타입: 5개 파일 (admin/chat/status-history repository, ai/chat-context, chat-utils)
- 쿼리 훅들의 optimistic update 패턴은 유사하지만 각기 다른 캐시 키/동작으로 추상화 ROI 낮음

---

## Phase 9A — CrossLinkedTaskSection 공통 컴포넌트 추출

**목적**: `goal-view-mode.tsx`와 `goal-expanded-content.tsx`에서 3곳씩 중복되는 cross-link 렌더링 + unlink 로직을 단일 컴포넌트로 추출

**수정 파일**:

- 신규: `src/features/roadmap/components/shared/cross-linked-task-section.tsx`
- 수정: `src/features/roadmap/components/panel-modes/goal-view-mode.tsx`
- 수정: `src/features/roadmap/components/panel-modes/goal-expanded-content.tsx`

**작업 내용**:

1. `CrossLinkedTaskSection` 컴포넌트 생성 — props: `crossLinkedTasks`, `goalId`, `goalAreaId`, `allGoals`, `onNavigate`
2. 내부에서 `computeUnlinkUpdates` + `useUpdateTask` + `CrossLinkedTaskRow` 매핑을 캡슐화
3. `goal-view-mode.tsx`에서 3곳의 cross-link 렌더링을 `<CrossLinkedTaskSection>` 호출로 교체
4. `goal-expanded-content.tsx`에서 3곳의 cross-link 렌더링을 동일하게 교체

**예상 효과**: 각 파일에서 ~60 LOC 제거, 중복 로직 단일화

**검증**: `npm run lint && npm run type-check`, 로드맵 페이지에서 cross-link task가 정상 표시/unlink 동작 확인

---

## Phase 9B — GoalViewMode 컴포넌트 분할

**목적**: 861 LOC → 핵심 레이아웃 + 추출된 서브컴포넌트들로 분할

**수정 파일**:

- `src/features/roadmap/components/panel-modes/goal-view-mode.tsx` (분할)
- 신규: `src/features/roadmap/components/panel-modes/goal-view-header.tsx`
- 신규: `src/features/roadmap/components/panel-modes/goal-groups-section.tsx`
- 신규: `src/features/roadmap/components/panel-modes/goal-flat-tasks-section.tsx`
- 신규: `src/features/roadmap/components/panel-modes/goal-delete-dialog.tsx`
- `ImpactAreaPicker` → 별도 파일 `impact-area-picker.tsx`로 이동

**작업 내용**:

1. `GoalViewHeader` — area chip, 목표명, period badge, 편집/삭제/닫기 버튼
2. `GoalGroupsSection` — 그룹 ON 상태: 그룹 목록 + 그룹별 task + InlineGroupCreate/Edit
3. `GoalFlatTasksSection` — 그룹 OFF 상태: flat task list + InlineTaskQuickInput
4. `GoalDeleteDialog` — 삭제 확인 모달 (일시정지 대안 포함)
5. `ImpactAreaPicker` → 별도 파일 `impact-area-picker.tsx`로 이동
6. `goal-view-mode.tsx`는 이들을 조합하는 ~300 LOC 컨테이너로 축소

**검증**: `npm run lint && npm run type-check`, 목표 상세 패널 전체 기능 확인

---

## Phase 9C — GoalExpandedContent DnD 로직 정리

**목적**: 787 LOC의 복잡한 cross-group DnD 로직을 커스텀 훅으로 추출

**수정 파일**:

- `src/features/roadmap/components/panel-modes/goal-expanded-content.tsx`
- 신규: `src/features/roadmap/hooks/use-cross-group-dnd.ts`

**작업 내용**:

1. `useCrossGroupDnd` 훅 추출 — `taskContainers`, `activeTaskId`, `handleTaskDragStart/Over/End/Cancel` 등 DnD 상태 + 핸들러 전체
2. `GoalExpandedContent`에서는 훅 호출 후 렌더링만 담당
3. 9A에서 추출한 `CrossLinkedTaskSection` 활용

**예상 효과**: `goal-expanded-content.tsx` ~550 LOC → ~400 LOC, DnD 로직 테스트 가능

**검증**: `npm run lint && npm run type-check`, 그룹 간 task 드래그&드롭 동작, 그룹 리오더 동작

---

## Phase 9D — Roadmap Store 분할

**목적**: 17+ 프로퍼티의 god store를 관심사별 3개 store로 분리, 리렌더 격리 개선

**수정 파일**:

- `src/stores/roadmap.store.ts` (리팩토링)
- 신규: `src/stores/roadmap-selection.store.ts` — selection, panelMode, inlineMode, focusedGoalId
- 신규: `src/stores/roadmap-version.store.ts` — isVersionHistoryOpen, isNewVersionWizardOpen, restoreSourceDirectionId, deleteTargetDirectionId
- `roadmap.store.ts`에 남는 것: statusFilter, expandedAreas, treeLayout, rightPanelTab, floating panel, mobile drawer + barrel re-export

**작업 내용**:

1. `useRoadmapSelectionStore` 생성 — selection, panelMode, inlineMode, focusedGoalId + 관련 actions
2. `useRoadmapVersionStore` 생성 — version 관련 4개 프로퍼티 + actions
3. `roadmap.store.ts`에서 기존 `useRoadmapStore` + selectors를 유지하되, 내부적으로 새 store에 위임 (barrel re-export로 import 변경 최소화)
4. 각 store에 맞는 selector 함수 이동

**전략**: barrel re-export 패턴으로 기존 import path (`@/stores/roadmap.store`) 유지 → 소비자 코드 변경 0

**검증**: `npm run lint && npm run type-check`, 전체 로드맵 UI 동작 확인 (선택, 필터, 버전 관리)

---

## Phase 9E — `any` 타입 제거

**목적**: 비레거시 코드의 `any` 타입 완전 제거 (TypeScript strict 준수)

**수정 파일** (5개):

- `src/repositories/admin.repository.ts`
- `src/repositories/status-history.repository.ts`
- `src/repositories/chat.repository.ts`
- `src/lib/ai/chat-context.ts`
- `src/components/layout/ai-chat/chat-utils.ts`

**작업 내용**:

1. 각 파일의 `any` 사용처 확인 → Supabase RPC 반환 타입이 원인이면 `database.ts`에 RPC 타입 augmentation 추가
2. 그 외 `any`는 적절한 타입으로 교체 (unknown + type guard, 또는 구체적 인터페이스)
3. chat-utils의 AI 응답 파싱 `any` → Zod schema 또는 타입 가드로 대체

**검증**: `npm run type-check` (0 errors), `npm run lint`

---

## Phase 9F — \_legacy 디렉토리 정리

**목적**: 더 이상 참조되지 않는 레거시 코드 제거로 코드베이스 경량화

**수정 파일**:

- `src/_legacy/` 전체 디렉토리

**작업 내용**:

1. `src/_legacy/`를 import하는 코드가 있는지 grep으로 확인
2. 참조가 0인 경우 `src/_legacy/` 전체 삭제
3. 참조가 있는 파일만 남기고 나머지 삭제

**검증**: `npm run build` (빌드 성공), `npm run lint && npm run type-check`

---

## 실행 순서 & 의존성

```
9A (cross-link 추출) ─┬─> 9B (GoalViewMode 분할)
                      └─> 9C (ExpandedContent DnD 정리)

9D (store 분할) ──────────── (9B/9C와 독립, 병렬 가능)
9E (any 제거) ──────────── (완전 독립, 언제든 가능)
9F (legacy 정리) ──────────── (마지막, 모든 작업 후)
```

- **9A 먼저**: 9B와 9C 모두 cross-link 추출 결과를 사용
- **9D, 9E**: 9A~9C와 독립적으로 병렬 실행 가능
- **9F**: 모든 리팩토링 후 마지막에 실행 (의존성 확인 필요)

## 전체 검증

각 Phase 완료 후: `npm run lint && npm run type-check`
전체 완료 후: `npm run build` + 수동 UI 테스트 (로드맵 페이지 전체 동작)
