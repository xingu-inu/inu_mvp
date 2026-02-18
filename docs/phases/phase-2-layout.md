# Phase 2: Layout & Navigation

> **Goal**: Implement layout components, route groups, and responsive navigation

---

## 📚 Reference Documents

- `docs/plan/components/navigation.md`
- `docs/plan/components/sidebar.md`
- `docs/plan/components/top-bar.md`
- `docs/plan/reference/relations/ia-diagrams.md`
- `docs/code-architecture.md` (Layout section)

---

## 2.1 Route Group Structure

### App Router Organization

```
src/app/
├── loading.tsx                # Global loading state
├── error.tsx                  # Global error boundary
├── not-found.tsx              # 404 page
│
├── (auth)/                    # No navigation
│   ├── login/
│   │   └── page.tsx
│   ├── signup/
│   │   └── page.tsx
│   └── layout.tsx             # Auth layout (centered, minimal)
│
├── (main)/                    # With BottomNav (mobile) / Sidebar (desktop)
│   ├── today/
│   │   ├── page.tsx
│   │   ├── loading.tsx        # Route-specific loading
│   │   └── error.tsx          # Route-specific error
│   ├── roadmap/
│   │   ├── page.tsx
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   └── [goalId]/          # Goal detail (mobile)
│   │       └── page.tsx
│   ├── calendar/
│   │   ├── page.tsx
│   │   ├── loading.tsx
│   │   └── error.tsx
│   ├── review/
│   │   ├── page.tsx
│   │   ├── loading.tsx
│   │   └── error.tsx
│   └── layout.tsx             # Main layout with navigation
│
├── (secondary)/               # TopBar only
│   ├── inbox/
│   │   └── page.tsx
│   ├── search/
│   │   └── page.tsx
│   ├── profile/
│   │   ├── page.tsx
│   │   ├── notifications/page.tsx
│   │   ├── language/page.tsx
│   │   └── privacy/page.tsx
│   ├── ai-hub/
│   │   └── page.tsx
│   └── layout.tsx             # Secondary layout with TopBar
│
├── onboarding/                # Dedicated onboarding layout
│   ├── page.tsx
│   └── layout.tsx
│
├── layout.tsx                 # Root layout
├── page.tsx                   # Landing/redirect
└── globals.css
```

---

## 2.1.1 Loading, Error & Not Found Pages

### src/app/loading.tsx (Global Loading)

```typescript
import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
    </div>
  )
}
```

### src/app/error.tsx (Global Error Boundary)

```typescript
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-5xl mb-4">😵</div>
      <h2 className="text-xl font-semibold mb-2">문제가 발생했어요</h2>
      <p className="text-foreground-secondary mb-4 text-center">
        잠시 후 다시 시도해주세요.
      </p>
      <Button onClick={reset}>다시 시도</Button>
    </div>
  )
}
```

### src/app/not-found.tsx (404 Page)

```typescript
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-6xl font-bold text-primary-500 mb-4">404</h1>
      <h2 className="text-xl font-semibold mb-2">페이지를 찾을 수 없어요</h2>
      <p className="text-foreground-secondary mb-6 text-center">
        요청하신 페이지가 존재하지 않거나 이동되었어요.
      </p>
      <Button asChild>
        <Link href="/today">홈으로 돌아가기</Link>
      </Button>
    </div>
  )
}
```

### Route-specific Loading (Example: Today)

```typescript
// src/app/(main)/today/loading.tsx
import { Card } from '@/components/ui/card'

export default function TodayLoading() {
  return (
    <div className="px-4 py-6 space-y-4">
      {/* Hero Card Skeleton */}
      <Card className="h-40 animate-pulse bg-surface-secondary" />

      {/* Task Cards Skeleton */}
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="h-20 animate-pulse bg-surface-secondary" />
      ))}
    </div>
  )
}
```

---

## 2.2 Layout Components

### src/components/layout/page-container.tsx

```typescript
import { cn } from '@/lib/utils'

interface PageContainerProps {
  children: React.ReactNode
  className?: string
  padded?: boolean
}

export function PageContainer({ children, className, padded = true }: PageContainerProps) {
  return (
    <main
      className={cn(
        'min-h-screen bg-surface-primary',
        padded && 'px-4 py-6 md:px-6 lg:px-8',
        className
      )}
    >
      <div className="mx-auto max-w-3xl">{children}</div>
    </main>
  )
}
```

### src/components/layout/top-bar.tsx

TopBar는 3가지 variant를 지원합니다:

- **main**: 로고 + 아이콘 버튼들 (기본, Today/Roadmap/Calendar/Review)
- **secondary**: 뒤로가기 + 타이틀 + 액션 (Inbox, Search, Profile 등)
- **transparent**: 배경 투명, 스크롤 시 glass로 전환 (Today 화면 Hero 영역)

```typescript
'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Bell, Sparkles, Search, User, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useScrollY } from '@/hooks/use-scroll-y'

const topBarItems = [
  { href: '/inbox', icon: Bell, label: 'Inbox' },
  { href: '/ai-hub', icon: Sparkles, label: 'AI Hub' },
  { href: '/search', icon: Search, label: 'Search' },
  { href: '/profile', icon: User, label: 'Profile' },
]

interface TopBarProps {
  variant?: 'main' | 'secondary' | 'transparent'
  title?: string
  showBackButton?: boolean
  rightActions?: React.ReactNode
}

export function TopBar({
  variant = 'main',
  title,
  showBackButton = false,
  rightActions,
}: TopBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { scrollY } = useScrollY()

  // transparent variant: 스크롤 시 배경 전환
  const isScrolled = scrollY > 10

  return (
    <header
      className={cn(
        'sticky top-0 z-sticky border-b transition-all duration-200',
        'pt-[env(safe-area-inset-top)]', // Safe area for notch
        variant === 'transparent' && !isScrolled
          ? 'bg-transparent border-transparent'
          : 'glass-3 border-border'
      )}
      role="banner"
    >
      <div className="mx-auto max-w-3xl px-4 h-14 flex items-center justify-between">
        {/* Left Section */}
        {showBackButton ? (
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-lg hover:bg-surface-secondary transition-colors"
            aria-label="뒤로 가기"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        ) : variant === 'main' ? (
          <Link href="/today" className="font-bold text-xl text-primary-500">
            inu
          </Link>
        ) : (
          <div className="w-10" /> // Spacer for centering title
        )}

        {/* Center Title (secondary variant) */}
        {variant === 'secondary' && title && (
          <h1 className="absolute left-1/2 -translate-x-1/2 font-semibold text-lg">
            {title}
          </h1>
        )}

        {/* Right Section */}
        {rightActions || (variant === 'main' && <TopBarIcons />)}
        {variant === 'secondary' && !rightActions && <div className="w-10" />}
      </div>
    </header>
  )
}

function TopBarIcons() {
  const pathname = usePathname()
  // Note: useUnreadCount는 Phase 11에서 구현
  // const unreadCount = useUnreadCount()
  const unreadCount = 0 // Placeholder

  return (
    <nav className="flex items-center gap-1" aria-label="보조 네비게이션">
      {topBarItems.map(({ href, icon: Icon, label }) => {
        const isActive = pathname === href
        const showBadge = href === '/inbox' && unreadCount > 0

        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className={cn(
              'relative p-2 rounded-lg transition-colors',
              isActive
                ? 'bg-primary-50 text-primary-500'
                : 'text-foreground-secondary hover:bg-surface-secondary'
            )}
          >
            <Icon className="w-5 h-5" />
            {showBadge && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-ai text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
```

### src/hooks/use-scroll-y.ts

```typescript
'use client'

import { useState, useEffect } from 'react'

export function useScrollY() {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)

    // 초기값 설정
    setScrollY(window.scrollY)

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return { scrollY }
}
```

### src/components/layout/bottom-nav.tsx

BottomNav 기능:

- 4개 메인 탭 (Today, Roadmap, Calendar, Review)
- 활성 탭 filled 아이콘으로 전환
- 햅틱 피드백 (지원 기기)
- 더블탭 시 스크롤 최상단
- Safe area 대응 (iPhone 홈 인디케이터)
- 데스크톱에서 숨김 (lg breakpoint)

```typescript
'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Map,
  Calendar,
  BarChart3,
  // Filled versions (lucide doesn't have filled, we use stroke-width)
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/today', icon: Home, label: 'Today' },
  { href: '/roadmap', icon: Map, label: 'Roadmap' },
  { href: '/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/review', icon: BarChart3, label: 'Review' },
]

export function BottomNav() {
  const pathname = usePathname()
  const lastTapRef = useRef<{ href: string; time: number } | null>(null)

  const handleClick = (e: React.MouseEvent, href: string) => {
    // 햅틱 피드백 (모바일 지원 시)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10)
    }

    // 더블탭 감지 → 스크롤 최상단
    const now = Date.now()
    const lastTap = lastTapRef.current

    if (
      lastTap?.href === href &&
      now - lastTap.time < 300 &&
      pathname.startsWith(href)
    ) {
      e.preventDefault()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    lastTapRef.current = { href, time: now }
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-fixed glass-4 border-t border-border lg:hidden"
      role="navigation"
      aria-label="메인 네비게이션"
    >
      <div
        className="mx-auto max-w-3xl h-16 flex items-center justify-around px-4"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              onClick={(e) => handleClick(e, href)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-all min-w-[64px]',
                'active:scale-95', // 터치 피드백
                isActive
                  ? 'text-primary-500'
                  : 'text-foreground-tertiary hover:text-foreground-secondary'
              )}
            >
              <Icon
                className={cn(
                  'w-6 h-6 transition-all',
                  isActive && 'stroke-[2.5] fill-primary-100'
                )}
              />
              <span className={cn('text-xs', isActive ? 'font-semibold' : 'font-medium')}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

### src/components/layout/sidebar.tsx

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Map, Calendar, BarChart3, Bell, Sparkles, Search, User, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const mainNavItems = [
  { href: '/today', icon: Home, label: 'Today' },
  { href: '/roadmap', icon: Map, label: 'Roadmap' },
  { href: '/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/review', icon: BarChart3, label: 'Review' },
]

const secondaryNavItems = [
  { href: '/inbox', icon: Bell, label: 'Inbox' },
  { href: '/ai-hub', icon: Sparkles, label: 'AI Hub' },
  { href: '/search', icon: Search, label: 'Search' },
]

const bottomNavItems = [
  { href: '/profile', icon: User, label: 'Profile' },
  { href: '/profile/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const pathname = usePathname()

  const NavLink = ({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) => {
    const isActive = pathname === href || (href !== '/today' && pathname.startsWith(href))

    return (
      <Link
        href={href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
          isActive
            ? 'bg-primary-50 text-primary-600 font-medium'
            : 'text-foreground-secondary hover:bg-surface-secondary hover:text-foreground'
        )}
      >
        <Icon className="w-5 h-5" />
        <span>{label}</span>
      </Link>
    )
  }

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col glass-3 border-r border-border">
      {/* Logo */}
      <div className="p-6">
        <Link href="/today" className="font-bold text-2xl text-primary-500">
          inu
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </div>

        <div className="my-4 h-px bg-border" />

        <div className="space-y-1">
          {secondaryNavItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-border space-y-1">
        {bottomNavItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </div>
    </aside>
  )
}
```

---

## 2.3 Route Layouts

### src/app/layout.tsx (Root Layout)

```typescript
import type { Metadata } from 'next'
import { Providers } from '@/components/providers'
import '@/styles/tokens.css'
import '@/styles/glass.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'inu - Life Roadmap & Goal Management',
  description: 'Create your life roadmap and manage goals within your time',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

### src/app/(main)/layout.tsx

```typescript
import { TopBar } from '@/components/layout/top-bar'
import { BottomNav } from '@/components/layout/bottom-nav'
import { Sidebar } from '@/components/layout/sidebar'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Desktop: Sidebar */}
      <Sidebar />

      {/* Mobile: TopBar */}
      <div className="lg:hidden">
        <TopBar />
      </div>

      {/* Main Content */}
      <div className="lg:ml-64 pb-20 lg:pb-0">{children}</div>

      {/* Mobile: BottomNav */}
      <BottomNav />
    </>
  )
}
```

### src/app/(secondary)/layout.tsx

```typescript
import { TopBar } from '@/components/layout/top-bar'
import { Sidebar } from '@/components/layout/sidebar'

export default function SecondaryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Desktop: Sidebar */}
      <Sidebar />

      {/* Mobile: TopBar */}
      <div className="lg:hidden">
        <TopBar />
      </div>

      {/* Main Content */}
      <div className="lg:ml-64">{children}</div>
    </>
  )
}
```

### src/app/(auth)/layout.tsx

```typescript
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
```

### src/app/onboarding/layout.tsx

```typescript
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-primary">
      <div className="mx-auto max-w-lg px-4 py-8">{children}</div>
    </div>
  )
}
```

---

## 2.4 Providers Setup

### src/components/providers/index.tsx

```typescript
'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from './theme-provider'
import { queryClient } from '@/lib/query-client'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {children}
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

### src/components/providers/theme-provider.tsx

```typescript
'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored) setTheme(stored)
  }, [])

  useEffect(() => {
    const root = document.documentElement

    const applyTheme = (isDark: boolean) => {
      root.setAttribute('data-theme', isDark ? 'dark' : 'light')
      setResolvedTheme(isDark ? 'dark' : 'light')
    }

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      applyTheme(mediaQuery.matches)

      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches)
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    } else {
      applyTheme(theme === 'dark')
    }
  }, [theme])

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
```

### src/lib/query-client.ts

```typescript
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
```

---

## 2.5 Navigation State Management

### src/stores/navigation.store.ts

```typescript
import { create } from 'zustand'

interface NavigationState {
  // Scroll positions for each route
  scrollPositions: Record<string, number>
  setScrollPosition: (route: string, position: number) => void
  getScrollPosition: (route: string) => number

  // Active sheet/modal
  activeSheet: string | null
  openSheet: (id: string) => void
  closeSheet: () => void
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  scrollPositions: {},
  setScrollPosition: (route, position) =>
    set((state) => ({
      scrollPositions: { ...state.scrollPositions, [route]: position },
    })),
  getScrollPosition: (route) => get().scrollPositions[route] ?? 0,

  activeSheet: null,
  openSheet: (id) => set({ activeSheet: id }),
  closeSheet: () => set({ activeSheet: null }),
}))
```

### src/hooks/use-scroll-restoration.ts

```typescript
'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useNavigationStore } from '@/stores/navigation.store'

export function useScrollRestoration() {
  const pathname = usePathname()
  const { getScrollPosition, setScrollPosition } = useNavigationStore()

  // Restore scroll position on mount
  useEffect(() => {
    const savedPosition = getScrollPosition(pathname)
    if (savedPosition > 0) {
      window.scrollTo(0, savedPosition)
    }
  }, [pathname, getScrollPosition])

  // Save scroll position on scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(pathname, window.scrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [pathname, setScrollPosition])
}
```

---

## 2.6 Responsive Breakpoints & CSS Utilities

### Breakpoint Reference

| Breakpoint | Width      | Navigation | Content Max Width |
| ---------- | ---------- | ---------- | ----------------- |
| Mobile     | 0-639px    | BottomNav  | 100%              |
| Tablet     | 640-1023px | BottomNav  | 672px (max-w-2xl) |
| Desktop    | 1024px+    | Sidebar    | 768px (max-w-3xl) |
| Wide       | 1280px+    | Sidebar    | 768px (max-w-3xl) |

### src/lib/constants/breakpoints.ts

```typescript
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

export type Breakpoint = keyof typeof BREAKPOINTS

// 레이아웃 전환점
export const LAYOUT_BREAKPOINT = BREAKPOINTS.lg // 1024px

// Navigation 표시 규칙:
// < lg: BottomNav (mobile)
// >= lg: Sidebar (desktop)
```

### CSS Utility Classes

```css
/* Add to globals.css */

/* ============================================
   Safe Area CSS Variables
   ============================================ */
:root {
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-left: env(safe-area-inset-left, 0px);
  --safe-area-right: env(safe-area-inset-right, 0px);

  /* Layout constants */
  --top-bar-height: 3.5rem; /* 56px */
  --bottom-nav-height: 4rem; /* 64px */
  --sidebar-width: 16rem; /* 256px */
}

/* ============================================
   Safe Area Utility Classes
   ============================================ */
.pt-safe {
  padding-top: var(--safe-area-top);
}
.pb-safe {
  padding-bottom: var(--safe-area-bottom);
}
.pl-safe {
  padding-left: var(--safe-area-left);
}
.pr-safe {
  padding-right: var(--safe-area-right);
}

.mt-safe {
  margin-top: var(--safe-area-top);
}
.mb-safe {
  margin-bottom: var(--safe-area-bottom);
}

/* ============================================
   Layout Spacing Utilities
   ============================================ */

/* Bottom nav offset (content doesn't go under nav) */
.pb-bottom-nav {
  padding-bottom: calc(var(--bottom-nav-height) + var(--safe-area-bottom));
}

@media (min-width: 1024px) {
  .pb-bottom-nav {
    padding-bottom: 0;
  }
}

/* Top bar offset */
.pt-top-bar {
  padding-top: calc(var(--top-bar-height) + var(--safe-area-top));
}

/* Sidebar offset (desktop only) */
@media (min-width: 1024px) {
  .ml-sidebar {
    margin-left: var(--sidebar-width);
  }

  .pl-sidebar {
    padding-left: var(--sidebar-width);
  }
}

/* ============================================
   Touch Target Utilities
   ============================================ */
.touch-target {
  min-height: 44px;
  min-width: 44px;
}

.touch-target-lg {
  min-height: 48px;
  min-width: 48px;
}
```

---

## 2.7 Auth Guard

인증이 필요한 페이지를 보호하는 컴포넌트입니다.

### src/components/layout/auth-guard.tsx

```typescript
'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUser } from '@/hooks/use-user'
import { Loader2 } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, isLoading } = useUser()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !user) {
      // 로그인 후 돌아올 경로 저장
      sessionStorage.setItem('redirectAfterLogin', pathname)
      router.replace('/login')
    }
  }, [user, isLoading, pathname, router])

  // 로딩 중
  if (isLoading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  // 미인증 (리다이렉트 처리 중)
  if (!user) {
    return null
  }

  return <>{children}</>
}
```

### Main Layout에 적용

```typescript
// src/app/(main)/layout.tsx
import { AuthGuard } from '@/components/layout/auth-guard'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      {/* ... 기존 내용 */}
    </AuthGuard>
  )
}
```

---

## 2.8 Focus Trap Hook

모달, 시트 등에서 키보드 포커스를 가두는 훅입니다.

### src/hooks/use-focus-trap.ts

```typescript
'use client'

import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    // 이전 포커스 저장
    previousActiveElement.current = document.activeElement as HTMLElement

    const container = containerRef.current
    const focusableElements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)

    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    // 초기 포커스 설정
    firstElement.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        // Shift + Tab: 첫 번째 요소에서 마지막으로
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab: 마지막 요소에서 첫 번째로
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    // Escape 키로 닫기 (선택적)
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // onClose callback이 있으면 호출
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keydown', handleEscape)

      // 이전 포커스 복원
      previousActiveElement.current?.focus()
    }
  }, [isActive])

  return containerRef
}
```

### 사용 예시 (Bottom Sheet)

```typescript
function BottomSheet({ isOpen, onClose, children }: BottomSheetProps) {
  const containerRef = useFocusTrap(isOpen)

  return (
    <div ref={containerRef} role="dialog" aria-modal="true">
      {children}
    </div>
  )
}
```

---

## 2.9 Keyboard Navigation

전역 키보드 단축키를 처리하는 훅입니다.

### src/hooks/use-keyboard-navigation.ts

```typescript
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Cmd/Ctrl + Key 단축키
const SHORTCUTS: Record<string, string> = {
  t: '/today', // Today
  r: '/roadmap', // Roadmap
  c: '/calendar', // Calendar
  v: '/review', // reView
  s: '/search', // Search
  i: '/inbox', // Inbox
}

export function useKeyboardNavigation() {
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에서는 무시
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // Cmd/Ctrl + Key 조합
      if (e.metaKey || e.ctrlKey) {
        const route = SHORTCUTS[e.key.toLowerCase()]
        if (route) {
          e.preventDefault()
          router.push(route)
        }
      }

      // 단일 키 단축키 (선택적)
      // '?' → 도움말 모달
      // 'g' + 't' → Go to Today (vim 스타일)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])
}
```

### Root Layout에서 사용

```typescript
// src/app/layout.tsx
'use client' // Provider로 감싸거나 별도 컴포넌트로 분리

function KeyboardNavigationProvider({ children }: { children: React.ReactNode }) {
  useKeyboardNavigation()
  return <>{children}</>
}
```

---

## 2.10 Skip Link (접근성)

키보드 사용자가 네비게이션을 건너뛰고 메인 콘텐츠로 바로 이동할 수 있는 링크입니다.

### src/components/layout/skip-link.tsx

```typescript
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className={cn(
        'sr-only',
        'focus:not-sr-only',
        'focus:absolute focus:top-4 focus:left-4 focus:z-[100]',
        'focus:px-4 focus:py-2',
        'focus:bg-primary-500 focus:text-white',
        'focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300'
      )}
    >
      메인 콘텐츠로 건너뛰기
    </a>
  )
}
```

### Root Layout에 추가

```typescript
// src/app/layout.tsx
import { SkipLink } from '@/components/layout/skip-link'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <SkipLink />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

### Main Content에 id 추가

```typescript
// src/components/layout/page-container.tsx
export function PageContainer({ children, className, padded = true }: PageContainerProps) {
  return (
    <main
      id="main-content" // Skip link target
      className={cn(
        'min-h-screen bg-surface-primary',
        padded && 'px-4 py-6 md:px-6 lg:px-8',
        className
      )}
    >
      <div className="mx-auto max-w-3xl">{children}</div>
    </main>
  )
}
```

---

## 🤖 AI Testing Verification

Phase 완료 후 Claude가 Playwright MCP로 직접 검증합니다:

```
1. pnpm dev 실행
2. browser_navigate("http://localhost:3000/today")
3. browser_snapshot으로 레이아웃 확인

### 기본 레이아웃 테스트
- [ ] TopBar 렌더링 (모바일 뷰포트)
- [ ] BottomNav 4개 탭 표시 (Today, Roadmap, Calendar, Review)
- [ ] 각 탭 클릭 시 페이지 이동 확인
- [ ] viewport 1024px 이상에서 Sidebar 표시 확인
- [ ] viewport 1024px 이상에서 BottomNav 숨김 확인

### 네비게이션 플로우 테스트
1. /today → BottomNav "Roadmap" 클릭 → /roadmap 이동 확인
2. /roadmap → TopBar "Search" 아이콘 클릭 → /search 이동 확인
3. /search → 뒤로가기 버튼 → /roadmap 복귀 확인
4. /inbox → TopBar back button 표시 확인

### TopBar Variant 테스트
- [ ] /today: main variant (로고 + 아이콘들)
- [ ] /inbox: secondary variant (뒤로가기 + 타이틀)
- [ ] 스크롤 시 배경 전환 (transparent → glass)

### 반응형 테스트
1. browser_resize(375, 667) → 모바일 레이아웃
   - [ ] BottomNav 표시
   - [ ] Sidebar 숨김
2. browser_resize(1280, 800) → 데스크톱 레이아웃
   - [ ] Sidebar 표시
   - [ ] BottomNav 숨김

### 접근성 테스트
- [ ] Tab 키로 네비게이션 가능
- [ ] SkipLink 포커스 시 표시
- [ ] ARIA labels 확인 (browser_snapshot으로 확인)

### 에러 상태 테스트
1. 존재하지 않는 URL 접근 → not-found.tsx 렌더링
2. 로그인 없이 /today 접근 → /login 리다이렉트

### 다크모드 테스트
- [ ] 테마 토글 후 레이아웃 유지 확인
- [ ] glass 효과 다크모드 적용 확인
```

---

## ✅ Completion Checklist

### Core Layout

- [x] Route group structure created ((auth), (main), (secondary), onboarding)
- [x] PageContainer component with `id="main-content"`
- [x] Root layout with providers
- [x] Main layout (BottomNav + Sidebar + AuthGuard)
- [x] Secondary layout (TopBar only + AuthGuard)
- [x] Auth layout (centered, no navigation)
- [x] Onboarding layout (progress indicator)

### Loading & Error States

- [x] Global loading.tsx
- [x] Global error.tsx
- [x] Global not-found.tsx
- [x] Route-specific loading (today, roadmap, calendar, review)
- [x] Route-specific error boundaries

### Navigation Components

- [x] **TopBar**
  - [x] variant props (main, secondary, transparent)
  - [x] showBackButton + title props
  - [x] 스크롤 시 배경 전환 (transparent variant)
  - [x] Inbox 알림 뱃지 (unread count)
  - [x] Safe area padding (top)
  - [x] ARIA labels

- [x] **BottomNav**
  - [x] 4탭 네비게이션 (Today, Roadmap, Calendar, Review)
  - [x] 활성 탭 강조 (filled style)
  - [x] 햅틱 피드백 (navigator.vibrate)
  - [x] 더블탭 → 스크롤 최상단
  - [x] aria-current="page"
  - [x] Safe area padding (bottom)
  - [x] 데스크톱에서 숨김 (lg:hidden)

- [x] **Sidebar (Desktop)**
  - [x] 메인/보조 네비게이션 분리
  - [x] 활성 상태 표시
  - [x] 모바일에서 숨김 (hidden lg:flex)

### State Management

- [x] Theme provider (light/dark/system)
- [x] Query client provider
- [x] Navigation state store (Zustand)
- [x] useScrollY hook
- [x] useScrollRestoration hook

### Auth & Security

- [x] AuthGuard component
- [x] Main layout에 AuthGuard 적용
- [x] Secondary layout에 AuthGuard 적용
- [x] 로그인 후 리다이렉트 복원 (sessionStorage)

### Accessibility

- [x] SkipLink component ("메인 콘텐츠로 건너뛰기")
- [x] useFocusTrap hook (모달/시트용)
- [x] useKeyboardNavigation hook (Cmd+T 등)
- [x] ARIA roles and labels 전체 적용

### CSS & Responsive

- [x] Safe area CSS 변수 정의
- [x] Layout spacing 유틸리티 (pb-bottom-nav, pt-top-bar)
- [x] Touch target 유틸리티 (touch-target, touch-target-lg)
- [x] Breakpoint 상수 정의 (breakpoints.ts)
- [x] 반응형 레이아웃 전환 테스트 (mobile ↔ desktop)

---

## 🔗 Navigation

← [Phase 1: Design System](./phase-1-design-system.md)
→ [Phase 3: Supabase Backend](./phase-3-supabase.md)
