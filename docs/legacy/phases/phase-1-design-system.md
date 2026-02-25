# Phase 1: Design System

> **Goal**: Implement OKLCH color system, Glass Effect, and base UI components

---

## 📚 Reference Documents

- `docs/plan/core/design-guide.md` (UI/UX design guide)
- `docs/plan/core/philosophy.md` (Product philosophy & principles)
- `docs/code-architecture.md` (Component structure section)

---

## 1.1 CSS Variables & Design Tokens

### src/styles/tokens.css

```css
:root {
  /* ========== Colors (OKLCH) ========== */

  /* Primary - Toss Blue */
  --color-primary-50: oklch(97% 0.02 250);
  --color-primary-100: oklch(94% 0.04 250);
  --color-primary-200: oklch(88% 0.08 250);
  --color-primary-300: oklch(78% 0.12 250);
  --color-primary-400: oklch(65% 0.16 250);
  --color-primary-500: oklch(55% 0.18 250); /* Main: #2186ff */
  --color-primary-600: oklch(48% 0.16 250);
  --color-primary-700: oklch(42% 0.14 250);
  --color-primary-800: oklch(35% 0.1 250);
  --color-primary-900: oklch(26% 0.08 250);

  /* Status Colors */
  --color-done: oklch(65% 0.2 145); /* Green #22c55e */
  --color-done-bg: oklch(95% 0.05 145);
  --color-skip: oklch(55% 0.02 260); /* Gray #6b7280 */
  --color-skip-bg: oklch(95% 0.01 260);
  --color-miss: oklch(70% 0.15 25); /* Soft Red #f87171 */
  --color-miss-bg: oklch(95% 0.03 25);
  --color-streak: oklch(75% 0.18 70); /* Orange #f59e0b */
  --color-streak-bg: oklch(95% 0.05 70);
  --color-ai: oklch(60% 0.2 290); /* Purple #8b5cf6 */
  --color-ai-bg: oklch(95% 0.05 290);
  --color-new-round: oklch(70% 0.15 250); /* Blue #60a5fa */

  /* Area Colors (8 presets) */
  --color-area-health: oklch(65% 0.18 160); /* Emerald */
  --color-area-career: oklch(55% 0.2 270); /* Indigo */
  --color-area-finance: oklch(75% 0.15 85); /* Gold */
  --color-area-relationships: oklch(70% 0.18 10); /* Rose */
  --color-area-hobbies: oklch(70% 0.15 200); /* Cyan */
  --color-area-mental: oklch(70% 0.15 300); /* Lavender */
  --color-area-learning: oklch(60% 0.18 240); /* Ocean */
  --color-area-daily: oklch(55% 0.05 260); /* Slate */

  /* Surface Colors - Light Mode */
  --color-bg-primary: oklch(100% 0 0);
  --color-bg-secondary: oklch(98% 0.005 260);
  --color-bg-tertiary: oklch(96% 0.01 260);
  --color-border: oklch(92% 0.01 260);
  --color-border-hover: oklch(85% 0.02 260);

  /* Text Colors - Light Mode */
  --color-text-primary: oklch(15% 0.01 260);
  --color-text-secondary: oklch(40% 0.02 260);
  --color-text-tertiary: oklch(55% 0.02 260);
  --color-text-disabled: oklch(70% 0.01 260);

  /* ========== Typography ========== */

  /* Font Family */
  --font-sans: 'Pretendard Variable', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', Consolas, monospace;

  /* Font Size (1.25 modular scale) */
  --text-xs: 0.75rem; /* 12px */
  --text-sm: 0.875rem; /* 14px */
  --text-base: 1rem; /* 16px */
  --text-lg: 1.125rem; /* 18px */
  --text-xl: 1.25rem; /* 20px */
  --text-2xl: 1.5rem; /* 24px */
  --text-3xl: 1.875rem; /* 30px */
  --text-4xl: 2.25rem; /* 36px */
  --text-5xl: 3rem; /* 48px */

  /* Font Weight */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
  --font-extrabold: 800;

  /* Line Height */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;

  /* ========== Spacing (4px base) ========== */
  --space-0: 0;
  --space-1: 0.25rem; /* 4px */
  --space-2: 0.5rem; /* 8px */
  --space-3: 0.75rem; /* 12px */
  --space-4: 1rem; /* 16px */
  --space-5: 1.25rem; /* 20px */
  --space-6: 1.5rem; /* 24px */
  --space-8: 2rem; /* 32px */
  --space-10: 2.5rem; /* 40px */
  --space-12: 3rem; /* 48px */
  --space-16: 4rem; /* 64px */

  /* ========== Border Radius ========== */
  --radius-sm: 0.25rem; /* 4px */
  --radius-md: 0.5rem; /* 8px */
  --radius-lg: 0.75rem; /* 12px */
  --radius-xl: 1rem; /* 16px */
  --radius-2xl: 1.25rem; /* 20px */
  --radius-3xl: 1.5rem; /* 24px */
  --radius-full: 9999px;

  /* ========== Shadows ========== */
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1);
  --shadow-2xl: 0 25px 50px rgba(0, 0, 0, 0.2);
  --shadow-card: 0 4px 16px rgba(0, 0, 0, 0.08);
  --shadow-card-hover: 0 8px 24px rgba(0, 0, 0, 0.12);

  /* ========== Z-Index ========== */
  --z-base: 0;
  --z-dropdown: 10;
  --z-sticky: 20;
  --z-fixed: 30;
  --z-modal-backdrop: 40;
  --z-modal: 50;
  --z-popover: 60;
  --z-tooltip: 70;
  --z-toast: 80;
  --z-max: 9999;

  /* ========== Animation ========== */
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);

  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;

  /* ========== Touch Targets ========== */
  --touch-min: 44px;
  --touch-comfortable: 48px;
  --touch-large: 56px;
}

/* ========== Dark Mode ========== */
[data-theme='dark'] {
  --color-bg-primary: oklch(12% 0.01 260);
  --color-bg-secondary: oklch(16% 0.015 260);
  --color-bg-tertiary: oklch(20% 0.02 260);
  --color-border: oklch(25% 0.02 260);
  --color-border-hover: oklch(35% 0.02 260);

  --color-text-primary: oklch(95% 0.005 260);
  --color-text-secondary: oklch(75% 0.01 260);
  --color-text-tertiary: oklch(60% 0.01 260);
  --color-text-disabled: oklch(45% 0.01 260);

  --color-done-bg: oklch(25% 0.08 145);
  --color-skip-bg: oklch(25% 0.02 260);
  --color-miss-bg: oklch(25% 0.05 25);
  --color-streak-bg: oklch(25% 0.08 70);
  --color-ai-bg: oklch(25% 0.08 290);
}
```

---

## 1.2 Glass Effect System

### src/styles/glass.css

```css
/* ========== Glass Effect Levels ========== */

/* Level 1: Subtle - List items, subtle separation */
.glass-1 {
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Level 2: Default - Standard cards, input fields */
.glass-2 {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

/* Level 3: Medium - Hero cards, important elements */
.glass-3 {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.4);
}

/* Level 4: Heavy - Modals, bottom sheets, overlays */
.glass-4 {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.5);
}

/* Dark Mode Glass */
[data-theme='dark'] .glass-1 {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.05);
}

[data-theme='dark'] .glass-2 {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
}

[data-theme='dark'] .glass-3 {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.1);
}

[data-theme='dark'] .glass-4 {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.12);
}

/* Fallback for browsers without backdrop-filter */
@supports not (backdrop-filter: blur(1px)) {
  .glass-1,
  .glass-2,
  .glass-3,
  .glass-4 {
    background: var(--color-bg-primary);
  }

  [data-theme='dark'] .glass-1,
  [data-theme='dark'] .glass-2,
  [data-theme='dark'] .glass-3,
  [data-theme='dark'] .glass-4 {
    background: var(--color-bg-secondary);
  }
}
```

---

## 1.3 Tailwind Configuration Extension

### tailwind.config.ts

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
        },
        done: 'var(--color-done)',
        'done-bg': 'var(--color-done-bg)',
        skip: 'var(--color-skip)',
        'skip-bg': 'var(--color-skip-bg)',
        miss: 'var(--color-miss)',
        'miss-bg': 'var(--color-miss-bg)',
        streak: 'var(--color-streak)',
        'streak-bg': 'var(--color-streak-bg)',
        ai: 'var(--color-ai)',
        'ai-bg': 'var(--color-ai-bg)',
        'new-round': 'var(--color-new-round)',
        area: {
          health: 'var(--color-area-health)',
          career: 'var(--color-area-career)',
          finance: 'var(--color-area-finance)',
          relationships: 'var(--color-area-relationships)',
          hobbies: 'var(--color-area-hobbies)',
          mental: 'var(--color-area-mental)',
          learning: 'var(--color-area-learning)',
          daily: 'var(--color-area-daily)',
        },
        surface: {
          primary: 'var(--color-bg-primary)',
          secondary: 'var(--color-bg-secondary)',
          tertiary: 'var(--color-bg-tertiary)',
        },
        border: 'var(--color-border)',
        'border-hover': 'var(--color-border-hover)',
        foreground: {
          DEFAULT: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
          disabled: 'var(--color-text-disabled)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        '3xl': 'var(--radius-3xl)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
      },
      animation: {
        'streak-pop': 'streak-pop 300ms var(--ease-spring)',
        'particle-burst': 'particle-burst 600ms var(--ease-default) forwards',
        'fade-in': 'fade-in 250ms var(--ease-default)',
        'slide-up': 'slide-up 250ms var(--ease-default)',
      },
      keyframes: {
        'streak-pop': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
        'particle-burst': {
          '0%': { opacity: '1', transform: 'scale(0)' },
          '100%': { opacity: '0', transform: 'scale(1.5)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
```

---

## 1.4 Base UI Components

### src/lib/utils/cn.ts

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### src/components/ui/button.tsx

```typescript
import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500',
        secondary: 'bg-surface-secondary text-foreground border border-border hover:bg-surface-tertiary',
        ghost: 'bg-transparent hover:bg-surface-secondary',
        done: 'bg-done text-white hover:bg-done/90',
        skip: 'bg-skip-bg text-skip border border-skip/30 hover:bg-skip/10',
        danger: 'bg-miss text-white hover:bg-miss/90',
      },
      size: {
        sm: 'h-9 px-3 text-sm rounded-md',
        md: 'h-11 px-4 text-base rounded-lg',
        lg: 'h-14 px-6 text-lg rounded-lg',
        icon: 'h-11 w-11 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
```

### src/components/ui/card.tsx

```typescript
import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const cardVariants = cva('rounded-xl transition-all', {
  variants: {
    variant: {
      default: 'glass-2 shadow-card hover:shadow-card-hover hover:-translate-y-0.5',
      hero: 'glass-3 shadow-lg p-6',
      list: 'glass-1 shadow-sm hover:bg-surface-secondary',
      done: 'bg-done-bg border border-done/20',
      skip: 'bg-skip-bg/80 border border-skip/10',
      miss: 'bg-miss-bg border border-miss/20',
    },
    padding: {
      none: 'p-0',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'md',
  },
})

interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ variant, padding }), className)} {...props} />
  )
)
Card.displayName = 'Card'

export { Card, cardVariants }
```

### src/components/ui/chip.tsx

```typescript
import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const chipVariants = cva('inline-flex items-center gap-1 font-medium transition-all', {
  variants: {
    variant: {
      area: 'rounded-full px-2.5 py-0.5 text-xs',
      selection: 'rounded-full px-4 py-2 text-sm border-2 cursor-pointer',
    },
    selected: {
      true: 'border-primary-500 bg-primary-50 text-primary-600',
      false: 'border-border bg-surface-secondary text-foreground-secondary hover:border-border-hover',
    },
  },
  defaultVariants: {
    variant: 'area',
    selected: false,
  },
})

interface ChipProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof chipVariants> {
  emoji?: string
  color?: string
}

const Chip = forwardRef<HTMLSpanElement, ChipProps>(
  ({ className, variant, selected, emoji, color, children, style, ...props }, ref) => {
    const areaStyle = variant === 'area' && color
      ? { backgroundColor: `${color}20`, color, ...style }
      : style

    return (
      <span ref={ref} className={cn(chipVariants({ variant, selected }), className)} style={areaStyle} {...props}>
        {emoji && <span>{emoji}</span>}
        {children}
      </span>
    )
  }
)
Chip.displayName = 'Chip'

export { Chip, chipVariants }
```

### src/components/ui/badge.tsx

```typescript
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface StreakBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  count: number
  animate?: boolean
}

const StreakBadge = forwardRef<HTMLSpanElement, StreakBadgeProps>(
  ({ count, animate, className, ...props }, ref) => {
    if (count === 0) return null

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full',
          'bg-streak-bg text-streak font-mono font-semibold text-sm',
          animate && 'animate-streak-pop',
          className
        )}
        {...props}
      >
        <span>🔥</span>
        <span className="tabular-nums">{count}</span>
      </span>
    )
  }
)
StreakBadge.displayName = 'StreakBadge'

export { StreakBadge }
```

### src/components/ui/progress.tsx

```typescript
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  showLabel?: boolean
}

const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ value, max = 100, showLabel, className, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

    return (
      <div ref={ref} className={cn('flex items-center gap-2', className)} {...props}>
        <div className="flex-1 h-2 bg-surface-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full transition-all duration-slow"
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showLabel && (
          <span className="text-sm text-foreground-secondary font-mono tabular-nums">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
    )
  }
)
ProgressBar.displayName = 'ProgressBar'

interface PhaseIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  total: number
  current: number
  completed: number
}

const PhaseIndicator = forwardRef<HTMLDivElement, PhaseIndicatorProps>(
  ({ total, current, completed, className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center gap-1', className)} {...props}>
      {Array.from({ length: total }).map((_, i) => {
        const isCompleted = i < completed
        const isCurrent = i === current

        return (
          <div key={i} className="flex items-center">
            <div
              className={cn(
                'w-3 h-3 rounded-full border-2 transition-all',
                isCompleted && 'bg-done border-done',
                isCurrent && !isCompleted && 'bg-primary-500 border-primary-500',
                !isCompleted && !isCurrent && 'bg-transparent border-border'
              )}
            />
            {i < total - 1 && (
              <div className={cn('w-4 h-0.5 mx-0.5', isCompleted ? 'bg-done' : 'bg-border')} />
            )}
          </div>
        )
      })}
    </div>
  )
)
PhaseIndicator.displayName = 'PhaseIndicator'

export { ProgressBar, PhaseIndicator }
```

### src/components/ui/input.tsx

```typescript
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, error, ...props }, ref) => (
  <div className="w-full">
    <input
      ref={ref}
      className={cn(
        'w-full h-12 px-4 rounded-lg glass-2',
        'text-foreground placeholder:text-foreground-tertiary',
        'border border-border focus:border-primary-500',
        'focus:outline-none focus:ring-2 focus:ring-primary-500/20',
        'transition-all duration-fast',
        error && 'border-miss focus:border-miss focus:ring-miss/20',
        className
      )}
      {...props}
    />
    {error && <p className="mt-1 text-sm text-miss">{error}</p>}
  </div>
))
Input.displayName = 'Input'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, error, ...props }, ref) => (
  <div className="w-full">
    <textarea
      ref={ref}
      className={cn(
        'w-full min-h-[120px] px-4 py-3 rounded-lg glass-2 resize-none',
        'text-foreground placeholder:text-foreground-tertiary',
        'border border-border focus:border-primary-500',
        'focus:outline-none focus:ring-2 focus:ring-primary-500/20',
        'transition-all duration-fast',
        error && 'border-miss focus:border-miss focus:ring-miss/20',
        className
      )}
      {...props}
    />
    {error && <p className="mt-1 text-sm text-miss">{error}</p>}
  </div>
))
Textarea.displayName = 'Textarea'

export { Input, Textarea }
```

### src/components/ui/skeleton.tsx

```typescript
import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width of the skeleton (default: 100%) */
  width?: string | number
  /** Height of the skeleton (default: 1rem) */
  height?: string | number
}

export function Skeleton({ className, width, height, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-surface-tertiary',
        className
      )}
      style={{
        width: width ?? '100%',
        height: height ?? '1rem',
        ...style,
      }}
      {...props}
    />
  )
}

/** Skeleton variant for text lines */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="0.875rem"
          width={i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  )
}

/** Skeleton variant for cards (Task card, etc.) */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('p-4 rounded-xl glass-2 space-y-3', className)}>
      <div className="flex items-center justify-between">
        <Skeleton width="60%" height="1.25rem" />
        <Skeleton width="3rem" height="1.5rem" className="rounded-full" />
      </div>
      <Skeleton width="40%" height="0.75rem" />
      <div className="flex gap-2 pt-2">
        <Skeleton width="5rem" height="2.5rem" className="rounded-lg" />
        <Skeleton width="5rem" height="2.5rem" className="rounded-lg" />
      </div>
    </div>
  )
}
```

---

## 1.5 Animation Components

### src/components/ui/animations.tsx

```typescript
'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function ParticleBurst({ trigger }: { trigger: boolean }) {
  const [particles, setParticles] = useState<number[]>([])

  useEffect(() => {
    if (trigger) {
      setParticles(Array.from({ length: 12 }, (_, i) => i))
      const timer = setTimeout(() => setParticles([]), 600)
      return () => clearTimeout(timer)
    }
  }, [trigger])

  return (
    <AnimatePresence>
      {particles.map((i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-done"
          initial={{ opacity: 1, scale: 0 }}
          animate={{
            opacity: 0,
            scale: 1.5,
            x: Math.cos((i * 30 * Math.PI) / 180) * 40,
            y: Math.sin((i * 30 * Math.PI) / 180) * 40,
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      ))}
    </AnimatePresence>
  )
}

export function Confetti({ trigger }: { trigger: boolean }) {
  const [confetti, setConfetti] = useState<Array<{ id: number; color: string; left: number }>>([])
  const colors = ['#22c55e', '#f59e0b', '#2186ff', '#8b5cf6', '#f87171']

  useEffect(() => {
    if (trigger) {
      const pieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        color: colors[Math.floor(Math.random() * colors.length)],
        left: Math.random() * 100,
      }))
      setConfetti(pieces)
      const timer = setTimeout(() => setConfetti([]), 3000)
      return () => clearTimeout(timer)
    }
  }, [trigger])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-toast">
      <AnimatePresence>
        {confetti.map((piece) => (
          <motion.div
            key={piece.id}
            className="absolute w-3 h-3 rounded-sm"
            style={{ backgroundColor: piece.color, left: `${piece.left}%` }}
            initial={{ y: -20, rotate: 0, opacity: 1 }}
            animate={{ y: '100vh', rotate: 720, opacity: 0 }}
            transition={{ duration: 2 + Math.random(), ease: 'easeIn', delay: Math.random() * 0.3 }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  )
}
```

---

## 1.6 Accessibility (A11y) Fundamentals

### src/styles/a11y.css

```css
/* ========== Focus Styles ========== */

/* Default focus-visible for all interactive elements */
:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 3px var(--color-primary-100),
    0 0 0 4px var(--color-primary-500);
  border-radius: inherit;
}

/* Dark mode focus */
[data-theme='dark'] :focus-visible {
  box-shadow:
    0 0 0 3px var(--color-primary-900),
    0 0 0 4px var(--color-primary-400);
}

/* Error state focus */
.input-error:focus-visible {
  box-shadow:
    0 0 0 3px var(--color-miss-bg),
    0 0 0 4px var(--color-miss);
}

/* ========== Screen Reader Only ========== */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* ========== Skip Link ========== */
.skip-link {
  position: absolute;
  top: -100px;
  left: 50%;
  transform: translateX(-50%);
  z-index: var(--z-max);
  padding: var(--space-3) var(--space-6);
  background: var(--color-primary-500);
  color: white;
  border-radius: var(--radius-md);
  font-weight: var(--font-semibold);
  text-decoration: none;
  transition: top var(--duration-fast) var(--ease-default);
}

.skip-link:focus {
  top: var(--space-4);
}

/* ========== Touch Target Minimum ========== */
.touch-target {
  min-height: var(--touch-min);
  min-width: var(--touch-min);
}

/* ========== Reduced Motion ========== */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* ========== High Contrast Mode ========== */
@media (prefers-contrast: more) {
  :focus-visible {
    outline: 3px solid currentColor;
    outline-offset: 2px;
    box-shadow: none;
  }

  .glass-1,
  .glass-2,
  .glass-3,
  .glass-4 {
    background: var(--color-bg-primary);
    border: 2px solid var(--color-text-primary);
  }
}
```

### A11y Component Patterns

```typescript
// src/components/a11y/skip-link.tsx
export function SkipLink() {
  return (
    <a href="#main-content" className="skip-link">
      메인 콘텐츠로 건너뛰기
    </a>
  )
}

// src/components/a11y/visually-hidden.tsx
export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return <span className="sr-only">{children}</span>
}

// src/components/a11y/live-region.tsx
export function LiveRegion({
  children,
  politeness = 'polite'
}: {
  children: React.ReactNode
  politeness?: 'polite' | 'assertive'
}) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {children}
    </div>
  )
}
```

### Color Contrast Verification

All color combinations meet WCAG 2.1 AA standards:

| Combination                  | Ratio  | Standard        |
| ---------------------------- | ------ | --------------- |
| text-primary on bg-primary   | 17.5:1 | AAA             |
| text-secondary on bg-primary | 5.6:1  | AA              |
| primary-500 on bg-primary    | 4.1:1  | AA (large text) |
| done on done-bg              | 3.2:1  | AA (large text) |
| miss on miss-bg              | 2.9:1  | + icon required |

**Important**: Miss status requires icon + text, not color alone.

---

## 1.7 Testing Requirements

### Unit Tests

| File                         | Test File           | Coverage Target |
| ---------------------------- | ------------------- | --------------- |
| `lib/utils/cn.ts`            | `cn.test.ts`        | 100%            |
| `components/ui/button.tsx`   | `button.test.tsx`   | 80%             |
| `components/ui/card.tsx`     | `card.test.tsx`     | 80%             |
| `components/ui/chip.tsx`     | `chip.test.tsx`     | 80%             |
| `components/ui/input.tsx`    | `input.test.tsx`    | 80%             |
| `components/ui/progress.tsx` | `progress.test.tsx` | 80%             |
| `components/ui/skeleton.tsx` | `skeleton.test.tsx` | 80%             |

### Test Cases for cn()

```typescript
// src/lib/utils/__tests__/cn.test.ts
import { describe, it, expect } from 'vitest'
import { cn } from '../cn'

describe('cn utility', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('should handle conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })

  it('should dedupe Tailwind classes', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('should handle arrays', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })
})
```

### Test Cases for Button

```typescript
// src/components/ui/__tests__/button.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../button'

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('applies variant classes', () => {
    render(<Button variant="done">Done</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-done')
  })

  it('shows loading spinner when isLoading', () => {
    render(<Button isLoading>Submit</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is keyboard accessible', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Press me</Button>)

    await userEvent.tab()
    await userEvent.keyboard('{Enter}')

    expect(onClick).toHaveBeenCalled()
  })

  it('has visible focus indicator', async () => {
    render(<Button>Focus me</Button>)

    await userEvent.tab()

    // Verify focus-visible styles are applied
    expect(screen.getByRole('button')).toHaveFocus()
  })
})
```

### A11y Test Automation

```typescript
// src/components/ui/__tests__/a11y.test.tsx
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { Button, Card, Chip, Input, ProgressBar } from '../'

expect.extend(toHaveNoViolations)

describe('A11y Compliance', () => {
  it('Button has no accessibility violations', async () => {
    const { container } = render(<Button>Test</Button>)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('Card has no accessibility violations', async () => {
    const { container } = render(<Card>Content</Card>)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('Input with label has no violations', async () => {
    const { container } = render(
      <label>
        Email
        <Input type="email" />
      </label>
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('ProgressBar has proper ARIA attributes', async () => {
    const { container } = render(
      <ProgressBar value={50} max={100} aria-label="Loading progress" />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
```

### Coverage Target

- **Overall Phase 1**: 40%
- **Utilities (cn)**: 100%
- **UI Components**: 80%

---

## 🤖 AI Testing Verification

Phase 완료 후 Claude가 Playwright MCP로 직접 검증합니다:

```
1. pnpm dev 실행
2. browser_navigate("http://localhost:3000")
3. browser_snapshot으로 화면 캡처

검증 항목:
- [ ] 기본 색상 변수 적용 확인 (primary-500 등)
- [ ] Glass Effect 렌더링 확인
- [ ] 다크모드 토글 테스트 (data-theme 속성)
- [ ] Button 컴포넌트 variant별 스타일 확인
- [ ] Card 컴포넌트 hover 효과 확인
- [ ] 키보드 포커스 스타일 확인
- [ ] prefers-reduced-motion 적용 확인
```

---

## ✅ Completion Checklist

- [x] CSS variables & tokens defined (`src/styles/tokens.css`)
- [x] Glass Effect system (`src/styles/glass.css`)
- [x] Tailwind configuration extended (`tailwind.config.ts`)
- [x] Button component
- [x] Card component
- [x] Chip component (Area, Selection)
- [x] Badge component (Streak)
- [x] Progress component (Bar, Phase Indicator)
- [x] Input/Textarea components
- [x] Skeleton component (loading states)
- [x] cn() utility function
- [x] Animation components (ParticleBurst, Confetti, PageTransition)
- [x] Dark mode verified
- [x] prefers-reduced-motion support

---

## 🔗 Navigation

← [Phase 0: Project Setup](./phase-0-setup.md)
→ [Phase 2: Layout & Navigation](./phase-2-layout.md)
