# Why Map 캔버스 구현 스펙

> @xyflow/react 12.10.2 + @dagrejs/dagre

---

## 의존성

```bash
pnpm add @xyflow/react @dagrejs/dagre
```

globals.css에 `@import '@xyflow/react/dist/style.css'` 추가

---

## 노드 전략

```
캔버스 노드 (dagre 레이아웃):
  Direction (1개) → Area (3-8개) → Goal (5-20개)

Goal 내부 (일반 React):
  [TreeNodeCard]
  [💭 Why]
  [▼ Group → Task 리스트]
```

Goal 확장 시 → `useUpdateNodeInternals()` → 엣지 재계산

## 엣지 전략

| 타입        | 연결                 | 시각                                  |
| ----------- | -------------------- | ------------------------------------- |
| hierarchy   | Direction→Area→Goal  | smoothstep, 1.5px                     |
| shared-task | Goal↔Goal            | **두께 = 1+공유수**, area color, dash |
| cross-link  | Task→Goal, Goal→Area | dashed, arrow                         |

## 데이터 흐름

```
useDirection + useGoals + useAreas
  → buildVisualTreeData()          (기존)
  → treeToFlowElements()           (새 어댑터)
  → useDagreLayout()               (dagre)
  → <ReactFlow>
```

## ReactFlow 설정

```tsx
<ReactFlow
  panOnScroll={true}
  zoomOnScroll={true}
  panOnDrag={[1, 2]}
  selectionOnDrag={true}
  panActivationKeyCode="Space"
  snapToGrid={true}
  snapGrid={[20, 20]}
  minZoom={0.15}
  maxZoom={2}
  proOptions={{ hideAttribution: true }}
/>
```

---

## 파일 구조

### 생성

```
src/features/roadmap/components/canvas/
├── why-map-canvas.tsx          ReactFlow 컨테이너
├── types.ts                    WhyMapNodeData, WhyMapEdgeData
├── tree-to-flow.ts             트리 → Node/Edge 변환
├── use-dagre-layout.ts         dagre 레이아웃
├── use-canvas-interactions.ts  이벤트 핸들러
├── nodes/
│   ├── index.ts                nodeTypes
│   ├── direction-node.tsx
│   ├── area-node.tsx
│   ├── goal-node.tsx           내부 Group/Task 확장
│   └── sticky-node.tsx
└── edges/
    ├── index.ts                edgeTypes
    ├── hierarchy-edge.tsx
    └── shared-task-edge.tsx
```

### 수정

| 파일                      | 변경                              |
| ------------------------- | --------------------------------- |
| `visual-tree-wrapper.tsx` | WhyMapCanvas로 교체               |
| `tree-node-card.tsx`      | Why 서브타이틀 Area/Goal에도 표시 |
| `globals.css`             | xyflow CSS import                 |

### 재사용

`tree-node-card.tsx`, `tree-context-menu.tsx`, `tree-quick-add.tsx`, `use-focus-branch.ts`, `use-tree-search.ts`, `tree-search-bar.tsx`, `command-palette.tsx`, `buildVisualTreeData()`

### 삭제

`tree-node.tsx`, `cross-link-overlay.tsx`, `tree-minimap.tsx`

---

## 핵심 패턴

### dagre 레이아웃 (two-pass)

```ts
// v12: node.measured?.width (NOT node.width)
g.setNode(node.id, {
  width: node.measured?.width ?? 220,
  height: node.measured?.height ?? 60,
})

// useNodesInitialized() true 후 dagre 실행
useEffect(() => {
  if (nodesInitialized && !layoutApplied) {
    setNodes(getLayoutedElements(nodes, edges, direction))
    setLayoutApplied(true)
    requestAnimationFrame(() => fitView({ padding: 0.15, duration: 300 }))
  }
}, [nodesInitialized])
```

### 공유 태스크 엣지

```ts
// task.related_goal_ids → Goal 쌍 탐지 → strength 계산
// strokeWidth = Math.min(5, 1 + strength)
```

### 포커스 모드

```ts
const focusedIds = useFocusBranch(treeData, selectedNodeId)
// 포커스 노드: opacity 1, 나머지: opacity 0.15
```

### Goal 확장

```ts
const handleToggle = useCallback(() => {
  setIsExpanded((prev) => !prev)
  requestAnimationFrame(() => updateNodeInternals(id))
}, [])
```

### nodeTypes는 컴포넌트 밖에서 정의

```ts
// 안에서 정의하면 매 렌더마다 전체 리마운트
const nodeTypes = { direction: DirectionNode, area: AreaNode, goal: GoalNode, sticky: StickyNode }
const edgeTypes = { hierarchy: HierarchyEdge, 'shared-task': SharedTaskEdge }
```

---

## v12 주의사항

- `node.measured?.width` (not `node.width`)
- `screenToFlowPosition()` (not `project()`)
- `parentId` (not `parentNode`)
- 노드 업데이트는 immutable (spread)
- CSS: `@xyflow/react/dist/style.css`

---

## 키보드

| 키           | 동작          |
| ------------ | ------------- |
| Space+드래그 | 팬            |
| 스크롤       | 줌            |
| Cmd+F        | 검색          |
| /            | 커맨드 팔레트 |
| N            | 스티키 노트   |
| M            | 미니맵 토글   |
| Cmd+0        | Fit View      |
| Delete       | 노드 삭제     |

---

## 이전 실패 방지

| 하지 말 것            | 해야 할 것                |
| --------------------- | ------------------------- |
| `onSelect={() => {}}` | roadmap.store에 실제 연결 |
| 전체 노드 플래튼      | Direction/Area/Goal만     |
| 기존 기능 삭제        | TreeContextMenu 등 재사용 |

---

## 구현 계획

### 이전 시도 분석 (5be7cef → revert 2d9d28e)

| 문제점           | 원인                                                                     |
| ---------------- | ------------------------------------------------------------------------ |
| 전체 노드 플래튼 | Direction~Task 모든 노드를 ReactFlow 노드로 변환 → 성능/복잡도 폭발      |
| 기존 기능 단절   | TreeContextMenu, QuickAdd 등 재사용 안 함, `onSelect={() => {}}` 빈 함수 |
| 빅뱅 커밋        | 983줄 한번에 추가, 검증 없이 머지                                        |

### 핵심 전략: 하이브리드 접근

```
ReactFlow 캔버스 노드: Direction (1) → Area (3~8) → Goal (5~20)
Goal 내부:             일반 React (TreeNodeCard 재사용) → Group → Task
```

Goal 안쪽은 기존 코드를 그대로 쓰고, 캔버스 레벨은 Direction/Area/Goal 3계층만 담당.

---

### Phase 1: 기반 설치 + 어댑터

| 작업              | 파일                         | 설명                                                                                            |
| ----------------- | ---------------------------- | ----------------------------------------------------------------------------------------------- |
| 의존성 설치       | `package.json`               | `@xyflow/react`, `@dagrejs/dagre`                                                               |
| CSS import        | `globals.css`                | `@import '@xyflow/react/dist/style.css'`                                                        |
| 타입 정의         | `canvas/types.ts`            | `WhyMapNodeData`, `WhyMapEdgeData`                                                              |
| 트리→플로우 변환  | `canvas/tree-to-flow.ts`     | `buildVisualTreeData()` 결과 → Direction/Area/Goal 노드 + 엣지. **Goal 이하는 플래튼하지 않음** |
| dagre 레이아웃 훅 | `canvas/use-dagre-layout.ts` | two-pass 레이아웃 (v12 `node.measured?.width`)                                                  |

검증: `tree-to-flow.ts` 단위 테스트 — 입력 트리 → 올바른 노드/엣지 수 확인

### Phase 2: 커스텀 노드 3종

| 노드                 | 내용                                                                                         |
| -------------------- | -------------------------------------------------------------------------------------------- |
| `direction-node.tsx` | 방향 이름 + emoji, 컴팩트                                                                    |
| `area-node.tsx`      | 영역 이름 + 색상 바 + 하위 Goal 수                                                           |
| `goal-node.tsx`      | **TreeNodeCard 재사용** + expand/collapse로 Group→Task 표시. `useUpdateNodeInternals()` 호출 |

핵심: `nodeTypes`는 컴포넌트 **밖**에서 정의 (매 렌더 리마운트 방지)

### Phase 3: 메인 컨테이너 + 기존 기능 연결

| 작업               | 파일                                          |
| ------------------ | --------------------------------------------- |
| ReactFlow 컨테이너 | `canvas/why-map-canvas.tsx`                   |
| 이벤트 핸들러      | `canvas/use-canvas-interactions.ts`           |
| wrapper 교체       | `visual-tree-wrapper.tsx` → WhyMapCanvas 렌더 |

연결해야 할 기존 기능들:

- 노드 클릭 → `roadmap.store`의 `selection` 업데이트 (우측 패널)
- 우클릭 → `tree-context-menu.tsx` 재사용
- Quick-add (+) → `tree-quick-add.tsx` 재사용
- Cmd+F → `use-tree-search.ts` + `tree-search-bar.tsx` 재사용
- 포커스 모드 → `use-focus-branch.ts` (opacity 1 vs 0.15)
- 커맨드 팔레트 → `command-palette.tsx` 재사용

### Phase 4: 엣지 + 시각 효과

| 엣지 타입              | 설명                                                    |
| ---------------------- | ------------------------------------------------------- |
| `hierarchy-edge.tsx`   | Direction→Area→Goal, smoothstep 1.5px                   |
| `shared-task-edge.tsx` | Goal↔Goal, `strokeWidth = 1 + 공유수`, area color, dash |

추가 시각 요소: Draft 점선 테두리, Vibe 색상/이모지, 스트릭/D-Day/Progress 배지

### Phase 5: 부가 기능

- 스티키 노트 (`sticky-node.tsx`)
- 미니맵 (ReactFlow 내장 `<MiniMap>` 사용, 기존 `tree-minimap.tsx` 대체)
- 레이아웃 토글 (H/V) — dagre `rankdir` 전환
- 키보드 단축키 (Space+드래그, Cmd+0 fit view, N 스티키, M 미니맵 등)

### Phase 6: 정리 + 검증

- **삭제**: `tree-node.tsx`, `cross-link-overlay.tsx`, `tree-minimap.tsx`
- lint + type-check 통과
- 체크리스트 16개 항목 전수 확인
- Demo mode 호환성 확인

---

## 이전 실패 방지 체크

| 하지 말 것            | 이번 계획                                        |
| --------------------- | ------------------------------------------------ |
| 전체 노드 플래튼      | Direction/Area/Goal만 캔버스 노드                |
| `onSelect={() => {}}` | `roadmap.store`에 실제 연결                      |
| 기존 기능 삭제        | TreeContextMenu, QuickAdd, Search 등 모두 재사용 |
| 빅뱅 커밋             | Phase별 커밋 (6단계)                             |

---

## 체크리스트

- [ ] 노드 클릭 → 우측 패널
- [ ] 우클릭 context menu
- [ ] Goal expand/collapse
- [ ] Cmd+F 검색 + 하이라이트
- [ ] 포커스 모드
- [ ] Quick-add (+)
- [ ] 스티키 노트
- [ ] 미니맵
- [ ] 줌/팬
- [ ] 커맨드 팔레트
- [ ] 공유 태스크 연결선
- [ ] Why 서브타이틀
- [ ] Draft 점선 테두리
- [ ] 레이아웃 토글 (H/V)
- [ ] 스트릭/D-Day/Progress
- [ ] Vibe 색상/이모지
- [ ] Demo mode

---

## 구현 로그

| Phase | 커밋      | 날짜       | 요약                                                                            |
| ----- | --------- | ---------- | ------------------------------------------------------------------------------- |
| 1     | `63bfc53` | 2026-03-28 | 의존성 설치, types.ts, tree-to-flow.ts, use-dagre-layout.ts, globals.css import |
