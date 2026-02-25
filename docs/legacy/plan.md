# inu (이누) - 서비스 기획서

> 내 인생의 로드맵을 그리고, 내 시간 안에서 목표와 실천을 관리하는 자기개발 서비스

---

## 문서 구조 v2.0

기획서가 **페이지별 + 기능별**로 재구성되었습니다.
특정 화면/기능 작업 시 해당 문서만 참조하면 됩니다.

**시작점**: 👉 [plan/README.md](plan/README.md)

---

## 폴더 구조

```
docs/plan/
├── README.md              # 전체 안내 (목차)
│
├── foundation/            # 기반 문서 (4개)
│   ├── 00_philosophy.md   # 철학, 핵심 가치
│   ├── 01_target_user.md  # 타겟 유저
│   ├── 02_design_principles.md  # UI/UX 원칙
│   └── 03_data_model.md   # 5단계 구조
│
├── pages/                 # 페이지별 문서 (9개)
│   ├── today.md           # 오늘 (메인) ⭐
│   ├── roadmap.md         # 로드맵
│   ├── calendar.md        # 캘린더
│   ├── review.md          # 리뷰
│   ├── profile.md         # 프로필
│   ├── inbox.md           # 인박스
│   ├── search.md          # 검색
│   ├── onboarding.md      # 온보딩
│   └── landing-auth.md    # 랜딩/인증
│
├── features/              # 공통 기능 문서 (9개)
│   ├── life-roadmap.md    # Life Roadmap
│   ├── why-chain.md       # Why Chain
│   ├── checkin-streak.md  # 체크인 & 스트릭
│   ├── ai-advisor.md      # AI 어드바이저
│   ├── journey-log.md     # 여정 기록
│   ├── goal-lifecycle.md  # Goal 생명주기
│   ├── time-management.md # 시간 관리
│   ├── daily-life.md      # 인박스 & 일상
│   └── life-reset.md      # 인생 재정비
│
├── shared/                # 공유 컴포넌트 (3개)
│   ├── components.md      # 공통 UI
│   ├── navigation.md      # 네비게이션
│   └── empty-states.md    # 빈 상태 UX
│
├── relations/             # 연관성 문서 (3개)
│   ├── page-matrix.md     # 페이지 간 연관성
│   ├── feature-page-mapping.md  # 기능 ↔ 페이지 매핑
│   └── ia-diagrams.md     # IA 다이어그램
│
├── strategy/              # 전략 문서 (3개)
    ├── mvp-scope.md       # MVP 범위
    ├── pricing.md         # 수익 모델
    └── competition.md     # 경쟁 분석
```

---

## 핵심 컨셉 5가지

| 컨셉              | 설명                                                 |
| ----------------- | ---------------------------------------------------- |
| **Life Roadmap**  | Direction → Area → Goal → Phase → Task 5단계 구조    |
| **Why Chain**     | Direction 필수, 나머지 Why 선택                      |
| **원탭 체크인**   | Done/Skip 15초 완료, 새 라운드 철학                  |
| **캘린더 통합**   | 시간대별 배치 + Google Calendar                      |
| **AI 어드바이저** | 규칙 기반 메시지 (즉시) + AI 대화 (Phase 2, 요청 시) |

---

## 핵심 페이지 (4탭 = PDCA)

| 탭        | PDCA      | 역할         | 문서                                        |
| --------- | --------- | ------------ | ------------------------------------------- |
| 🏠 오늘   | Do        | 메인, 체크인 | [pages/today.md](plan/pages/today.md)       |
| 🗺 로드맵 | Plan:What | 인생 로드맵  | [pages/roadmap.md](plan/pages/roadmap.md)   |
| 📅 캘린더 | Plan:When | 시간 배치    | [pages/calendar.md](plan/pages/calendar.md) |
| 📊 리뷰   | Check+Act | 회고 & 조정  | [pages/review.md](plan/pages/review.md)     |

---

## 페이지별 기능 리스트

### Today (오늘) - 핵심 페이지

- 시간대별 그룹핑 (아침/오전/오후/저녁/밤/자유)
- 체크인 카드 (Task명, Area, Phase, Why, 스트릭)
- Done/Skip 원탭 (15초 체크인)
- 기분 선택 (5단계 이모지)
- 규칙 기반 메시지 (체크인 완료, 스트릭 등)
- Google Calendar 표시

### Roadmap (로드맵)

- 트리 뷰 (기본) - 위→아래 계층 구조
- 카드 뷰 - Area별 그리드
- Active/Backlog 필터
- Phase 인디케이터 (●━━○━━○)
- Goal 상세 (Why Chain, Phase, Task)
- 맵 뷰 - 좌→우 전체 구조 (Phase 2)
- 보드(칸반) 뷰 (Phase 2)

### Calendar (캘린더)

- 주간 뷰 (7일 x 시간축)
- 월간 뷰 (컬러 모자이크)
- Action Panel (기본 리스트)
- Action Panel 3티어 (Phase 2)
- 드래그 배치 (Phase 2)
- Google Calendar 연동 (Phase 2)

### Review (리뷰)

- 주간: 달성률, 스트릭 현황
- 주간 AI 인사이트 (Phase 2)
- 월간: 추이 그래프, 영역 균형 레이더 (Phase 2)
- 저널: 여정 타임라인 (6종: 데일리/마일스톤/회고/전환/자유/시스템)
- 성장: Phase 진행, 달성 목표 리스트 (Phase 2)

---

## 페이지 간 연관성

```
              Today ←──→ Calendar (시간 배치)
                ↑           ↑
                │           │
                └─── Roadmap ─┘ (Task/Goal 원본)
                       ↓
                    Review (통계, 조정)
```

---

## MVP 핵심 루프

```
온보딩 → 로드맵 만들기 → 매일 체크인 → 스트릭 쌓기 → 진행률 보기
```

---

## 수익 모델

| 티어 | 가격                     | 내용                         |
| ---- | ------------------------ | ---------------------------- |
| Free | 무료                     | 핵심 루프 전부, AI 1일 3회   |
| Pro  | 월 3,900원 / 연 29,000원 | AI 무제한, 상세 분석, 히트맵 |

---

## 역할별 시작점

| 역할       | 시작 문서                                                                          |
| ---------- | ---------------------------------------------------------------------------------- |
| 신규 팀원  | [plan/foundation/00_philosophy.md](plan/foundation/00_philosophy.md)               |
| 디자이너   | [plan/foundation/02_design_principles.md](plan/foundation/02_design_principles.md) |
| 프론트엔드 | [plan/pages/](plan/pages/)                                                         |
| 백엔드     | [plan/foundation/03_data_model.md](plan/foundation/03_data_model.md)               |
| PM         | [plan/strategy/](plan/strategy/)                                                   |
