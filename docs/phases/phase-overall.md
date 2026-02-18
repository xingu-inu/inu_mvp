# inu Development Roadmap - Overall Summary

> Complete overview of all 16 development phases for the inu self-development service

---

## 🎯 Project Goal

**inu** is a life roadmap and goal management service that helps users:

- Define their life direction
- Break down goals into actionable tasks
- Build habits through daily check-ins
- Track progress with streaks and analytics
- Receive AI-powered insights and encouragement

---

## 📊 Phase Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FOUNDATION                                │
│  Phase 0: Setup → Phase 1: Design → Phase 2: Layout → Phase 3: DB │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      CORE FEATURES                               │
│  Phase 4: Types → 4.5: API → 4.75: Auth → 5: Onboarding → 6      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      MAIN SCREENS                                │
│   Phase 7: Roadmap → Phase 8: Calendar → Phase 9: Review         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   SECONDARY & AI                                 │
│       Phase 10: Secondary Screens → Phase 11: AI Advisor         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    QUALITY & LAUNCH                              │
│  Phase 12: Testing → Phase 13: Performance → Phase 14: Deploy    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       FUTURE                                     │
│                    Phase 15: Post-MVP                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Phase Summaries

### Phase 0: Project Setup

**Goal**: Initialize development environment and project structure

| Item      | Details                                           |
| --------- | ------------------------------------------------- |
| Duration  | ~1 day                                            |
| Key Tasks | Node.js 22.x, pnpm, Next.js 16.1, dependencies    |
| Output    | Working dev environment with all tools configured |
| Reference | `code-architecture.md`                            |

**Key Deliverables**:

- Next.js project with TypeScript
- ESLint, Prettier, Husky configured
- Project folder structure created
- Environment variables set up

---

### Phase 1: Design System

**Goal**: Build the visual foundation with tokens and components

| Item      | Details                                         |
| --------- | ----------------------------------------------- |
| Duration  | ~2-3 days                                       |
| Key Tasks | OKLCH colors, Glass effects, UI components      |
| Output    | Complete design system with reusable components |
| Reference | `design-guide.md`, `core/design-guide.md`       |

**Key Deliverables**:

- CSS variables (colors, typography, spacing)
- 4-level Glass effect system
- Button, Card, Chip, Badge, Progress, Input components
- Animation components (ParticleBurst, Confetti)
- Dark mode support

**Color System**:

```
Primary: Toss Blue (#2186ff)
Done: Green (#22c55e)
Skip: Gray (#6b7280)
Miss: Soft Red (#f87171)
Streak: Orange (#f59e0b)
AI: Purple (#8b5cf6)
```

---

### Phase 2: Layout & Navigation

**Goal**: Implement app shell with responsive navigation

| Item      | Details                                             |
| --------- | --------------------------------------------------- |
| Duration  | ~1-2 days                                           |
| Key Tasks | Route groups, TopBar, BottomNav, Sidebar            |
| Output    | Fully navigable app structure                       |
| Reference | `components/navigation.md`, `components/sidebar.md` |

**Key Deliverables**:

- Route groups: `(auth)`, `(main)`, `(secondary)`, `onboarding`
- BottomNav (mobile): Today, Roadmap, Calendar, Review
- Sidebar (desktop): Full navigation
- TopBar: Logo, Inbox, AI Hub, Search, Profile
- Theme provider (light/dark/system)

**Navigation Model (PDCA)**:

```
🏠 Today    → Do      → Daily check-ins
🗺 Roadmap  → Plan    → Goals & tasks
📅 Calendar → Plan    → Time allocation
📊 Review   → Check   → Analytics & reflection
```

---

### Phase 3: Supabase Backend

**Goal**: Set up database, authentication, and security

| Item      | Details                                  |
| --------- | ---------------------------------------- |
| Duration  | ~2 days                                  |
| Key Tasks | Schema, RLS policies, auth, client setup |
| Output    | Fully functional backend                 |
| Reference | `core/data-model.md`                     |

**Database Schema (5-Level Hierarchy)**:

```
Direction (Life purpose)
    ↓
Area (Life domains: Health, Career, Finance, etc.)
    ↓
Goal (Specific achievements)
    ↓
Phase (Optional milestones)
    ↓
Task (Daily actions)
    ↓
CheckIn (done/skip/miss)
```

**Key Tables**: profiles, directions, areas, goals, phases, tasks, check_ins, daily_reflections, ai_messages

---

### Phase 4: Types & Services

**Goal**: Create type-safe data layer with caching

| Item      | Details                                                 |
| --------- | ------------------------------------------------------- |
| Duration  | ~2 days                                                 |
| Key Tasks | TypeScript types, Zod schemas, services, TanStack Query |
| Output    | Complete API layer with optimistic updates              |
| Reference | `core/data-model.md`, `code-architecture.md`            |

**Key Deliverables**:

- Entity types (Direction, Area, Goal, Phase, Task, CheckIn)
- Zod validation schemas
- Service layer (CRUD operations)
- TanStack Query hooks with caching
- Optimistic updates for check-ins

---

### Phase 4.5: API Design & Server Actions

**Goal**: Define API strategy and implement Server Actions

| Item      | Details                                                            |
| --------- | ------------------------------------------------------------------ |
| Duration  | ~1.5-2 days                                                        |
| Key Tasks | Server Actions, Repositories, API Routes, Response standardization |
| Output    | Type-safe API layer with standardized responses                    |
| Reference | `phase-4.5-api-design.md`                                          |

**Key Deliverables**:

- Server Actions for all CRUD operations
- Repository layer (data access abstraction)
- API response standardization (success/error formats)
- Error code system (1xxx-5xxx)
- Rate limiting for auth endpoints
- Extended proxy (route protection, onboarding check) - `src/proxy.ts`
- Optimistic Update Mutation Hooks

**Layer Architecture**:

```
React Component → TanStack Query → Server Actions → Repositories → Supabase
```

**Server Actions vs API Routes**:

- Server Actions: CRUD, check-in, onboarding, profile
- API Routes: OAuth callback, webhooks, cron jobs, AI proxy

---

### Phase 4.75: Landing & Authentication

**Goal**: 사용자 진입점 구현 - Landing, Login, Signup 페이지

| Item      | Details                                        |
| --------- | ---------------------------------------------- |
| Duration  | ~1.5-2 days                                    |
| Key Tasks | Landing 페이지, Auth 페이지, OAuth, Magic Link |
| Output    | 완전한 사용자 인증 플로우                      |
| Reference | `phase-4.75-auth.md`, `screens/landing/`       |

**Key Deliverables**:

- Landing 페이지 (Hero, Features, Pricing)
- Login 페이지 (Email/Password, OAuth, Magic Link)
- Signup 페이지 (회원가입 폼, 이용약관 동의)
- Forgot Password 페이지
- Auth callback route
- Auth Server Actions

**Route Structure**:

```
app/
├── page.tsx              # Landing (/)
├── (auth)/
│   ├── login/            # /login
│   ├── signup/           # /signup
│   └── forgot-password/  # /forgot-password
└── api/auth/callback/    # OAuth callback
```

---

### Phase 5: Onboarding Flow

**Goal**: Guide new users through initial setup

| Item      | Details                                                         |
| --------- | --------------------------------------------------------------- |
| Duration  | ~2 days                                                         |
| Key Tasks | Multi-step wizard, data collection, profile setup               |
| Output    | Complete onboarding experience                                  |
| Reference | `screens/onboarding/spec.md`, `screens/onboarding/wireframe.md` |

**Onboarding Steps**:

1. **Welcome** - Service introduction
2. **Values** - Select 3 core values
3. **Direction** - Define life direction + why
4. **Areas** - Choose life areas to focus on
5. **First Goal** - Create initial goal
6. **Complete** - Celebration + redirect to Today

---

### Phase 6: Today Screen (Main Hub)

**Goal**: Build the primary daily interaction screen

| Item      | Details                                            |
| --------- | -------------------------------------------------- |
| Duration  | ~3-4 days                                          |
| Key Tasks | TaskCard, check-in, streaks, animations            |
| Output    | Functional daily check-in experience               |
| Reference | `screens/today/spec.md`, `components/task-card.md` |

**Key Deliverables**:

- Date header with navigation
- Progress summary card
- TaskCard with Done/Skip buttons
- Streak badge with animation
- Particle burst on completion
- Confetti on milestone (every 5 streaks)
- AI insight card
- Quick add FAB

**Core Loop**:

```
View today's tasks → One-tap check-in → See streak grow → Feel progress
```

---

### Phase 7: Roadmap Screen

**Goal**: Visualize life roadmap with goal management

| Item      | Details                                               |
| --------- | ----------------------------------------------------- |
| Duration  | ~3-4 days                                             |
| Key Tasks | Goal cards, filters, CRUD, detail sheet               |
| Output    | Complete goal management interface                    |
| Reference | `screens/roadmap/spec.md`, `features/life-roadmap.md` |

**Key Deliverables**:

- Direction summary card
- Goal filters (status, area)
- View modes (card/tree/list)
- Goal cards with progress
- Goal detail bottom sheet
- Create/edit goal forms
- Phase management
- Task management within goals

**Goal Statuses**: Active, Backlog, Completed, Maintenance, Paused, Archived

---

### Phase 8: Calendar Screen

**Goal**: Time-based view of tasks and scheduling

| Item      | Details                                                   |
| --------- | --------------------------------------------------------- |
| Duration  | ~2-3 days                                                 |
| Key Tasks | Week view, month view, time slots                         |
| Output    | Calendar with task visualization                          |
| Reference | `screens/calendar/spec.md`, `features/time-management.md` |

**Key Deliverables**:

- Week view with time slot rows
- Month view with day cells
- Task pills (color-coded by area)
- View toggle (week/month)
- Date navigation
- Selected day task panel

**Time Slots**:

```
☀️ Early Morning (5-7)
🌤 Morning (7-9)
🌞 Late Morning (9-12)
🌆 Afternoon (12-18)
🌙 Evening (18-21)
🌙 Night (21-24)
```

---

### Phase 9: Review Screen

**Goal**: Analytics dashboard with reflection tools

| Item      | Details                                             |
| --------- | --------------------------------------------------- |
| Duration  | ~2-3 days                                           |
| Key Tasks | Stats, charts, mood tracking, reflection            |
| Output    | Comprehensive analytics view                        |
| Reference | `screens/review/spec.md`, `features/journey-log.md` |

**Key Deliverables**:

- Period selector (week/month)
- Overview stats (check-in rate, streaks)
- Daily activity heatmap
- Area breakdown chart
- Mood trend visualization
- Goal progress cards
- Weekly reflection form

**Key Metrics**: Check-in rate, completed tasks, current streak, best streak, area performance

---

### Phase 10: Secondary Screens

**Goal**: Build supporting screens for the app

| Item      | Details                                                                    |
| --------- | -------------------------------------------------------------------------- |
| Duration  | ~2-3 days                                                                  |
| Key Tasks | Inbox, Search, Profile, AI Hub                                             |
| Output    | Complete secondary navigation                                              |
| Reference | `screens/inbox/`, `screens/search/`, `screens/profile/`, `screens/ai-hub/` |

**Screens**:

- **Inbox**: AI messages, notifications, read/unread states
- **Search**: Unified search across goals, tasks, reflections
- **Profile**: User info, settings, theme toggle, logout
- **AI Hub**: Quick prompts, insight history, chat interface

---

### Phase 11: AI Advisor (Rule-based)

**Goal**: Implement contextual AI messaging system

| Item      | Details                                 |
| --------- | --------------------------------------- |
| Duration  | ~2-3 days                               |
| Key Tasks | Triggers, templates, message generation |
| Output    | Automated AI insights                   |
| Reference | `features/ai-advisor.md`                |

**Message Types**:

- 🎉 **Celebration**: Streak milestones, goal completion
- 💪 **Encouragement**: Skip streaks, low completion, returning users
- 💡 **Insight**: Area imbalance, performance patterns
- 🎯 **Suggestion**: Stalled goals, optimization tips
- ⏰ **Reminder**: High streak at risk

**Trigger Examples**:

```
Streak 5/10/30/100 → "🔥 {streak}-day streak!"
3 days of skips → "Rest is part of the process"
Perfect day → "✨ All tasks completed!"
```

---

### Phase 12: Testing & QA (Integration & E2E Focus)

**Goal**: Integrate tests from all phases and add comprehensive E2E coverage

| Item      | Details                                                   |
| --------- | --------------------------------------------------------- |
| Duration  | ~2-3 days                                                 |
| Key Tasks | E2E regression, integration verification, coverage report |
| Output    | 80%+ total coverage, all critical flows tested            |
| Reference | `code-architecture.md`                                    |

**Role Change**: Tests are now distributed across phases. Phase 12 focuses on:

- Integration of all phase tests
- Full E2E regression test suite
- Coverage report generation
- Test documentation

**Distributed Testing Strategy**:
| Phase | Test Type | Coverage Target |
|-------|-----------|-----------------|
| Phase 1 | UI Component Unit | 40% |
| Phase 4 | Service + Schema Unit | 60% |
| Phase 5-6 | Integration + E2E | 65-70% |
| Phase 7-11 | Screen Integration | 70-75% |
| Phase 12 | E2E Regression | 80% (total) |

**E2E Test Scenarios**: Onboarding flow, check-in flow, navigation, goal CRUD, streak milestones

---

### Phase 13: Performance Optimization

**Goal**: Achieve Core Web Vitals targets

| Item      | Details                                |
| --------- | -------------------------------------- |
| Duration  | ~2 days                                |
| Key Tasks | Images, fonts, code splitting, caching |
| Output    | LCP < 2.5s, FID < 100ms, CLS < 0.1     |
| Reference | `code-architecture.md`                 |

**Key Optimizations**:

- Image optimization (AVIF, WebP)
- Font optimization (Pretendard Variable)
- Dynamic imports for heavy components
- TanStack Query caching strategy
- Component memoization
- Bundle analysis

---

### Phase 14: Deployment & Launch

**Goal**: Deploy to production and launch MVP

| Item      | Details                                        |
| --------- | ---------------------------------------------- |
| Duration  | ~2-3 days                                      |
| Key Tasks | Vercel setup, monitoring, pre-launch checks    |
| Output    | Live production application                    |
| Reference | `strategy/mvp-scope.md`, `strategy/pricing.md` |

**Key Deliverables**:

- Vercel deployment
- Custom domain + SSL
- Sentry error tracking
- Vercel Analytics
- SEO configuration
- Pre-launch checklist
- Rollback plan

---

### Phase 15: Post-MVP Features

**Goal**: Plan and implement advanced features

| Item      | Details                                            |
| --------- | -------------------------------------------------- |
| Duration  | Ongoing                                            |
| Key Tasks | LLM AI, Google Calendar, Life Reset, Pro tier      |
| Output    | Enhanced product offering                          |
| Reference | `features/life-reset.md`, `features/ai-advisor.md` |

**Future Features**:

- 🤖 Advanced AI Advisor (LLM-based)
- 📅 Google Calendar Integration
- 🔄 Life Reset Mode
- 👥 Social Features (accountability partners)
- 📱 PWA Enhancements + Push Notifications
- 💳 Pro Subscription (₩3,900/mo)

---

## 🛠 Tech Stack Summary

| Category       | Technology                                |
| -------------- | ----------------------------------------- |
| **Framework**  | Next.js 16.1 (App Router, RSC, Turbopack) |
| **Language**   | TypeScript 5.9                            |
| **UI Library** | React 19.2                                |
| **Styling**    | Tailwind CSS 4.0, Radix UI, Framer Motion |
| **State**      | TanStack Query v5, Zustand, nuqs          |
| **Backend**    | Supabase (PostgreSQL, Auth, Storage)      |
| **Validation** | Zod                                       |
| **Forms**      | react-hook-form                           |
| **Testing**    | Vitest, Playwright                        |
| **Deployment** | Vercel                                    |

---

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Login, signup
│   ├── (main)/            # Today, Roadmap, Calendar, Review
│   ├── (secondary)/       # Inbox, Search, Profile, AI Hub
│   └── onboarding/        # Onboarding flow
├── components/
│   ├── ui/                # Design system primitives
│   ├── common/            # Domain components
│   ├── layout/            # Navigation, containers
│   └── providers/         # Context providers
├── features/              # Feature modules
├── lib/                   # Utilities, Supabase client
├── stores/                # Zustand stores
├── services/              # API services
├── queries/               # TanStack Query hooks
├── types/                 # TypeScript types
└── styles/                # CSS tokens, glass effects
```

---

## 📈 Timeline Estimate

| Phase Group        | Phases   | Duration        |
| ------------------ | -------- | --------------- |
| Foundation         | 0-2      | ~5 days         |
| Backend & Services | 3-4      | ~4 days         |
| API Design         | 4.5      | ~2 days         |
| Landing & Auth     | 4.75     | ~2 days         |
| Core Features      | 5-6      | ~6 days         |
| Main Screens       | 7-9      | ~8 days         |
| Secondary & AI     | 10-11    | ~5 days         |
| Quality & Launch   | 12-14    | ~7 days         |
| **Total MVP**      | **0-14** | **~39-40 days** |

_Note: Timelines are estimates. Tests are now distributed across phases (+0). API design, Landing/Auth, and error handling/A11y fundamentals add ~4-5 days._

### Timeline Changes from Original

- **+2 days**: Phase 4.5 API Design & Server Actions
- **+2 days**: Phase 4.75 Landing & Authentication
- **+0.5 days**: Error handling fundamentals (Phase 3-4)
- **+0.5 days**: A11y fundamentals (Phase 1-2)
- **±0 days**: Test distribution (moved from Phase 12 to each phase)

---

## ✅ MVP Definition

The MVP (Minimum Viable Product) includes Phases 0-14:

**Core Features**:

- ✅ User authentication
- ✅ Onboarding flow
- ✅ Life direction & areas
- ✅ Goal & task management
- ✅ Daily check-in with streaks
- ✅ Calendar view
- ✅ Basic analytics
- ✅ Rule-based AI advisor

**Not in MVP**:

- ❌ LLM-based AI chat
- ❌ Google Calendar sync
- ❌ Life Reset mode
- ❌ Social features
- ❌ Pro subscription

---

## 🎯 Success Metrics

| Metric             | MVP Target | Description                  |
| ------------------ | ---------- | ---------------------------- |
| Daily Active Users | 100        | Users checking in daily      |
| Check-in Rate      | 40%        | % of scheduled tasks checked |
| 7-day Retention    | 30%        | Users returning after 1 week |
| Lighthouse Score   | 90+        | Performance & accessibility  |
| Error Rate         | < 0.1%     | Production stability         |

---

## 📚 Reference Document Map

| Phase | Primary References                                                         |
| ----- | -------------------------------------------------------------------------- |
| 0-1   | `code-architecture.md`, `design-guide.md`                                  |
| 2     | `components/navigation.md`, `components/sidebar.md`                        |
| 3-4   | `core/data-model.md`                                                       |
| 4.5   | `phase-4.5-api-design.md`                                                  |
| 4.75  | `phase-4.75-auth.md`, `screens/landing/`                                   |
| 5     | `screens/onboarding/`                                                      |
| 6     | `screens/today/`, `components/task-card.md`                                |
| 7     | `screens/roadmap/`, `features/life-roadmap.md`                             |
| 8     | `screens/calendar/`, `features/time-management.md`                         |
| 9     | `screens/review/`, `features/journey-log.md`                               |
| 10    | `screens/inbox/`, `screens/search/`, `screens/profile/`, `screens/ai-hub/` |
| 11    | `features/ai-advisor.md`                                                   |
| 12-13 | `code-architecture.md`                                                     |
| 14    | `strategy/mvp-scope.md`, `strategy/pricing.md`                             |
| 15    | `features/life-reset.md`                                                   |

---

## 🚀 Getting Started

1. **Read Phase 0** - Set up your development environment
2. **Follow sequentially** - Each phase builds on the previous
3. **Check references** - Read linked docs for full context
4. **Verify checklists** - Ensure all items complete before moving on
5. **Test continuously** - Don't wait until Phase 12

```bash
# Start here
docs/phases/phase-0-setup.md
```

---

_Document Version: 1.1 | Last Updated: 2026-02-03_
_Changes: Added Phase 4.75 (Landing & Auth), Repository layer in Phase 4.5_
