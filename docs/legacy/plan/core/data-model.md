# 데이터 모델 — 5단계 구조

---

## Life Roadmap 5단계 구조

```
Direction (방향)
    ↓
Area (영역)
    ↓
Goal (목표)
    ↓
Group (그룹) — 선택적
    ↓
Task (실천)
```

---

## 레벨별 정의

| 레벨      | 이름          | 성격                                                      | Why                                       | 예시                                             |
| --------- | ------------- | --------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------ |
| Level -1  | **Direction** | 내 인생의 방향. Why Chain의 최종 종착점. 온보딩에서 설정. | — (그 자체가 Why의 근원)                  | "건강하고 당당한 삶을 통해 가족과 오래 행복하게" |
| Level 0   | **Area**      | 내 인생에서 중요한 영역                                   | "이 영역이 내 인생에서 왜 중요한가"       | 건강, 커리어, 재정, 관계, 취미                   |
| Level 1   | **Goal**      | 구체적으로 달성하고 싶은 것. Active 또는 Backlog.         | "이 목표를 왜 달성하고 싶은가"            | "10km 달리기", "영어 면접 가능"                  |
| Level 1.5 | **Group**     | Goal 안의 그룹핑 (선택적). 순차 없이 단순 분류.           | "이 그룹을 왜 나눴는가"                   | "기초 체력 만들기", "5km 안정화"                 |
| Level 2   | **Task**      | Group(또는 Goal)에 딸린 반복 행동. 데일리 체크인 대상.    | "이 행동을 왜 선택했는가 (왜 효과적인가)" | "매일 30분 러닝", "쉐도잉 10분"                  |

---

## 구조 예시

```
나의 인생 로드맵 (inu)
│
🧭 나의 방향 (Direction)
│  "나는 [건강하고 당당한] 삶을 통해 [가족과 오래 행복하게] 살고 싶다"
│
├── 💪 건강
│   ├── why: "오래 건강하게 살고 싶다"
│   │
│   ├── 🎯 10km 달리기 완주                     [Active]
│   │   ├── why: "기초체력이 모든 활동의 기반이다"
│   │   │
│   │   ├── 그룹 1: 기초 체력 만들기
│   │   │   ├── ✅ 매일 30분 러닝     🔥12
│   │   │   └── ✅ 주 2회 스트레칭    🔥5
│   │   │
│   │   ├── 그룹 2: 5km 안정화
│   │   └── 그룹 3: 10km 도전
│   │
│   └── 💤 마라톤 완주                          [Backlog]
│
├── 📈 커리어
│   └── ...
│
└── ❤️ 관계
    └── ...
```

---

## 엔티티 속성

### Direction

| 속성       | 타입     | 필수 | 설명           |
| ---------- | -------- | ---- | -------------- |
| id         | UUID     | Y    |                |
| user_id    | UUID     | Y    |                |
| text       | string   | Y    | Direction 문장 |
| created_at | datetime | Y    |                |
| updated_at | datetime | Y    |                |

### Area

| 속성       | 타입   | 필수 | 설명                                   |
| ---------- | ------ | ---- | -------------------------------------- |
| id         | UUID   | Y    |                                        |
| user_id    | UUID   | Y    |                                        |
| name       | string | Y    | 영역 이름                              |
| emoji      | string | N    | 이모지                                 |
| color      | string | Y    | 색상 코드                              |
| why        | string | N    | 이 영역이 왜 중요한가                  |
| sort_order | string | Y    | 정렬 순서 (Fractional Indexing용 TEXT) |

### Goal

| 속성     | 타입   | 필수 | 설명                                                          |
| -------- | ------ | ---- | ------------------------------------------------------------- |
| id       | UUID   | Y    |                                                               |
| area_id  | UUID   | Y    | 소속 Area                                                     |
| name     | string | Y    | 목표 이름                                                     |
| why      | string | N    | 이 목표를 왜 달성하고 싶은가                                  |
| status   | enum   | Y    | Backlog / Active / Completed / Maintenance / Paused / Archive |
| deadline | date   | N    | 기한                                                          |
| vision   | string | N    | 완료 비전 문장                                                |
| obstacle | string | N    | WOOP 장애물                                                   |
| if_then  | string | N    | WOOP if-then 계획                                             |

### Group

| 속성         | 타입     | 필수 | 설명                                   |
| ------------ | -------- | ---- | -------------------------------------- |
| id           | UUID     | Y    |                                        |
| goal_id      | UUID     | Y    | 소속 Goal                              |
| name         | string   | Y    | 그룹 이름                              |
| why          | string   | N    | 이 그룹을 왜 나눴는가                  |
| description  | string   | N    | 그룹 설명                              |
| is_completed | boolean  | Y    | 완료 여부 (기본 false)                 |
| sort_order   | string   | Y    | 정렬 순서 (Fractional Indexing용 TEXT) |
| completed_at | datetime | N    | 완료 시점                              |

### Task

| 속성             | 타입   | 필수 | 설명                                                        |
| ---------------- | ------ | ---- | ----------------------------------------------------------- |
| id               | UUID   | Y    |                                                             |
| group_id         | UUID   | N    | 소속 Group (없으면 Goal 직접 연결)                          |
| goal_id          | UUID   | Y    | 소속 Goal                                                   |
| name             | string | Y    | Task 이름                                                   |
| why              | string | N    | 이 행동이 왜 효과적인가                                     |
| repeat_type      | enum   | Y    | daily / weekdays / weekly / custom                          |
| repeat_days      | array  | N    | 요일 배열 (custom일 때)                                     |
| duration_minutes | int    | N    | 예상 소요 시간                                              |
| time_slot        | enum   | N    | morning / late_morning / afternoon / evening / night / free |
| specific_time    | time   | N    | 특정 시간                                                   |

### CheckIn

| 속성         | 타입     | 필수 | 설명               |
| ------------ | -------- | ---- | ------------------ |
| id           | UUID     | Y    |                    |
| task_id      | UUID     | Y    |                    |
| date         | date     | Y    | 체크인 날짜        |
| status       | enum     | Y    | done / skip / miss |
| completed_at | datetime | N    | 완료 시간          |

### DailyReflection

하루 전체에 대한 기분+한줄 회고 (일 1회)

| 속성       | 타입       | 필수 | 설명                                    |
| ---------- | ---------- | ---- | --------------------------------------- |
| id         | UUID       | Y    |                                         |
| user_id    | UUID       | Y    |                                         |
| date       | date       | Y    | 회고 날짜 (UNIQUE per user)             |
| mood       | mood_level | N    | terrible / bad / neutral / good / great |
| summary    | string     | N    | 한줄 요약                               |
| created_at | datetime   | Y    | 작성 시간                               |
| updated_at | datetime   | Y    | 수정 시간                               |

**mood_level enum 정의:**

```sql
CREATE TYPE mood_level AS ENUM ('terrible', 'bad', 'neutral', 'good', 'great');
```

**참고:** 특정 Task별 회고가 필요한 경우 CheckIn의 note 필드나 별도 TaskReflection 테이블 확장 검토.

---

## Goal 상태 (Status)

| 상태            | 의미                           | Today 화면                    | 예시                     |
| --------------- | ------------------------------ | ----------------------------- | ------------------------ |
| **Active**      | 지금 실제로 하고 있는 목표     | Task가 체크인 카드로 표시     | 체중 감량, 영어 공부     |
| **Backlog**     | 하고 싶지만 아직 시작 안 한 것 | 표시 안 됨 (Goals에서만 보임) | 마라톤 완주, AI 공부     |
| **Completed**   | 달성 완료                      | 표시 안 됨 (기록으로 남음)    | -                        |
| **Maintenance** | 달성 후 유지 모드              | 유지 Habit만 표시             | 10km 달성 후 주 3회 유지 |
| **Paused**      | 하다가 잠시 멈춤               | 표시 안 됨                    | 일이 바빠서 잠시 중단    |
| **Archive**     | 완료 후 아카이브 (기록만 보존) | 표시 안 됨                    | 달성 후 아카이브 처리    |

---

## 기본 제공 영역 (커스텀 가능)

| 기본 영역 | 이모지 | 설명                             |
| --------- | ------ | -------------------------------- |
| 건강      | 💪     | 운동, 식습관, 수면, 체중         |
| 커리어    | 📈     | 직장, 이직, 공부, 사이드프로젝트 |
| 재정      | 💰     | 저축, 투자, 소비 관리            |
| 관계      | ❤️     | 가족, 친구, 연인, 네트워킹       |
| 취미/성장 | 🎨     | 취미, 독서, 자기계발, 즐거움     |
| 마음/멘탈 | 🧘     | 명상, 감정관리, 번아웃 방지      |

---

> **관련 문서**
>
> - [철학 & 타겟 유저](philosophy.md)
> - [디자인 가이드](design-guide.md)
