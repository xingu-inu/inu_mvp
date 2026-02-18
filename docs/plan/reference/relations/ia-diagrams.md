# inu IA (Information Architecture) 다이어그램

> 서비스 전체 구조를 시각적으로 표현한 문서

---

## 1. 전체 앱 구조 (App Structure)

```mermaid
flowchart TB
    subgraph Entry["🚪 진입"]
        Landing["Landing Page"]
        Auth["Login / Signup"]
        Onboarding["Onboarding<br/>(Direction 설정)"]
    end

    subgraph MainApp["📱 메인 앱 (3탭)"]
        subgraph DoWhen["Do + When"]
            Today["🏠 홈<br/>(Day/Week/Month)"]
        end
        subgraph PlanWhat["Plan: What"]
            Roadmap["🗺 로드맵"]
        end
        subgraph CheckAct["Check + Act"]
            Review["📊 리뷰"]
        end
    end

    subgraph TopBar["🔝 상단 바"]
        Profile["👤 프로필"]
        Search["🔍 검색"]
        Inbox["📥 인박스"]
    end

    Landing --> Auth
    Auth -->|신규| Onboarding
    Auth -->|기존| Today
    Onboarding --> Today

    Today <--> Roadmap
    Today --> Review
    Roadmap --> Review

    Profile -.-> Today
    Search -.-> Today
    Inbox -.-> Today
```

---

## 2. 페이지 네비게이션 흐름

```mermaid
flowchart LR
    subgraph BottomNav["하단 탭 네비게이션"]
        direction LR
        T["🏠 홈<br/>(Day/Week/Month)"]
        R["🗺 로드맵"]
        V["📊 리뷰"]
    end

    T <--> R
    T --> V
    R --> V

    subgraph TopNav["상단 바"]
        P["👤 프로필"]
        S["🔍 검색"]
        I["📥 인박스"]
    end

    P -.->|AI 어드바이저| T
    I -.->|로드맵 연결| R
    S -.->|결과 이동| T
    S -.->|결과 이동| R
    S -.->|결과 이동| V
```

---

## 3. 데이터 계층 구조 (Life Roadmap)

```mermaid
flowchart TB
    Direction["🧭 Direction<br/>(인생 방향)"]

    Direction --> Area1["💪 건강"]
    Direction --> Area2["📈 커리어"]
    Direction --> Area3["💰 재정"]
    Direction --> Area4["❤️ 관계"]
    Direction --> Area5["🎨 취미"]

    Area1 --> Goal1["🎯 10km 달리기"]
    Area1 --> Goal2["🎯 수면 개선"]
    Area2 --> Goal3["🎯 영어 면접"]
    Area2 --> Goal4["🎯 사이드 프로젝트"]

    Goal1 --> Phase1["Phase 1: 기초 체력"]
    Goal1 --> Phase2["Phase 2: 5km"]
    Goal1 --> Phase3["Phase 3: 10km"]

    Phase1 --> Task1["✅ 매일 30분 러닝"]
    Phase1 --> Task2["✅ 스트레칭 15분"]

    Goal3 --> Task3["✅ 영어 뉴스 듣기"]
    Goal3 --> Task4["✅ 쉐도잉 10분"]

    style Direction fill:#e1f5fe
    style Area1 fill:#c8e6c9
    style Area2 fill:#bbdefb
    style Goal1 fill:#fff9c4
    style Goal3 fill:#fff9c4
    style Phase1 fill:#ffe0b2
    style Task1 fill:#f5f5f5
    style Task2 fill:#f5f5f5
    style Task3 fill:#f5f5f5
    style Task4 fill:#f5f5f5
```

---

## 4. Why Chain

```mermaid
flowchart BT
    Task["✅ 매일 30분 러닝<br/>💭 유산소가 체력을 올린다"]
    Phase["📍 Phase 1: 기초 체력<br/>💭 기초 체력이 있어야 달릴 수 있다"]
    Goal["🎯 10km 달리기<br/>💭 기초체력이 모든 활동의 기반"]
    Area["💪 건강<br/>💭 오래 건강하게 살고 싶다"]
    Direction["🧭 Direction<br/>건강하고 당당한 삶을 통해<br/>가족과 오래 행복하게"]

    Task -->|왜?| Phase
    Phase -->|왜?| Goal
    Goal -->|왜?| Area
    Area -->|왜?| Direction

    style Task fill:#f5f5f5
    style Phase fill:#ffe0b2
    style Goal fill:#fff9c4
    style Area fill:#c8e6c9
    style Direction fill:#e1f5fe
```

---

## 5. Home Day 뷰 기능 구조

```mermaid
flowchart TB
    subgraph HomePage["🏠 Home 페이지 (Day 뷰)"]
        Header["상단: 날짜 + 뷰 토글 [일|주|월]"]
        MiniCal["미니 월간 캘린더 (접기 가능)"]

        subgraph TimeGroups["시간대별 그룹"]
            Morning["🌅 아침 (5-7)"]
            AM["☀️ 오전 (7-12)"]
            PM["🌤️ 오후 (12-17)"]
            Evening["🌙 저녁 (17-21)"]
            Night["🌑 밤 (21-24)"]
            Free["🕐 언제든"]
        end

        subgraph TaskCard["체크인 카드"]
            TaskName["Task 이름 + 이모지"]
            AreaChip["Area 컬러칩 or 📌 일상"]
            Streak["🔥 스트릭"]
            Why["💭 Why (목표 연결 시만)"]
            Actions["[Done] [Skip]"]
        end

        DailySection["📌 일상 섹션 (goal 없는 Task)"]
        AICard["💡 AI 넛지 카드"]

        subgraph Reflection["데일리 회고"]
            Mood["기분 선택 😫😕😐🙂😄"]
            Note["한 줄 메모"]
        end

        QuickAdd["[＋] 퀵 추가"]
    end

    Header --> MiniCal
    MiniCal --> TimeGroups
    TimeGroups --> TaskCard
    TaskCard --> DailySection
    DailySection --> AICard
    Actions -->|모두 완료| Reflection
```

---

## 6. Roadmap 페이지 기능 구조

```mermaid
flowchart TB
    subgraph RoadmapPage["🗺 Roadmap 페이지"]
        subgraph Views["뷰 토글"]
            TreeView["🌳 트리 뷰"]
            CardView["🃏 카드 뷰"]
            BoardView["📋 보드 뷰<br/>(Phase 2)"]
        end

        subgraph Filters["필터"]
            Active["Active"]
            Backlog["Backlog"]
            All["전체"]
        end

        subgraph TreeContent["트리 콘텐츠"]
            AreaList["Area 리스트"]
            GoalList["Goal 리스트"]
            PhaseIndicator["Phase 인디케이터<br/>●━━○━━○"]
            TaskList["Task 리스트"]
        end

        subgraph GoalDetail["Goal 상세 페이지"]
            GoalInfo["Goal 정보"]
            WhyChain["Why Chain 표시"]
            PhaseList["Phase 리스트"]
            TasksInPhase["Phase별 Task"]
            Stats["진행률 통계"]
            AIHelp["AI와 목표 점검"]
        end
    end

    Views --> Filters
    Filters --> TreeContent
    GoalList -->|탭| GoalDetail
```

---

## 7. Home 페이지 뷰 모드 구조

```mermaid
flowchart TB
    subgraph HomePage["🏠 Home 페이지"]
        subgraph ViewModes["뷰 모드 토글"]
            DayView["📋 Day 뷰<br/>(기본)"]
            WeekView["📅 Week 뷰"]
            MonthView["📆 Month 뷰"]
        end

        subgraph DayContent["Day 뷰 콘텐츠"]
            MiniCal["미니 월간 캘린더<br/>(Area 컬러 dot)"]
            Progress["진행률 바"]
            TimeGroups["시간대별 Task 그룹"]
            DailyTasks["📌 일상 Task"]
            Reflection["데일리 회고"]
            QuickAdd["[＋] 퀵 추가"]
        end

        subgraph CalContent["Week/Month 뷰 콘텐츠"]
            Grid["캘린더 그리드"]
            ActionPanel["Action Panel<br/>(미배치 Task)"]
        end
    end

    ViewModes --> DayContent
    ViewModes --> CalContent
```

---

## 8. Review 페이지 기능 구조

```mermaid
flowchart TB
    subgraph ReviewPage["📊 Review 페이지"]
        subgraph Tabs["서브 탭"]
            Weekly["📋 주간"]
            Monthly["📅 월간"]
            Journal["📖 저널"]
            Growth["📈 성장"]
        end

        subgraph WeeklyContent["주간 리뷰"]
            WeekStats["달성률 + 지난주 비교"]
            StreakStatus["스트릭 현황"]
            AIInsight["AI 인사이트"]
            WeekReview["10-Step 회고"]
        end

        subgraph MonthlyContent["월간 리뷰 (Phase 2)"]
            TrendGraph["추이 그래프"]
            BalanceChart["영역 균형 레이더"]
            MoodTrend["기분 추이"]
            GoalRecheck["로드맵 재점검"]
            WhyCheck["Why 온도 체크"]
        end

        subgraph JournalContent["저널"]
            Timeline["여정 타임라인"]
            Filter["필터: 데일리/회고/자유/마일스톤"]
            NewRecord["새 기록 작성"]
        end

        subgraph GrowthContent["성장 (Phase 2)"]
            PhaseProgress["Phase 진행 시각화"]
            CycleView["사이클 뷰"]
            AchievedGoals["달성 목표 리스트"]
        end
    end

    Tabs --> WeeklyContent
    Tabs --> MonthlyContent
    Tabs --> JournalContent
    Tabs --> GrowthContent
```

---

## 9. 기능 ↔ 페이지 매핑

```mermaid
flowchart LR
    subgraph Features["🔧 기능"]
        F1["Life Roadmap"]
        F2["Why Chain"]
        F3["체크인 & 스트릭"]
        F4["AI 어드바이저"]
        F5["여정 기록"]
        F6["시간 관리"]
    end

    subgraph Pages["📱 페이지"]
        P1["Home<br/>(Day/Week/Month)"]
        P2["Roadmap"]
        P4["Review"]
        P5["Profile"]
    end

    F1 -->|전체 로드맵| P2
    F1 -->|Active Task| P1
    F1 -->|진행률| P4

    F2 -->|Why 한줄| P1
    F2 -->|Why Chain 전체| P2
    F2 -->|온도 체크| P4

    F3 -->|체크인 카드| P1
    F3 -->|스트릭 표시| P2
    F3 -->|통계| P4

    F4 -->|넛지 카드| P1
    F4 -->|인사이트| P4
    F4 -->|7개 액션| P5

    F5 -->|데일리 기록| P1
    F5 -->|타임라인| P4

    F6 -->|시간대 그룹| P1
    F6 -->|캘린더 배치| P1
```

---

## 10. PDCA 순환 구조

```mermaid
flowchart TB
    subgraph PDCA["PDCA 순환"]
        Plan["📝 Plan<br/>(계획)"]
        Do["⚡ Do<br/>(실행)"]
        Check["🔍 Check<br/>(확인)"]
        Act["🔄 Act<br/>(조정)"]
    end

    Plan -->|What: 로드맵| Do
    Plan -->|When: 캘린더| Do
    Do -->|체크인 데이터| Check
    Check -->|분석/회고| Act
    Act -->|Goal 조정| Plan

    subgraph Pages["페이지 매핑"]
        P1["🗺 로드맵<br/>Plan:What"]
        P3["🏠 홈<br/>Do + Plan:When"]
        P4["📊 리뷰<br/>Check+Act"]
    end

    Plan --- P1
    Plan --- P3
    Do --- P3
    Check --- P4
    Act --- P4

    style Plan fill:#bbdefb
    style Do fill:#c8e6c9
    style Check fill:#fff9c4
    style Act fill:#ffe0b2
```

---

## 11. 사용자 여정 (User Journey)

```mermaid
flowchart LR
    subgraph Onboard["온보딩"]
        A1["가입"]
        A2["가치 칩 선택"]
        A3["Direction 설정"]
    end

    subgraph Setup["로드맵 구축"]
        B1["Area 추가"]
        B2["Goal 설정"]
        B3["Phase 나누기"]
        B4["Task 추가"]
    end

    subgraph Daily["매일 루프"]
        C1["앱 열기"]
        C2["Task 체크인"]
        C3["기분 선택"]
        C4["AI 한마디"]
    end

    subgraph Weekly["주간 루프"]
        D1["주간 달성률 확인"]
        D2["AI 인사이트"]
        D3["주간 회고"]
    end

    subgraph Monthly["월간 루프"]
        E1["영역 균형 체크"]
        E2["Goal 재점검"]
        E3["Direction 확인"]
    end

    A1 --> A2 --> A3
    A3 --> B1 --> B2 --> B3 --> B4
    B4 --> C1 --> C2 --> C3 --> C4
    C4 -->|매일 반복| C1
    C4 -->|일요일| D1 --> D2 --> D3
    D3 -->|월말| E1 --> E2 --> E3
    E3 -->|다음 달| C1
```

---

## 12. Goal 상태 전이

```mermaid
stateDiagram-v2
    [*] --> Backlog: 생성
    Backlog --> Active: 시작하기
    Active --> Paused: 일시 정지
    Paused --> Active: 재개
    Active --> Completed: 달성!
    Completed --> Maintenance: 유지 모드
    Completed --> Archive: 아카이브
    Completed --> NextLevel: 다음 레벨
    NextLevel --> Active: 새 사이클
    Maintenance --> Active: 목표 변경

    note right of Active: Today 화면에<br/>Task 표시
    note right of Backlog: 로드맵에서만<br/>보임
    note right of Maintenance: 유지 Habit만<br/>표시
```

---

## 13. 체크인 상태 전이

```mermaid
stateDiagram-v2
    [*] --> Pending: 오늘 시작
    Pending --> Done: ✅ Done 탭
    Pending --> Skip: ⏭ Skip 탭
    Pending --> Miss: 자정 지남

    Done --> [*]: 스트릭 +1
    Skip --> [*]: 스트릭 유지
    Miss --> [*]: 새 라운드 시작

    note right of Done: 초록 배경<br/>파티클 효과
    note right of Skip: 회색 배경<br/>의도적 휴식
    note right of Miss: 연한 빨강<br/>누적은 유지
```

---

## 14. AI 어드바이저 기능 구조

```mermaid
flowchart TB
    subgraph AIAdvisor["🤖 AI 어드바이저"]
        subgraph Cards["7개 액션 카드"]
            C1["🎯 목표 분해"]
            C2["📊 페이스 점검"]
            C3["💭 Why 다시 생각"]
            C4["🔥 막힌 목표 돌파"]
            C5["📋 이번 주 요약"]
            C6["📖 여정 돌아보기"]
            C7["🔄 과거 경험 참고"]
        end

        Chat["💬 자세히 이야기하기"]

        subgraph Nudge["Today 넛지 카드"]
            N1["스트릭 축하"]
            N2["연속 Skip 알림"]
            N3["최적 시간대 제안"]
            N4["영역 불균형 알림"]
        end

        subgraph Insight["Review 인사이트"]
            I1["주간 분석"]
            I2["월간 트렌드"]
            I3["성장 리포트"]
        end
    end

    Cards --> Chat
    Nudge -.->|Today 화면| Cards
    Insight -.->|Review 화면| Cards
```

---

## 사용 방법

### VS Code에서 보기

1. "Markdown Preview Mermaid Support" 확장 설치
2. 이 파일을 열고 미리보기 (Ctrl+Shift+V)

### GitHub에서 보기

- GitHub는 Mermaid를 자동으로 렌더링합니다

### 온라인 에디터

- [Mermaid Live Editor](https://mermaid.live/)에서 각 코드 블록을 붙여넣기

### Excalidraw로 변환

1. [Mermaid to Excalidraw](https://mermaid-to-excalidraw.vercel.app/)
2. 각 다이어그램 코드를 붙여넣어 변환

---

> **관련 문서**
>
> - [페이지 간 연관성](page-matrix.md)
> - [기능 ↔ 페이지 매핑](feature-page-mapping.md)
