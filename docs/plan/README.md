# inu (이누) - 기획서

> 내 인생의 로드맵을 그리고, 내 시간 안에서 목표와 실천을 관리하는 자기개발 서비스

---

## 문서 구조

```
docs/plan/
├── README.md              ← 지금 여기
│
├── core/                  # 핵심 정의
│   ├── philosophy.md      # 철학 + 타겟 유저
│   ├── data-model.md      # 5단계 구조
│   └── design-guide.md    # 디자인 원칙 + 컬러 + 타이포
│
├── screens/               # 화면별 (작업 단위) ⭐
│   ├── today/             # 오늘 (메인)
│   ├── roadmap/           # 로드맵
│   ├── calendar/          # 캘린더
│   ├── review/            # 리뷰
│   ├── inbox/             # 인박스
│   ├── search/            # 검색
│   ├── profile/           # 프로필
│   ├── ai-hub/            # AI 허브
│   ├── onboarding/        # 온보딩
│   └── landing/           # 랜딩/인증
│
├── components/            # 공유 UI 컴포넌트
│   ├── task-card.md       # Task 카드
│   ├── navigation.md      # 네비게이션
│   ├── empty-states.md    # 빈 상태 UX
│   └── common.md          # 기타 공통 UI
│
└── reference/             # 참조용
    ├── features/          # 기능 정의 원본
    ├── relations/         # IA, 매핑
    └── strategy/          # MVP, 가격 전략
```

---

## 핵심 컨셉 5가지

| 컨셉              | 설명                                              |
| ----------------- | ------------------------------------------------- |
| **Life Roadmap**  | Direction → Area → Goal → Phase → Task 5단계 구조 |
| **Why Chain**     | Direction 필수, 나머지 Why 선택                   |
| **원탭 체크인**   | Done/Skip 15초 완료, 새 라운드 철학               |
| **통합 홈**       | Day/Week/Month 뷰 + 일상 태스크 + 미니 캘린더     |
| **AI 어드바이저** | 규칙 기반 메시지 (즉시) + AI 대화 (Phase 2)       |

---

## 핵심 페이지 (3탭)

| 탭        | PDCA      | 역할                         | 문서                                 |
| --------- | --------- | ---------------------------- | ------------------------------------ |
| 🏠 홈     | Do + When | 체크인 + Day/Week/Month 일정 | [screens/today/](screens/today/)     |
| 🗺 로드맵 | Plan:What | 인생 로드맵                  | [screens/roadmap/](screens/roadmap/) |
| 📊 리뷰   | Check+Act | 회고 & 조정                  | [screens/review/](screens/review/)   |

---

## 역할별 시작점

| 역할       | 시작 문서                                       |
| ---------- | ----------------------------------------------- |
| 신규 팀원  | [core/philosophy.md](core/philosophy.md)        |
| 디자이너   | [core/design-guide.md](core/design-guide.md)    |
| 프론트엔드 | [screens/](screens/) 폴더                       |
| 백엔드     | [core/data-model.md](core/data-model.md)        |
| PM         | [reference/strategy/](reference/strategy/) 폴더 |

---

## 화면별 구성

각 화면 폴더에는:

- `spec.md` - 기획 (목적, 기능, 화면 구조)
- `wireframe.md` - 와이어프레임 (레이아웃, 인터랙션)

### 메인 네비게이션 (하단 3탭)

| 화면    | spec                               | wireframe                                    |
| ------- | ---------------------------------- | -------------------------------------------- |
| Home    | [spec.md](screens/today/spec.md)   | [wireframe.md](screens/today/wireframe.md)   |
| Roadmap | [spec.md](screens/roadmap/spec.md) | [wireframe.md](screens/roadmap/wireframe.md) |
| Review  | [spec.md](screens/review/spec.md)  | [wireframe.md](screens/review/wireframe.md)  |

> **Calendar**: Home에 통합됨 → [안내](screens/calendar/spec.md)

### 기타 화면 (상단 바 / 진입점)

| 화면       | spec                                  | wireframe                                       |
| ---------- | ------------------------------------- | ----------------------------------------------- |
| Inbox      | [spec.md](screens/inbox/spec.md)      | [wireframe.md](screens/inbox/wireframe.md)      |
| Search     | [spec.md](screens/search/spec.md)     | [wireframe.md](screens/search/wireframe.md)     |
| Profile    | [spec.md](screens/profile/spec.md)    | [wireframe.md](screens/profile/wireframe.md)    |
| AI Hub     | [spec.md](screens/ai-hub/spec.md)     | [wireframe.md](screens/ai-hub/wireframe.md)     |
| Onboarding | [spec.md](screens/onboarding/spec.md) | [wireframe.md](screens/onboarding/wireframe.md) |
| Landing    | [spec.md](screens/landing/spec.md)    | [wireframe.md](screens/landing/wireframe.md)    |

---

## MVP 핵심 루프

```
온보딩 → 로드맵 만들기 → 매일 체크인 (Day 뷰) → 스트릭 쌓기 → 진행률 보기 (Review)
```

---

## 수익 모델

| 티어 | 가격                     | 내용                       |
| ---- | ------------------------ | -------------------------- |
| Free | 무료                     | 핵심 루프 전부, AI 1일 3회 |
| Pro  | 월 3,900원 / 연 29,000원 | AI 무제한, 상세 분석       |

---

## 참조 문서

### 기능 정의

- [Life Roadmap](reference/features/life-roadmap.md)
- [Why Chain](reference/features/why-chain.md)
- [체크인 & 스트릭](reference/features/checkin-streak.md)
- [AI 어드바이저](reference/features/ai-advisor.md)
- [여정 기록](reference/features/journey-log.md)
- [Goal 생명주기](reference/features/goal-lifecycle.md)
- [시간 관리](reference/features/time-management.md)
- [인박스 & 일상](reference/features/daily-life.md)
- [인생 재정비](reference/features/life-reset.md)

### 전략

- [MVP 범위](reference/strategy/mvp-scope.md)
- [수익 모델](reference/strategy/pricing.md)
- [경쟁 분석](reference/strategy/competition.md)

### 관계/매핑

- [페이지 매트릭스](reference/relations/page-matrix.md)
- [기능-페이지 매핑](reference/relations/feature-page-mapping.md)
- [IA 다이어그램](reference/relations/ia-diagrams.md)

---

## 버전

| 버전 | 날짜       | 변경                                                |
| ---- | ---------- | --------------------------------------------------- |
| 3.0  | 2026-02-03 | 작업 단위 중심 구조로 재구성 (screens/ + wireframe) |
| 2.0  | 2026-02-03 | 페이지별/기능별 구조로 전면 재구성                  |
| 1.0  | 2025-xx-xx | 초기 역할별 문서                                    |
