# Phase 12: Testing & Quality Assurance (Integration Focus)

> **Goal**: Integrate tests from all phases and ensure comprehensive E2E regression coverage

**Important**: Unit and integration tests are now distributed across phases (1-11). Phase 12 focuses on:

- **Test Integration**: Verify all phase tests work together
- **E2E Regression Suite**: Comprehensive end-to-end testing
- **Coverage Verification**: Ensure 80%+ total coverage
- **Test Documentation**: Finalize testing documentation

---

## 📚 Reference Documents

- `docs/code-architecture.md` (Testing section)

---

## 12.0 Distributed Testing Summary

Tests are now implemented in their respective phases:

| Phase        | Test Type                        | Coverage        |
| ------------ | -------------------------------- | --------------- |
| Phase 1      | UI Component Unit                | 40%             |
| Phase 4      | Service + Schema Unit            | 60%             |
| Phase 4.5    | API Response/Repository          | 80%             |
| Phase 5      | Onboarding Store + E2E           | 65%             |
| Phase 6      | TaskCard Integration + E2E       | 70%             |
| Phase 7-9    | Screen Integration               | 65-70%          |
| Phase 11     | AI Rule Engine Unit              | 75%             |
| **Phase 12** | **E2E Regression + Integration** | **80% (total)** |

---

## 12.1 Testing Setup (Verify Configuration)

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/', '**/*.d.ts', '**/*.config.*', '**/types/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### src/test/setup.ts

```typescript
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  }),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
```

---

## 12.2 Unit Tests

### src/lib/utils/**tests**/cn.test.ts

```typescript
import { describe, it, expect } from 'vitest'
import { cn } from '../cn'

describe('cn utility', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })

  it('merges Tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })

  it('handles arrays', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })

  it('handles objects', () => {
    expect(cn({ foo: true, bar: false })).toBe('foo')
  })
})
```

### src/lib/utils/**tests**/task-utils.test.ts

```typescript
import { describe, it, expect } from 'vitest'
import { groupTasksByTimeSlot, sortTasksByPriority } from '../task-utils'
import type { Task } from '@/types/entities'

const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: '1',
  user_id: 'user-1',
  goal_id: null,
  phase_id: null,
  name: 'Test Task',
  why: null,
  repeat_type: 'daily',
  repeat_days: null,
  duration_minutes: 15,
  time_slot: 'morning',
  specific_time: null,
  streak_count: 0,
  best_streak: 0,
  last_check_in_date: null,
  is_active: true,
  sort_order: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

describe('groupTasksByTimeSlot', () => {
  it('groups tasks by time slot', () => {
    const tasks = [
      createMockTask({ id: '1', time_slot: 'morning' }),
      createMockTask({ id: '2', time_slot: 'evening' }),
      createMockTask({ id: '3', time_slot: 'morning' }),
    ]

    const grouped = groupTasksByTimeSlot(tasks)

    expect(grouped.morning).toHaveLength(2)
    expect(grouped.evening).toHaveLength(1)
  })

  it('handles empty array', () => {
    const grouped = groupTasksByTimeSlot([])
    expect(Object.keys(grouped)).toHaveLength(0)
  })
})

describe('sortTasksByPriority', () => {
  it('puts unchecked tasks first', () => {
    const tasks = [
      createMockTask({ id: '1', check_ins: [{ status: 'done' }] as any }),
      createMockTask({ id: '2', check_ins: [] }),
    ]

    const sorted = sortTasksByPriority(tasks)

    expect(sorted[0].id).toBe('2')
    expect(sorted[1].id).toBe('1')
  })

  it('sorts by streak count when both unchecked', () => {
    const tasks = [
      createMockTask({ id: '1', streak_count: 5 }),
      createMockTask({ id: '2', streak_count: 10 }),
    ]

    const sorted = sortTasksByPriority(tasks)

    expect(sorted[0].id).toBe('2')
    expect(sorted[1].id).toBe('1')
  })
})
```

### src/lib/validations/**tests**/schemas.test.ts

```typescript
import { describe, it, expect } from 'vitest'
import { createGoalSchema, createTaskSchema } from '../index'

describe('createGoalSchema', () => {
  it('validates valid goal data', () => {
    const result = createGoalSchema.safeParse({
      area_id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Learn TypeScript',
      why: 'To improve my coding skills',
    })

    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = createGoalSchema.safeParse({
      area_id: '123e4567-e89b-12d3-a456-426614174000',
      name: '',
    })

    expect(result.success).toBe(false)
  })

  it('rejects invalid UUID', () => {
    const result = createGoalSchema.safeParse({
      area_id: 'not-a-uuid',
      name: 'Test Goal',
    })

    expect(result.success).toBe(false)
  })

  it('allows optional fields', () => {
    const result = createGoalSchema.safeParse({
      area_id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Goal',
    })

    expect(result.success).toBe(true)
  })
})

describe('createTaskSchema', () => {
  it('validates valid task data', () => {
    const result = createTaskSchema.safeParse({
      name: 'Morning Run',
      repeat_type: 'daily',
      time_slot: 'morning',
    })

    expect(result.success).toBe(true)
  })

  it('validates custom repeat days', () => {
    const result = createTaskSchema.safeParse({
      name: 'Weekly Review',
      repeat_type: 'custom',
      repeat_days: [1, 3, 5], // Mon, Wed, Fri
    })

    expect(result.success).toBe(true)
  })

  it('rejects invalid time slot', () => {
    const result = createTaskSchema.safeParse({
      name: 'Test Task',
      time_slot: 'invalid',
    })

    expect(result.success).toBe(false)
  })
})
```

---

## 12.3 Component Tests

### src/components/ui/**tests**/button.test.tsx

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('handles click events', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    fireEvent.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('shows loading state', () => {
    render(<Button isLoading>Loading</Button>)

    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('applies variant classes', () => {
    render(<Button variant="done">Done</Button>)

    expect(screen.getByRole('button')).toHaveClass('bg-done')
  })

  it('applies size classes', () => {
    render(<Button size="lg">Large</Button>)

    expect(screen.getByRole('button')).toHaveClass('h-14')
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)

    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

### src/components/ui/**tests**/card.test.tsx

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card } from '../card'

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>)
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('applies variant classes', () => {
    const { container } = render(<Card variant="done">Done card</Card>)
    expect(container.firstChild).toHaveClass('bg-done-bg')
  })

  it('applies padding classes', () => {
    const { container } = render(<Card padding="lg">Large padding</Card>)
    expect(container.firstChild).toHaveClass('p-6')
  })

  it('merges custom className', () => {
    const { container } = render(<Card className="custom-class">Content</Card>)
    expect(container.firstChild).toHaveClass('custom-class')
  })
})
```

### src/features/today/**tests**/task-card.test.tsx

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TaskCard } from '../components/task-card'
import type { Task } from '@/types/entities'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

const mockTask: Task = {
  id: '1',
  user_id: 'user-1',
  goal_id: 'goal-1',
  phase_id: null,
  name: 'Morning Run',
  why: 'To stay healthy',
  repeat_type: 'daily',
  repeat_days: null,
  duration_minutes: 30,
  time_slot: 'morning',
  specific_time: '07:00',
  streak_count: 5,
  best_streak: 10,
  last_check_in_date: null,
  is_active: true,
  sort_order: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  goal: {
    area: {
      id: 'area-1',
      name: 'Health',
      emoji: '💪',
      color: '#10b981',
    },
  } as any,
  check_ins: [],
}

describe('TaskCard', () => {
  it('renders task name', () => {
    render(<TaskCard task={mockTask} />, { wrapper: createWrapper() })
    expect(screen.getByText('Morning Run')).toBeInTheDocument()
  })

  it('displays streak badge', () => {
    render(<TaskCard task={mockTask} />, { wrapper: createWrapper() })
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('shows area chip', () => {
    render(<TaskCard task={mockTask} />, { wrapper: createWrapper() })
    expect(screen.getByText('Health')).toBeInTheDocument()
  })

  it('shows done and skip buttons when unchecked', () => {
    render(<TaskCard task={mockTask} />, { wrapper: createWrapper() })
    expect(screen.getByLabelText('Complete task')).toBeInTheDocument()
    expect(screen.getByLabelText('Skip task')).toBeInTheDocument()
  })

  it('hides buttons when checked in', () => {
    const checkedTask = {
      ...mockTask,
      check_ins: [{ status: 'done' }] as any,
    }
    render(<TaskCard task={checkedTask} />, { wrapper: createWrapper() })
    expect(screen.queryByLabelText('Complete task')).not.toBeInTheDocument()
  })

  it('expands why section on click', () => {
    render(<TaskCard task={mockTask} />, { wrapper: createWrapper() })

    fireEvent.click(screen.getByText('Why?'))

    expect(screen.getByText('To stay healthy')).toBeInTheDocument()
  })
})
```

---

## 12.4 E2E Tests (Playwright)

### playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
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
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

### e2e/onboarding.spec.ts

```typescript
import { test, expect } from '@playwright/test'

test.describe('Onboarding Flow', () => {
  test('completes full onboarding', async ({ page }) => {
    await page.goto('/onboarding')

    // Welcome step
    await expect(page.getByText('Your Life Roadmap Companion')).toBeVisible()
    await page.getByRole('button', { name: 'Get Started' }).click()

    // Values step
    await expect(page.getByText('What matters most to you?')).toBeVisible()
    await page.getByText('Health & Wellness').click()
    await page.getByText('Career Growth').click()
    await page.getByRole('button', { name: 'Continue' }).click()

    // Direction step
    await expect(page.getByText('Define your life direction')).toBeVisible()
    await page
      .getByPlaceholder(/life direction/i)
      .fill('To build a successful career while staying healthy')
    await page.getByRole('button', { name: 'Continue' }).click()

    // Areas step
    await expect(page.getByText('Choose your life areas')).toBeVisible()
    await page.getByText('Health').click()
    await page.getByText('Career').click()
    await page.getByRole('button', { name: 'Continue' }).click()

    // First goal step
    await expect(page.getByText('Set your first goal')).toBeVisible()
    await page.getByPlaceholder(/achieve/i).fill('Run 5km without stopping')
    await page.getByRole('button', { name: 'Complete Setup' }).click()

    // Complete step
    await expect(page.getByText("You're all set!")).toBeVisible()
  })
})
```

### e2e/checkin.spec.ts

```typescript
import { test, expect } from '@playwright/test'

test.describe('Check-in Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to Today
    await page.goto('/today')
  })

  test('completes a task check-in', async ({ page }) => {
    // Find a task card
    const taskCard = page.locator('[data-testid="task-card"]').first()

    // Click done button
    await taskCard.getByLabel('Complete task').click()

    // Verify visual feedback
    await expect(taskCard).toHaveClass(/bg-done/)
  })

  test('skips a task', async ({ page }) => {
    const taskCard = page.locator('[data-testid="task-card"]').first()

    await taskCard.getByLabel('Skip task').click()

    await expect(taskCard).toHaveClass(/bg-skip/)
  })

  test('shows streak animation on milestone', async ({ page }) => {
    // This would require mocking a task with streak_count = 4
    // After check-in, streak becomes 5 (milestone)
    // Verify confetti animation appears
  })
})
```

### e2e/navigation.spec.ts

```typescript
import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('navigates between main tabs', async ({ page }) => {
    await page.goto('/today')

    // Navigate to Roadmap
    await page.getByRole('link', { name: 'Roadmap' }).click()
    await expect(page).toHaveURL('/roadmap')

    // Navigate to Calendar
    await page.getByRole('link', { name: 'Calendar' }).click()
    await expect(page).toHaveURL('/calendar')

    // Navigate to Review
    await page.getByRole('link', { name: 'Review' }).click()
    await expect(page).toHaveURL('/review')

    // Back to Today
    await page.getByRole('link', { name: 'Today' }).click()
    await expect(page).toHaveURL('/today')
  })

  test('responsive navigation on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/today')

    // Bottom nav should be visible
    await expect(
      page.locator('nav').filter({ has: page.getByRole('link', { name: 'Today' }) })
    ).toBeVisible()
  })
})
```

---

## 12.5 Test Coverage Goals

| Category        | Target         | Scope                            |
| --------------- | -------------- | -------------------------------- |
| Unit Tests      | 80%+           | Utils, hooks, services           |
| Component Tests | 60%+           | UI components, features          |
| E2E Tests       | Critical flows | Onboarding, check-in, navigation |

---

## ✅ Completion Checklist

### Test Integration Verification

- [ ] All Phase 1-11 tests passing
- [ ] No test conflicts between phases
- [ ] Test utilities shared correctly

### E2E Regression Suite

- [ ] E2E test for onboarding flow (complete journey)
- [ ] E2E test for check-in flow (done, skip, undo)
- [ ] E2E test for navigation (all routes)
- [ ] E2E test for goal CRUD (create, edit, delete)
- [ ] E2E test for streak milestones (confetti trigger)

### Coverage Verification

- [ ] Total coverage >= 80%
- [ ] All critical paths covered
- [ ] Coverage report generated (HTML, JSON)

### CI/CD Integration

- [ ] GitHub Actions workflow configured
- [ ] Tests run on PR to develop/main
- [ ] Coverage check on PR (fail if < threshold)

### Documentation

- [ ] Test strategy document updated
- [ ] All test files have descriptive names
- [ ] Test data fixtures documented

---

## 🔗 Navigation

← [Phase 11: AI Advisor](./phase-11-ai-advisor.md)
→ [Phase 13: Performance Optimization](./phase-13-performance.md)

---

_Version: 1.0 | Last Updated: 2026-02-03_
