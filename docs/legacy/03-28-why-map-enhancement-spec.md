# Why Map 캔버스 기능 확장 스펙

> Phase 1-5 완료 기반, FigJam / Miro / Whimsical / Excalidraw / Obsidian Canvas 레퍼런스

---

## 레퍼런스 분석 요약

| 도구                | 참고 패턴                                    | 적용                                        |
| ------------------- | -------------------------------------------- | ------------------------------------------- |
| **FigJam**          | 스포트라이트, 스티키 클러스터링, 섹션        | Why Walk, 브레인스톰 모드                   |
| **Miro**            | 프레임, 프레젠테이션, 태그/필드, 의존성 라벨 | Area 프레임, 상태 태그, 엣지 라벨, 의존관계 |
| **Whimsical**       | AI 제안, 마인드맵 키보드, 호버 프리뷰        | AI 밸런스, Tab/Enter 단축키, Why Chain 툴팁 |
| **Excalidraw**      | 하단 바, 줌 레벨별 디테일, Export            | 통계 바, 시맨틱 줌, 이미지 내보내기         |
| **Obsidian Canvas** | 임베디드 콘텐츠, 컬러 그룹                   | Goal 확장 콘텐츠, Area 색상 영역            |

### 적용 안 함 (단일 사용자 앱)

- 리액션/스탬프, 투표, 커서 채팅, 실시간 협업, 위젯 에코시스템, 손그림 스타일

---

## Phase 7: Quick Wins

> 기존 데이터/컴포넌트만으로 구현 가능한 시각 개선

### 7-1. SharedTask 엣지 라벨

공유 태스크 엣지 중간에 공유 수 배지 표시. 현재는 `strokeWidth`로만 표현됨.

```tsx
// shared-task-edge.tsx 수정
import { EdgeLabelRenderer, getBezierPath } from '@xyflow/react'

const [edgePath, labelX, labelY] = getBezierPath({ ... })

<EdgeLabelRenderer>
  <div
    style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}
    className="pointer-events-none absolute rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold shadow-sm"
  >
    {strength}
  </div>
</EdgeLabelRenderer>
```

| 파일                                | 변경                                                               |
| ----------------------------------- | ------------------------------------------------------------------ |
| `canvas/edges/shared-task-edge.tsx` | `EdgeLabelRenderer` 추가, `getBezierPath` 반환값에서 labelX/Y 사용 |

### 7-2. Goal 상태 태그

Goal 노드에 Active/Paused/Backlog 등 상태 칩을 소형 배지로 표시.

```tsx
// goal-node.tsx — TreeNodeCard 아래에 추가
{
  treeNode.status && treeNode.status !== 'active' && (
    <span
      className="mt-1 inline-block rounded-full px-1.5 py-px text-[9px] font-medium"
      style={{ backgroundColor: GOAL_STATUS_CONFIG[treeNode.status].bgColor }}
    >
      {GOAL_STATUS_CONFIG[treeNode.status].label}
    </span>
  )
}
```

| 파일                         | 변경         |
| ---------------------------- | ------------ |
| `canvas/nodes/goal-node.tsx` | 상태 칩 렌더 |

### 7-3. Area 집계 배지

Area 노드의 Goal 수 배지를 상태별로 세분화: `3 active · 1 paused`

| 파일                         | 변경                                                          |
| ---------------------------- | ------------------------------------------------------------- |
| `canvas/types.ts`            | `AreaNodeData`에 `statusCounts?: Record<string, number>` 추가 |
| `canvas/tree-to-flow.ts`     | Area별 Goal 상태 집계                                         |
| `canvas/nodes/area-node.tsx` | 상태별 count 렌더                                             |

### 7-4. Canvas 통계 바

하단에 총 Goal 수, 완료율, 활성/일시정지 수, 총 스트릭 표시.

```tsx
// why-map-canvas.tsx — <ReactFlow> 내부에 추가
import { Panel } from '@xyflow/react'
;<Panel position="bottom-center" className="!mb-2">
  <div className="flex items-center gap-3 rounded-lg bg-[var(--color-bg-primary)]/90 px-3 py-1.5 text-xs shadow-sm backdrop-blur">
    <span>{totalGoals} goals</span>
    <span className="text-[var(--color-done)]">{completedCount} done</span>
    <span>{activeCount} active</span>
    <span>{Math.round(completionRate)}%</span>
  </div>
</Panel>
```

| 파일                        | 변경                             |
| --------------------------- | -------------------------------- |
| `canvas/why-map-canvas.tsx` | `Panel` import, 통계 계산 + 렌더 |

---

## Phase 8: Why 내러티브 강화

> 앱의 핵심 차별점인 "Why" 체인을 캔버스에서 강화

### 8-1. Why Chain 호버 툴팁

Goal/Area 노드 호버 시 상위 Why 체인을 브레드크럼으로 표시.

```
[Direction.why] → [Area.why] → [Goal.why]
```

현재 `treeNode.why`는 Direction에만 표시됨. Goal의 why까지 상위 체인으로 보여줌.

**구현 전략**: `treeToFlowElements`에서 각 노드에 `ancestorWhys: { name: string, why?: string }[]` 배열 추가.

| 파일                         | 변경                                                 |
| ---------------------------- | ---------------------------------------------------- |
| `canvas/types.ts`            | `GoalNodeData`, `AreaNodeData`에 `ancestorWhys` 추가 |
| `canvas/tree-to-flow.ts`     | 트리 순회 시 ancestor why 수집                       |
| `canvas/nodes/goal-node.tsx` | 호버 시 Why 체인 툴팁 렌더                           |
| `canvas/nodes/area-node.tsx` | 호버 시 Why 체인 툴팁 렌더                           |

### 8-2. Progress 히트맵 오버레이

Goal 노드 배경에 최근 체크인 활동 기반 서틀 강도 그라디언트.

- 활발한 Goal: 노드 테두리에 warm glow (`box-shadow`)
- 정체된 Goal: 기본 스타일 (변화 없음, 죄책감 방지)
- 기존 `meta.totalStreak` 데이터 활용, 추가 fetch 불필요

```tsx
// goal-node.tsx
const activityLevel = Math.min(1, (treeNode.meta?.totalStreak ?? 0) / 30)
style={{ boxShadow: activityLevel > 0 ? `0 0 ${8 + activityLevel * 12}px color-mix(in srgb, ${areaColor} ${20 + activityLevel * 30}%, transparent)` : undefined }}
```

| 파일                         | 변경                         |
| ---------------------------- | ---------------------------- |
| `canvas/nodes/goal-node.tsx` | streak 기반 glow 스타일 적용 |

### 8-3. Area 색상 영역 프레임

Area와 하위 Goal들을 감싸는 반투명 배경 사각형.

**구현 전략**: dagre 레이아웃 후 Area별 자식 Goal 위치로 바운딩 박스 계산 → SVG 배경 렌더.

```tsx
// 새 파일: canvas/area-regions.tsx
// dagre 레이아웃 이후 nodes 배열에서 area별 bounding box 계산

function computeAreaRegions(nodes: WhyMapNode[]): AreaRegion[] {
  // area 노드 기준으로 같은 subtree의 goal 노드들 위치 + 패딩
  // → { areaId, x, y, width, height, color } 배열 반환
}

// why-map-canvas.tsx — ReactFlow 내부에 SVG 레이어로 렌더
```

| 파일                        | 변경                                          |
| --------------------------- | --------------------------------------------- |
| `canvas/area-regions.tsx`   | 새 파일: 바운딩 박스 계산 + SVG 렌더 컴포넌트 |
| `canvas/why-map-canvas.tsx` | AreaRegions 컴포넌트 추가                     |
| `canvas/tree-to-flow.ts`    | 각 Goal에 parentAreaId 추가                   |

---

## Phase 9: 파워유저 인터랙션

> 키보드 기반 빠른 조작 + 줌 레벨별 UX 최적화

### 9-1. 마인드맵 키보드 단축키

노드 선택 상태에서:

- `Tab` → 자식 추가 (Area 아래 Goal, Goal 아래 Task)
- `Enter` → 형제 추가 (같은 레벨에 새 노드)
- `Arrow` → 인접 노드로 선택 이동 (dagre 위치 기반 최근접 계산)

```ts
// 새 파일: canvas/use-canvas-keyboard.ts
export function useCanvasKeyboard(
  nodes: WhyMapNode[],
  selectedNodeId: string | null,
  interactions: CanvasInteractions
) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selectedNodeId) return
      const node = nodes.find((n) => n.id === selectedNodeId)
      if (!node) return

      switch (e.key) {
        case 'Tab':
          e.preventDefault()
          interactions.handleStartAdd(node.type, node.id)
          break
        case 'Enter':
          e.preventDefault()
          // 부모 노드 찾아서 handleStartAdd
          break
        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight':
          e.preventDefault()
          // dagre 위치 기반 최근접 노드로 선택 이동
          break
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [nodes, selectedNodeId, interactions])
}
```

| 파일                            | 변경                          |
| ------------------------------- | ----------------------------- |
| `canvas/use-canvas-keyboard.ts` | 새 파일: 키보드 네비게이션 훅 |
| `canvas/why-map-canvas.tsx`     | 훅 연결                       |

### 9-2. 시맨틱 줌

줌 레벨에 따라 노드 디테일 자동 조절:

| 줌      | Direction  | Area            | Goal                     |
| ------- | ---------- | --------------- | ------------------------ |
| < 0.4   | 이름만     | 이름 + 색상 dot | 이름만                   |
| 0.4-0.8 | 이름 + why | 이름 + 배지     | 이름 + 상태 + 프로그레스 |
| > 0.8   | 풀 디테일  | 풀 디테일       | 풀 디테일 + 확장 가능    |

```tsx
// why-map-canvas.tsx
import { useViewport } from '@xyflow/react'
const { zoom } = useViewport()
// enrichedNodes에 zoomLevel 전달

// 각 노드 컴포넌트에서 조건부 렌더
const isCompact = zoomLevel < 0.4
const isMedium = zoomLevel >= 0.4 && zoomLevel < 0.8
```

| 파일                              | 변경                                               |
| --------------------------------- | -------------------------------------------------- |
| `canvas/why-map-canvas.tsx`       | `useViewport()` 훅, zoomLevel을 노드 데이터에 주입 |
| `canvas/types.ts`                 | `InteractionState`에 `zoomLevel?: number` 추가     |
| `canvas/nodes/direction-node.tsx` | 줌 레벨별 조건부 렌더                              |
| `canvas/nodes/area-node.tsx`      | 줌 레벨별 조건부 렌더                              |
| `canvas/nodes/goal-node.tsx`      | 줌 레벨별 조건부 렌더 (compact 시 확장 비활성)     |

---

## Phase 10: 시그니처 기능

> Why Map만의 차별화된 핵심 경험

### 10-1. Why Walk 프레젠테이션 모드

Direction → Area → Goal 순서로 한 노드씩 줌인하며 워크스루. 각 단계에서 "Why" 내러티브 + 진행 통계를 오버레이 패널로 표시.

**워크스루 시퀀스**: DFS 순서 (Direction → Area1 → Goal1.1 → Goal1.2 → Area2 → ...)

```tsx
// 새 파일: canvas/why-walk-overlay.tsx
interface WhyWalkState {
  isActive: boolean
  currentIndex: number
  sequence: { nodeId: string; type: string; why?: string; stats?: NodeStats }[]
}

// 진행: 좌우 화살표 또는 클릭
// 각 단계: fitView({ nodes: [{ id }], padding: 0.5, duration: 600 })
// 비포커스 노드: opacity 0.15 (기존 포커스 모드 재사용)
// 오버레이: 하단에 Why 텍스트 + 프로그레스/스트릭 통계
```

**키보드**: `W`로 시작/종료, `←` `→`로 이동, `Escape`로 종료

| 파일                          | 변경                           |
| ----------------------------- | ------------------------------ |
| `canvas/why-walk-overlay.tsx` | 새 파일: 프레젠테이션 오버레이 |
| `canvas/why-map-canvas.tsx`   | Why Walk 토글 + 시퀀스 생성    |
| `canvas/types.ts`             | WhyWalkState 타입              |

### 10-2. 브레인스톰 모드 (스티키→구조)

빠른 아이디어 덤프 → 구조화 변환 플로우.

1. `B` 키로 브레인스톰 모드 ON → 캔버스 클릭마다 스티키 생성
2. 스티키를 Area 노드 근처에 드래그하면 "이 Area에 Goal로 변환?" 제안
3. 기존 `brain-dump` 모듈과 연계: AI가 스티키들을 Area별로 분류 제안

```tsx
// why-map-canvas.tsx — handleNodeDragStop 확장
// 스티키 노드와 Area 노드 간 거리 계산
const nearbyArea = findNearestArea(stickyPosition, areaNodes, threshold: 100)
if (nearbyArea) {
  // 변환 제안 UI 표시
}
```

| 파일                           | 변경                                 |
| ------------------------------ | ------------------------------------ |
| `canvas/why-map-canvas.tsx`    | 브레인스톰 모드 상태, 근접 Area 감지 |
| `canvas/nodes/sticky-node.tsx` | Area 근접 시 변환 제안 UI            |

---

## Phase 11: AI + 관계 시각화

> 기존 AI 인프라 활용 + 수동 관계 생성

### 11-1. AI 밸런스 오버레이

기존 `roadmap-diagnosis` AI 결과를 캔버스 노드 스타일로 매핑.

- Goal 과밀 Area: 붉은 아우트라인 글로우
- 방치된 Area: 서틀 펄스 애니메이션
- 정체된 Goal: 경고 배지
- 토글 버튼으로 ON/OFF

```tsx
// 새 파일: canvas/use-ai-balance-overlay.ts
// 기존 useAiSuggest + DiagnosisAction 타입 재사용
// 결과를 노드별 visualWarning 으로 변환

interface BalanceOverlay {
  nodeId: string
  level: 'healthy' | 'warning' | 'critical'
  message: string
}
```

| 파일                               | 변경                                |
| ---------------------------------- | ----------------------------------- |
| `canvas/use-ai-balance-overlay.ts` | 새 파일: AI 결과 → 노드 스타일 매핑 |
| `canvas/why-map-canvas.tsx`        | 오버레이 토글 + 노드에 스타일 주입  |

### 11-2. Goal 간 의존관계 엣지

사용자가 Goal 간 "depends on" / "supports" / "conflicts" 관계선을 직접 그림.

```tsx
// 새 파일: canvas/edges/dependency-edge.tsx
// ReactFlow onConnect + 새 edge type

<BaseEdge path={edgePath}
  style={{ stroke: '#6366f1', strokeWidth: 1.5 }}
  markerEnd={MarkerType.ArrowClosed}
/>
<EdgeLabelRenderer>
  <span>{label}</span> {/* "depends on", "supports" 등 */}
</EdgeLabelRenderer>
```

| 파일                               | 변경                            |
| ---------------------------------- | ------------------------------- |
| `canvas/edges/dependency-edge.tsx` | 새 파일: 의존관계 엣지 컴포넌트 |
| `canvas/edges/index.ts`            | edgeTypes에 dependency 추가     |
| `canvas/types.ts`                  | DependencyEdgeData 타입         |
| `canvas/why-map-canvas.tsx`        | `onConnect` 핸들러 추가         |

---

## 미래 고려

| 기능              | 레퍼런스      | 설명                                                  |
| ----------------- | ------------- | ----------------------------------------------------- |
| Canvas Export     | Excalidraw    | `html-to-image` 라이브러리로 PNG/PDF 내보내기         |
| Impact Ripple     | Novel         | 체크인 완료 시 Goal → SharedTask 엣지 리플 애니메이션 |
| Goal Journey 주석 | FigJam 코멘트 | Goal별 타임스탬프 미니 저널 스레드                    |
| 멀티셀렉트 벌크   | FigJam        | Shift+클릭 다중 선택 → 상태 일괄 변경                 |
| 엣지 헬스         | Novel         | Hierarchy 엣지 색상/두께를 브랜치 건강도로 동적 변경  |
| 타임라인 뷰       | Miro 타임라인 | `target_date` 기반 수평 타임라인 레이아웃             |

---

## 파일 구조 (새 파일)

```
src/features/roadmap/components/canvas/
├── area-regions.tsx              Phase 8: Area 배경 프레임
├── why-walk-overlay.tsx          Phase 10: 프레젠테이션 모드
├── use-canvas-keyboard.ts        Phase 9: 키보드 단축키
├── use-ai-balance-overlay.ts     Phase 11: AI 밸런스
└── edges/
    └── dependency-edge.tsx       Phase 11: 의존관계 엣지
```

## 수정 파일

| 파일                                | Phase           |
| ----------------------------------- | --------------- |
| `canvas/edges/shared-task-edge.tsx` | 7               |
| `canvas/nodes/goal-node.tsx`        | 7, 8, 9         |
| `canvas/nodes/area-node.tsx`        | 7, 8, 9         |
| `canvas/nodes/direction-node.tsx`   | 9               |
| `canvas/types.ts`                   | 7, 8, 9, 10, 11 |
| `canvas/tree-to-flow.ts`            | 7, 8            |
| `canvas/why-map-canvas.tsx`         | 7, 8, 9, 10, 11 |
| `canvas/edges/index.ts`             | 11              |

---

## 체크리스트

### Phase 7

- [ ] SharedTask 엣지 라벨
- [ ] Goal 상태 태그
- [ ] Area 상태별 집계 배지
- [ ] Canvas 하단 통계 바

### Phase 8

- [ ] Why Chain 호버 툴팁
- [ ] Progress 히트맵 glow
- [ ] Area 색상 영역 프레임

### Phase 9

- [ ] Tab/Enter 자식/형제 추가
- [ ] Arrow 노드 이동
- [ ] 시맨틱 줌 (3단계)

### Phase 10

- [ ] Why Walk 프레젠테이션 모드
- [ ] 브레인스톰 모드 (스티키→구조)

### Phase 11

- [ ] AI 밸런스 오버레이
- [ ] 의존관계 엣지

---

## 구현 로그

| Phase | 커밋 | 날짜 | 요약 |
| ----- | ---- | ---- | ---- |
| 7     |      |      |      |
| 8     |      |      |      |
| 9     |      |      |      |
| 10    |      |      |      |
| 11    |      |      |      |
