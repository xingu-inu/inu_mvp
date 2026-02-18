# 페이지 간 연관성 매트릭스

> 페이지 간 데이터 흐름과 연결 관계

---

## 1. 페이지 흐름도

```
                          ┌─────────┐
                          │ Landing │
                          └────┬────┘
                               │
                          ┌────▼────┐
                          │Onboarding│
                          └────┬────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
         ┌────▼────┐     ┌────▼────┐     ┌────▼────┐
         │ Roadmap │◄────│  Today  │────►│Calendar │
         │(Plan:What)│    │  (Do)   │     │(Plan:When)│
         └────┬────┘     └────┬────┘     └────┬────┘
              │                │                │
              └────────────────┼────────────────┘
                               │
                          ┌────▼────┐
                          │  Review │
                          │(Check+Act)│
                          └─────────┘
```

---

## 2. 연관성 매트릭스

| From ↓ / To →  | Landing  | Onboarding | Today     | Roadmap       | Calendar  | Review        | Profile     | Inbox     | Search |
| -------------- | -------- | ---------- | --------- | ------------- | --------- | ------------- | ----------- | --------- | ------ |
| **Landing**    | -        | 가입 후    | 로그인 후 | -             | -         | -             | -           | -         | -      |
| **Onboarding** | -        | -          | 완료 후   | -             | -         | -             | -           | -         | -      |
| **Today**      | -        | -          | -         | Goal 컨텍스트 | 시간 배치 | 체크인 데이터 | AI 코칭     | 빠른 캡처 | 검색   |
| **Roadmap**    | -        | -          | Task 확인 | -             | 시간 배치 | 진행률        | Goal 분해   | 연결      | 검색   |
| **Calendar**   | -        | -          | 체크인    | Task 원본     | -         | 시간 분석     | AI 제안     | -         | -      |
| **Review**     | -        | -          | 패턴 반영 | Goal 조정     | 시간 조정 | -             | AI 인사이트 | -         | 검색   |
| **Profile**    | 로그아웃 | -          | 넛지 설정 | 목표 제안     | 시간 제안 | 여정 분석     | -           | -         | -      |
| **Inbox**      | -        | -          | 일상 이동 | 로드맵 연결   | -         | -             | -           | -         | -      |
| **Search**     | -        | -          | 결과 이동 | 결과 이동     | -         | 결과 이동     | -           | 결과 이동 | -      |

---

## 3. 관계 유형

### 양방향 관계

| 페이지 A | 페이지 B | 설명                         |
| -------- | -------- | ---------------------------- |
| Today    | Calendar | 시간 배치 ↔ 체크인 표시      |
| Today    | Roadmap  | Task 체크인 ↔ Goal 컨텍스트  |
| Roadmap  | Calendar | Task 시간 설정 ↔ 캘린더 표시 |
| Roadmap  | Review   | Goal 상태 ↔ 진행률/재점검    |

### 단방향 관계

| From   | To          | 설명                      |
| ------ | ----------- | ------------------------- |
| Today  | Review      | 체크인 데이터 → 통계      |
| Today  | Profile     | AI 한마디 → AI 어드바이저 |
| Inbox  | Roadmap     | 연결 시 Task로 변환       |
| Inbox  | Today       | 일상 영역으로 이동        |
| Search | 모든 페이지 | 검색 결과 → 해당 상세     |

---

## 4. 데이터 흐름

```
Direction (Onboarding에서 생성)
     │
     └──► Area (Roadmap에서 관리)
              │
              └──► Goal (Roadmap에서 관리)
                       │
                       ├──► Phase (Roadmap에서 관리)
                       │         │
                       │         └──► Task ◄───────────────┐
                       │              │                     │
                       │              ├──► Today (체크인)    │
                       │              │         │           │
                       │              │         ├──► Mood   │
                       │              │         └──► Journal│
                       │              │                     │
                       │              └──► Calendar (시간 배치)
                       │
                       └──► Review (통계, 분석)
```

---

## 5. 핵심 페이지 연결

### Today (중심 허브)

Today는 앱의 메인 화면으로, 대부분의 페이지와 연결됩니다:

- **← Roadmap**: Active Goal의 Task를 가져옴
- **← Calendar**: 시간대별 Task 배치 정보
- **→ Review**: 체크인 데이터 전송
- **↔ Profile**: AI 넛지/코칭 주고받음
- **→ Inbox**: 빠른 캡처 진입점

### Roadmap (데이터 원본)

Roadmap은 앱의 데이터 구조를 정의하는 핵심 페이지:

- **→ Today**: Task 제공
- **→ Calendar**: Task 시간 배치 대상 제공
- **↔ Review**: 진행률 표시, Goal 상태 조정
- **← Inbox**: 인박스 아이템 연결

---

## 6. 공유 상태 (전역)

| 상태            | 영향 범위                        | 설명                          |
| --------------- | -------------------------------- | ----------------------------- |
| User Profile    | 모든 페이지                      | 로그인 사용자 정보, Direction |
| Roadmap Data    | Roadmap, Today, Calendar, Review | Area, Goal, Phase, Task 구조  |
| Today's Tasks   | Today, Calendar, Review          | 오늘 체크인 Task 목록         |
| Streaks         | Today, Roadmap, Review           | Task별 연속 완료 기록         |
| Records/Journal | Review, Search                   | 체크인, 회고, 저널 기록       |

---

> **관련 문서**
>
> - [기능 ↔ 페이지 매핑](feature-page-mapping.md)
> - [데이터 모델](../../foundation/03_data_model.md)
