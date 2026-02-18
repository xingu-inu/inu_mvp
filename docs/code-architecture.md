# inu Code Architecture

> Technical foundation for the inu self-development service

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Project Structure](#2-project-structure)
3. [Coding Conventions](#3-coding-conventions)
4. [Design System Integration](#4-design-system-integration)
5. [Data Layer](#5-data-layer)
6. [State Management](#6-state-management)
7. [Component Architecture](#7-component-architecture)
8. [Testing Strategy](#8-testing-strategy)
9. [Performance Optimization](#9-performance-optimization)
10. [Security Guidelines](#10-security-guidelines)
11. [Development Workflow](#11-development-workflow)

---

## 1. Tech Stack

### 1.1 Core Framework

| Technology     | Version | Purpose                                         |
| -------------- | ------- | ----------------------------------------------- |
| **Next.js**    | 16.1.x  | React framework with App Router, RSC, Turbopack |
| **React**      | 19.2.x  | UI library with Server Components, Suspense     |
| **TypeScript** | 5.9.x   | Type safety and developer experience            |

### 1.2 Styling & UI

| Technology         | Version | Purpose                                        |
| ------------------ | ------- | ---------------------------------------------- |
| **Tailwind CSS**   | 4.0.x   | Utility-first CSS with CSS-first configuration |
| **Radix UI**       | Latest  | Headless accessible UI primitives              |
| **Framer Motion**  | Latest  | Animations (check-in effects, transitions)     |
| **Lucide React**   | Latest  | Icon library (consistent with design guide)    |
| **tailwind-merge** | Latest  | Merge Tailwind classes without conflicts       |
| **clsx**           | Latest  | Conditional class name utility                 |

### 1.3 State Management

| Technology            | Purpose             | Use Case                                |
| --------------------- | ------------------- | --------------------------------------- |
| **TanStack Query v5** | Server state        | API data, caching, mutations            |
| **Zustand**           | Global client state | User session, settings, navigation      |
| **nuqs**              | URL state           | Filters, search params, shareable state |

### 1.4 Backend (BaaS)

| Technology                | Purpose                                            |
| ------------------------- | -------------------------------------------------- |
| **Supabase**              | PostgreSQL database, Auth, Storage, Edge Functions |
| **@supabase/ssr**         | Server-side authentication helpers                 |
| **@supabase/supabase-js** | Client SDK                                         |

### 1.5 Development & Quality

| Technology      | Purpose                      |
| --------------- | ---------------------------- |
| **Vitest**      | Unit and integration testing |
| **Playwright**  | End-to-end testing           |
| **ESLint**      | Code linting                 |
| **Prettier**    | Code formatting              |
| **Husky**       | Git hooks                    |
| **lint-staged** | Run linters on staged files  |

### 1.6 Additional Libraries

| Technology              | Purpose                              |
| ----------------------- | ------------------------------------ |
| **date-fns**            | Date manipulation and formatting     |
| **zod**                 | Schema validation                    |
| **react-hook-form**     | Form handling                        |
| **@hookform/resolvers** | Zod integration with react-hook-form |

### 1.7 Package Versions (package.json reference)

```json
{
  "dependencies": {
    "next": "^16.1.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0",
    "@tanstack/react-query": "^5.90.0",
    "zustand": "^5.0.0",
    "nuqs": "^2.0.0",
    "framer-motion": "^11.15.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-dropdown-menu": "^2.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-tooltip": "^1.1.0",
    "lucide-react": "^0.470.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.6.0",
    "date-fns": "^4.1.0",
    "zod": "^3.24.0",
    "react-hook-form": "^7.54.0",
    "@hookform/resolvers": "^3.9.0",
    "class-variance-authority": "^0.7.0"
  },
  "devDependencies": {
    "typescript": "^5.9.0",
    "tailwindcss": "^4.0.0",
    "@types/react": "^19.0.0",
    "@types/node": "^22.0.0",
    "eslint": "^9.18.0",
    "eslint-config-next": "^16.1.0",
    "prettier": "^3.4.0",
    "prettier-plugin-tailwindcss": "^0.6.0",
    "vitest": "^2.1.0",
    "@vitejs/plugin-react": "^4.3.0",
    "@testing-library/react": "^16.1.0",
    "@playwright/test": "^1.50.0",
    "husky": "^9.1.0",
    "lint-staged": "^15.3.0"
  }
}
```

---

## 2. Project Structure

### 2.1 Root Directory

```
inu/
├── src/                    # Source code
├── public/                 # Static assets
├── docs/                   # Documentation
│   └── plan/              # Planning documents
├── tests/                  # E2E tests (Playwright)
├── .husky/                 # Git hooks
├── next.config.ts          # Next.js configuration
├── tailwind.config.ts      # Tailwind configuration
├── tsconfig.json           # TypeScript configuration
├── vitest.config.ts        # Vitest configuration
├── playwright.config.ts    # Playwright configuration
├── .env.local              # Local environment variables
├── .env.example            # Environment template
└── package.json
```

### 2.2 Source Directory (`src/`)

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes (no main layout)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   ├── callback/
│   │   │   └── route.ts          # OAuth callback handler
│   │   └── layout.tsx            # Minimal auth layout
│   │
│   ├── (main)/                   # Main app routes (with bottom nav)
│   │   ├── today/
│   │   │   ├── page.tsx
│   │   │   └── loading.tsx
│   │   ├── roadmap/
│   │   │   ├── page.tsx
│   │   │   ├── [goalId]/
│   │   │   │   └── page.tsx      # Goal detail
│   │   │   └── loading.tsx
│   │   ├── calendar/
│   │   │   ├── page.tsx
│   │   │   └── loading.tsx
│   │   ├── review/
│   │   │   ├── page.tsx
│   │   │   └── loading.tsx
│   │   └── layout.tsx            # Layout with BottomNav
│   │
│   ├── (secondary)/              # Secondary screens (top bar only)
│   │   ├── inbox/
│   │   │   └── page.tsx
│   │   ├── search/
│   │   │   └── page.tsx
│   │   ├── profile/
│   │   │   └── page.tsx
│   │   ├── ai-hub/
│   │   │   └── page.tsx
│   │   └── layout.tsx            # Layout with TopBar
│   │
│   ├── onboarding/               # Onboarding flow
│   │   ├── page.tsx              # Welcome / entry
│   │   ├── values/
│   │   │   └── page.tsx          # Value chip selection
│   │   ├── direction/
│   │   │   └── page.tsx          # Direction creation
│   │   ├── areas/
│   │   │   └── page.tsx          # Area selection
│   │   ├── first-goal/
│   │   │   └── page.tsx          # First goal creation
│   │   └── layout.tsx            # Onboarding layout
│   │
│   ├── landing/
│   │   └── page.tsx              # Marketing landing page
│   │
│   ├── api/                      # API routes (Phase 4.5)
│   │   ├── health/
│   │   │   └── route.ts          # Health check
│   │   ├── auth/
│   │   │   ├── callback/
│   │   │   │   └── route.ts      # OAuth callback
│   │   │   └── signout/
│   │   │       └── route.ts      # Sign out
│   │   ├── webhooks/
│   │   │   └── stripe/
│   │   │       └── route.ts      # Stripe webhooks (Phase 2)
│   │   ├── ai/
│   │   │   └── chat/
│   │   │       └── route.ts      # AI chat (Phase 2)
│   │   └── cron/
│   │       ├── daily-miss/
│   │       │   └── route.ts      # Daily miss processing
│   │       └── streak-reminder/
│   │           └── route.ts      # Streak reminders
│   │
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Root page (redirect logic)
│   ├── loading.tsx               # Global loading
│   ├── error.tsx                 # Global error boundary
│   ├── not-found.tsx             # 404 page
│   └── globals.css               # Global styles + design tokens
│
├── components/
│   ├── ui/                       # Design system primitives
│   │   ├── button/
│   │   │   ├── button.tsx
│   │   │   ├── button.test.tsx
│   │   │   └── index.ts
│   │   ├── card/
│   │   │   ├── card.tsx
│   │   │   └── index.ts
│   │   ├── input/
│   │   │   ├── input.tsx
│   │   │   ├── textarea.tsx
│   │   │   └── index.ts
│   │   ├── glass-card/
│   │   │   ├── glass-card.tsx    # 4-level glass effect
│   │   │   └── index.ts
│   │   ├── bottom-sheet/
│   │   │   ├── bottom-sheet.tsx
│   │   │   └── index.ts
│   │   ├── chip/
│   │   │   ├── chip.tsx
│   │   │   ├── selection-chip.tsx
│   │   │   └── index.ts
│   │   ├── progress/
│   │   │   ├── progress-bar.tsx
│   │   │   └── index.ts
│   │   ├── skeleton/
│   │   │   ├── skeleton.tsx
│   │   │   └── index.ts
│   │   └── index.ts              # Barrel export
│   │
│   ├── common/                   # Domain-specific shared components
│   │   ├── task-card/
│   │   │   ├── task-card.tsx
│   │   │   ├── task-card-hero.tsx
│   │   │   ├── task-card-compact.tsx
│   │   │   ├── task-card-skeleton.tsx
│   │   │   ├── task-card.test.tsx
│   │   │   └── index.ts
│   │   ├── goal-card/
│   │   │   ├── goal-card.tsx
│   │   │   └── index.ts
│   │   ├── area-chip/
│   │   │   ├── area-chip.tsx
│   │   │   └── index.ts
│   │   ├── streak-badge/
│   │   │   ├── streak-badge.tsx
│   │   │   └── index.ts
│   │   ├── phase-indicator/
│   │   │   ├── phase-indicator.tsx
│   │   │   └── index.ts
│   │   ├── why-chain/
│   │   │   ├── why-chain.tsx
│   │   │   └── index.ts
│   │   ├── mood-selector/
│   │   │   ├── mood-selector.tsx
│   │   │   └── index.ts
│   │   ├── time-slot-group/
│   │   │   ├── time-slot-group.tsx
│   │   │   ├── time-slot-header.tsx
│   │   │   └── index.ts
│   │   └── empty-state/
│   │       ├── empty-state.tsx
│   │       └── index.ts
│   │
│   ├── layout/                   # Layout components
│   │   ├── top-bar.tsx
│   │   ├── bottom-nav.tsx
│   │   ├── sidebar.tsx           # Desktop sidebar
│   │   ├── page-container.tsx
│   │   └── index.ts
│   │
│   ├── providers/                # Context providers
│   │   ├── app-providers.tsx     # Combines all providers
│   │   ├── query-provider.tsx    # TanStack Query
│   │   ├── auth-provider.tsx     # Supabase Auth
│   │   └── theme-provider.tsx    # Theme (light/dark)
│   │
│   ├── error-boundary/           # Error handling components
│   │   ├── root-error-boundary.tsx
│   │   ├── route-error-boundary.tsx
│   │   ├── section-error-boundary.tsx
│   │   └── error-message.tsx
│   │
│   └── a11y/                     # Accessibility components
│       ├── skip-link.tsx
│       ├── live-region.tsx
│       ├── visually-hidden.tsx
│       └── keyboard-shortcuts-help.tsx
│
├── features/                     # Feature-specific modules
│   ├── checkin/
│   │   ├── components/
│   │   │   ├── checkin-modal.tsx
│   │   │   ├── checkin-particle.tsx
│   │   │   ├── checkin-confetti.tsx
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   ├── use-checkin.ts
│   │   │   └── use-streak.ts
│   │   └── utils/
│   │       └── streak-calculator.ts
│   │
│   ├── today/
│   │   ├── components/
│   │   │   ├── today-header.tsx
│   │   │   ├── task-list.tsx
│   │   │   ├── ai-nudge-card.tsx
│   │   │   └── index.ts
│   │   └── hooks/
│   │       └── use-today-tasks.ts
│   │
│   ├── roadmap/
│   │   ├── components/
│   │   │   ├── tree-view.tsx
│   │   │   ├── card-view.tsx
│   │   │   ├── goal-detail-sheet.tsx
│   │   │   └── index.ts
│   │   └── hooks/
│   │       └── use-roadmap-data.ts
│   │
│   ├── calendar/
│   │   ├── components/
│   │   │   ├── week-view.tsx
│   │   │   ├── month-view.tsx
│   │   │   ├── action-panel.tsx
│   │   │   └── index.ts
│   │   └── hooks/
│   │       └── use-calendar-data.ts
│   │
│   ├── review/
│   │   ├── components/
│   │   │   ├── weekly-stats.tsx
│   │   │   ├── streak-overview.tsx
│   │   │   ├── journal-timeline.tsx
│   │   │   └── index.ts
│   │   └── hooks/
│   │       └── use-review-data.ts
│   │
│   ├── onboarding/
│   │   ├── components/
│   │   │   ├── value-chip-grid.tsx
│   │   │   ├── direction-form.tsx
│   │   │   ├── area-selector.tsx
│   │   │   └── index.ts
│   │   └── hooks/
│   │       └── use-onboarding.ts
│   │
│   └── ai-advisor/
│       ├── components/
│       │   ├── ai-message-card.tsx
│       │   └── index.ts
│       └── utils/
│           └── rule-engine.ts    # Rule-based message generation
│
├── lib/                          # Core utilities
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client
│   │   ├── middleware.ts         # Auth middleware
│   │   └── types.ts              # Re-export database types
│   │
│   ├── api/                      # API utilities (Phase 4.5)
│   │   ├── response.ts           # Response helpers (success/error)
│   │   ├── errors.ts             # Error codes and classes
│   │   └── auth.ts               # Auth helpers for API
│   │
│   ├── errors/                   # Error handling utilities
│   │   ├── types.ts              # Error type definitions
│   │   ├── messages.ts           # User-friendly error messages
│   │   ├── handlers.ts           # Error handlers
│   │   └── reporter.ts           # Error reporting (Sentry)
│   │
│   ├── a11y/                     # Accessibility utilities
│   │   ├── keyboard-shortcuts.ts # Global keyboard shortcuts
│   │   ├── focus-manager.ts      # Focus management
│   │   └── announcer.ts          # Screen reader announcer
│   │
│   ├── utils/
│   │   ├── cn.ts                 # clsx + tailwind-merge
│   │   ├── date.ts               # Date helpers (date-fns wrappers)
│   │   ├── format.ts             # Number/string formatting
│   │   └── validation.ts         # Common validation schemas
│   │
│   └── constants/
│       ├── time-slots.ts         # Time slot definitions
│       ├── area-defaults.ts      # Default area configs
│       ├── mood-options.ts       # Mood emoji options
│       ├── routes.ts             # Route constants
│       └── query-keys.ts         # Query key constants
│
├── stores/                       # Zustand stores
│   ├── user-store.ts             # User session state
│   ├── navigation-store.ts       # Navigation state
│   ├── onboarding-store.ts       # Onboarding progress
│   └── index.ts
│
├── hooks/                        # Shared custom hooks
│   ├── use-media-query.ts
│   ├── use-safe-area.ts
│   ├── use-debounce.ts
│   ├── use-intersection.ts
│   ├── use-local-storage.ts
│   ├── use-network-status.ts     # Network status detection
│   ├── use-focus-trap.ts         # Focus trap for modals
│   ├── use-focus-management.ts   # Focus restoration
│   ├── use-keyboard-navigation.ts # Keyboard nav helpers
│   └── index.ts
│
├── actions/                      # Server Actions (Phase 4.5)
│   ├── auth.actions.ts
│   ├── direction.actions.ts
│   ├── area.actions.ts
│   ├── goal.actions.ts
│   ├── phase.actions.ts
│   ├── task.actions.ts
│   ├── checkin.actions.ts
│   ├── reflection.actions.ts
│   ├── ai-message.actions.ts
│   ├── profile.actions.ts
│   ├── stats.actions.ts
│   └── onboarding.actions.ts
│
├── repositories/                 # Data Access Layer (Phase 4.5)
│   ├── base.repository.ts        # Common CRUD operations
│   ├── direction.repository.ts
│   ├── area.repository.ts
│   ├── goal.repository.ts
│   ├── phase.repository.ts
│   ├── task.repository.ts
│   ├── checkin.repository.ts
│   └── reflection.repository.ts
│
├── services/                     # Business logic layer
│   ├── direction.service.ts
│   ├── area.service.ts
│   ├── goal.service.ts
│   ├── phase.service.ts
│   ├── task.service.ts
│   ├── checkin.service.ts
│   ├── reflection.service.ts
│   ├── streak.service.ts         # Streak calculation logic
│   └── index.ts
│
├── queries/                      # TanStack Query definitions
│   ├── keys.ts                   # Query key factory
│   ├── direction.queries.ts
│   ├── area.queries.ts
│   ├── goal.queries.ts
│   ├── task.queries.ts
│   ├── checkin.queries.ts
│   └── index.ts
│
├── types/                        # TypeScript types
│   ├── database.types.ts         # Supabase generated types
│   ├── entities.ts               # Domain entity types
│   ├── api.ts                    # API response types (success/error)
│   ├── errors.ts                 # Error code enums
│   └── index.ts
│
└── styles/
    ├── tokens.css                # Design tokens (from design-guide.md)
    └── animations.css            # Animation keyframes
```

### 2.3 Route Groups Explained

| Group         | Path Pattern                                 | Layout             | Purpose              |
| ------------- | -------------------------------------------- | ------------------ | -------------------- |
| `(auth)`      | `/login`, `/signup`                          | Minimal            | Authentication pages |
| `(main)`      | `/today`, `/roadmap`, `/calendar`, `/review` | BottomNav          | Core PDCA tabs       |
| `(secondary)` | `/inbox`, `/search`, `/profile`, `/ai-hub`   | TopBar only        | Secondary screens    |
| `onboarding`  | `/onboarding/*`                              | Progress indicator | New user flow        |

---

## 3. Coding Conventions

### 3.1 File Naming

| Type              | Convention                        | Example           |
| ----------------- | --------------------------------- | ----------------- |
| Components        | kebab-case                        | `task-card.tsx`   |
| Component folders | kebab-case                        | `task-card/`      |
| Hooks             | camelCase with `use` prefix       | `use-checkin.ts`  |
| Utilities         | kebab-case                        | `date.ts`         |
| Services          | kebab-case with `.service` suffix | `task.service.ts` |
| Queries           | kebab-case with `.queries` suffix | `task.queries.ts` |
| Types             | kebab-case                        | `entities.ts`     |
| Constants         | kebab-case                        | `time-slots.ts`   |
| Stores            | kebab-case with `-store` suffix   | `user-store.ts`   |

### 3.2 TypeScript Naming

| Type             | Convention                         | Example                         |
| ---------------- | ---------------------------------- | ------------------------------- |
| Interfaces       | PascalCase                         | `Task`, `Goal`, `CheckIn`       |
| Type aliases     | PascalCase                         | `TaskStatus`, `TimeSlot`        |
| Enums            | PascalCase (const enums preferred) | `GoalStatus`                    |
| Constants        | UPPER_SNAKE_CASE                   | `TIME_SLOTS`, `MAX_STREAK`      |
| Functions        | camelCase                          | `calculateStreak`, `formatDate` |
| React Components | PascalCase                         | `TaskCard`, `BottomNav`         |

### 3.3 Component Structure

```tsx
// task-card.tsx

// 1. Imports (external -> internal -> types -> styles)
import { memo } from 'react'
import { motion } from 'framer-motion'

import { cn } from '@/lib/utils/cn'
import { AreaChip } from '@/components/common/area-chip'
import { StreakBadge } from '@/components/common/streak-badge'

import type { Task } from '@/types/entities'

// 2. Type definitions
interface TaskCardProps {
  task: Task
  onCheckin?: (status: 'done' | 'skip') => void
  className?: string
}

// 3. Component definition
export const TaskCard = memo(function TaskCard({ task, onCheckin, className }: TaskCardProps) {
  // 3a. Hooks
  // 3b. Derived state
  // 3c. Event handlers
  // 3d. Render

  return <motion.div className={cn('bg-glass-2 rounded-xl p-4', className)}>{/* ... */}</motion.div>
})
```

### 3.4 Import Order

```tsx
// 1. React/Next.js
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// 2. External libraries
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'

// 3. Internal - lib/utils
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/date'

// 4. Internal - components
import { Button } from '@/components/ui/button'
import { TaskCard } from '@/components/common/task-card'

// 5. Internal - hooks/stores/services
import { useCheckin } from '@/features/checkin/hooks/use-checkin'
import { useUserStore } from '@/stores/user-store'

// 6. Internal - queries
import { useTodayTasks } from '@/queries/task.queries'

// 7. Types (always last, with `type` keyword)
import type { Task } from '@/types/entities'
```

### 3.5 Path Aliases

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### 3.6 Export Patterns

```tsx
// Barrel exports for public API
// components/ui/index.ts
export { Button } from './button';
export { Card } from './card';
export { Input } from './input';

// Named exports (preferred)
export const TaskCard = () => { ... };

// Default exports only for pages
// app/(main)/today/page.tsx
export default function TodayPage() { ... }
```

### 3.7 ESLint Configuration

```js
// eslint.config.js
import nextPlugin from '@next/eslint-plugin-next'
import tsPlugin from '@typescript-eslint/eslint-plugin'

export default [
  {
    plugins: {
      '@next/next': nextPlugin,
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // Enforce consistent imports
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
          'newlines-between': 'always',
        },
      ],

      // TypeScript specific
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': 'error',

      // React specific
      'react/prop-types': 'off',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
]
```

### 3.8 Prettier Configuration

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

---

## 4. Design System Integration

### 4.1 Design Tokens (globals.css)

Reference: [design-guide.md](plan/core/design-guide.md)

```css
/* src/app/globals.css */

@import 'tailwindcss';
@import '../styles/tokens.css';
@import '../styles/animations.css';

/* Custom base styles */
@layer base {
  :root {
    /* Typography */
    --font-sans:
      'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    --font-mono: 'JetBrains Mono', 'SF Mono', monospace;
  }

  html {
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
  }

  body {
    background: var(--bg-base);
    color: var(--text-primary);
  }
}
```

### 4.2 Design Tokens CSS

```css
/* src/styles/tokens.css */

:root {
  /* ===== Colors (OKLCH) ===== */

  /* Primary Brand Color (Toss Blue) */
  --color-primary-50: oklch(97% 0.02 250);
  --color-primary-100: oklch(93% 0.04 250);
  --color-primary-200: oklch(87% 0.08 250);
  --color-primary-300: oklch(78% 0.12 250);
  --color-primary-400: oklch(68% 0.16 250);
  --color-primary-500: oklch(58% 0.18 250);
  --color-primary-600: oklch(50% 0.18 250);
  --color-primary-700: oklch(42% 0.16 250);
  --color-primary-800: oklch(34% 0.12 250);
  --color-primary-900: oklch(26% 0.08 250);

  /* Status Colors */
  --color-done: oklch(72% 0.18 145);
  --color-done-bg: oklch(95% 0.05 145);
  --color-done-border: oklch(85% 0.12 145);

  --color-skip: oklch(60% 0.01 260);
  --color-skip-bg: oklch(96% 0.005 260);
  --color-skip-border: oklch(90% 0.01 260);

  --color-miss: oklch(65% 0.15 25);
  --color-miss-bg: oklch(97% 0.03 25);
  --color-miss-border: oklch(88% 0.08 25);

  --color-streak: oklch(70% 0.18 55);
  --color-streak-bg: oklch(97% 0.04 55);

  --color-ai: oklch(65% 0.16 290);
  --color-ai-bg: oklch(97% 0.03 290);

  /* Area Colors */
  --area-health: oklch(65% 0.18 165);
  --area-health-light: oklch(95% 0.04 165);
  --area-career: oklch(55% 0.18 275);
  --area-career-light: oklch(96% 0.03 275);
  --area-finance: oklch(68% 0.16 85);
  --area-finance-light: oklch(97% 0.03 85);
  --area-relation: oklch(65% 0.18 10);
  --area-relation-light: oklch(97% 0.03 10);
  --area-hobby: oklch(68% 0.14 195);
  --area-hobby-light: oklch(96% 0.03 195);
  --area-mental: oklch(70% 0.12 300);
  --area-mental-light: oklch(97% 0.025 300);
  --area-learning: oklch(60% 0.16 230);
  --area-learning-light: oklch(96% 0.025 230);
  --area-daily: oklch(55% 0.02 260);
  --area-daily-light: oklch(97% 0.005 260);

  /* Surface & Background */
  --bg-base: oklch(100% 0 0);
  --bg-subtle: oklch(98.5% 0.003 260);
  --bg-muted: oklch(96% 0.005 260);
  --bg-emphasis: oklch(93% 0.008 260);

  --surface-default: oklch(100% 0 0);
  --surface-raised: oklch(100% 0 0);
  --surface-overlay: oklch(100% 0 0);

  /* Text Colors */
  --text-primary: oklch(15% 0.01 260);
  --text-secondary: oklch(40% 0.01 260);
  --text-tertiary: oklch(55% 0.01 260);
  --text-placeholder: oklch(65% 0.005 260);
  --text-inverse: oklch(100% 0 0);

  /* Border Colors */
  --border-default: oklch(90% 0.008 260);
  --border-subtle: oklch(94% 0.005 260);
  --border-emphasis: oklch(80% 0.01 260);

  /* ===== Glass Effect System ===== */

  /* Level 1: Subtle */
  --glass-1-bg: rgba(255, 255, 255, 0.4);
  --glass-1-blur: 4px;
  --glass-1-border: rgba(255, 255, 255, 0.2);
  --glass-1-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

  /* Level 2: Light (Default) */
  --glass-2-bg: rgba(255, 255, 255, 0.6);
  --glass-2-blur: 8px;
  --glass-2-border: rgba(255, 255, 255, 0.4);
  --glass-2-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);

  /* Level 3: Medium (Emphasis) */
  --glass-3-bg: rgba(255, 255, 255, 0.75);
  --glass-3-blur: 12px;
  --glass-3-border: rgba(255, 255, 255, 0.5);
  --glass-3-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);

  /* Level 4: Heavy (Maximum) */
  --glass-4-bg: rgba(255, 255, 255, 0.85);
  --glass-4-blur: 16px;
  --glass-4-border: rgba(255, 255, 255, 0.6);
  --glass-4-shadow: 0 12px 48px rgba(0, 0, 0, 0.12);

  /* ===== Typography ===== */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  --text-4xl: 2.25rem;
  --text-5xl: 3rem;

  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
  --font-extrabold: 800;

  --leading-none: 1;
  --leading-tight: 1.25;
  --leading-snug: 1.375;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;

  /* ===== Spacing ===== */
  --space-0: 0;
  --space-px: 1px;
  --space-0-5: 0.125rem;
  --space-1: 0.25rem;
  --space-1-5: 0.375rem;
  --space-2: 0.5rem;
  --space-2-5: 0.625rem;
  --space-3: 0.75rem;
  --space-3-5: 0.875rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-7: 1.75rem;
  --space-8: 2rem;
  --space-9: 2.25rem;
  --space-10: 2.5rem;
  --space-11: 2.75rem;
  --space-12: 3rem;
  --space-14: 3.5rem;
  --space-16: 4rem;
  --space-20: 5rem;
  --space-24: 6rem;

  /* ===== Layout ===== */
  --touch-target-min: 44px;
  --touch-target-comfortable: 48px;
  --touch-target-large: 56px;

  --page-margin-mobile: 16px;
  --page-margin-tablet: 24px;
  --page-margin-desktop: 32px;

  --content-max-width: 640px;
  --container-max-width: 1200px;

  --topbar-height-mobile: 44px;
  --topbar-height-desktop: 56px;
  --bottombar-height: 56px;
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --sidebar-width: 200px;

  /* ===== Border Radius ===== */
  --radius-none: 0;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 20px;
  --radius-3xl: 24px;
  --radius-full: 9999px;

  /* ===== Shadows ===== */
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);

  --shadow-card: 0 4px 16px rgba(0, 0, 0, 0.08);
  --shadow-card-hover: 0 8px 24px rgba(0, 0, 0, 0.12);
  --shadow-primary: 0 4px 14px oklch(58% 0.18 250 / 0.4);
  --shadow-done: 0 4px 14px oklch(72% 0.18 145 / 0.4);

  /* ===== Z-Index ===== */
  --z-base: 0;
  --z-dropdown: 10;
  --z-sticky: 20;
  --z-fixed: 30;
  --z-modal-backdrop: 40;
  --z-modal: 50;
  --z-popover: 60;
  --z-tooltip: 70;
  --z-toast: 80;

  /* ===== Animation ===== */
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
  --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);

  --duration-instant: 50ms;
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
  --duration-slower: 600ms;
}

/* ===== Dark Mode ===== */
[data-theme='dark'] {
  --bg-base: oklch(12% 0.01 260);
  --bg-subtle: oklch(15% 0.01 260);
  --bg-muted: oklch(20% 0.01 260);
  --bg-emphasis: oklch(28% 0.01 260);

  --surface-default: oklch(15% 0.01 260);
  --surface-raised: oklch(18% 0.01 260);
  --surface-overlay: oklch(20% 0.012 260);

  --text-primary: oklch(95% 0.005 260);
  --text-secondary: oklch(70% 0.005 260);
  --text-tertiary: oklch(55% 0.005 260);
  --text-placeholder: oklch(40% 0.005 260);
  --text-inverse: oklch(12% 0.01 260);

  --border-default: oklch(28% 0.01 260);
  --border-subtle: oklch(22% 0.008 260);
  --border-emphasis: oklch(40% 0.01 260);

  /* Dark mode glass */
  --glass-1-bg: rgba(255, 255, 255, 0.03);
  --glass-1-border: rgba(255, 255, 255, 0.06);
  --glass-2-bg: rgba(255, 255, 255, 0.05);
  --glass-2-border: rgba(255, 255, 255, 0.08);
  --glass-3-bg: rgba(255, 255, 255, 0.08);
  --glass-3-border: rgba(255, 255, 255, 0.1);
  --glass-4-bg: rgba(255, 255, 255, 0.1);
  --glass-4-border: rgba(255, 255, 255, 0.12);
}
```

### 4.3 Tailwind CSS Configuration

```css
/* tailwind.config.ts - CSS-first in Tailwind v4 */
/* src/app/globals.css */

@import 'tailwindcss';

@theme {
  /* Colors */
  --color-primary-50: var(--color-primary-50);
  --color-primary-100: var(--color-primary-100);
  --color-primary-500: var(--color-primary-500);
  --color-primary-600: var(--color-primary-600);
  --color-primary-700: var(--color-primary-700);

  --color-done: var(--color-done);
  --color-skip: var(--color-skip);
  --color-streak: var(--color-streak);
  --color-ai: var(--color-ai);

  /* Font Family */
  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);

  /* Border Radius */
  --radius-button: var(--radius-lg);
  --radius-card: var(--radius-xl);
  --radius-modal: var(--radius-2xl);
  --radius-chip: var(--radius-full);
  --radius-input: var(--radius-md);
}
```

### 4.4 Animation Keyframes

```css
/* src/styles/animations.css */

/* Check-in particle burst */
@keyframes particle-burst {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0;
  }
}

/* Streak counter pop */
@keyframes streak-pop {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.3);
  }
  100% {
    transform: scale(1);
  }
}

/* Confetti fall */
@keyframes confetti-fall {
  0% {
    transform: translateY(-100%) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0;
  }
}

/* Page enter */
@keyframes page-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Page exit */
@keyframes page-exit {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-8px);
  }
}

/* Slide up (bottom sheet) */
@keyframes slide-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

/* Fade in */
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 5. Data Layer

### 5.1 Supabase Client Setup

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

import type { Database } from '@/types/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import type { Database } from '@/types/database.types'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component - ignore
          }
        },
      },
    }
  )
}
```

```typescript
// src/lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith('/(main)') ||
    request.nextUrl.pathname.startsWith('/(secondary)')

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

### 5.2 Service Layer Pattern

```typescript
// src/services/task.service.ts
import { createClient } from '@/lib/supabase/client'

import type { Task, TaskInsert, TaskUpdate } from '@/types/entities'

export const taskService = {
  async getByDate(date: string): Promise<Task[]> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('tasks')
      .select(
        `
        *,
        phase:phases(*),
        goal:goals(*, area:areas(*)),
        checkins!inner(*)
      `
      )
      .eq('checkins.date', date)
      .order('time_slot')

    if (error) throw error
    return data
  },

  async create(task: TaskInsert): Promise<Task> {
    const supabase = createClient()

    const { data, error } = await supabase.from('tasks').insert(task).select().single()

    if (error) throw error
    return data
  },

  async update(id: string, updates: TaskUpdate): Promise<Task> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient()

    const { error } = await supabase.from('tasks').delete().eq('id', id)

    if (error) throw error
  },
}
```

### 5.3 Database Types Generation

```bash
# Generate types from Supabase
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.types.ts
```

### 5.4 Entity Types

```typescript
// src/types/entities.ts
import type { Database } from './database.types'

// Extract table types
type Tables = Database['public']['Tables']

// Base entities
export type Direction = Tables['directions']['Row']
export type DirectionInsert = Tables['directions']['Insert']
export type DirectionUpdate = Tables['directions']['Update']

export type Area = Tables['areas']['Row']
export type AreaInsert = Tables['areas']['Insert']
export type AreaUpdate = Tables['areas']['Update']

export type Goal = Tables['goals']['Row']
export type GoalInsert = Tables['goals']['Insert']
export type GoalUpdate = Tables['goals']['Update']

export type Phase = Tables['phases']['Row']
export type PhaseInsert = Tables['phases']['Insert']
export type PhaseUpdate = Tables['phases']['Update']

export type Task = Tables['tasks']['Row']
export type TaskInsert = Tables['tasks']['Insert']
export type TaskUpdate = Tables['tasks']['Update']

export type CheckIn = Tables['checkins']['Row']
export type CheckInInsert = Tables['checkins']['Insert']
export type CheckInUpdate = Tables['checkins']['Update']

export type DailyReflection = Tables['daily_reflections']['Row']

// Enums
export type GoalStatus = 'backlog' | 'active' | 'completed' | 'maintenance' | 'paused' | 'archive'

export type CheckInStatus = 'done' | 'skip' | 'miss'

export type TimeSlot =
  | 'morning' // 6-9
  | 'late_morning' // 9-12
  | 'afternoon' // 12-18
  | 'evening' // 18-21
  | 'night' // 21-24
  | 'free' // Anytime

export type RepeatType = 'daily' | 'weekdays' | 'weekly' | 'custom'

// Extended types with relations
export interface TaskWithRelations extends Task {
  phase?: Phase
  goal: GoalWithArea
  checkins?: CheckIn[]
}

export interface GoalWithArea extends Goal {
  area: Area
}

export interface GoalWithPhases extends Goal {
  area: Area
  phases: Phase[]
}
```

---

## 6. State Management

### 6.1 State Categories

| Category            | Solution        | Use Case                                |
| ------------------- | --------------- | --------------------------------------- |
| Server State        | TanStack Query  | Data from Supabase (tasks, goals, etc.) |
| Global Client State | Zustand         | User session, app settings, navigation  |
| URL State           | nuqs            | Filters, search, pagination             |
| Local UI State      | useState        | Form inputs, modals, dropdowns          |
| Form State          | react-hook-form | Complex forms with validation           |

### 6.2 TanStack Query Setup

```typescript
// src/components/providers/query-provider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### 6.3 Query Key Factory

```typescript
// src/queries/keys.ts
export const queryKeys = {
  // Direction
  direction: {
    all: ['direction'] as const,
    detail: () => [...queryKeys.direction.all, 'detail'] as const,
  },

  // Areas
  areas: {
    all: ['areas'] as const,
    list: () => [...queryKeys.areas.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.areas.all, 'detail', id] as const,
  },

  // Goals
  goals: {
    all: ['goals'] as const,
    list: (filters?: { status?: string; areaId?: string }) =>
      [...queryKeys.goals.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.goals.all, 'detail', id] as const,
    byArea: (areaId: string) => [...queryKeys.goals.all, 'area', areaId] as const,
  },

  // Tasks
  tasks: {
    all: ['tasks'] as const,
    today: (date: string) => [...queryKeys.tasks.all, 'today', date] as const,
    byGoal: (goalId: string) => [...queryKeys.tasks.all, 'goal', goalId] as const,
  },

  // Check-ins
  checkins: {
    all: ['checkins'] as const,
    byDate: (date: string) => [...queryKeys.checkins.all, 'date', date] as const,
    byTask: (taskId: string) => [...queryKeys.checkins.all, 'task', taskId] as const,
    streak: (taskId: string) => [...queryKeys.checkins.all, 'streak', taskId] as const,
  },
}
```

### 6.4 Query Hooks Example

```typescript
// src/queries/task.queries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'

import { taskService } from '@/services/task.service'
import { queryKeys } from './keys'

import type { TaskInsert, TaskUpdate } from '@/types/entities'

// Get today's tasks
export function useTodayTasks(date?: Date) {
  const dateStr = format(date ?? new Date(), 'yyyy-MM-dd')

  return useQuery({
    queryKey: queryKeys.tasks.today(dateStr),
    queryFn: () => taskService.getByDate(dateStr),
  })
}

// Create task mutation
export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (task: TaskInsert) => taskService.create(task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
    },
  })
}

// Update task mutation
export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: TaskUpdate }) =>
      taskService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
    },
  })
}
```

### 6.5 Zustand Store Example

```typescript
// src/stores/user-store.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import type { User } from '@supabase/supabase-js'

interface UserState {
  user: User | null
  isLoading: boolean
  hasCompletedOnboarding: boolean

  // Actions
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setOnboardingComplete: (complete: boolean) => void
  reset: () => void
}

const initialState = {
  user: null,
  isLoading: true,
  hasCompletedOnboarding: false,
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      ...initialState,

      setUser: (user) => set({ user, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      setOnboardingComplete: (hasCompletedOnboarding) => set({ hasCompletedOnboarding }),
      reset: () => set(initialState),
    }),
    {
      name: 'inu-user-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      }),
    }
  )
)
```

### 6.6 URL State with nuqs

```typescript
// src/features/roadmap/hooks/use-roadmap-filters.ts
import { useQueryState, parseAsString, parseAsStringEnum } from 'nuqs'

const viewOptions = ['tree', 'card'] as const
const statusOptions = ['active', 'backlog', 'all'] as const

export function useRoadmapFilters() {
  const [view, setView] = useQueryState('view', parseAsStringEnum(viewOptions).withDefault('tree'))

  const [status, setStatus] = useQueryState(
    'status',
    parseAsStringEnum(statusOptions).withDefault('active')
  )

  const [areaId, setAreaId] = useQueryState('area', parseAsString)

  return {
    view,
    setView,
    status,
    setStatus,
    areaId,
    setAreaId,
  }
}
```

---

## 7. Component Architecture

### 7.1 UI Primitives

Base components that implement design system tokens.

```typescript
// src/components/ui/button/button.tsx
import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils/cn';

const buttonVariants = cva(
  // Base styles
  `inline-flex items-center justify-center gap-2
   font-semibold transition-all duration-fast
   focus-visible:outline-none focus-visible:ring-2
   focus-visible:ring-primary-500 focus-visible:ring-offset-2
   disabled:pointer-events-none disabled:opacity-50`,
  {
    variants: {
      variant: {
        primary: `bg-primary-500 text-white
                  hover:bg-primary-600 hover:-translate-y-0.5
                  active:bg-primary-700 active:translate-y-0`,
        secondary: `bg-muted text-primary border border-default
                    hover:bg-emphasis hover:border-emphasis`,
        ghost: `bg-transparent text-secondary
                hover:bg-muted hover:text-primary`,
        done: `bg-done text-white hover:brightness-110`,
        skip: `bg-skip-bg text-skip border border-skip-border
               hover:bg-emphasis`,
      },
      size: {
        sm: 'h-11 px-4 text-sm rounded-lg',
        md: 'h-14 px-6 text-base rounded-xl',
        lg: 'h-16 px-8 text-lg rounded-xl',
        icon: 'h-11 w-11 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
```

### 7.2 Glass Card Component

```typescript
// src/components/ui/glass-card/glass-card.tsx
import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils/cn';

const glassCardVariants = cva(
  'rounded-card transition-all duration-normal',
  {
    variants: {
      level: {
        1: `bg-[var(--glass-1-bg)] backdrop-blur-[var(--glass-1-blur)]
            border border-[var(--glass-1-border)]
            shadow-[var(--glass-1-shadow)]`,
        2: `bg-[var(--glass-2-bg)] backdrop-blur-[var(--glass-2-blur)]
            border border-[var(--glass-2-border)]
            shadow-[var(--glass-2-shadow)]`,
        3: `bg-[var(--glass-3-bg)] backdrop-blur-[var(--glass-3-blur)]
            border border-[var(--glass-3-border)]
            shadow-[var(--glass-3-shadow)]`,
        4: `bg-[var(--glass-4-bg)] backdrop-blur-[var(--glass-4-blur)]
            border border-[var(--glass-4-border)]
            shadow-[var(--glass-4-shadow)]`,
      },
    },
    defaultVariants: {
      level: 2,
    },
  }
);

interface GlassCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> {}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, level, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(glassCardVariants({ level, className }))}
        {...props}
      />
    );
  }
);

GlassCard.displayName = 'GlassCard';
```

### 7.3 Domain Component: Task Card

```typescript
// src/components/common/task-card/task-card.tsx
'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';

import { cn } from '@/lib/utils/cn';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { AreaChip } from '@/components/common/area-chip';
import { StreakBadge } from '@/components/common/streak-badge';
import { WhyChain } from '@/components/common/why-chain';

import type { TaskWithRelations, CheckInStatus } from '@/types/entities';

interface TaskCardProps {
  task: TaskWithRelations;
  streak: number;
  showWhy?: boolean;
  onCheckin?: (status: CheckInStatus) => void;
  className?: string;
}

export const TaskCard = memo(function TaskCard({
  task,
  streak,
  showWhy = false,
  onCheckin,
  className,
}: TaskCardProps) {
  const { goal } = task;
  const area = goal.area;

  return (
    <GlassCard
      level={2}
      className={cn(
        'p-4 hover:-translate-y-0.5 hover:shadow-card-hover',
        className
      )}
    >
      {/* Header: Area + Streak */}
      <div className="mb-3 flex items-center justify-between">
        <AreaChip
          name={area.name}
          emoji={area.emoji}
          color={area.color}
        />
        {streak > 0 && <StreakBadge count={streak} />}
      </div>

      {/* Task Name */}
      <h3 className="mb-1 text-lg font-semibold text-primary">
        {task.name}
      </h3>

      {/* Phase & Goal */}
      <p className="mb-3 text-sm text-secondary">
        {task.phase?.name && `${task.phase.name} · `}
        {goal.name}
      </p>

      {/* Why Chain (collapsible) */}
      {showWhy && task.why && (
        <WhyChain
          taskWhy={task.why}
          goalWhy={goal.why}
          areaWhy={area.why}
          className="mb-4"
        />
      )}

      {/* Action Buttons */}
      {onCheckin && (
        <div className="flex gap-2">
          <Button
            variant="done"
            size="sm"
            className="flex-1"
            onClick={() => onCheckin('done')}
          >
            Done
          </Button>
          <Button
            variant="skip"
            size="sm"
            className="flex-1"
            onClick={() => onCheckin('skip')}
          >
            Skip
          </Button>
        </div>
      )}
    </GlassCard>
  );
});
```

### 7.4 Feature Module: Check-in

```typescript
// src/features/checkin/hooks/use-checkin.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { checkinService } from '@/services/checkin.service'
import { queryKeys } from '@/queries/keys'

import type { CheckInStatus } from '@/types/entities'

interface CheckinParams {
  taskId: string
  date: string
  status: CheckInStatus
}

export function useCheckin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, date, status }: CheckinParams) =>
      checkinService.create({ task_id: taskId, date, status }),

    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.today(variables.date),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.checkins.streak(variables.taskId),
      })
    },
  })
}
```

```typescript
// src/features/checkin/utils/streak-calculator.ts
import type { CheckIn } from '@/types/entities'

export function calculateStreak(checkins: CheckIn[]): number {
  if (checkins.length === 0) return 0

  // Sort by date descending
  const sorted = [...checkins].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  let streak = 0
  let currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)

  for (const checkin of sorted) {
    const checkinDate = new Date(checkin.date)
    checkinDate.setHours(0, 0, 0, 0)

    const diffDays = Math.floor(
      (currentDate.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Allow for today or yesterday
    if (diffDays > 1) break

    if (checkin.status === 'done') {
      streak++
      currentDate = checkinDate
      currentDate.setDate(currentDate.getDate() - 1)
    } else if (checkin.status === 'skip') {
      // Skip doesn't break streak but doesn't count
      currentDate = checkinDate
      currentDate.setDate(currentDate.getDate() - 1)
    } else {
      // Miss breaks the streak
      break
    }
  }

  return streak
}

export function isMilestoneStreak(streak: number): boolean {
  return streak > 0 && streak % 5 === 0
}
```

---

## 8. Testing Strategy

### 8.1 Testing Pyramid

| Level       | Tool         | Coverage Target | Focus                        |
| ----------- | ------------ | --------------- | ---------------------------- |
| Unit        | Vitest       | 80%+            | Utils, hooks, pure functions |
| Integration | Vitest + RTL | 60%+            | Components, service layer    |
| E2E         | Playwright   | Critical paths  | User flows                   |

### 8.2 Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### 8.3 Test Setup

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))
```

### 8.4 Component Test Example

```typescript
// src/components/common/task-card/task-card.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { TaskCard } from './task-card';

const mockTask = {
  id: '1',
  name: 'Morning Run',
  why: 'Build endurance',
  goal_id: 'g1',
  goal: {
    id: 'g1',
    name: '10km Marathon',
    why: 'Stay healthy',
    area: {
      id: 'a1',
      name: 'Health',
      emoji: '💪',
      color: '#10b981',
      why: 'Long healthy life',
    },
  },
  phase: {
    id: 'p1',
    name: 'Foundation',
  },
};

describe('TaskCard', () => {
  it('renders task information correctly', () => {
    render(<TaskCard task={mockTask} streak={5} />);

    expect(screen.getByText('Morning Run')).toBeInTheDocument();
    expect(screen.getByText(/Foundation/)).toBeInTheDocument();
    expect(screen.getByText(/10km Marathon/)).toBeInTheDocument();
    expect(screen.getByText('💪')).toBeInTheDocument();
  });

  it('displays streak badge when streak > 0', () => {
    render(<TaskCard task={mockTask} streak={12} />);

    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('calls onCheckin with correct status', () => {
    const onCheckin = vi.fn();
    render(<TaskCard task={mockTask} streak={0} onCheckin={onCheckin} />);

    fireEvent.click(screen.getByText('Done'));
    expect(onCheckin).toHaveBeenCalledWith('done');

    fireEvent.click(screen.getByText('Skip'));
    expect(onCheckin).toHaveBeenCalledWith('skip');
  });

  it('shows why chain when showWhy is true', () => {
    render(<TaskCard task={mockTask} streak={0} showWhy />);

    expect(screen.getByText('Build endurance')).toBeInTheDocument();
  });
});
```

### 8.5 Playwright E2E Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

### 8.6 E2E Test Example

```typescript
// tests/checkin-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Check-in Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login (assumes test user exists)
    await page.goto('/login')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'testpassword')
    await page.click('button[type="submit"]')
    await page.waitForURL('/today')
  })

  test('can complete a check-in', async ({ page }) => {
    // Find first task card
    const taskCard = page.locator('[data-testid="task-card"]').first()

    // Click Done button
    await taskCard.locator('button:has-text("Done")').click()

    // Verify success animation/state
    await expect(taskCard).toHaveAttribute('data-status', 'done')
  })

  test('can skip a task', async ({ page }) => {
    const taskCard = page.locator('[data-testid="task-card"]').first()

    await taskCard.locator('button:has-text("Skip")').click()

    await expect(taskCard).toHaveAttribute('data-status', 'skip')
  })
})
```

---

## 9. Performance Optimization

### 9.1 Core Web Vitals Targets

| Metric | Target  | Strategy                          |
| ------ | ------- | --------------------------------- |
| LCP    | < 2.5s  | Image optimization, critical CSS  |
| FID    | < 100ms | Code splitting, minimal JS        |
| CLS    | < 0.1   | Reserved space, font loading      |
| TTFB   | < 600ms | Edge caching, server optimization |

### 9.2 Next.js Optimizations

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Enable Turbopack for development
  experimental: {
    turbo: {},
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },

  // Headers for caching
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

export default nextConfig
```

### 9.3 Component Optimization Patterns

```typescript
// Lazy loading for heavy components
import dynamic from 'next/dynamic';

const CalendarWeekView = dynamic(
  () => import('@/features/calendar/components/week-view'),
  {
    loading: () => <CalendarSkeleton />,
    ssr: false, // Disable SSR for client-heavy components
  }
);

// Memoization for expensive renders
import { memo, useMemo } from 'react';

export const TaskList = memo(function TaskList({ tasks, date }) {
  const groupedTasks = useMemo(
    () => groupTasksByTimeSlot(tasks),
    [tasks]
  );

  return (
    <div>
      {Object.entries(groupedTasks).map(([slot, slotTasks]) => (
        <TimeSlotGroup key={slot} slot={slot} tasks={slotTasks} />
      ))}
    </div>
  );
});
```

### 9.4 Data Fetching Optimization

```typescript
// Parallel data fetching in Server Components
// app/(main)/today/page.tsx
import { Suspense } from 'react';

import { TodayHeader } from '@/features/today/components/today-header';
import { TaskList } from '@/features/today/components/task-list';
import { TaskListSkeleton } from '@/features/today/components/task-list-skeleton';

export default async function TodayPage() {
  return (
    <div>
      <TodayHeader />
      <Suspense fallback={<TaskListSkeleton />}>
        <TaskList />
      </Suspense>
    </div>
  );
}
```

---

## 10. Security Guidelines

### 10.1 Environment Variables

```bash
# .env.local (never commit)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# Server-only (for admin operations)
SUPABASE_SERVICE_ROLE_KEY=xxx
```

```bash
# .env.example (commit this)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### 10.2 Supabase Row Level Security

All tables must have RLS enabled. Example policies:

```sql
-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tasks
CREATE POLICY "Users can view own tasks" ON tasks
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own tasks
CREATE POLICY "Users can insert own tasks" ON tasks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own tasks
CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only delete their own tasks
CREATE POLICY "Users can delete own tasks" ON tasks
  FOR DELETE
  USING (auth.uid() = user_id);
```

### 10.3 Input Validation

```typescript
// src/lib/utils/validation.ts
import { z } from 'zod'

export const taskSchema = z.object({
  name: z.string().min(1).max(200),
  why: z.string().max(500).optional(),
  goal_id: z.string().uuid(),
  phase_id: z.string().uuid().optional(),
  repeat_type: z.enum(['daily', 'weekdays', 'weekly', 'custom']),
  repeat_days: z.array(z.number().min(0).max(6)).optional(),
  time_slot: z
    .enum(['morning', 'late_morning', 'afternoon', 'evening', 'night', 'free'])
    .optional(),
  duration_minutes: z.number().min(1).max(480).optional(),
})

export type TaskFormData = z.infer<typeof taskSchema>
```

### 10.4 Authentication Flow

```typescript
// src/components/providers/auth-provider.tsx
'use client';

import { createContext, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';
import { useUserStore } from '@/stores/user-store';

const AuthContext = createContext<{ signOut: () => Promise<void> } | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { setUser, setLoading } = useUserStore();
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase, setUser]);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

---

## 11. Development Workflow

### 11.1 NPM Scripts

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "db:types": "supabase gen types typescript --project-id $PROJECT_ID > src/types/database.types.ts",
    "prepare": "husky"
  }
}
```

### 11.2 Git Hooks (Husky + lint-staged)

```bash
# .husky/pre-commit
npx lint-staged
```

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
}
```

### 11.3 Git Commit Convention

```
type(scope): description

Types:
- feat: New feature
- fix: Bug fix
- refactor: Code refactoring
- style: Style/formatting changes
- docs: Documentation
- test: Tests
- chore: Build/tooling

Examples:
- feat(checkin): add confetti animation for milestone streaks
- fix(task-card): correct streak calculation for skipped days
- refactor(queries): migrate to query key factory pattern
```

### 11.4 Branch Strategy

| Branch       | Purpose               |
| ------------ | --------------------- |
| `main`       | Production-ready code |
| `develop`    | Integration branch    |
| `feature/*`  | New features          |
| `fix/*`      | Bug fixes             |
| `refactor/*` | Refactoring           |

### 11.5 Recommended VS Code Extensions

```json
// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-playwright.playwright",
    "vitest.explorer"
  ]
}
```

### 11.6 VS Code Settings

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "tailwindCSS.experimental.classRegex": [["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]]
}
```

---

## Related Documents

- [Philosophy & Target User](plan/core/philosophy.md)
- [Data Model](plan/core/data-model.md)
- [Design Guide](plan/core/design-guide.md)
- [MVP Scope](plan/reference/strategy/mvp-scope.md)

---

## Version History

| Version | Date       | Changes                       |
| ------- | ---------- | ----------------------------- |
| 1.0     | 2026-02-03 | Initial architecture document |
