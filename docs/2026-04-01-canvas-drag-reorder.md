# Canvas Node Drag Reorder

## Context

Why Map 캔버스에서 노드들의 순서를 변경할 방법이 없다. 현재 dagre가 자동 배치하지만, 같은 부모 아래 형제 노드끼리 순서(sort_order)를 드래그로 바꿀 수 있어야 한다. 자유 이동(1px 단위)이 아닌, 형제 간 "슬롯 기반" 순서 교환 방식.

## Design

### Interaction Flow

1. **드래그 시작**: 노드를 잡고 움직이기 시작
   - 드래그 중인 노드에 그림자 + 살짝 투명 효과
   - 같은 부모 아래 형제 노드들 식별

2. **드래그 중**: 커서 따라 노드 이동
   - TB 레이아웃: 좌우 이동 기준, LR 레이아웃: 상하 이동 기준
   - 형제 중간점 넘으면 → 형제들이 부드럽게 자리 이동 (CSS transition 200ms)
   - dagre 재계산 없이 위치만 스왑

3. **드래그 종료**: 최종 위치로 스냅
   - fractional-indexing으로 새 sort_order 계산
   - useTreeReorder로 optimistic update + debounce 서버 저장

### Scope

- 전체 레벨 지원: Area, Goal, Group, Task
- Direction (루트)은 1개뿐이므로 드래그 비활성화
- 캔버스에서 직접 드래그 (별도 핸들 없음)
- 좌클릭 드래그 = 노드 순서변경, 빈 배경 드래그 = 캔버스 패닝

### Edge Cases

- 형제 1개: 순서 바꿀 대상 없음 → 원위치 복귀
- 확장된 Goal 자식 (Group/Task): 각 레벨에서 리오더 가능
- Escape: 드래그 취소 → 원위치 복귀
- 드래그 중 데이터 변경: 드래그 취소 후 새 데이터 반영

---

## Phase 1: Canvas Reorder Hook

새 훅 `use-canvas-reorder.ts` 생성. 드래그 리오더의 핵심 로직 담당.

### Files

- **CREATE** `src/features/roadmap/components/canvas/use-canvas-reorder.ts`

### Details

```
Hook: useCanvasReorder(nodes, edges, direction, setNodes)

State:
- draggingNodeId: string | null
- originalPositions: Map<string, {x, y}>  (드래그 시작 시 형제 위치 저장)
- siblingIds: string[]  (형제 노드 ID 목록)
- currentInsertIndex: number  (현재 삽입 위치)

Callbacks:
- onDragStart(nodeId):
  1. 노드의 부모 찾기 (edges에서 hierarchy edge의 source → target 관계로)
  2. 같은 부모의 자식 노드들 = 형제 (siblingIds)
  3. 형제가 1개 이하면 리오더 불가 → early return
  4. 각 형제의 현재 위치 저장 (originalPositions)
  5. 드래그 중인 노드의 원래 인덱스 저장

- onDrag(nodeId, position):
  1. 관련 축의 위치 계산 (TB→x축, LR→y축)
  2. 형제 중간점과 비교하여 insertIndex 계산
  3. insertIndex가 변경되면:
     - 형제 위치를 새 순서에 맞게 재배치 (setNodes로 위치 스왑)
     - 드래그 중인 노드는 커서 위치 유지

- onDragStop(nodeId):
  1. 최종 insertIndex로 sort_order 계산 (getNewOrder)
  2. useTreeReorder.handleReorder() 호출
  3. 상태 초기화, relayout 트리거

- onDragCancel():
  1. originalPositions로 복원
  2. 상태 초기화
```

### Reuse

- `useTreeReorder` from `src/hooks/use-tree-reorder.ts` — sort_order 계산 + optimistic update
- `getNewOrder` from `src/lib/fractional-index.ts` — fractional index 계산
- `moveNode` server action from `src/actions/tree.actions.ts`

---

## Phase 2: Wire Up Canvas Drag Handlers

`why-map-canvas.tsx`에 드래그 핸들러 연결.

### Files

- **MODIFY** `src/features/roadmap/components/canvas/why-map-canvas.tsx`

### Details

1. ReactFlow에 드래그 관련 props 추가:

   ```tsx
   <ReactFlow
     ...
     onNodeDragStart={(event, node) => canvasReorder.onDragStart(node.id)}
     onNodeDrag={(event, node) => canvasReorder.onDrag(node.id, node.position)}
     onNodeDragStop={(event, node) => canvasReorder.onDragStop(node.id)}
     panOnDrag={[1, 2]}  // 중클릭/우클릭만 패닝 (좌클릭은 노드 드래그용)
     nodesDraggable  // 명시적으로 활성화
   />
   ```

2. useCanvasReorder 훅 호출 추가

3. Escape 키 핸들러에 드래그 취소 추가 (기존 useCanvasKeyboard 활용)

---

## Phase 3: Dagre Layout Override During Drag

드래그 중 dagre가 드래그 노드의 위치를 덮어쓰지 않도록 수정.

### Files

- **MODIFY** `src/features/roadmap/components/canvas/use-dagre-layout.ts`

### Details

1. `useDagreLayout`에 `draggingNodeId: string | null` 파라미터 추가

2. dagre 레이아웃 적용 시, `draggingNodeId`가 설정되어 있으면:
   - 해당 노드의 위치는 dagre 결과를 적용하지 않음 (커서 위치 유지)
   - 나머지 노드들만 dagre 위치 적용

3. `onNodesChange` 핸들러에서도 드래그 중인 노드의 위치 변경은 허용

---

## Phase 4: Visual Feedback

드래그 중 시각적 피드백 추가.

### Files

- **MODIFY** 노드 컴포넌트들 (`src/features/roadmap/components/canvas/nodes/` 디렉토리)
- **MODIFY** 또는 global CSS

### Details

1. 드래그 중인 노드:
   - `opacity: 0.8`
   - `box-shadow` 추가 (elevation 느낌)
   - `z-index` 올림
   - `cursor: grabbing`

2. 형제 노드 이동 애니메이션:
   - ReactFlow 노드에 `.reordering` 클래스 추가
   - `transition: transform 200ms ease` 적용
   - 드래그 끝나면 클래스 제거

3. 드래그 가능한 노드:
   - hover 시 `cursor: grab` (Direction 제외)

---

## Phase 5: Integration & Edge Cases

전체 통합 및 엣지 케이스 처리.

### Files

- **MODIFY** `src/features/roadmap/components/canvas/use-canvas-reorder.ts`
- **MODIFY** `src/features/roadmap/components/canvas/why-map-canvas.tsx`

### Details

1. 부모-자식 관계 식별:
   - edges 배열에서 `edgeType === 'hierarchy'`인 간선으로 부모 찾기
   - 같은 source(부모)를 가진 target(자식)들이 형제

2. 엔티티 타입별 reorder mutation 라우팅:
   - Area → reorderAreas
   - Goal → reorderGoals
   - Group → reorderGroups
   - Task → reorderTasks
   - 노드의 `type` 필드로 구분

3. Escape 키 핸들러:
   - 드래그 중 Escape → onDragCancel() 호출
   - 기존 useCanvasKeyboard에 통합

4. 형제 1개 처리:
   - onDragStart에서 형제 수 확인 → 1개 이하면 드래그 시작해도 리오더 로직 스킵

---

## Verification

1. `npm run lint` — 린트 통과
2. `npm run type-check` — 타입 체크 통과
3. 수동 테스트:
   - TB/LR 레이아웃 모두에서 Area 순서 드래그로 변경
   - Goal, Group, Task도 각각 순서 변경 확인
   - 페이지 새로고침 후 순서 유지 확인
   - Escape로 드래그 취소 시 원위치 복귀
   - 형제 1개일 때 드래그해도 문제 없는지 확인
   - 빈 배경 드래그로 캔버스 패닝 정상 동작 확인
