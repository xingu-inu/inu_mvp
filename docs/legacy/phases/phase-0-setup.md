# Phase 0: Project Initial Setup

> **Goal**: Configure development environment and scaffold Next.js project

---

## 📚 Reference Documents

- `docs/code-architecture.md` (Full architecture)
- `docs/plan/core/philosophy.md` (Project direction)

---

## 0.1 Development Environment Setup

### Node.js Installation

```bash
# Verify Node.js 22.x LTS
node -v  # v22.x.x

# Install pnpm (recommended package manager)
npm install -g pnpm
pnpm -v
```

### Git Initialization

```bash
git init
git branch -M main
```

### .gitignore Configuration

```gitignore
# Dependencies
node_modules/
.pnpm-store/

# Next.js
.next/
out/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
playwright-report/

# Misc
*.log
```

---

## 0.2 Create Next.js Project

```bash
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

**Options:**

- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes
- `src/` directory: Yes
- App Router: Yes
- Import alias: `@/*`

---

## 0.3 Install Core Dependencies

### UI & Styling

```bash
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tabs @radix-ui/react-toast @radix-ui/react-checkbox @radix-ui/react-select @radix-ui/react-switch @radix-ui/react-progress
pnpm add framer-motion lucide-react class-variance-authority clsx tailwind-merge
pnpm add sonner  # Toast notifications (used in Phase 4-5+)
```

### State Management

```bash
pnpm add @tanstack/react-query zustand nuqs
```

### Forms & Validation

```bash
pnpm add react-hook-form @hookform/resolvers zod
```

### Backend (Supabase)

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

### Utilities

```bash
pnpm add date-fns
```

### Dev Dependencies

```bash
# Testing
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
pnpm add -D playwright @playwright/test @playwright/mcp

# Code Quality
pnpm add -D husky lint-staged prettier eslint-config-prettier prettier-plugin-tailwindcss

# Types
pnpm add -D @types/node

# Install Playwright browsers
pnpm exec playwright install chromium
```

---

## 0.4 Create Project Structure

```bash
# Create directory structure
mkdir -p src/app/(auth)
mkdir -p src/app/(main)
mkdir -p src/app/(secondary)
mkdir -p src/app/onboarding
mkdir -p src/app/api

mkdir -p src/components/ui
mkdir -p src/components/common
mkdir -p src/components/layout
mkdir -p src/components/providers

mkdir -p src/features/checkin
mkdir -p src/features/today
mkdir -p src/features/roadmap
mkdir -p src/features/calendar
mkdir -p src/features/review
mkdir -p src/features/onboarding
mkdir -p src/features/ai-advisor

mkdir -p src/lib/supabase
mkdir -p src/lib/utils

mkdir -p src/stores
mkdir -p src/services
mkdir -p src/queries
mkdir -p src/types
mkdir -p src/styles
```

### Final Structure

```
src/
├── app/
│   ├── (auth)/           # Login/Signup
│   │   ├── login/
│   │   └── signup/
│   ├── (main)/           # With BottomNav
│   │   ├── today/
│   │   ├── roadmap/
│   │   ├── calendar/
│   │   └── review/
│   ├── (secondary)/      # TopBar only
│   │   ├── inbox/
│   │   ├── search/
│   │   ├── profile/
│   │   └── ai-hub/
│   ├── onboarding/
│   ├── api/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── components/
│   ├── ui/               # Design system primitives
│   ├── common/           # Domain components
│   ├── layout/           # Layout components
│   └── providers/        # Context Providers
│
├── features/             # Feature modules
│   ├── checkin/
│   ├── today/
│   ├── roadmap/
│   ├── calendar/
│   ├── review/
│   ├── onboarding/
│   └── ai-advisor/
│
├── lib/
│   ├── supabase/         # Supabase clients
│   └── utils/            # Utility functions
│
├── stores/               # Zustand stores
├── services/             # API service layer
├── queries/              # TanStack Query hooks
├── types/                # TypeScript types
└── styles/               # Additional styles
```

---

## 0.5 Environment Variables Setup

### Create .env.local

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Create .env.example (Include in Git)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 0.6 TypeScript Configuration (tsconfig.json)

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## 0.7 Prettier Configuration

### .prettierrc

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

### .prettierignore

```
node_modules
.next
dist
coverage
```

---

## 0.8 ESLint Configuration (eslint.config.mjs)

```javascript
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript', 'prettier'),
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
]

export default eslintConfig
```

---

## 0.9 Husky & lint-staged Setup

```bash
# Initialize Husky
pnpm exec husky init

# Configure pre-commit hook
echo "pnpm lint-staged" > .husky/pre-commit
```

### Add to package.json

```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
}
```

---

## 0.10 Playwright MCP Setup (AI Testing)

Playwright MCP를 통해 Claude가 직접 브라우저를 제어하여 테스트할 수 있습니다.

### .mcp.json (프로젝트 루트)

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

### .claude/settings.local.json 권한 추가

```json
{
  "permissions": {
    "allow": ["mcp__playwright__*"]
  },
  "enableAllProjectMcpServers": true
}
```

### AI Testing 워크플로우

각 Phase 완료 후, Claude가 Playwright MCP를 통해 직접 테스트합니다:

1. **dev 서버 시작**: `pnpm dev`
2. **브라우저 실행**: `browser_navigate` → `http://localhost:3000`
3. **UI 검증**: `browser_snapshot` → 현재 화면 캡처 및 분석
4. **인터랙션 테스트**: `browser_click`, `browser_type` 등으로 사용자 행동 시뮬레이션
5. **결과 확인**: 예상 결과와 비교

---

## 0.11 package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "format": "prettier --write .",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "db:types": "supabase gen types typescript --project-id <project-id> > src/types/database.ts",
    "prepare": "husky"
  }
}
```

---

## ✅ Completion Checklist

- [x] Node.js 22.x+ installed
- [x] pnpm installed
- [x] Next.js project created
- [x] All dependencies installed
- [x] Project structure created
- [x] Environment variable files configured
- [x] TypeScript configured
- [x] Prettier configured
- [x] ESLint configured
- [x] Husky + lint-staged configured
- [x] Playwright MCP configured
- [x] `pnpm dev` runs successfully
- [x] `pnpm build` succeeds
- [x] `pnpm type-check` succeeds

---

## 🤖 AI Testing Verification

Phase 완료 후 Claude가 Playwright MCP로 직접 검증합니다:

```
1. pnpm dev 실행
2. browser_navigate("http://localhost:3000")
3. browser_snapshot으로 화면 확인
4. Next.js 기본 페이지 렌더링 확인
```

---

## 🔗 Next Step

→ [Phase 1: Design System](./phase-1-design-system.md)
