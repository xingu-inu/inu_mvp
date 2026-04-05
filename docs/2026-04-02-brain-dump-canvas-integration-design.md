# 쏟아내기 캔버스 연동 설계

## Context

쏟아내기(brain dump)가 현재 AI 채팅 패널 안에서 "일반/쏟아내기" 모드 칩으로 전환하는 형태로 존재한다. 문제점:

- **프로세스가 다르다**: 쏟아내기는 "세션형" 워크플로우(시작→정리→적용)인데 채팅 UX에 억지로 끼워넣은 느낌
- **맥락이 섞인다**: 일반 대화와 쏟아내기가 같은 공간이라 대화 히스토리 뒤섞임
- **진입이 불편하다**: 채팅 열고 → 모드 전환해야 함
- **결과물이 답답하다**: ProposalCard가 좁은 채팅 패널(384~640px) 안에만 표시됨. 로드맵과의 연결이 직관적이지 않음

## 설계 방향

**채팅 통합 유지 + 진입점 강화 + 결과물 캔버스 연동**

- AI 채팅은 하나로 유지 (모드 칩 제거)
- 쏟아내기 진입점을 별도로 강화
- 핵심 변화: `propose_structure` 결과가 캔버스에 **고스트 노드**로 시각화
- 일반 대화 중에도 AI가 쏟아내기 의도를 감지하면 자연스럽게 전환 가능

---

## Phase 1: 쏟아내기 분리 & 진입점 개선

### 1.1 모드 칩 제거

**파일**: `src/components/layout/ai-chat/ai-chat-panel.tsx`

- "일반 / 쏟아내기" FormSegmentedControl (lines 293-326) 제거
- `chatMode` 로컬 state 제거
- 쏟아내기는 `context.type === 'brain-dump'`로만 구분 (기존 ChatContext 시스템 활용)

### 1.2 퀵액션 카드 강화

**파일**: `src/components/layout/ai-chat/chat-utils.ts`

빈 채팅 상태에서 보이는 퀵액션을 개선:

- 기존 4개 퀵액션 위에 **"생각 쏟아내기" 카드**를 크고 눈에 띄게 배치
- amber 계열 색상, Lightbulb 아이콘
- 클릭 시 `openChatWithContext({ type: 'brain-dump' })` 호출

**파일**: `src/components/layout/ai-chat/ai-chat-panel.tsx`

퀵액션 렌더링 영역에서 brain-dump 카드를 별도 디자인으로 표시:

```
┌────────────────────────────────┐
│ 💡 생각 쏟아내기                │  ← amber 배경, 크게
│ 머릿속에 떠오르는 것들을 자유롭게 │
│ 이야기하면 함께 정리해줄게       │
└────────────────────────────────┘
[마음 정리] [삶의 시즌] [다음 한 걸음] [나에 대해]  ← 기존 퀵액션
```

### 1.3 로드맵 헤더 진입 버튼

**파일**: `src/features/roadmap/components/roadmap-header.tsx` (또는 관련 헤더 컴포넌트)

- 로드맵 헤더에 💡 아이콘 버튼 추가
- 클릭 시: AI 채팅 패널 열기 + brain-dump 컨텍스트로 시작
- `useAiChatStore`의 `openChatWithContext({ type: 'brain-dump' })` 사용

### 1.4 모바일 풀스크린 쏟아내기

**새 파일**: `src/features/roadmap/components/brain-dump-fullscreen.tsx`

모바일에서 쏟아내기 진입 시 풀스크린 화면:

```
┌─────────────────────────────┐
│ ← 쏟아내기           ✕     │  ← 헤더 (뒤로가기 + 닫기)
├─────────────────────────────┤
│                             │
│  메시지 영역                │
│  (StreamingBubble 재사용)    │
│  ...                        │
│  ProposalCard               │
│  (체크박스 + 반영하기)        │
│                             │
├─────────────────────────────┤
│  [입력창]              [→]  │
└─────────────────────────────┘
```

- `AiChatPanel`에 `fullscreen` prop 추가 (`embedded`와 유사한 패턴)
- `fullscreen` 모드: 고정 포지션 전체 화면, 자체 헤더(뒤로가기 + 닫기), 탭/사이드바 숨김
- FAB 메뉴의 "이누와 대화" → 이 풀스크린으로 진입
- 닫기 → 로드맵 카드 리스트로 복귀
- 데스크톱에서는 기존 floating chat panel이 brain-dump 컨텍스트로 열림 (풀스크린 아님)

### 1.5 변경할 파일 목록

| 파일                                | 변경 내용                                  |
| ----------------------------------- | ------------------------------------------ |
| `ai-chat-panel.tsx`                 | 모드 칩 제거, 퀵액션 카드 UI 개선          |
| `chat-utils.ts`                     | brain-dump 퀵액션 카드 데이터 추가         |
| `roadmap-header.tsx` 또는 관련 헤더 | 💡 버튼 추가                               |
| `mobile-roadmap-fab.tsx`            | "이누와 대화" → 풀스크린 brain-dump로 연결 |
| 새: `brain-dump-fullscreen.tsx`     | 모바일 풀스크린 쏟아내기                   |
| `ai-chat.store.ts`                  | 필요시 풀스크린 상태 추가                  |

---

## Phase 2: 캔버스 고스트 노드

### 2.1 고스트 노드 상태 관리

**새 파일 또는 기존 store 확장**: `src/stores/brain-dump-preview.store.ts`

```typescript
interface BrainDumpPreviewStore {
  // propose_structure 결과를 저장
  proposal: ProposeStructureOutput | null
  // ProposalCard의 체크 상태를 미러링
  checkedItems: Record<string, boolean> // tempId → checked

  setProposal: (proposal: ProposeStructureOutput | null) => void
  setChecked: (tempId: string, checked: boolean) => void
  clearPreview: () => void
}
```

### 2.2 캔버스에 고스트 노드 주입

**파일**: `src/features/roadmap/components/canvas/tree-to-flow.ts`

`treeToFlowElements` 함수 확장:

- 추가 파라미터: `ghostProposal?: ProposeStructureOutput`, `checkedItems?: Record<string, boolean>`
- 기존 트리 노드 생성 후, proposal의 체크된 항목을 고스트 노드로 추가
- 기존 Area에 추가되는 Goal → 해당 Area의 children에 고스트 Goal 노드 삽입
- 새 Area → 트리 루트에 고스트 Area + 고스트 Goal 노드 추가
- 모든 고스트 노드에 `isGhost: true`, `tempId` 플래그 설정

### 2.3 노드 컴포넌트 고스트 스타일링

**파일들**: `src/features/roadmap/components/canvas/nodes/*.tsx`

기존 노드 컴포넌트에 조건부 스타일 추가:

```typescript
// 각 노드 컴포넌트 (area-node, goal-node, group-node, task-node)
const isGhost = data.isGhost === true

// 스타일 적용
className={cn(
  // 기존 스타일들...
  isGhost && [
    'border-dashed',
    'border-amber-300',
    'opacity-60',
    'bg-amber-50/30 dark:bg-amber-900/10',
  ]
)}
```

- **테두리**: 점선 (dashed), amber-300
- **배경**: 반투명 amber
- **투명도**: 60%
- **뱃지**: "NEW" 또는 "기존 Area에 추가" 표시
- **클릭**: ProposalCard의 해당 항목으로 스크롤/하이라이트

### 2.4 ProposalCard ↔ 캔버스 연동

**파일**: `src/components/layout/ai-chat/proposal-card.tsx`

ProposalCard의 체크 상태 변경 시:

- `brain-dump-preview.store`의 `setChecked` 호출
- 캔버스가 store 변경을 감지 → 고스트 노드 표시/숨김

"반영하기" 클릭 시:

1. 고스트 노드에 pulse 애니메이션 적용
2. `useBrainDumpApply` 실행 (기존 로직)
3. 쿼리 무효화 → 실제 노드로 교체
4. `clearPreview()` 호출 → 고스트 상태 정리

### 2.5 변경할 파일 목록

| 파일                              | 변경 내용                              |
| --------------------------------- | -------------------------------------- |
| 새: `brain-dump-preview.store.ts` | 고스트 노드 상태 관리                  |
| `tree-to-flow.ts`                 | 고스트 노드 주입 로직                  |
| `why-map-canvas.tsx`              | preview store 구독, 고스트 데이터 전달 |
| `nodes/area-node.tsx`             | 고스트 스타일 조건부 적용              |
| `nodes/goal-node.tsx`             | 고스트 스타일 조건부 적용              |
| `nodes/group-node.tsx`            | 고스트 스타일 조건부 적용              |
| `nodes/task-node.tsx`             | 고스트 스타일 조건부 적용              |
| `proposal-card.tsx`               | store 연동, 반영 시 고스트 정리        |
| `types.ts`                        | `isGhost`, `tempId` 필드 추가          |

---

## Phase 3: AI 자연 전환

### 3.1 시스템 프롬프트 업데이트

**파일**: `src/app/api/ai/chat/route.ts`

일반 대화 모드에서도 `propose_structure` 도구를 사용 가능하도록:

- 기존: brain-dump 컨텍스트에서만 `propose_structure` 활성화
- 변경: 항상 활성화하되, 시스템 프롬프트에 가이드 추가

```
사용자가 "하고 싶은 것들이 많아", "정리가 필요해", "새로운 목표를 세우고 싶어" 등
구조 정리가 필요한 의도를 보이면, 충분히 이야기를 들은 후
propose_structure 도구를 사용해 구조를 제안하세요.
명시적 쏟아내기 모드가 아니어도 자연스럽게 사용 가능합니다.
```

### 3.2 컨텍스트 자동 전환

`propose_structure`가 호출되면:

- 채팅 UI에서 자동으로 brain-dump 관련 UI 힌트 표시 (선택적)
- ProposalCard가 정상 렌더링됨
- 캔버스 고스트 노드 활성화 (Phase 2가 완료된 상태라면)

### 3.3 변경할 파일 목록

| 파일       | 변경 내용                                                  |
| ---------- | ---------------------------------------------------------- |
| `route.ts` | propose_structure 도구 활성화 범위 확장, 프롬프트 업데이트 |
| `tools.ts` | 도구 활성화 조건 완화 (필요 시)                            |

---

## 검증 방법

### Phase 1 검증

1. AI 채팅 패널에서 모드 칩이 사라졌는지 확인
2. 빈 채팅에서 "생각 쏟아내기" 카드가 눈에 띄게 표시되는지 확인
3. 카드 클릭 → brain-dump 컨텍스트로 대화 시작되는지 확인
4. 로드맵 헤더 💡 버튼 → 채팅 열리면서 brain-dump 시작되는지 확인
5. 모바일: FAB → 풀스크린 쏟아내기 진입/대화/ProposalCard 표시/반영하기/닫기 플로우
6. `npm run lint` + `npm run type-check` 통과

### Phase 2 검증

1. 쏟아내기 대화에서 propose_structure 호출 시 캔버스에 고스트 노드 표시
2. ProposalCard 체크 해제 → 해당 고스트 노드 사라짐
3. ProposalCard 체크 → 고스트 노드 다시 나타남
4. "반영하기" → 고스트 노드가 실제 노드로 전환
5. 새 Area + 기존 Area 양쪽 케이스 테스트
6. `npm run lint` + `npm run type-check` 통과

### Phase 3 검증

1. 일반 대화에서 "요즘 하고 싶은 게 많아" 류 입력 → AI가 구조 정리 제안
2. propose_structure 호출 → ProposalCard + 고스트 노드 정상 동작
3. brain-dump 컨텍스트 없이도 전체 플로우 작동 확인
