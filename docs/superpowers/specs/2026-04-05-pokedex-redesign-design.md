# Pokedex 전면 개편 — 도감 스타일 레이아웃

> 기록 탭 좌측 패널(나에 대한 데이터)을 포켓몬GO 도감 스타일로 전면 개편

## Context

현재 기록 탭 좌측 패널은 6개 카테고리(identity, stats, interests, description, habits, general)별로 분리된 존 컴포넌트가 거의 복붙 수준으로 중복되어 있다. 사용자가 원하는 것은:

1. 포켓몬GO 도감처럼 **아바타(좌) + 정보 테이블(우)** 히어로 블록
2. 위쪽: 유저가 직접 추가하는 **간단한 key-value 정보** (MBTI, 직업, 혈액형 등)
3. 아래쪽: AI가 채팅 중 자동으로 축적하는 **인사이트 카드** (제목 + 설명)
4. 유저 데이터와 AI 인사이트를 별도 테이블로 분리

---

## 레이아웃

### 데스크톱 (기존 ProfilePanel 위치)

```
┌─ 왼쪽 패널 ──────────────────────────────────┐
│                                               │
│  ┌────────┬───────────────────────────┐       │
│  │        │ 닉네임              #007  │       │
│  │ [아바타]├───────────┬─────────────┤       │
│  │  80x80  │ MBTI      │ INTJ       │       │
│  │ 클릭→   │ 직업      │ 개발자      │       │
│  │ 픽커    │ 혈액형    │ A          │       │
│  │        │ 나이      │ 29         │       │
│  │        │      [+ 항목 추가]      │       │
│  └────────┴───────────────────────────┘       │
│                                               │
│  ── AI 인사이트 ──────────────────────        │
│                                               │
│  ┌───────────────────────────────────┐        │
│  │ 몰입형 사고자                      │        │
│  │ 하나에 깊이 파고드는 성향.    [편집]│        │
│  └───────────────────────────────────┘        │
│  ┌───────────────────────────────────┐        │
│  │ 성장 지향적                        │        │
│  │ 현재에 안주하지 않고          [편집]│        │
│  │ 끊임없이 발전하려는 패턴           │        │
│  └───────────────────────────────────┘        │
│  ┌───────────────────────────────────┐        │
│  │ 아직 분석이 부족해요               │        │
│  │ 대화를 더 나누면 인사이트가         │        │
│  │ 추가돼요                           │        │
│  └───────────────────────────────────┘        │
│                                               │
└───────────────────────────────────────────────┘
```

### 모바일

기존과 동일하게 접히는 구조 유지. 펼치면 위 레이아웃 표시.

---

## 데이터 소유권

|            | 위쪽 정보 테이블 (profile_traits)     | 아래 AI 인사이트 (ai_insights) |
| ---------- | ------------------------------------- | ------------------------------ |
| **생성**   | 유저 직접 추가 or AI 제안 → 유저 수락 | AI가 채팅 중 자동 생성         |
| **편집**   | 유저 자유롭게                         | 유저도 편집 가능               |
| **삭제**   | 유저 자유롭게                         | 유저가 삭제 가능               |
| **형태**   | key-value (MBTI: INTJ)                | 제목 + 설명 문단               |
| **주도권** | 유저                                  | AI                             |

### 정보 테이블 입력 경로

1. **유저 직접 추가**: `[+ 항목 추가]` → 프리셋 칩에서 선택 (MBTI 16종, 혈액형 등) or 자유 입력
2. **AI 제안**: 채팅 중 AI가 파악 → `suggest_profile_traits` 도구로 제안 카드 표시 → 유저 수락 시 자동 추가

### AI 인사이트 생성

- AI가 채팅 대화 중 유저의 성향/패턴을 파악하면 자동으로 `ai_insights` 테이블에 저장
- 새 AI 도구 `save_ai_insight` 추가 (title + description)
- 유저에게 별도 확인 없이 자동 축적
- 유저는 도감에서 편집/삭제 가능

---

## DB 스키마

### 기존 테이블 변경

```sql
-- 프로필에 아바타 프리셋 컬럼 추가
ALTER TABLE profiles
  ADD COLUMN avatar_preset text;  -- 'char_01', 'char_02' 등
```

`profile_traits` 테이블은 그대로 유지. `category` 컬럼 존속 (AI 도구 호환성 유지), UI에서만 무시.

### 신규 테이블

```sql
CREATE TABLE ai_insights (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,        -- "몰입형 사고자"
  description text NOT NULL,        -- "하나에 깊이 파고드는..."
  sort_order  text NOT NULL,        -- fractional-indexing
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own insights"
  ON ai_insights FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_ai_insights_user
  ON ai_insights(user_id);
```

---

## 컴포넌트 구조

### 삭제 대상 (8개)

- `pokedex-hero.tsx`
- `pokedex-stat-bars.tsx`
- `pokedex-interests.tsx`
- `pokedex-description.tsx`
- `pokedex-habits.tsx`
- `pokedex-info-list.tsx`
- `pokedex-radar-chart.tsx`
- `pokedex-empty-slots.tsx`

### 신규/재작성 컴포넌트

```
character-entry-panel.tsx (오케스트레이터 — 재작성)
├── pokedex-header.tsx (NEW)
│   ├── 아바타 (80x80, 클릭 → 픽커)
│   ├── 닉네임 + 도감번호
│   └── 정보 테이블 (profile_traits key-value 행)
│       └── pokedex-avatar-picker.tsx (NEW — 프리셋 캐릭터 팝오버)
├── pokedex-trait-list.tsx (NEW — 플랫 key-value 리스트)
│   ├── pokedex-trait-row.tsx (NEW — 개별 행, hover 편집/삭제)
│   └── pokedex-add-trait.tsx (간소화 — 카테고리 선택 단계 제거)
├── pokedex-trait-history.tsx (유지)
└── pokedex-ai-insights.tsx (NEW — AI 인사이트 섹션)
    └── pokedex-ai-insight-card.tsx (NEW — 제목+설명, 인라인 편집)
```

### 유지되는 컴포넌트

- `pokedex-trait-history.tsx` — 변경 이력 표시 (그대로)
- `trait-presets.ts` — 플랫 배열로 구조 변경 (`Record<TraitCategory, ...>` → `TraitPreset[]`)

---

## 데이터 레이어

### 신규 타입 (entities.ts)

```typescript
export interface AiInsight extends BaseEntity {
  user_id: string
  title: string // "몰입형 사고자"
  description: string // "하나에 깊이 파고드는 성향..."
  sort_order: string // fractional-indexing
}
```

### 신규 파일

| 파일                                        | 패턴 참고                     |
| ------------------------------------------- | ----------------------------- |
| `src/repositories/ai-insight.repository.ts` | `profile-trait.repository.ts` |
| `src/actions/ai-insight.actions.ts`         | `profile-trait.actions.ts`    |
| `src/queries/use-ai-insights.ts`            | `use-profile-traits.ts`       |
| `src/validations/ai-insight.ts`             | 기존 validation 패턴          |

모든 mutation에 optimistic update 적용.

### AI 도구 추가

`save_ai_insight` 도구를 AI 시스템에 추가:

- parameters: `{ title: string, description: string }`
- 채팅 중 AI가 유저 성향/패턴을 파악하면 자동 호출
- 기존 `suggest_profile_traits` 도구는 유지 (위쪽 테이블 제안용)

---

## 아바타 시스템

- 미리 준비된 캐릭터 세트 (static assets, `/public/avatars/`)
- `profiles.avatar_preset` 컬럼에 선택한 캐릭터 ID 저장
- `pokedex-avatar-picker.tsx`: Radix Popover로 캐릭터 그리드 표시
- 초기에는 5~10종 정도로 시작, 나중에 확장 가능

---

## 프리셋 구조 변경

기존 (`Record<TraitCategory, TraitPreset[]>`):

```typescript
{ identity: [{ label: 'MBTI', values: [...] }], stats: [...], ... }
```

변경 (`TraitPreset[]`):

```typescript
[
  { label: 'MBTI', values: ['INTJ', 'INTP', ...] },
  { label: '혈액형', values: ['A', 'B', 'O', 'AB'] },
  { label: '에니어그램' },
  { label: '직업' },
  { label: '나이' },
  { label: '취미' },
  ...
]
```

카테고리 구분 없이 플랫 리스트. 추가 시 프리셋 칩으로 빠르게 선택 가능.

---

## Verification

1. `npm run lint` + `npm run type-check` 통과
2. 기존 profile_traits CRUD 정상 동작 확인
3. 새 ai_insights CRUD 동작 확인
4. 아바타 선택 → 저장 → 새로고침 후 유지 확인
5. 모바일 레이아웃 접기/펼치기 확인
6. AI 채팅에서 `suggest_profile_traits` 기존 플로우 깨지지 않음 확인
