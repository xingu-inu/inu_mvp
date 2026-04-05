# inu

Self-development app. Direction → Area → Goal → Group → Task (5-level structure).
Core loop: Roadmap (Why Map) → 기록

2-page structure: Roadmap (`/roadmap`, Why Map 캔버스) · 기록 (`/record`, 자유 프로필 + 타임라인)

## Tech Stack

- Next.js 16.1 (App Router, RSC), React 19.2, TypeScript 5.9
- Tailwind CSS 4.0, Radix UI, Framer Motion, Lucide React
- TanStack Query v5 (server), Zustand (client), nuqs (URL)
- react-hook-form + Zod
- Supabase (PostgreSQL, Auth, Edge Functions)
- Vitest, Playwright, @testing-library/react

## Commands

npm run dev / build / lint / lint:fix / format / type-check / test / test:e2e / db:types

## Rules

- TypeScript strict: no `any`, explicit types
- UI primitives → `components/ui/`, domain components → `components/common/`
- Supabase queries: must handle loading/error states
- Next.js 16+: route protection uses `src/proxy.ts` (not middleware.ts)
- "No guilt" philosophy: no guilt/blame in user-facing messages, growth mindset only
- Mutations must always use Optimistic Update: update all related caches (`tasks.all`, `goals.all`, etc.) immediately in `onMutate`. UI must update before server response
- sort_order: use `fractional-indexing` library format (no numeric strings)
- Commits: `type(scope): description`
- After completing work: run `npm run lint` + `npm run type-check`
- When 4+ TODOs exist: parallelize independent tasks using Task tool (sub-agents). Run independent file edits, searches, and research concurrently. Split into sub-agents when context is likely to grow large, keeping the main context lightweight
- For major overhauls / large-scale refactors: always use WebSearch to research the latest official docs, best practices, and community patterns for the relevant technology before starting work. Don't rely on existing code inertia — reinforce with the latest approaches as of 2026

## Naming

| Type     | Convention      | Example           |
| -------- | --------------- | ----------------- |
| Files    | kebab-case      | `task-card.tsx`   |
| Types    | PascalCase      | `Goal`            |
| Consts   | UPPER_SNAKE     | `TIME_SLOTS`      |
| Hooks    | use- prefix     | `use-goals.ts`    |
| Services | .service suffix | `task.service.ts` |

## Data Model

Direction → Area → Goal → Group (optional) → Task
Goal statuses: Active / Backlog / Completed / Maintenance / Paused / Archive

Details: @docs/plan/core/data-model.md

## AI 채팅 (쏟아내기)

- 쏟아내기 모드: 사용자가 아이디어를 말하면 즉시 예시 구조(Area/Goal/Task)를 propose_structure 도구로 제안. "충분히 듣기" 아닌 "바로 보여주고 함께 수정" 방식
- 응답 칩: 모든 AI 응답 끝에 suggest_responses 도구로 2-4개 클릭형 칩 제공 (필수)
- Task 제안 시 repeat_type, duration_minutes, time_slot 필드 사용하지 않음 — 이름+이유만
- propose_structure 호출 시 텍스트로 구조 내용을 반복하지 않음 (카드가 보여줌)

## Notion 연동

- 기능 명세서 DB: `331ff360838e80c3b9aec2983cac67d1` (data_source: `331ff360-838e-8089-b7ba-000bf0e15691`, view: `331ff360838e80a59d06000c9fdb629c`)
- 기능 명세 작업 시 이 Notion DB를 조회/업데이트하여 사용할 것
- MCP 도구: `mcp__notion__API-*` 시리즈 사용

## Docs

- Screen specs + wireframes: @docs/plan/screens/
- Design guide: @docs/plan/core/design-guide.md
- Philosophy: @docs/plan/core/philosophy.md
