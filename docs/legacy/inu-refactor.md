# Inu 리팩토링 실행 계획

> Inu를 3탭 앱(Home/Roadmap/Review)에서 2페이지(Roadmap + Timeline)로 전환하는 정리 작업.
> 모든 제거 대상은 삭제가 아니라 `src/_legacy/`로 이동. 각 Phase 끝에 빌드 확인.

---

## Phase 1 — 큰 덩어리 이동 ✅ 완료

독립적인 feature 폴더와 라우트를 통째로 옮긴다. 가장 안전하고 효과가 큼.

| 작업              | 출발                           | 도착                                      |
| ----------------- | ------------------------------ | ----------------------------------------- |
| Home 기능         | `src/features/home/`           | `src/_legacy/features/home/`              |
| Review 기능       | `src/features/review/`         | `src/_legacy/features/review/`            |
| Demo 기능         | `src/features/demo/`           | `src/_legacy/features/demo/`              |
| Onboarding 기능   | `src/features/onboarding/`     | `src/_legacy/features/onboarding/`        |
| Guide 기능        | `src/features/guide/`          | `src/_legacy/features/guide/`             |
| Home 라우트       | `src/app/(main)/home/`         | `src/_legacy/app-routes/home/`            |
| Review 라우트     | `src/app/(main)/review/`       | `src/_legacy/app-routes/review/`          |
| Calendar 라우트   | `src/app/(main)/calendar/`     | `src/_legacy/app-routes/calendar/`        |
| Search 라우트     | `src/app/(secondary)/search/`  | `src/_legacy/app-routes/search/`          |
| Onboarding 라우트 | `src/app/onboarding/`          | `src/_legacy/app-routes/onboarding/`      |
| Calendar API      | `src/app/api/google-calendar/` | `src/_legacy/api-routes/google-calendar/` |
| Demo lib          | `src/lib/demo/`                | `src/_legacy/lib/demo/`                   |

---

## Phase 2 — 스토어/액션/쿼리/레포지토리 이동 ✅ 완료

Home/Review/체크인/리플렉션 전용 파일들을 옮긴다.

### 스토어 (4개)

| 파일                             | 설명                      |
| -------------------------------- | ------------------------- |
| `src/stores/home.store.ts`       | Home 패널 모드, 선택 상태 |
| `src/stores/review.store.ts`     | Review 뷰 상태            |
| `src/stores/panel-date.store.ts` | 날짜 선택 패널            |
| `src/stores/onboarding.store.ts` | 온보딩 진행 상태          |

### 액션 (9개)

| 파일                                        | 설명          |
| ------------------------------------------- | ------------- |
| `src/actions/home.actions.ts`               | Home 대시보드 |
| `src/actions/checkin.actions.ts`            | 체크인 CRUD   |
| `src/actions/stats.actions.ts`              | 통계          |
| `src/actions/onboarding.actions.ts`         | 온보딩 플로우 |
| `src/actions/reflection.actions.ts`         | 일일 리플렉션 |
| `src/actions/weekly-reflection.actions.ts`  | 주간 리플렉션 |
| `src/actions/monthly-reflection.actions.ts` | 월간 리플렉션 |
| `src/actions/goal-reflection.actions.ts`    | 목표 리플렉션 |
| `src/actions/google-calendar.actions.ts`    | 캘린더 연동   |

### 쿼리 (6개)

| 파일                                            | 설명                 |
| ----------------------------------------------- | -------------------- |
| `src/queries/use-home.ts`                       | Home 대시보드 데이터 |
| `src/queries/use-checkin.ts`                    | 체크인 조회/생성     |
| `src/queries/use-reflection.ts`                 | 리플렉션 조회/생성   |
| `src/queries/use-google-calendar-events.ts`     | 캘린더 이벤트        |
| `src/queries/use-google-calendar-connection.ts` | 캘린더 연결 상태     |
| `src/queries/use-update-checkin-note.ts`        | 체크인 메모 수정     |

### 레포지토리 (5개)

| 파일                                                | 설명             |
| --------------------------------------------------- | ---------------- |
| `src/repositories/checkin.repository.ts`            | 체크인 DB        |
| `src/repositories/reflection.repository.ts`         | 일일 리플렉션 DB |
| `src/repositories/weekly-reflection.repository.ts`  | 주간 리플렉션 DB |
| `src/repositories/monthly-reflection.repository.ts` | 월간 리플렉션 DB |
| `src/repositories/goal-reflection.repository.ts`    | 목표 리플렉션 DB |

### barrel file 정리

각 index.ts에서 위 파일들의 export 제거:

- `src/stores/index.ts`
- `src/actions/index.ts`
- `src/queries/index.ts`
- `src/repositories/index.ts`

---

## Phase 3 — 크로스 의존성 해결 ✅ 완료

Phase 1-2에서 옮긴 파일을 import하던 곳들을 수정. **빌드 에러 0개 달성.**

### 계획된 8개 파일

| 파일                                              | 해결                                                |
| ------------------------------------------------- | --------------------------------------------------- |
| `src/features/roadmap/components/today-panel.tsx` | ✅ 파일 삭제                                        |
| `src/components/layout/date-task-panel.tsx`       | ✅ ReviewPanel 제거, 로드맵 전용으로 단순화         |
| `src/queries/use-tasks.ts`                        | ✅ Home 캐시 optimistic update 전면 제거 (~250줄)   |
| `src/lib/utils/task-utils.ts`                     | ✅ mapApiTaskToEntity/mapApiTasksToEntities 제거    |
| `src/lib/utils/home-cache-utils.ts`               | ✅ 통째로 legacy 이동                               |
| `src/lib/notifications.ts`                        | ✅ streak 알림 제거, Goal deadline + Announcement만 |
| `src/queries/use-notifications.ts`                | ✅ HomeTask 의존성 제거                             |
| `src/app/page.tsx`                                | ✅ `redirect('/roadmap')` 단순화                    |

### 추가 발견 + 처리 (10개 파일)

| 파일                                                                | 해결                                |
| ------------------------------------------------------------------- | ----------------------------------- |
| `src/lib/ai/chat-context.ts`                                        | ✅ reflectionRepository 제거        |
| `src/lib/ai/tools.ts`                                               | ✅ get_recent_reflections tool 제거 |
| `src/features/profile/components/google-calendar-connect.tsx`       | ✅ legacy 이동 (Phase 7에서 당김)   |
| `src/components/layout/profile/profile-main-view.tsx`               | ✅ GoogleCalendarConnect 제거       |
| `src/components/layout/top-bar-actions.tsx`                         | ✅ GuideModal 제거                  |
| `src/features/roadmap/components/roadmap-header.tsx`                | ✅ useDemoMode 제거                 |
| `src/features/roadmap/components/mobile-roadmap-fab.tsx`            | ✅ useDemoMode 제거                 |
| `src/features/roadmap/components/panel-modes/goal-browse-panel.tsx` | ✅ useDemoMode 제거                 |
| `src/features/roadmap/components/visual-tree/tree-context-menu.tsx` | ✅ useDemoMode 제거                 |
| `src/features/roadmap/components/visual-tree/tree-node.tsx`         | ✅ useDemoMode 제거                 |

---

## Phase 4 — 네비게이션을 2페이지로

3탭(Home/Roadmap/Review) 구조를 Roadmap + Timeline 2페이지로 바꾼다.

| 작업                                        | 설명                                                   |
| ------------------------------------------- | ------------------------------------------------------ |
| `src/components/layout/bottom-nav.tsx`      | Roadmap + Timeline 2개만 남기기                        |
| `src/components/layout/segment-control.tsx` | legacy로 이동                                          |
| `src/app/(main)/layout.tsx`                 | 2페이지 구조에 맞게 조정                               |
| `src/components/layout/desktop-top-bar.tsx` | Roadmap/Timeline 2개 네비만                            |
| `src/components/layout/top-bar-actions.tsx` | ~~Guide import 제거~~ ✅ Phase 3에서 완료              |
| `src/proxy.ts`                              | `/home`, `/calendar`, `/search` 제거, `/timeline` 추가 |
| Timeline 빈 라우트                          | `src/app/(main)/timeline/page.tsx` 생성 (빈 페이지)    |

---

## Phase 5 — 로드맵 내 정리

캔버스에서 Brainstorm/Why Walk/AI 모달을 제거한다. AI 기능은 채팅으로 통합.

### legacy로 이동

| 파일                                                               | 설명                       |
| ------------------------------------------------------------------ | -------------------------- |
| `src/features/roadmap/components/canvas/nodes/sticky-node.tsx`     | 스티키 노트 노드           |
| `src/stores/sticky-notes.store.ts`                                 | 스티키 노트 상태           |
| `src/features/roadmap/components/canvas/why-walk-overlay.tsx`      | Why Walk 오버레이          |
| `src/features/roadmap/components/brain-dump/`                      | 쏟아내기 모달 (폴더 전체)  |
| `src/features/roadmap/components/roadmap-diagnosis/`               | 건강 진단 모달 (폴더 전체) |
| `src/features/roadmap/components/canvas/use-ai-balance-overlay.ts` | 밸런스 오버레이 훅         |

### 코드 수정

| 파일                                                            | 수정 내용                                                           |
| --------------------------------------------------------------- | ------------------------------------------------------------------- |
| `src/features/roadmap/components/canvas/why-map-canvas.tsx`     | brainstorm 모드 로직 제거, why walk 로직 제거, balance overlay 제거 |
| `src/features/roadmap/components/canvas/use-canvas-keyboard.ts` | `B`(brainstorm), `W`(why walk), `A`(balance) 단축키 제거            |
| `src/features/roadmap/components/canvas/nodes/index.ts`         | sticky 노드 export 제거                                             |
| `src/features/roadmap/components/canvas/types.ts`               | StickyNodeData, WhyWalkState 등 타입 제거                           |
| 인라인 폼들                                                     | AI Suggest 버튼/훅 import 제거 (useAiSuggest 등)                    |

---

## Phase 6 — AI 타입/프롬프트 정리

채팅으로 통합되면서 불필요해진 AI 타입과 프롬프트를 정리한다.

| 파일                    | 수정 내용                                                                      |
| ----------------------- | ------------------------------------------------------------------------------ |
| `src/lib/ai/types.ts`   | PriorityRank, ReviewInsight, AreaAnalysis, BrainDump, Diagnosis 관련 타입 제거 |
| `src/lib/ai/prompts.ts` | 위 기능들의 프롬프트 템플릿 제거                                               |
| `src/lib/ai/types.ts`   | `AiGenerateRequest`/`AiGenerateResponse` union에서 제거된 타입 빼기            |

---

## Phase 7 — 엔티티 타입 + 문서 정리

| 파일                                                          | 수정 내용                                                                                                                                            |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/types/entities.ts`                                       | CheckIn, CheckInStatus, DailyReflection, MoodLevel, HomeDashboard, HomeTask, WeeklyReflection, MonthlyReflection, GoalReflection 등 미사용 타입 제거 |
| `CLAUDE.md`                                                   | 3탭→2페이지, Home/Review/CheckIn/Streak/Calendar 관련 제거, Inu.md 참조 추가                                                                         |
| `src/features/profile/components/google-calendar-connect.tsx` | ~~legacy로 이동~~ ✅ Phase 3에서 완료                                                                                                                |
| Profile 설정 UI                                               | ~~Google Calendar 연결 섹션 제거~~ ✅ Phase 3에서 완료                                                                                               |

---

## Phase 8 — 검증 ✅ 완료

```
npm run type-check   → 0 errors ✅
npm run lint         → 0 errors ✅
npm run build        → 성공 ✅
```

| 확인 항목           | 기대 결과                        | 결과                                              |
| ------------------- | -------------------------------- | ------------------------------------------------- |
| `/roadmap` 페이지   | 캔버스 정상 로드, 노드/엣지 표시 | ✅ 라우트 존재, proxy 보호 정상                   |
| `/timeline` 페이지  | 빈 페이지 정상 라우팅            | ✅ 라우트 존재, proxy 보호 정상                   |
| 로그인/로그아웃     | 정상 동작                        | ✅ 로그인 페이지 정상 렌더링                      |
| 2페이지 네비게이션  | Roadmap ↔ Timeline 전환          | ✅ 빌드 라우트 확인                               |
| 오른쪽 패널 AI 채팅 | 대화 가능                        | ✅ 빌드 포함 확인                                 |
| `src/_legacy/`      | 빌드에 포함되지 않음             | ✅ tsconfig exclude + eslint ignores + import 0건 |

---

## Phase 순서

```
Phase 1  큰 덩어리 이동 (feature, route)       ✅ 완료
  ↓
Phase 2  스토어/액션/쿼리/레포 이동             ✅ 완료
  ↓
Phase 3  크로스 의존성 해결 ← 빌드 에러 수정   ✅ 완료
  ↓
Phase 4  네비게이션 2페이지화       ┐
Phase 5  로드맵 내 정리              ├ 병렬 가능
  ↓                                  ┘
Phase 6  AI 타입/프롬프트            ┐
Phase 7  엔티티 타입 + 문서          ├ 병렬 가능
  ↓                                  ┘
Phase 8  검증                                  ✅ 완료
```

---

## 이후 작업 (이번 범위 밖)

| 작업                 | 설명                                                |
| -------------------- | --------------------------------------------------- |
| Timeline 페이지 구현 | GoalStatusHistory + 자유 저널 + AI 대화 로그 UI     |
| AI 채팅 강화         | 로드맵 컨텍스트 인식 + 대화에서 직접 로드맵 수정    |
| AI 대화형 온보딩     | 기존 step-by-step 대신 AI 채팅으로 초기 로드맵 설계 |
