# inu 디자인 시스템 & 브랜딩 분석

> 2026-02-25 기준 현재 구현 상태 스냅샷

---

## 1. 브랜드 아이덴티티

### 핵심 정체성

inu는 **따뜻하고 부드러운 자기개발 앱**이다. 기업적이지 않고, 비난하지 않으며, 사용자의 페이스를 존중한다.

| 키워드             | 설명                                                                         |
| ------------------ | ---------------------------------------------------------------------------- |
| **Terra Cotta**    | 브랜드 메인 컬러. 따뜻한 흙빛 톤(OKLCH hue 35°)으로 자연스럽고 안정적인 느낌 |
| **죄책감 없음**    | Miss 상태에 연한 빨강, Skip은 중립 회색. "못한 것"을 비난하지 않는 색상 설계 |
| **최소 마찰**      | 원탭 체크인, 44px+ 터치 타겟, 15초 완료 가능한 데일리 루틴                   |
| **Glass Morphism** | 4단계 반투명 블러로 깊이감 제공. 거친 그림자 대신 부드러운 레이어링          |
| **시간 중심**      | Google Calendar 스타일 Week Grid에 Task 배치. 내 일정 안에서 실천            |

### 디자인 철학 요약

```
따뜻함 (Terra Cotta) + 부드러움 (Glass) + 격려 (성장 마인드셋) = inu
```

- OKLCH 색 공간 채택 → perceptual uniformity (인간 눈에 균일한 밝기 차이)
- warm-toned 그림자 `rgba(40,30,20)` → 차가운 회색 그림자 대신 흙빛 그림자
- Pretendard Variable → 한글 최적화 산세리프, 깔끔하면서도 따뜻한 인상
- 구분선 대신 여백 → 시각적 노이즈 최소화

### 차별점

| vs 일반 습관앱  | inu                                       |
| --------------- | ----------------------------------------- |
| 단순 체크리스트 | Life Roadmap (Direction→Area→Goal→Task)   |
| 빨간색 경고     | 부드러운 Miss (연한 빨강), Skip 중립 처리 |
| 차가운 UI       | Terra Cotta + Glass Morphism              |
| 텍스트 구분선   | 여백으로 구분 (16-24px)                   |
| 고정된 뷰       | 24시간 캘린더 그리드 + 시간대별 배치      |

---

## 2. 디자인 토큰

> 원본: `src/styles/tokens.css`

### 2.1 색상 (OKLCH)

#### Primary — Terra Cotta (Hue 35°)

| Token                 | OKLCH                | 용도                 |
| --------------------- | -------------------- | -------------------- |
| `--color-primary-50`  | `oklch(97% 0.02 35)` | 매우 연한 배경       |
| `--color-primary-100` | `oklch(94% 0.04 35)` | 연한 배경, 선택 상태 |
| `--color-primary-200` | `oklch(88% 0.09 35)` | 보더, 연한 장식      |
| `--color-primary-300` | `oklch(78% 0.13 35)` | 중간 톤              |
| `--color-primary-400` | `oklch(68% 0.17 35)` | 호버 전 단계         |
| `--color-primary-500` | `oklch(56% 0.16 35)` | **메인 브랜드 컬러** |
| `--color-primary-600` | `oklch(48% 0.14 35)` | 호버 상태            |
| `--color-primary-700` | `oklch(42% 0.12 35)` | 강조 텍스트          |
| `--color-primary-800` | `oklch(35% 0.09 35)` | 진한 강조            |
| `--color-primary-900` | `oklch(26% 0.07 35)` | 가장 진한 톤         |

#### Status Colors

| 상태          | Token                 | OKLCH                 | BG Token                 | BG OKLCH              |
| ------------- | --------------------- | --------------------- | ------------------------ | --------------------- |
| Done (완료)   | `--color-done`        | `oklch(62% 0.14 155)` | `--color-done-bg`        | `oklch(95% 0.04 155)` |
| Skip (건너뜀) | `--color-skip`        | `oklch(55% 0.02 55)`  | `--color-skip-bg`        | `oklch(94% 0.01 60)`  |
| Miss (미완료) | `--color-miss`        | `oklch(65% 0.12 20)`  | `--color-miss-bg`        | `oklch(95% 0.025 20)` |
| Streak (연속) | `--color-streak`      | `oklch(68% 0.2 65)`   | `--color-streak-bg`      | `oklch(95% 0.05 65)`  |
| Streak High   | `--color-streak-high` | `oklch(60% 0.22 55)`  | `--color-streak-high-bg` | `oklch(95% 0.06 55)`  |
| Nudge (알림)  | `--color-nudge`       | `oklch(70% 0.14 55)`  | `--color-nudge-bg`       | `oklch(96% 0.03 55)`  |
| AI            | `--color-ai`          | `oklch(55% 0.12 220)` | `--color-ai-bg`          | `oklch(95% 0.03 220)` |
| New Round     | `--color-new-round`   | `oklch(68% 0.12 75)`  | `--color-new-round-bg`   | `oklch(96% 0.02 75)`  |
| Paused        | `--color-paused`      | `oklch(72% 0.12 55)`  | `--color-paused-bg`      | `oklch(96% 0.03 55)`  |
| Active        | `--color-active`      | `oklch(58% 0.14 240)` | `--color-active-bg`      | `oklch(96% 0.03 240)` |
| Archived      | `--color-archived`    | `oklch(60% 0.1 20)`   | `--color-archived-bg`    | `oklch(95% 0.03 20)`  |
| Maintenance   | `--color-maintenance` | `oklch(58% 0.12 220)` | `--color-maintenance-bg` | `oklch(96% 0.03 220)` |

#### Area 프리셋 (8종)

| Area   | Token                        | OKLCH                 | 색감        |
| ------ | ---------------------------- | --------------------- | ----------- |
| 건강   | `--color-area-health`        | `oklch(60% 0.12 160)` | 청록        |
| 커리어 | `--color-area-career`        | `oklch(55% 0.1 245)`  | 파랑        |
| 재정   | `--color-area-finance`       | `oklch(68% 0.11 55)`  | 골드        |
| 관계   | `--color-area-relationships` | `oklch(65% 0.12 15)`  | 따뜻한 빨강 |
| 취미   | `--color-area-hobbies`       | `oklch(60% 0.1 190)`  | 시안        |
| 멘탈   | `--color-area-mental`        | `oklch(65% 0.1 300)`  | 보라        |
| 학습   | `--color-area-learning`      | `oklch(58% 0.1 225)`  | 인디고      |
| 일상   | `--color-area-daily`         | `oklch(55% 0.04 55)`  | 중립 회색   |

#### Surface & Text (Light Mode)

| 용도          | Token                    | OKLCH                   |
| ------------- | ------------------------ | ----------------------- |
| 배경 1차      | `--color-bg-primary`     | `oklch(99% 0.002 60)`   |
| 배경 2차      | `--color-bg-secondary`   | `oklch(97.5% 0.005 55)` |
| 배경 3차      | `--color-bg-tertiary`    | `oklch(96% 0.008 50)`   |
| 캔버스        | `--color-bg-canvas`      | `oklch(94.5% 0.012 48)` |
| 보더          | `--color-border`         | `oklch(91% 0.008 50)`   |
| 보더 호버     | `--color-border-hover`   | `oklch(84% 0.015 45)`   |
| 텍스트 1차    | `--color-text-primary`   | `oklch(22% 0.01 42)`    |
| 텍스트 2차    | `--color-text-secondary` | `oklch(45% 0.012 42)`   |
| 텍스트 3차    | `--color-text-tertiary`  | `oklch(58% 0.008 45)`   |
| 텍스트 비활성 | `--color-text-disabled`  | `oklch(72% 0.005 45)`   |

#### On-Primary (Primary 배경 위 요소)

| Token                     | 값                        |
| ------------------------- | ------------------------- |
| `--color-text-on-primary` | `oklch(100% 0 0)` (white) |
| `--color-bg-on-primary`   | `oklch(100% 0 0 / 20%)`   |

#### Time Slot 배경 틴트

| Slot           | Token                    | OKLCH                   |
| -------------- | ------------------------ | ----------------------- |
| 새벽 (0-6시)   | `--color-slot-dawn`      | `oklch(97% 0.008 280)`  |
| 오전 (6-12시)  | `--color-slot-morning`   | `oklch(98.5% 0.012 85)` |
| 오후 (12-18시) | `--color-slot-afternoon` | `oklch(98% 0.01 50)`    |
| 저녁 (18-24시) | `--color-slot-evening`   | `oklch(97.5% 0.01 260)` |

### 2.2 타이포그래피

#### Font Family

```css
--font-sans: 'Pretendard Variable', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
--font-serif: 'Noto Serif KR', 'Noto Serif', Georgia, serif;
--font-mono: 'JetBrains Mono', 'SF Mono', Consolas, monospace;
```

| 폰트                | 용도                                          |
| ------------------- | --------------------------------------------- |
| Pretendard Variable | 기본 UI 텍스트 전체                           |
| Noto Serif KR       | Direction 문장, 인용문 등 강조                |
| JetBrains Mono      | 숫자 통계, 코드, 퍼센트 표시 (`tabular-nums`) |

#### Font Size (1.25 modular scale)

| Token         | Size            | 주요 용도                   |
| ------------- | --------------- | --------------------------- |
| `--text-xs`   | 0.75rem (12px)  | 배지, 보조 라벨, chip time  |
| `--text-sm`   | 0.875rem (14px) | 본문 small, 캡션, task 이름 |
| `--text-base` | 1rem (16px)     | 기본 본문                   |
| `--text-lg`   | 1.125rem (18px) | 서브 타이틀                 |
| `--text-xl`   | 1.25rem (20px)  | 섹션 제목                   |
| `--text-2xl`  | 1.5rem (24px)   | 페이지 제목                 |
| `--text-3xl`  | 1.875rem (30px) | 히어로 제목                 |
| `--text-4xl`  | 2.25rem (36px)  | 대형 제목                   |
| `--text-5xl`  | 3rem (48px)     | 최대 제목                   |

#### Font Weight

| Token              | Value | 용도                      |
| ------------------ | ----- | ------------------------- |
| `--font-normal`    | 400   | 본문                      |
| `--font-medium`    | 500   | 라벨, 버튼 텍스트         |
| `--font-semibold`  | 600   | 섹션 제목, Area 이름      |
| `--font-bold`      | 700   | 강조 제목, Direction 문장 |
| `--font-extrabold` | 800   | 히어로 숫자               |

#### Line Height

| Token               | Value | 용도                |
| ------------------- | ----- | ------------------- |
| `--leading-tight`   | 1.25  | 제목, 밀집 레이아웃 |
| `--leading-normal`  | 1.5   | 기본 본문           |
| `--leading-relaxed` | 1.625 | 긴 텍스트           |

### 2.3 간격

#### 4px 기본 단위

| Token        | Value          | 용도           |
| ------------ | -------------- | -------------- |
| `--space-0`  | 0              | —              |
| `--space-1`  | 0.25rem (4px)  | 최소 간격      |
| `--space-2`  | 0.5rem (8px)   | 밀착 요소 간   |
| `--space-3`  | 0.75rem (12px) | 관련 요소 간   |
| `--space-4`  | 1rem (16px)    | 섹션 내부      |
| `--space-5`  | 1.25rem (20px) | 카드 패딩      |
| `--space-6`  | 1.5rem (24px)  | 주요 섹션 구분 |
| `--space-8`  | 2rem (32px)    | 큰 영역 구분   |
| `--space-10` | 2.5rem (40px)  | 페이지 여백    |
| `--space-12` | 3rem (48px)    | 대형 여백      |
| `--space-16` | 4rem (64px)    | 최대 여백      |

#### 레이아웃 상수

```css
--top-bar-height: 56px; /* DesktopTopBar */
--bottom-nav-height: 64px; /* MobileBottomNav */
--safe-area-top: env(safe-area-inset-top, 0px);
--safe-area-bottom: env(safe-area-inset-bottom, 0px);
```

#### 자주 쓰이는 패딩 조합

| 컴포넌트        | 모바일      | 데스크톱    |
| --------------- | ----------- | ----------- |
| 페이지 컨테이너 | `px-4 py-2` | `px-6 py-6` |
| 카드 내부       | `px-3 py-2` | `px-4 py-3` |
| 히어로 카드     | `px-5 py-4` | `px-5 py-4` |
| 리스트 아이템   | `px-3 py-2` | `px-4 py-3` |
| 섹션 간         | `space-y-4` | `space-y-4` |

### 2.4 Border Radius

| Token           | Value  | 용도                 |
| --------------- | ------ | -------------------- |
| `--radius-sm`   | 4px    | 작은 칩, 인라인 요소 |
| `--radius-md`   | 8px    | 기본 카드, 버튼      |
| `--radius-lg`   | 12px   | 큰 카드, Task 카드   |
| `--radius-xl`   | 16px   | 섹션 카드, Goal 카드 |
| `--radius-2xl`  | 20px   | 히어로 카드, 모달    |
| `--radius-3xl`  | 24px   | 대형 모달            |
| `--radius-full` | 9999px | 원형 배지, 필터 필   |

### 2.5 Shadow (따뜻한 톤)

기본 색상: `rgba(40, 30, 20, ...)` — 순수 검정이 아닌 따뜻한 갈색 계열

| Token                 | Value                             | 용도          |
| --------------------- | --------------------------------- | ------------- |
| `--shadow-xs`         | `0 1px 2px rgba(40,30,20,0.05)`   | 미세 구분     |
| `--shadow-sm`         | `0 1px 3px rgba(40,30,20,0.08)`   | 리스트 아이템 |
| `--shadow-md`         | `0 4px 6px rgba(40,30,20,0.07)`   | 기본 카드     |
| `--shadow-lg`         | `0 10px 15px rgba(40,30,20,0.08)` | 팝오버        |
| `--shadow-xl`         | `0 20px 25px rgba(40,30,20,0.08)` | 대형 카드     |
| `--shadow-2xl`        | `0 25px 50px rgba(40,30,20,0.14)` | 모달          |
| `--shadow-card`       | `0 4px 16px rgba(40,30,20,0.05)`  | 카드 기본     |
| `--shadow-card-hover` | `0 8px 24px rgba(40,30,20,0.08)`  | 카드 호버     |

### 2.6 Glass Morphism

> 원본: `src/styles/glass.css`

#### 4+1 단계 시스템

| Level        | Blur | Opacity | Border | 용도                        |
| ------------ | ---- | ------- | ------ | --------------------------- |
| `glass-1`    | 4px  | 50%     | 15%    | 리스트 아이템, 미묘한 구분  |
| `glass-2`    | 8px  | 68%     | 20%    | **기본 카드**, 입력 필드    |
| `glass-3`    | 12px | 80%     | 25%    | 히어로 카드, Top Bar        |
| `glass-4`    | 16px | 90%     | 30%    | 모달, Bottom Sheet          |
| `glass-dive` | 16px | 65%     | 10%    | Auth 화면 (Warm Earth 테마) |

```css
/* 예시: glass-2 (가장 많이 사용) */
.glass-2 {
  background: rgba(255, 253, 250, 0.68);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(210, 200, 185, 0.2);
}
```

**Fallback**: `@supports not (backdrop-filter: blur(1px))` → solid `var(--color-bg-primary)`

### 2.7 Z-Index

| Token                | Value | 용도        |
| -------------------- | ----- | ----------- |
| `--z-base`           | 0     | 기본        |
| `--z-dropdown`       | 10    | 드롭다운    |
| `--z-sticky`         | 20    | 고정 헤더   |
| `--z-fixed`          | 30    | 고정 요소   |
| `--z-modal-backdrop` | 40    | 모달 배경   |
| `--z-modal`          | 50    | 모달        |
| `--z-popover`        | 60    | 팝오버      |
| `--z-tooltip`        | 70    | 툴팁        |
| `--z-toast`          | 80    | 토스트 알림 |
| `--z-max`            | 9999  | 최상위      |

### 2.8 Calendar Chip

| Token                 | Value           | 설명                |
| --------------------- | --------------- | ------------------- |
| `--chip-h`            | 32px (xl: 34px) | 칩 높이             |
| `--chip-radius`       | 8px             | 모서리              |
| `--chip-px`           | 8px             | 좌우 패딩           |
| `--chip-py`           | 3px             | 상하 패딩           |
| `--chip-border-left`  | 3px             | 왼쪽 Area 색상 보더 |
| `--chip-font-size`    | 12px (xl: 13px) | 폰트 크기           |
| `--chip-tint-opacity` | 12% (dark: 18%) | 배경 틴트           |

### 2.9 Dark Mode

`[data-theme='dark']` attribute로 토글.

**전략**: OKLCH 명도 반전 — Light에서 높은 명도를 Dark에서 낮은 명도로 전환

| 카테고리       | Light            | Dark                         |
| -------------- | ---------------- | ---------------------------- |
| bg-primary     | 99%              | 14%                          |
| bg-secondary   | 97.5%            | 18%                          |
| bg-tertiary    | 96%              | 22%                          |
| bg-canvas      | 94.5%            | 12%                          |
| text-primary   | 22%              | 93%                          |
| text-secondary | 45%              | 73%                          |
| text-tertiary  | 58%              | 58% (동일)                   |
| text-disabled  | 72%              | 43%                          |
| border         | 91%              | 28%                          |
| shadow base    | `rgba(40,30,20)` | `rgba(30,20,10)` + 더 진하게 |

Primary scale도 일부 오버라이드:

| Token       | Light                | Dark                 |
| ----------- | -------------------- | -------------------- |
| primary-50  | `oklch(97% 0.02 35)` | `oklch(20% 0.04 35)` |
| primary-100 | `oklch(94% 0.04 35)` | `oklch(24% 0.06 35)` |
| primary-200 | `oklch(88% 0.09 35)` | `oklch(28% 0.08 35)` |
| primary-700 | `oklch(42% 0.12 35)` | `oklch(78% 0.13 35)` |

---

## 3. 애니메이션 시스템

> 원본: `src/lib/constants/animations.ts`, `src/styles/tokens.css`

### Duration

| 상수          | 값     | 용도            |
| ------------- | ------ | --------------- |
| `INSTANT`     | 50ms   | 즉각 피드백     |
| `FAST`        | 100ms  | 빠른 인터랙션   |
| `DEFAULT`     | 200ms  | 표준 트랜지션   |
| `MEDIUM`      | 300ms  | 복합 상태 변경  |
| `SLOW`        | 400ms  | 중요 애니메이션 |
| `PARTICLE`    | 600ms  | 파티클 버스트   |
| `CONFETTI`    | 2000ms | 컨페티          |
| `CELEBRATION` | 3000ms | 축하 효과       |

CSS 변수:

```css
--duration-fast: 150ms;
--duration-normal: 250ms;
--duration-slow: 400ms;
```

### Easing

| 이름       | 값                            | 용도            |
| ---------- | ----------------------------- | --------------- |
| `DEFAULT`  | `[0.4, 0, 0.2, 1]`            | 기본 트랜지션   |
| `EASE_OUT` | `[0, 0, 0.2, 1]`              | 진입 애니메이션 |
| `EASE_IN`  | `[0.4, 0, 1, 1]`              | 퇴장 애니메이션 |
| `SPRING`   | `stiffness: 300, damping: 20` | 탄성 느낌       |
| `BOUNCY`   | `stiffness: 400, damping: 15` | 강한 탄성       |

CSS 변수:

```css
--ease-default: cubic-bezier(0.4, 0, 0.2, 1);
--ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### 주요 Keyframe

| 이름             | Duration    | 설명                           |
| ---------------- | ----------- | ------------------------------ |
| `streak-pop`     | 300ms       | 스트릭 배지 1→1.3→1 scale      |
| `particle-burst` | 600ms       | 12개 파티클 발산, opacity 1→0  |
| `confetti-fall`  | 2000ms      | Y축 -20px→100vh, rotate 0→720° |
| `shake`          | 400ms       | X축 ±8px 진동 (에러)           |
| `pulse`          | 2s infinite | opacity 100%→50% (위험 알림)   |

### Particle Config

```typescript
COUNT: 12,        // 파티클 수
DURATION: 600,    // ms
MAX_DISTANCE: 80, // px
MIN_DISTANCE: 40, // px
SIZE: { MIN: 4, MAX: 8 } // px
```

### Confetti Config

```typescript
COUNT: 50,
DURATION: 2000,
SPREAD: 180,
COLORS: ['done', 'primary-500', 'streak', '#FFD700', '#FF6B6B', '#4ECDC4']
```

### Streak Milestones

`[5, 10, 15, 20, 25, 30, 50, 75, 100]` — 이 숫자에서 confetti 발동

### Reduced Motion

```typescript
function getReducedMotionConfig(prefersReducedMotion: boolean) {
  return {
    duration: prefersReducedMotion ? 0 : ANIMATION_DURATION.DEFAULT,
    transition: prefersReducedMotion ? { duration: 0 } : undefined,
  }
}
```

---

## 4. 화면별 디자인

### 4.1 Home

#### 레이아웃

**데스크톱 (≥1024px)**

```
┌──────────────────────────────────────────────────┐
│ Top Bar (56px) — SegmentControl (Home·Roadmap·Review) │
├─────────────────────────────┬────────────────────┤
│                             │                    │
│   Week Grid (7일)           │  Right Panel       │
│   24hr × 56px/hr            │  ┌──────────────┐  │
│   왼쪽: 시간 라벨 (56px)    │  │ Task List    │  │
│   상단: 요일 헤더 (sticky)  │  │ Check-in     │  │
│   본문: Task Block 배치     │  │ Reflection   │  │
│   하단: 종일 행 (sticky)    │  └──────────────┘  │
│                             │                    │
└─────────────────────────────┴────────────────────┘
```

**모바일 (<1024px)**

```
┌─────────────────────────┐
│ Home Header (날짜+필터) │
├─────────────────────────┤
│ Compact Week Strip      │
│ (3일 슬라이딩 윈도우)   │
├─────────────────────────┤
│ Task List               │
│ (Area별 그룹, 스크롤)   │
│                         │
│ Reflection Card         │
│                         │
├─────────────────────────┤
│ Bottom Nav (64px)       │
└─────────────────────────┘
```

#### Week Grid 상세

| 속성           | 값                                                                     |
| -------------- | ---------------------------------------------------------------------- |
| HOUR_HEIGHT    | 56px                                                                   |
| 시간 라벨 너비 | 56px (데스크톱), 40px (모바일)                                         |
| 그리드         | `gridTemplateColumns: '56px repeat(7, minmax(0, 1fr))'` (inline style) |
| Auto-scroll    | 마운트 시 현재 시간으로 스크롤                                         |
| Current Time   | 빨간 선, 절대 위치 (px 계산)                                           |
| 종일 행        | 상단 sticky, `bg-[var(--color-bg-secondary)]/60`                       |

**주의**: Tailwind v4에서 `grid-cols-[56px_repeat(7,1fr)]`은 동작하지 않음 → inline style 사용

#### Time Slot (5개)

| Slot      | 이모지 | 시간    | 배경                    |
| --------- | ------ | ------- | ----------------------- |
| dawn      | 🌃     | 0-6시   | `oklch(97% 0.008 280)`  |
| morning   | ☀️     | 6-12시  | `oklch(98.5% 0.012 85)` |
| afternoon | 🌞     | 12-18시 | `oklch(98% 0.01 50)`    |
| evening   | 🌙     | 18-24시 | `oklch(97.5% 0.01 260)` |
| anytime   | ⏰     | —       | —                       |

#### Task Block (Week Grid 내)

```
┌─┬──────────────────┐
│█│ 🏃 매일 30분 걷기 │ ← 왼쪽 보더 3px (Area 색상)
│█│ 🔥12  30분       │ ← 스트릭 + 소요시간
└─┴──────────────────┘
```

- 위치: `top = (hour + minute/60) * HOUR_HEIGHT`
- 높이: `height = (duration_minutes / 60) * HOUR_HEIGHT`
- 최소 높이: 14px
- 겹침 처리: `use-task-layout.ts` 알고리즘
- 스타일: `rounded-md`, 상태별 배경 (done/skip/miss)
- 호버: `hover:-translate-y-0.5`

#### Task List (Sortable)

**Area 섹션**

```
│ 💪 건강          3/5  ━━━━━━░░ │
│ ─────────────────────────────── │ ← border-l-2 (area 색상)
│ ☐ 매일 30분 걷기     🔥12      │
│ ✅ 스트레칭            🔥5      │
│ ☐ 물 2L 마시기                  │
```

- Area 구분: `border-l-2 pl-3` (왼쪽 보더 = Area 색상)
- 진행률: `h-1 w-12 rounded-full` (Area 색상으로 채움)
- Task 간격: `space-y-0.5` (2px)
- DnD: `@dnd-kit/sortable` (Area 간, Task 간 드래그 정렬)

**CompactTaskRow (Task 한 줄)**

- 컨테이너: `rounded-lg px-3 py-2 flex items-center gap-2.5`
- 체크박스: `h-5 w-5`, hover시 done 색상 보더
- 이름: `text-sm font-medium text-[var(--color-text-primary)]`
- 상태별:
  - Pending: `hover:bg-[var(--color-bg-secondary)]`
  - Done: `bg-[var(--color-done-bg)]`
  - Skip: `bg-[var(--color-skip-bg)]`
  - Streak at risk: `bg-[var(--color-streak-bg)]/30 ring-1 ring-[var(--color-streak-ring)]`

**Daily 섹션** (Goal 없는 Task)

- `border-l-2 pl-3`, 색상: `var(--color-text-tertiary)`

#### Filter Pills

```
[ 전체 | 미완료 | 스트릭 위험 | ... ]
```

- Active: `bg-[var(--color-primary-500)] text-white`
- Inactive: `text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)]`
- 스타일: `rounded-full px-3 py-2 text-xs font-medium`

#### Check-in

- **Done 버튼**: `bg-[var(--color-done)] text-white` → 완료 시 파티클 버스트
- **Skip 버튼**: `bg-[var(--color-skip-bg)] text-[var(--color-skip)]`
- 체크인 완료 → 즉각적 색상 변화 + `streak-pop` 애니메이션
- 마일스톤 (5, 10, 15...) → confetti 발동

#### Reflection Card

```
┌────────────────────────────────┐
│ 오늘 하루 어땠나요?            │  ← CTA 모드: primary-500 bg
│                                │
│ 😫  😕  😐  🙂  😄           │  ← 5단계 기분 선택
│                                │
│ [한줄 요약 입력]               │
└────────────────────────────────┘
```

- CTA 모드: `bg-[var(--color-primary-500)] text-white rounded-xl px-5 py-4`
- 기분 선택기: `whileHover={{scale:1.1}}` `whileTap={{scale:0.95}}`, spring `stiffness=400`
- 확장/축소: Framer Motion `initial={{height:0, opacity:0}}`

### 4.2 Roadmap

#### 레이아웃

**데스크톱: Visual Tree**

```
┌─────────────────────────────┬────────────────────┐
│ Top Bar                     │                    │
├─────────────────────────────┤  GoalBrowsePanel   │
│                             │  (Right Panel)     │
│   [Zoom Controls]           │                    │
│                             │  ┌──────────────┐  │
│   ┌─────────┐              │  │ Area 목록    │  │
│   │Direction│              │  │ Goal 아코디언│  │
│   └────┬────┘              │  │ 인라인 폼    │  │
│   ┌────┴────┐              │  └──────────────┘  │
│   │  Area   │  ...         │                    │
│   └────┬────┘              │                    │
│   ┌────┴────┐              │                    │
│   │  Goal   │  ...         │                    │
│   └─────────┘              │                    │
│                             │                    │
│   (dot grid canvas, zoom/pan) │                  │
└─────────────────────────────┴────────────────────┘
```

**모바일: Accordion List**

```
┌─────────────────────────┐
│ 헤더 (Brain Dump + 진단) │
├─────────────────────────┤
│ Direction Bar           │
├─────────────────────────┤
│ ▼ 💪 건강  (3)          │
│   ┌─────────────────┐   │
│   │🎯 10km 달리기    │   │
│   │ ━━━━━━░░  78%   │   │
│   └─────────────────┘   │
│ ▼ 📈 커리어  (2)        │
│   ...                   │
│ [+ Area 추가] (dashed)  │
├─────────────────────────┤
│ Bottom Nav (64px)       │
└─────────────────────────┘
```

#### Tree Node 스타일

공통: `rounded-xl border-2 px-4 py-2.5 shadow-sm`

| Node      | 배경                                 | 아이콘                | 텍스트                       | Min Width |
| --------- | ------------------------------------ | --------------------- | ---------------------------- | --------- |
| Direction | `primary-500`                        | Compass (h-4)         | `text-base font-bold`, white | 180px     |
| Area      | `bg-primary` + 왼쪽 `w-1` accent bar | 색상 dot + emoji      | `text-[15px] font-semibold`  | 140px     |
| Goal      | `bg-primary`                         | Target (h-4, primary) | `text-sm font-medium`        | 150px     |
| Group     | `bg-primary`                         | Circle / CheckCircle2 | `text-[13px] font-medium`    | 130px     |
| Task      | `bg-primary`                         | Repeat / Calendar1    | `text-[13px] text-secondary` | 120px     |

**선택 상태**: `shadow-[0_0_0_4px_var(--color-primary-100)] ring-2 ring-[var(--color-primary-500)]/60`

**검색 매치**: `ring-2 ring-[var(--color-primary-400)]`

#### Tree Canvas

- 배경: `bg-[var(--color-bg-canvas)]` (dot grid 패턴)
- Zoom: 0.5x ~ 3x (ZOOM_STEP=0.1)
- Pan: 드래그 or 스크롤
- Connector: `border-l-2 border-[var(--color-border-hover)]`

#### Zoom Controls

```
┌─────────────────────────┐
│ [-]  100%  [+]  [Reset] │  ← absolute bottom-6 left-6 z-20
└─────────────────────────┘
```

- 스타일: `rounded-xl border bg-[var(--color-bg-primary)]/90 backdrop-blur-md shadow-sm`
- 버튼: `min-h-[44px] min-w-[44px] rounded-lg`

#### Quick Add (+)

- 위치: `absolute top-1/2 -right-3 z-10`
- 크기: `h-6 w-6 rounded-full`
- 노출: `opacity-0 group-hover/node:opacity-100`
- 호버: `hover:bg-[var(--color-primary-50)] hover:shadow-md`

#### Goal Accordion (모바일/우측 패널)

```
┌──────────────────────────────────┐
│ 🎯 10km 달리기      D-7 🔥15 ▼ │  ← border-left: 4px area 색상
├──────────────────────────────────┤
│ (확장 시 내용)                    │  ← bg: color-mix area 4%
│ Task 리스트, WOOP 정보           │
└──────────────────────────────────┘
```

- 카드: `rounded-xl border`
- 선택: `border-[var(--color-primary-500)] bg-[var(--color-primary-50)]`
- 확장 배경: `color-mix(in srgb, ${area.color} 4%, transparent)`

#### Focus Mode

- 선택 브랜치: 100% opacity
- 비활성 브랜치: `opacity-[0.35] hover:opacity-[0.55]`

#### Add 버튼 (Dashed)

```
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│      + 목표 추가              │
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

- `border border-dashed border-[var(--color-border)] rounded-xl`
- 호버: `border-[var(--color-border-hover)] bg-[var(--color-bg-secondary)]`

#### Brain Dump 버튼

- `bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-ai)]`
- `text-xs font-medium text-white rounded-lg`
- 아이콘: `Sparkles` (h-3.5 w-3.5)

### 4.3 Review

#### 레이아웃

```
┌────────────────────────────────┐
│ Period Selector                │
│ [◀ 2월 3주차 ▶]  [주간|월간]  │
├────────────────────────────────┤
│ Compact Summary Card           │
│ ┌──────┐                      │
│ │ ○78% │ 실천율 +5%p          │
│ └──────┘ 기분 😊 3.8          │
│          🔥 Top: 러닝(12)      │
├────────────────────────────────┤
│ Daily Heatmap                  │
│ 일 월 화 수 목 금 토          │
│ ■  □  ■  ■  ■  □  ■           │
├────────────────────────────────┤
│ Area Progress List             │
│ 💪 건강  ━━━━━━━░░░  80%      │
│ 📈 커리어 ━━░░░░░░░░  30%     │
│ 🧘 멘탈  ━━━━━━━━░░  90%      │
└────────────────────────────────┘
```

#### Compact Summary Card

- 스타일: `rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4`
- Progress Ring: 48px diameter, 4px stroke
  - 색상: `var(--color-primary-500)` (rate > 0) / `var(--color-bg-tertiary)` (0%)
  - 애니메이션: `strokeDashoffset`, 1초 easeOut
- 비교 칩: `bg-emerald-50 text-emerald-700` (양수) / `bg-tertiary text-tertiary` (0)

#### Daily Heatmap

**Week View**: 7개 flex column, `gap-1`

- 각 셀: 날짜 + 기분 이모지/dot + 완료율
- 선택: `bg-[var(--color-primary-50)] ring-2 ring-[var(--color-primary-400)]`
- 호버: `hover:bg-[var(--color-bg-secondary)]`

**Month View**: 7-column grid (`grid-cols-7 gap-1`)

- 셀 높이: `h-11` (44px — 터치 타겟)
- 완료율 색상 (Emerald scale):
  - 0%: `bg-[var(--color-bg-secondary)]`
  - 1-49%: `bg-emerald-50`
  - 50-99%: `bg-emerald-100`
  - 100%: `bg-emerald-200`
- 미래 날짜: `opacity-40`

#### Area Progress List

- 컨테이너: `divide-y divide-[var(--color-border)] rounded-xl border bg-[var(--color-bg-card)]`
- 행: `px-4 py-3`
- Progress bar: `h-2 flex-1 rounded-full` (Area 색상)
- 퍼센트: `w-9 text-right font-mono text-xs`
- 선택: `bg-[var(--color-primary-50)]`
- 초기 4개 표시, 나머지 접기/펼치기

#### DeltaChip

```
실천율 +5%p    기분 -0.3
```

- 양수: `bg-emerald-50 text-emerald-700`
- 제로: `bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]`
- 음수: `bg-[var(--color-miss-bg)] text-[var(--color-miss)]`
- 포맷: `{label} {sign}{value}{suffix}`

#### Empty State

```
┌────────────────────────────────┐
│                                │
│         🌱 (Mascot)            │
│     mood: curious, size: lg    │
│                                │
│     아직 기록이 없어요          │
│                                │
│  [홈에서 시작하기] (CTA)        │
│                                │
└────────────────────────────────┘
```

- Mascot: `mood="curious" size="lg"`
- 제목: `text-xl font-semibold`
- 설명: `max-w-sm text-secondary`
- CTA: primary variant → `/home`

---

## 5. 공통 컴포넌트

### 5.1 Button

> `src/components/ui/button.tsx`

#### Variants

| Variant     | 배경         | 텍스트       | 호버             | 용도        |
| ----------- | ------------ | ------------ | ---------------- | ----------- |
| `primary`   | primary-500  | white        | primary-600      | 주 액션     |
| `secondary` | bg-secondary | text-primary | bg-tertiary      | 보조 액션   |
| `ghost`     | transparent  | text-primary | bg-secondary     | 텍스트 버튼 |
| `done`      | done         | white        | done (darker)    | 완료        |
| `skip`      | skip-bg      | skip         | skip-bg (darker) | 건너뛰기    |
| `danger`    | miss         | white        | miss (darker)    | 삭제        |

#### Sizes

| Size   | Height  | Padding | Font | Radius    |
| ------ | ------- | ------- | ---- | --------- |
| `sm`   | 36px    | px-3    | 14px | md (8px)  |
| `md`   | 44px    | px-4    | 16px | lg (12px) |
| `lg`   | 56px    | px-6    | 18px | lg (12px) |
| `icon` | 44×44px | —       | —    | lg (12px) |

#### 공통 스타일

- `transition-colors`
- `active:scale-[0.98]`
- Disabled: `cursor-not-allowed opacity-50`
- Loading: 스피너 (4px/2px border)
- Gradient (AI): `bg-gradient-to-r from-primary-500 to-ai`

### 5.2 Card

> `src/components/ui/card.tsx`

| Variant   | Glass      | Shadow      | 특징                | 용도          |
| --------- | ---------- | ----------- | ------------------- | ------------- |
| `default` | glass-2    | shadow-card | hover lift (-0.5px) | 기본 카드     |
| `hero`    | glass-3    | shadow-lg   | p-6                 | 강조 카드     |
| `list`    | glass-1    | shadow-sm   | hover bg change     | 리스트 아이템 |
| `done`    | —          | —           | done-bg + border    | 완료 상태     |
| `skip`    | —          | —           | skip-bg + border    | 건너뛴 상태   |
| `miss`    | —          | —           | miss-bg + border    | 미완료 상태   |
| `dive`    | glass-dive | —           | Warm Earth          | Auth 화면     |

Padding: `none` / `sm`(12px) / `md`(16px, 기본) / `lg`(24px)

### 5.3 ResponsiveModal

> `src/components/ui/responsive-modal.tsx`

| 화면              | 구현         | 상세                                       |
| ----------------- | ------------ | ------------------------------------------ |
| 데스크톱 (≥768px) | Radix Dialog | 중앙 오버레이, max-w-lg, max-h-85vh        |
| 모바일 (<768px)   | Vaul Drawer  | Bottom sheet, rounded-t-[20px], max-h-90vh |

- Backdrop: `bg-black/40`
- 드래그 핸들: `h-1.5 w-12` (모바일)
- ESC 키 닫기
- 자동 전환: breakpoint 기반

### 5.4 Badge

#### StreakBadge

```
🔥 12
```

- 스타일: `rounded-full px-2 py-0.5 font-mono font-semibold`
- Tier 1 (1-13): `bg-streak-bg text-streak`
- Tier 2 (14+): `bg-streak-high-bg text-streak-high`
- At-risk: `ring-2 ring-streak-ring` + pulse 애니메이션
- 마일스톤: `streak-pop` 애니메이션 (300ms spring)
- 표시 조건: streak > 0

#### DDayBadge

```
D-7
```

- 색상: primary
- 포맷: D-N (미래), D+N (지난)
- 표시 조건: deadline ≤ 7일

### 5.5 ProgressRing

```
┌──────┐
│  ○   │  ← SVG circle 2개 (bg + progress)
│ 78%  │  ← 중앙 텍스트 (mono font)
└──────┘
```

| Props       | 값                            |
| ----------- | ----------------------------- |
| size        | 48px (compact) ~ 120px (hero) |
| strokeWidth | 4px ~ 12px                    |
| rate        | 0-100                         |

- 색상: rate > 0 → primary-500, rate === 0 → tertiary
- 애니메이션: `strokeDashoffset`, 1초 easeOut (Framer Motion)
- 계산: `offset = circumference * (1 - rate / 100)`

### 5.6 DeltaChip

```typescript
<DeltaChip label="실천율" delta={5} suffix="%p" />
// → "실천율 +5%p" (emerald)
```

### 5.7 Mascot

| Mood        | 용도        |
| ----------- | ----------- |
| happy       | 일반 긍정   |
| proud       | 달성 축하   |
| curious     | empty state |
| sleepy      | 휴식        |
| encouraging | 격려        |
| celebrating | 마일스톤    |
| checkin     | 체크인      |
| empty       | 빈 상태     |

Size: `xs`(32px), `sm`(48px), `md`(80px), `lg`(120px), `xl`(160px)

### 5.8 Segment Control

```
┌──────────────────────────┐
│  Home  │ Roadmap │ Review │  ← iOS 스타일 pill toggle
└──────────────────────────┘
```

- 구현: Framer Motion `layoutId="segment-indicator"` (pill 슬라이딩)
- 물리: `spring duration=0.4, bounce=0.15`
- Active: primary-500 bg, white text
- Inactive: transparent, text-secondary

---

## 6. 반응형 디자인

### Breakpoint

| Token    | Value      | 역할                      |
| -------- | ---------- | ------------------------- |
| `sm`     | 640px      | 모바일 large              |
| `md`     | 768px      | 태블릿 (Modal 전환점)     |
| **`lg`** | **1024px** | **주요 레이아웃 전환**    |
| `xl`     | 1280px     | 데스크톱 (chip 크기 증가) |
| `2xl`    | 1536px     | 대형 데스크톱             |

### Navigation

| 화면       | 모바일 (<lg)                       | 데스크톱 (≥lg)                   |
| ---------- | ---------------------------------- | -------------------------------- |
| 내비게이션 | Bottom Tab Bar (64px), `lg:hidden` | Top Bar (56px), `hidden lg:flex` |
| 탭 전환    | 하단 아이콘 탭                     | SegmentControl (가운데 pill)     |

### Layout Overflow

| 화면           | 모바일                 | 데스크톱                         |
| -------------- | ---------------------- | -------------------------------- |
| Body           | 스크롤 가능            | `overflow: hidden` (뷰포트 고정) |
| Content        | 페이지 스크롤          | 컨테이너 내부 스크롤             |
| Bottom padding | `pb-bottom-nav` (64px) | 0                                |

### 화면별 반응형

| 화면    | 모바일                               | 데스크톱                             |
| ------- | ------------------------------------ | ------------------------------------ |
| Home    | 3일 슬라이딩 윈도우 + 하단 Task List | 7일 풀 그리드 + Right Panel          |
| Roadmap | Accordion 리스트                     | Visual Tree (zoomable) + Right Panel |
| Review  | 단일 컬럼 스크롤                     | 단일 컬럼 (고정 높이 내 스크롤)      |
| Modal   | Vaul Drawer (bottom sheet)           | Radix Dialog (center overlay)        |

### Touch Target

```css
--touch-min: 44px; /* 최소 (Apple HIG, WCAG) */
--touch-comfortable: 48px; /* 권장 */
--touch-large: 56px; /* 대형 */
```

적용: 버튼, 리스트 행, 히트맵 셀, 아이콘 버튼 모두 최소 44px 준수

### Safe Area (iOS Notch)

```css
--safe-area-top: env(safe-area-inset-top, 0px);
--safe-area-bottom: env(safe-area-inset-bottom, 0px);
```

유틸리티: `.pt-safe`, `.pb-safe`, `.mt-safe`, `.mb-safe`, `.pb-bottom-nav`

### Hover 전략

```tsx
// 데스크톱에서만 hover 효과 (모바일 터치 ghost hover 방지)
className =
  'lg:[@media(hover:hover)]:opacity-0 lg:[@media(hover:hover)]:group-hover/area:opacity-100'
```

---

## 7. 톤앤매너 & UX Writing

### 원칙

| 원칙                   | 설명                                     |
| ---------------------- | ---------------------------------------- |
| 친근하지만 가볍지 않은 | "~요" 존댓말, 이모지 적절히, 비격식+존중 |
| 격려하지만 현실적인    | 빈말 금지, 데이터 근거 칭찬              |
| 짧고 핵심만            | 한 메시지 1-2개 핵심, 긴 설교 없음       |
| 비난 없음              | "왜 못했어요?" → "혹시 이유가 있었나요?" |

### 성장 마인드셋 메시지

| 상황        | ❌ 기존               | ✅ 성장 마인드셋                                         |
| ----------- | --------------------- | -------------------------------------------------------- |
| 스트릭 깨짐 | "스트릭이 끊겼습니다" | "쉬는 것도 과정의 일부예요. 다시 시작하는 게 중요합니다" |
| 목표 미달성 | "달성하지 못했어요"   | "아직 도달하지 못했어요. 무엇이 방해했을까요?"           |
| 목표 중단   | "포기"                | "방향 전환. 이 경험에서 배운 것을 기록해두세요"          |
| 완료율 낮음 | "30%밖에 못했어요"    | "30%를 해냈어요. 어떤 부분이 어려웠을까요?"              |
| 느린 진행   | "진행이 느려요"       | "자기 페이스를 지키고 있어요"                            |

**주의**: 노력만 칭찬 ❌ → 전략 변화 유도 ✅

- "열심히 했어요!" → "어떤 전략이 효과적이었나요?"

### Empty State

| 화면    | 일러스트 | 메시지                | CTA                   |
| ------- | -------- | --------------------- | --------------------- |
| Home    | 🌱       | "오늘 할 일이 없어요" | [로드맵에서 추가하기] |
| Roadmap | 🗺️       | "아직 목표가 없어요"  | [첫 목표 만들기]      |
| Review  | 📊       | "기록이 없어요"       | [홈에서 시작하기]     |

**패턴**: "아직" = 기대감, CTA = 명확한 다음 행동

---

## 8. 파일 참조 맵

### 디자인 토큰

| 파일                        | 내용                                                                    |
| --------------------------- | ----------------------------------------------------------------------- |
| `src/styles/tokens.css`     | 모든 CSS 변수 (색상, 타이포, 간격, 그림자, z-index, chip, touch target) |
| `src/styles/glass.css`      | Glass Morphism 4+1단계 + dark mode + fallback                           |
| `src/styles/animations.css` | CSS keyframes (streak-pop, particle, confetti, shake)                   |
| `src/app/globals.css`       | 글로벌 스타일, safe area, scrollbar, 유틸리티                           |

### 상수

| 파일                              | 내용                                                   |
| --------------------------------- | ------------------------------------------------------ |
| `src/lib/constants/animations.ts` | Duration, easing, particle/confetti config, milestones |
| `src/lib/constants/time-slots.ts` | 5 Time Slots, HOUR_HEIGHT(56px), duration options      |

### UI Primitives

| 파일                                     | 컴포넌트                     |
| ---------------------------------------- | ---------------------------- |
| `src/components/ui/button.tsx`           | Button (6 variants, 4 sizes) |
| `src/components/ui/card.tsx`             | Card (7 variants, glass)     |
| `src/components/ui/responsive-modal.tsx` | ResponsiveModal (Radix/Vaul) |
| `src/components/ui/badge.tsx`            | Badge primitives             |
| `src/components/ui/chip.tsx`             | Chip (선택, 필터)            |
| `src/components/ui/progress.tsx`         | Progress bar                 |

### Common

| 파일                                           | 컴포넌트                  |
| ---------------------------------------------- | ------------------------- |
| `src/components/common/mascot.tsx`             | Mascot (8 moods, 5 sizes) |
| `src/components/common/progress-ring.tsx`      | ProgressRing (SVG)        |
| `src/components/common/delta-chip.tsx`         | DeltaChip (증감 표시)     |
| `src/components/common/badge/streak-badge.tsx` | StreakBadge               |

### Layout

| 파일                                          | 컴포넌트                                                         |
| --------------------------------------------- | ---------------------------------------------------------------- |
| `src/app/(main)/layout.tsx`                   | 메인 레이아웃 (TopBar + content + DateTaskPanel)                 |
| `src/components/layout/date-task-panel.tsx`   | 스마트 우측 패널 (Home→HomeDailyPanel / Roadmap→GoalBrowsePanel) |
| `src/components/layout/desktop-top-bar.tsx`   | 데스크톱 Top Bar + SegmentControl                                |
| `src/components/layout/mobile-bottom-nav.tsx` | 모바일 Bottom Tab Bar                                            |

### Feature: Home

| 파일                                                      | 컴포넌트                           |
| --------------------------------------------------------- | ---------------------------------- |
| `src/features/home/components/week-view.tsx`              | WeekViewGrid (24hr 캘린더)         |
| `src/features/home/components/week-day-column.tsx`        | Day column (절대 위치 task blocks) |
| `src/features/home/components/week-task-block.tsx`        | Task block (positionStyle)         |
| `src/features/home/components/current-time-indicator.tsx` | 빨간 현재 시간 선                  |
| `src/features/home/components/sortable-task-list.tsx`     | DnD task list                      |
| `src/features/home/components/compact-task-row.tsx`       | Task 한 줄 (체크인)                |
| `src/features/home/hooks/use-task-layout.ts`              | Task 위치 계산 + 겹침 해소         |

### Feature: Roadmap

| 파일                                                      | 컴포넌트                                     |
| --------------------------------------------------------- | -------------------------------------------- |
| `src/features/roadmap/components/visual-tree/`            | Visual Tree 전체 (canvas, nodes, connectors) |
| `src/features/roadmap/components/tree-node-card.tsx`      | 트리 노드 카드 (5 타입)                      |
| `src/features/roadmap/components/goal-accordion-item.tsx` | Goal 아코디언 (모바일/패널)                  |
| `src/features/roadmap/components/goal-browse-panel.tsx`   | 우측 패널 Goal 브라우저                      |

### Feature: Review

| 파일                                                         | 컴포넌트                 |
| ------------------------------------------------------------ | ------------------------ |
| `src/features/review/components/review-page-layout.tsx`      | Review 메인 레이아웃     |
| `src/features/review/components/compact-summary-card.tsx`    | 요약 카드 + ProgressRing |
| `src/features/review/components/daily-heatmap.tsx`           | 주간/월간 히트맵         |
| `src/features/review/components/area-list.tsx`               | Area 진행률 목록         |
| `src/features/review/components/journal/journal-heatmap.tsx` | 월간 캘린더 그리드       |
