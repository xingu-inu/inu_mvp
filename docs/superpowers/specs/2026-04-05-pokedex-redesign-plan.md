# Pokedex 전면 개편 — 실행 계획

> Design spec: `docs/superpowers/specs/2026-04-05-pokedex-redesign-design.md`

---

## Phase 1 — AiInsight 데이터 레이어

AiInsight 엔티티 전체 데이터 스택 구축 (profile_traits 패턴 복제).

**타입 추가** (`src/types/entities.ts`):

- `AiInsight` 인터페이스 추가 (BaseEntity 확장, user_id, title, description, sort_order)
- `CreateAiInsightInput`, `UpdateAiInsightInput` 타입 추가

**Validation** (`src/lib/validations/index.ts`):

- `createAiInsightSchema` (title: 1-100자, description: 1-2000자)
- `updateAiInsightSchema` (title, description 둘 다 optional)

**Query Keys** (`src/lib/query/keys.ts`):

- `aiInsights: { all: ['ai-insights'] as const }` 추가

**Stale Times** (`src/lib/query/stale-times.ts`):

- `AI_INSIGHTS` 추가 (PROFILE_TRAITS와 동일한 10분)

**Repository** (`src/repositories/ai-insight.repository.ts`):

- `profile-trait.repository.ts` 패턴 복제
- getByUser, create, update, delete, reorder
- history 불필요 (profile_traits와 다름)

**Repository Index** (`src/repositories/index.ts`):

- `aiInsightRepository` export 추가

**Actions** (`src/actions/ai-insight.actions.ts`):

- `profile-trait.actions.ts` 패턴 복제
- getAiInsights, createAiInsight, updateAiInsight, deleteAiInsight
- MAX_AI_INSIGHTS = 50

**Actions Index** (`src/actions/index.ts`):

- ai-insight actions export 추가

**Queries** (`src/queries/use-ai-insights.ts`):

- `use-profile-traits.ts` 패턴 복제
- useAiInsights, useCreateAiInsight, useUpdateAiInsight, useDeleteAiInsight
- 모든 mutation에 optimistic update
- onSettled에서 timeline도 invalidate

---

## Phase 2 — save_ai_insight AI 도구 + 프리셋 플랫화

**AI 도구** (`src/lib/ai/tools.ts`):

- `save_ai_insight` 도구 추가 (suggest_profile_traits 패턴 참고)
- parameters: `{ title: string, description: string }`
- execute: `aiInsightRepository.create(supabase, userId, { title, description })`
- import 필요: `aiInsightRepository`, `generateKeyBetween`

**프리셋 플랫화** (`src/features/record/components/pokedex/trait-presets.ts`):

- `TRAIT_PRESETS`를 `Record<TraitCategory, TraitPreset[]>` → `TraitPreset[]` 플랫 배열로 변경
- 기존: `{ identity: [...], stats: [...], ... }`
- 변경: `[{ label: 'MBTI', values: [...] }, { label: '혈액형', values: [...] }, ...]`
- 카테고리별 프리셋을 하나의 배열로 합침
- 추가 프리셋: 혈액형 (A, B, O, AB), 직업, 나이, 취미

**프리셋 소비자 업데이트**:

- `pokedex-add-trait.tsx`에서 `TRAIT_PRESETS[selectedCategory.category]` → `TRAIT_PRESETS` 직접 사용
- 다른 소비자가 있다면 동일하게 업데이트

---

## Phase 3 — pokedex-add-trait 간소화 (카테고리 단계 제거)

`src/features/record/components/pokedex/pokedex-add-trait.tsx` 전면 재작성:

- 2단계(picking → filling) → 1단계로 간소화
- 카테고리 선택 그리드 제거
- 프리셋 칩을 바로 표시 (플랫 TRAIT_PRESETS에서)
- category는 UI에서 감추되, 기존 호환성 위해 'general'로 기본 설정
- 칩 클릭 → label 자동 채움 + value 프리셋이 있으면 value 칩도 표시
- Props: `onClose`, `initialLabel?` (initialCategory 제거)

---

## Phase 4 — 새 컴포넌트: pokedex-header + pokedex-avatar-picker

**pokedex-header.tsx** (NEW):

- 디자인 스펙의 히어로 블록
- 좌: 아바타 (80x80, 클릭 → picker popover)
- 우: 닉네임 + 도감번호 (#007 스타일)
- 아바타 아래 또는 옆: 완성도 게이지 (기존 PokedexHero의 게이지 이관)
- identity 타입 배지는 제거 (trait-list로 통합)
- Props: `traitCount: number, nickname: string | null, avatarPreset: string | null, onAvatarChange: (preset: string) => void`

**pokedex-avatar-picker.tsx** (NEW):

- Radix Popover 기반
- 5~10종 프리셋 캐릭터 그리드 (아직 에셋 없으므로 이모지 또는 placeholder div로 시작)
- 선택 시 `onSelect(presetId)` 콜백
- `profiles.avatar_preset` 저장은 기존 `updateProfile` action 활용

---

## Phase 5 — 새 컴포넌트: pokedex-trait-list + pokedex-trait-row

**pokedex-trait-list.tsx** (NEW):

- 플랫 key-value 리스트 (카테고리 구분 없이 전체 traits 표시)
- Props: `traits: ProfileTrait[], onEditTrait, onDeleteTrait, editingId: string | null`
- 각 trait을 `pokedex-trait-row`로 렌더링
- 편집 중인 trait은 InlineEditForm 표시

**pokedex-trait-row.tsx** (NEW):

- 개별 trait 행
- label (w-20) + value (flex-1) + 상대 시간 (optional)
- hover 시 Pencil + Trash2 아이콘 표시
- 교대 배경색 (odd 행 bg-tertiary)
- Framer Motion opacity+x 애니메이션
- PokedexTraitHistory 표시 (history 있을 때)

---

## Phase 6 — 새 컴포넌트: pokedex-ai-insights + pokedex-ai-insight-card

**pokedex-ai-insights.tsx** (NEW):

- "AI 인사이트" 섹션 헤더 + 카드 리스트
- `useAiInsights()` 훅 사용
- 빈 상태: "아직 분석이 부족해요. 대화를 더 나누면 인사이트가 추가돼요" 메시지
- CRUD: 인라인 편집, 삭제
- Props: 없음 (자체적으로 데이터 fetch)

**pokedex-ai-insight-card.tsx** (NEW):

- 개별 인사이트 카드
- title (볼드) + description
- hover 시 Pencil + Trash2
- 인라인 편집 모드: title + description textarea
- Framer Motion opacity+x 애니메이션

---

## Phase 7 — 구 컴포넌트 삭제 + character-entry-panel 재작성

**삭제 대상** (8개):

- `pokedex-hero.tsx`
- `pokedex-stat-bars.tsx`
- `pokedex-interests.tsx`
- `pokedex-description.tsx`
- `pokedex-habits.tsx`
- `pokedex-info-list.tsx`
- `pokedex-radar-chart.tsx`
- `pokedex-empty-slots.tsx`

**character-entry-panel.tsx 재작성**:

- 새 구조:
  ```
  PokedexHeader (아바타 + 닉네임 + 도감번호 + 게이지)
  PokedexTraitList (전체 traits 플랫 리스트)
  PokedexTraitHistory (유지)
  PokedexAiInsights (AI 인사이트 섹션)
  PokedexAddTrait (항목 추가 버튼/폼)
  ```
- 카테고리별 grouped 로직 제거 (플랫 리스트)
- renderEditableZone 제거 → PokedexTraitList가 편집 핸들링
- InlineEditForm에서 카테고리 선택 UI 제거 (category는 'general' 기본)

**index.ts 업데이트**:

- 삭제된 컴포넌트 export 제거
- 새 컴포넌트 export 추가 (필요 시)

---

## Phase 8 — DB 마이그레이션 SQL

Supabase 마이그레이션 파일 생성:

**`supabase/migrations/20260405_ai_insights.sql`**:

```sql
-- profiles에 avatar_preset 컬럼 추가
ALTER TABLE profiles ADD COLUMN avatar_preset text;

-- ai_insights 테이블 생성
CREATE TABLE ai_insights (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text NOT NULL,
  sort_order  text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own insights"
  ON ai_insights FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_ai_insights_user ON ai_insights(user_id);
```

이후 `npm run db:types` 실행하여 타입 재생성.
