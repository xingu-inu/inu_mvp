# Mobile Roadmap Redesign: Tabbed Canvas + Accordion List

## Context

모바일 로드맵이 데스크탑과 별도의 단순화된 뷰로만 존재. Goal 카드에서 Group/Task 계층을 볼 수 없음. 데스크탑과 동일한 경험을 모바일에서도 제공하기 위해 **상단 탭(리스트/캔버스)** 구조로 재설계.

## 설계 요약

```
모바일 (< lg)
┌─────────────────────────┐
│  RoadmapHeader          │
│  [리스트] [캔버스]  ← 탭  │
├─────────────────────────┤
│  리스트 탭 (기본):       │
│   Direction Banner       │
│   Status > Area > Goal   │
│   Goal 탭 → 아코디언     │
│     └ Group → Task       │
│   Task 탭 → 바텀시트     │
│                          │
│  캔버스 탭:              │
│   WhyMapCanvas (터치)    │
│   노드 탭 → 바텀시트     │
│   FAB (추가 메뉴)        │
└─────────────────────────┘
```

## Step 1: Zustand에 mobileTab 상태 추가

**File:** `src/stores/roadmap.store.ts`

- `MobileTab = 'list' | 'canvas'` 타입 추가
- `mobileTab: MobileTab` + `setMobileTab` 액션 추가
- `persist.partialize`에 `mobileTab` 포함 (탭 기억)
- selector: `selectMobileTab`

## Step 2: MobileTabBar 컴포넌트

**New file:** `src/features/roadmap/components/mobile-tab-bar.tsx`

- 두 개 세그먼트: "리스트" | "캔버스"
- Framer Motion `layoutId`로 활성 인디케이터 애니메이션
- `lg:hidden` — 모바일에서만 표시
- Zustand `mobileTab` / `setMobileTab` 연결

## Step 3: MobileGoalAccordion — 아코디언 Goal 카드

**New file:** `src/features/roadmap/components/mobile-goal-accordion.tsx`

- 기존 `MobileGoalCard`의 헤더 디자인 재활용 (색상바, 이름, 진행률, Area 칩)
- 탭하면 아코디언으로 펼쳐짐 (Framer Motion `height: 'auto'`)
- 펼친 내부에 기존 `GoalExpandedContent` 렌더링 — Group→Task 계층 그대로 재활용
- `GoalExpandedContent`의 `onTaskSelect` → `openMobileDrawer`로 연결

**핵심 재활용:**

- `src/features/roadmap/components/panel-modes/goal-expanded-content.tsx` — DnD, 인라인 생성, 크로스링크 등 모든 기능 포함

## Step 4: MobileListView 교체

**File:** `src/features/roadmap/components/mobile-roadmap-view.tsx` (수정)

- `MobileGoalCard` → `MobileGoalAccordion`으로 교체
- 기존 Direction Banner, StatusSection, AreaSection 구조 유지
- `GoalDetailDrawer` 유지 (Task 바텀시트용)

## Step 5: MobileCanvasView

**New file:** `src/features/roadmap/components/mobile-canvas-view.tsx`

- `WhyMapCanvas`를 모바일 터치용 props로 래핑:
  - `panOnDrag={[0]}` (한 손가락 패닝)
  - 노드 드래그 비활성화
  - 핀치줌 활성화
- 노드 선택 → `openMobileDrawer(goalId)` 연결
- `GoalDetailDrawer` 포함
- FAB는 이 뷰에서만 렌더링 (`MobileRoadmapFab`)

## Step 6: roadmap-content.tsx 통합

**File:** `src/app/(main)/roadmap/roadmap-content.tsx`

현재 모바일 섹션:

```tsx
{
  /* Mobile */
}
;<PageContainer className="pb-24 lg:hidden">
  <RoadmapHeader />
  <MobileRoadmapView />
</PageContainer>
```

변경:

```tsx
{/* Mobile */}
<div className="flex h-full flex-col lg:hidden">
  <PageContainer padded={false} className="px-4 pt-6">
    <RoadmapHeader />
    <MobileTabBar />
  </PageContainer>

  {mobileTab === 'list' ? (
    <PageContainer className="flex-1 overflow-y-auto pb-24">
      <MobileRoadmapView />  {/* 아코디언 버전 */}
    </PageContainer>
  ) : (
    <MobileCanvasView />  {/* 캔버스 풀스크린 */}
  )}
</div>
```

## Step 7: FAB 조건부 렌더링

**File:** `src/features/roadmap/components/mobile-roadmap-fab.tsx` (수정)

- 캔버스 탭에서만 표시: `mobileTab === 'canvas'` 조건 추가
- 리스트 탭에서는 `GoalExpandedContent` 안의 인라인 추가 사용

## 수정 파일 요약

| File                                                        | Action                   |
| ----------------------------------------------------------- | ------------------------ |
| `src/stores/roadmap.store.ts`                               | `mobileTab` 상태 추가    |
| `src/features/roadmap/components/mobile-tab-bar.tsx`        | **신규** — 탭 바         |
| `src/features/roadmap/components/mobile-goal-accordion.tsx` | **신규** — 아코디언 카드 |
| `src/features/roadmap/components/mobile-roadmap-view.tsx`   | 아코디언으로 교체        |
| `src/features/roadmap/components/mobile-canvas-view.tsx`    | **신규** — 캔버스 래퍼   |
| `src/app/(main)/roadmap/roadmap-content.tsx`                | 탭 레이아웃 통합         |
| `src/features/roadmap/components/mobile-roadmap-fab.tsx`    | 캔버스에서만 표시        |

## Verification

1. `npm run lint && npm run type-check` 통과
2. 모바일 뷰포트에서:
   - 리스트 탭: Goal 아코디언 펼침 → Group/Task 보임 → Task 탭 → 바텀시트
   - 캔버스 탭: Why Map 터치 조작 → 노드 탭 → 바텀시트
   - 탭 전환 시 애니메이션
   - FAB는 캔버스에서만 표시
3. 데스크탑(≥1024px)에서: 기존 동작 변화 없음
