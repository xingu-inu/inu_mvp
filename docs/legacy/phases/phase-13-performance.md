# Phase 13: Performance Optimization

> **Goal**: Achieve Core Web Vitals targets and optimize bundle size

---

## 📚 Reference Documents

- `docs/code-architecture.md` (Performance section)

---

## 13.1 Core Web Vitals Targets

| Metric   | Target  | Meaning                  |
| -------- | ------- | ------------------------ |
| **LCP**  | < 2.5s  | Largest Contentful Paint |
| **FID**  | < 100ms | First Input Delay        |
| **CLS**  | < 0.1   | Cumulative Layout Shift  |
| **TTFB** | < 600ms | Time to First Byte       |

---

## 13.2 Image Optimization

### next.config.ts

```typescript
import type { NextConfig } from 'next'

const config: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
}

export default config
```

### Image Component Usage

```typescript
import Image from 'next/image'

// Optimized image with blur placeholder
export function Avatar({ src, name }: { src?: string; name: string }) {
  if (!src) {
    return (
      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
        <span className="text-primary-500 font-bold">{name[0]}</span>
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={name}
      width={40}
      height={40}
      className="rounded-full"
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD..."
    />
  )
}
```

---

## 13.3 Font Optimization

### src/app/layout.tsx

```typescript
import localFont from 'next/font/local'

const pretendard = localFont({
  src: [
    {
      path: '../fonts/PretendardVariable.woff2',
      weight: '100 900',
      style: 'normal',
    },
  ],
  variable: '--font-pretendard',
  display: 'swap',
  preload: true,
})

const jetbrainsMono = localFont({
  src: '../fonts/JetBrainsMono-Variable.woff2',
  variable: '--font-mono',
  display: 'swap',
  preload: false, // Only preload primary font
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${pretendard.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
```

---

## 13.4 Code Splitting & Dynamic Imports

### Lazy Load Heavy Components

```typescript
import dynamic from 'next/dynamic'

// Lazy load chart components
const CheckInChart = dynamic(
  () => import('@/features/review/components/checkin-chart'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false, // Client-only for charts
  }
)

// Lazy load modal/sheet components
const GoalDetailSheet = dynamic(
  () => import('@/features/roadmap/components/goal-detail-sheet'),
  { ssr: false }
)

// Lazy load animation components
const Confetti = dynamic(
  () => import('@/components/ui/animations').then((mod) => mod.Confetti),
  { ssr: false }
)
```

### Route-based Code Splitting (Automatic with App Router)

```
src/app/
├── (main)/
│   ├── today/page.tsx      → Separate chunk
│   ├── roadmap/page.tsx    → Separate chunk
│   ├── calendar/page.tsx   → Separate chunk
│   └── review/page.tsx     → Separate chunk
```

---

## 13.5 TanStack Query Optimization

### Query Caching Strategy

```typescript
// src/lib/query-client.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache for 5 minutes
      staleTime: 1000 * 60 * 5,

      // Keep in cache for 30 minutes
      gcTime: 1000 * 60 * 30,

      // Don't refetch on window focus (reduce API calls)
      refetchOnWindowFocus: false,

      // Only retry once
      retry: 1,

      // Retry delay
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
})
```

### Prefetching

```typescript
// Prefetch on hover
export function GoalCard({ goal }: { goal: Goal }) {
  const queryClient = useQueryClient()

  const handleMouseEnter = () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.goals.detail(goal.id),
      queryFn: () => goalService.getById(goal.id),
    })
  }

  return (
    <Card onMouseEnter={handleMouseEnter}>
      {/* ... */}
    </Card>
  )
}
```

### Optimistic Updates

```typescript
// Already implemented in useCheckIn hook
onMutate: async (newCheckIn) => {
  await queryClient.cancelQueries({ queryKey: queryKeys.tasks.today(newCheckIn.date) })
  const previousTasks = queryClient.getQueryData(queryKeys.tasks.today(newCheckIn.date))

  // Optimistically update
  queryClient.setQueryData(queryKeys.tasks.today(newCheckIn.date), (old) => {
    // Update logic
  })

  return { previousTasks }
},
onError: (err, newCheckIn, context) => {
  // Rollback on error
  queryClient.setQueryData(
    queryKeys.tasks.today(newCheckIn.date),
    context.previousTasks
  )
},
```

---

## 13.6 Component Optimization

### Memoization

```typescript
import { memo, useMemo, useCallback } from 'react'

// Memoize expensive components
export const TaskCard = memo(function TaskCard({ task }: TaskCardProps) {
  // Component implementation
})

// Memoize expensive calculations
export function useFilteredTasks(tasks: Task[], filters: Filters) {
  return useMemo(() => {
    return tasks
      .filter((t) => matchesFilters(t, filters))
      .sort((a, b) => a.sort_order - b.sort_order)
  }, [tasks, filters])
}

// Memoize callbacks
export function TaskList() {
  const handleCheckIn = useCallback((taskId: string, status: CheckInStatus) => {
    checkIn.mutate({ task_id: taskId, date: today, status })
  }, [checkIn, today])

  return tasks.map((task) => (
    <TaskCard key={task.id} task={task} onCheckIn={handleCheckIn} />
  ))
}
```

### Virtualization for Long Lists

```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

export function VirtualizedTaskList({ tasks }: { tasks: Task[] }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Estimated row height
    overscan: 5,
  })

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <TaskCard task={tasks[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## 13.7 Bundle Analysis

### Add Bundle Analyzer

```bash
pnpm add -D @next/bundle-analyzer
```

### next.config.ts

```typescript
import withBundleAnalyzer from '@next/bundle-analyzer'

const config: NextConfig = {
  // ... other config
}

export default process.env.ANALYZE === 'true'
  ? withBundleAnalyzer({ enabled: true })(config)
  : config
```

### package.json

```json
{
  "scripts": {
    "analyze": "ANALYZE=true pnpm build"
  }
}
```

### Common Optimizations

```typescript
// Import only what you need from date-fns
import { format } from 'date-fns' // ✓ Good
// import * as dateFns from 'date-fns'  // ✗ Bad

// Import specific icons
import { Home, Map } from 'lucide-react' // ✓ Good
// import * as Icons from 'lucide-react'  // ✗ Bad
```

---

## 13.8 Preloading & Prefetching

### Critical CSS

```html
<!-- In layout.tsx head -->
<link
  rel="preload"
  href="/fonts/PretendardVariable.woff2"
  as="font"
  type="font/woff2"
  crossorigin=""
/>
```

### Prefetch Links

```typescript
import Link from 'next/link'

// Next.js automatically prefetches visible links
<Link href="/roadmap" prefetch={true}>
  Roadmap
</Link>

// Disable prefetch for less important links
<Link href="/profile/settings" prefetch={false}>
  Settings
</Link>
```

---

## 13.9 Measuring Performance

### Lighthouse CI

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [push]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Install dependencies
        run: pnpm install
      - name: Build
        run: pnpm build
      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v10
        with:
          configPath: './lighthouserc.json'
```

### lighthouserc.json

```json
{
  "ci": {
    "collect": {
      "startServerCommand": "pnpm start",
      "url": ["http://localhost:3000/today"]
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }]
      }
    }
  }
}
```

---

## ✅ Completion Checklist

- [ ] Image optimization configured
- [ ] Font optimization (local fonts, display: swap)
- [ ] Dynamic imports for heavy components
- [ ] TanStack Query caching strategy
- [ ] Optimistic updates implemented
- [ ] Component memoization where needed
- [ ] Bundle analyzer setup
- [ ] Unused imports removed
- [ ] Lighthouse CI configured
- [ ] Core Web Vitals targets met
  - [ ] LCP < 2.5s
  - [ ] FID < 100ms
  - [ ] CLS < 0.1

---

## 🔗 Navigation

← [Phase 12: Testing & QA](./phase-12-testing.md)
→ [Phase 14: Deployment](./phase-14-deployment.md)

---

_Version: 1.0 | Last Updated: 2026-02-03_
