# inu Design Guide

> A refined and approachable design system combining Toss aesthetics with Apple Glassmorphism

---

## 1. Design Philosophy

### Core Philosophy

**"No pressure, no guilt, a companion on your journey"**

inu is a companion that walks alongside users on their journey toward their goals—without judgment.

### Design DNA

```
Toss's clarity + Apple's elegance + Glassmorphism's modernity
= A universally appealing, sophisticated design
```

### 5 Principles

| Principle                  | Description                             | Implementation                                         |
| -------------------------- | --------------------------------------- | ------------------------------------------------------ |
| **Minimal Friction**       | Daily actions require just one tap      | One-tap check-in, large touch targets, clear CTAs      |
| **Instant Feedback**       | Immediate response to every action      | Particle effects, color transitions, streak animations |
| **No Guilt**               | No judgment for missed goals            | Soft colors, Skip option, New Round philosophy         |
| **Context Always**         | Always show the "why"                   | Why Chain visibility, Phase connections                |
| **Progressive Disclosure** | Simple by default, detailed when needed | Expandable UI, bottom sheets, optional inputs          |

### Toss Principles Applied

- **1 thing per 1 page**: One clear objective per screen
- **Casual Concept**: Make complex concepts friendly and easy to understand
- **Minimum Features**: Only show what's necessary

---

## 2. Color System

### 2.1 OKLCH Color Space

OKLCH is a perceptually uniform color space that maintains consistent brightness and saturation.

```
oklch(L% C H)
- L: Lightness (0-100%)
- C: Chroma (0-0.4)
- H: Hue (0-360)
```

### 2.2 Primary Colors (Toss Blue Based)

```css
:root {
  /* === Primary Brand Color === */
  --color-primary-50: oklch(97% 0.02 250); /* #f0f7ff - Lightest background */
  --color-primary-100: oklch(93% 0.04 250); /* #e0efff - Selected state bg */
  --color-primary-200: oklch(87% 0.08 250); /* #b8daff - Hover background */
  --color-primary-300: oklch(78% 0.12 250); /* #7fbfff - Disabled elements */
  --color-primary-400: oklch(68% 0.16 250); /* #4da3ff - Secondary accent */
  --color-primary-500: oklch(58% 0.18 250); /* #2186ff - Main brand color */
  --color-primary-600: oklch(50% 0.18 250); /* #1a6cd4 - Hover state */
  --color-primary-700: oklch(42% 0.16 250); /* #1454a8 - Pressed state */
  --color-primary-800: oklch(34% 0.12 250); /* #103d7c - Dark mode text */
  --color-primary-900: oklch(26% 0.08 250); /* #0c2850 - Dark mode bg */

  /* Hex Fallback */
  --color-primary: #2186ff;
}
```

### 2.3 Status Colors

```css
:root {
  /* === Done/Complete - Warm Green === */
  --color-done: oklch(72% 0.18 145); /* #22c55e */
  --color-done-bg: oklch(95% 0.05 145); /* #f0fdf4 */
  --color-done-border: oklch(85% 0.12 145); /* #86efac */

  /* === Skip - Neutral Gray (No Guilt) === */
  --color-skip: oklch(60% 0.01 260); /* #6b7280 */
  --color-skip-bg: oklch(96% 0.005 260); /* #f9fafb */
  --color-skip-border: oklch(90% 0.01 260); /* #e5e7eb */

  /* === Miss - Soft Red (Not Accusatory) === */
  --color-miss: oklch(65% 0.15 25); /* #f87171 */
  --color-miss-bg: oklch(97% 0.03 25); /* #fef2f2 */
  --color-miss-border: oklch(88% 0.08 25); /* #fecaca */

  /* === Streak/Fire - Passionate Orange === */
  --color-streak: oklch(70% 0.18 55); /* #f59e0b */
  --color-streak-bg: oklch(97% 0.04 55); /* #fffbeb */

  /* === New Round - Gentle Blue === */
  --color-newround: oklch(72% 0.14 250); /* #60a5fa */
  --color-newround-bg: oklch(97% 0.02 250); /* #eff6ff */

  /* === AI Advisor - Trustworthy Purple === */
  --color-ai: oklch(65% 0.16 290); /* #8b5cf6 */
  --color-ai-bg: oklch(97% 0.03 290); /* #f5f3ff */
}
```

### 2.4 Area Colors

8 customizable presets for life areas:

```css
:root {
  /* === Area Default Colors === */

  /* Health 💪 - Emerald */
  --area-health: oklch(65% 0.18 165); /* #10b981 */
  --area-health-light: oklch(95% 0.04 165); /* #ecfdf5 */

  /* Career 📈 - Indigo */
  --area-career: oklch(55% 0.18 275); /* #4f46e5 */
  --area-career-light: oklch(96% 0.03 275); /* #eef2ff */

  /* Finance 💰 - Gold */
  --area-finance: oklch(68% 0.16 85); /* #ca8a04 */
  --area-finance-light: oklch(97% 0.03 85); /* #fefce8 */

  /* Relationships ❤️ - Rose */
  --area-relation: oklch(65% 0.18 10); /* #e11d48 */
  --area-relation-light: oklch(97% 0.03 10); /* #fff1f2 */

  /* Hobbies/Growth 🎨 - Cyan */
  --area-hobby: oklch(68% 0.14 195); /* #06b6d4 */
  --area-hobby-light: oklch(96% 0.03 195); /* #ecfeff */

  /* Mental 🧘 - Lavender */
  --area-mental: oklch(70% 0.12 300); /* #a855f7 */
  --area-mental-light: oklch(97% 0.025 300); /* #faf5ff */

  /* Learning 📚 - Ocean Blue */
  --area-learning: oklch(60% 0.16 230); /* #0284c7 */
  --area-learning-light: oklch(96% 0.025 230); /* #f0f9ff */

  /* Daily 🌱 - Slate */
  --area-daily: oklch(55% 0.02 260); /* #64748b */
  --area-daily-light: oklch(97% 0.005 260); /* #f8fafc */
}
```

### 2.5 Surface & Background Colors

```css
:root {
  /* === Light Mode === */
  --bg-base: oklch(100% 0 0); /* #ffffff - Base background */
  --bg-subtle: oklch(98.5% 0.003 260); /* #fafafa - Section divider */
  --bg-muted: oklch(96% 0.005 260); /* #f4f4f5 - Disabled bg */
  --bg-emphasis: oklch(93% 0.008 260); /* #e4e4e7 - Emphasis bg */

  --surface-default: oklch(100% 0 0); /* #ffffff */
  --surface-raised: oklch(100% 0 0); /* Differentiated by shadow */
  --surface-overlay: oklch(100% 0 0); /* Modal, bottom sheet */

  /* === Text Colors === */
  --text-primary: oklch(15% 0.01 260); /* #18181b - Primary text */
  --text-secondary: oklch(40% 0.01 260); /* #71717a - Secondary text */
  --text-tertiary: oklch(55% 0.01 260); /* #a1a1aa - Hint text */
  --text-placeholder: oklch(65% 0.005 260); /* #d4d4d8 - Placeholder */
  --text-inverse: oklch(100% 0 0); /* #ffffff - Inverse text */

  /* === Border Colors === */
  --border-default: oklch(90% 0.008 260); /* #e4e4e7 */
  --border-subtle: oklch(94% 0.005 260); /* #f4f4f5 */
  --border-emphasis: oklch(80% 0.01 260); /* #a1a1aa */
}
```

### 2.6 Dark Mode

```css
[data-theme='dark'] {
  /* === Dark Mode Surfaces === */
  --bg-base: oklch(12% 0.01 260); /* #09090b */
  --bg-subtle: oklch(15% 0.01 260); /* #18181b */
  --bg-muted: oklch(20% 0.01 260); /* #27272a */
  --bg-emphasis: oklch(28% 0.01 260); /* #3f3f46 */

  --surface-default: oklch(15% 0.01 260); /* #18181b */
  --surface-raised: oklch(18% 0.01 260); /* #1f1f23 */
  --surface-overlay: oklch(20% 0.012 260); /* #27272a */

  /* === Dark Mode Text === */
  --text-primary: oklch(95% 0.005 260); /* #fafafa */
  --text-secondary: oklch(70% 0.005 260); /* #a1a1aa */
  --text-tertiary: oklch(55% 0.005 260); /* #71717a */
  --text-placeholder: oklch(40% 0.005 260); /* #52525b */
  --text-inverse: oklch(12% 0.01 260); /* #18181b */

  /* === Dark Mode Borders === */
  --border-default: oklch(28% 0.01 260); /* #3f3f46 */
  --border-subtle: oklch(22% 0.008 260); /* #27272a */
  --border-emphasis: oklch(40% 0.01 260); /* #52525b */
}
```

---

## 3. Typography

### 3.1 Font Family

```css
:root {
  /* Primary: Optimized for Korean */
  --font-sans:
    'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo',
    'Noto Sans KR', system-ui, sans-serif;

  /* Monospace: Numbers, streaks */
  --font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', 'Consolas', monospace;

  /* Display: Large headings (optional) */
  --font-display: 'Pretendard Variable', var(--font-sans);
}
```

### 3.2 Font Size Scale (1.25 Modular Scale)

```css
:root {
  /* Base: 16px = 1rem */
  --text-xs: 0.75rem; /* 12px - Caption, badge */
  --text-sm: 0.875rem; /* 14px - Secondary text */
  --text-base: 1rem; /* 16px - Body default */
  --text-lg: 1.125rem; /* 18px - Emphasized body */
  --text-xl: 1.25rem; /* 20px - Subheading */
  --text-2xl: 1.5rem; /* 24px - Section title */
  --text-3xl: 1.875rem; /* 30px - Page title */
  --text-4xl: 2.25rem; /* 36px - Hero */
  --text-5xl: 3rem; /* 48px - Large numbers */
}
```

### 3.3 Line Height

```css
:root {
  --leading-none: 1; /* Large numbers */
  --leading-tight: 1.25; /* Headings */
  --leading-snug: 1.375; /* Subheadings */
  --leading-normal: 1.5; /* Body default */
  --leading-relaxed: 1.625; /* Long body text */
  --leading-loose: 2; /* Emphasized sentences */
}
```

### 3.4 Font Weight

```css
:root {
  --font-normal: 400; /* Body */
  --font-medium: 500; /* Emphasized body, labels */
  --font-semibold: 600; /* Buttons, subheadings */
  --font-bold: 700; /* Headings */
  --font-extrabold: 800; /* Hero, large numbers */
}
```

### 3.5 Typography Presets

```css
/* === Headings === */
.heading-hero {
  font-size: var(--text-4xl);
  font-weight: var(--font-extrabold);
  line-height: var(--leading-tight);
  letter-spacing: -0.025em;
}

.heading-page {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
  letter-spacing: -0.02em;
}

.heading-section {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-snug);
}

.heading-card {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  line-height: var(--leading-snug);
}

/* === Body === */
.body-large {
  font-size: var(--text-lg);
  font-weight: var(--font-normal);
  line-height: var(--leading-relaxed);
}

.body-base {
  font-size: var(--text-base);
  font-weight: var(--font-normal);
  line-height: var(--leading-normal);
}

.body-small {
  font-size: var(--text-sm);
  font-weight: var(--font-normal);
  line-height: var(--leading-normal);
}

/* === Utility === */
.caption {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  line-height: var(--leading-normal);
  letter-spacing: 0.01em;
}

.label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  line-height: var(--leading-tight);
}

/* === Numbers (Streak, Stats) === */
.number-large {
  font-family: var(--font-mono);
  font-size: var(--text-5xl);
  font-weight: var(--font-extrabold);
  line-height: var(--leading-none);
  font-variant-numeric: tabular-nums;
}

.number-medium {
  font-family: var(--font-mono);
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
  font-variant-numeric: tabular-nums;
}
```

---

## 4. Spacing & Layout

### 4.1 Spacing Scale (4px Base)

```css
:root {
  --space-0: 0;
  --space-px: 1px;
  --space-0.5: 0.125rem; /* 2px */
  --space-1: 0.25rem; /* 4px */
  --space-1.5: 0.375rem; /* 6px */
  --space-2: 0.5rem; /* 8px - Base unit */
  --space-2.5: 0.625rem; /* 10px */
  --space-3: 0.75rem; /* 12px */
  --space-3.5: 0.875rem; /* 14px */
  --space-4: 1rem; /* 16px */
  --space-5: 1.25rem; /* 20px */
  --space-6: 1.5rem; /* 24px */
  --space-7: 1.75rem; /* 28px */
  --space-8: 2rem; /* 32px */
  --space-9: 2.25rem; /* 36px */
  --space-10: 2.5rem; /* 40px */
  --space-11: 2.75rem; /* 44px - Min touch target */
  --space-12: 3rem; /* 48px */
  --space-14: 3.5rem; /* 56px */
  --space-16: 4rem; /* 64px */
  --space-20: 5rem; /* 80px */
  --space-24: 6rem; /* 96px */
}
```

### 4.2 Layout Constants

```css
:root {
  /* === Touch Targets === */
  --touch-target-min: 44px; /* iOS HIG minimum */
  --touch-target-comfortable: 48px; /* Material Design */
  --touch-target-large: 56px; /* Primary buttons */

  /* === Screen Widths === */
  --screen-mobile: 375px;
  --screen-tablet: 768px;
  --screen-desktop: 1024px;
  --screen-wide: 1280px;

  /* === Max Content Width === */
  --content-max-width: 640px; /* Onboarding, centered content */
  --container-max-width: 1200px; /* Full container */

  /* === Page Margins === */
  --page-margin-mobile: var(--space-4); /* 16px */
  --page-margin-tablet: var(--space-6); /* 24px */
  --page-margin-desktop: var(--space-8); /* 32px */

  /* === Component Spacing === */
  --card-padding: var(--space-4); /* 16px */
  --card-padding-lg: var(--space-6); /* 24px */
  --section-gap: var(--space-6); /* 24px */
  --item-gap: var(--space-3); /* 12px */

  /* === Navigation Heights === */
  --topbar-height-mobile: 44px;
  --topbar-height-desktop: 56px;
  --bottombar-height: 56px;
  --safe-area-bottom: 34px; /* iPhone notch */
  --sidebar-width: 200px; /* Desktop */
}
```

### 4.3 Border Radius

```css
:root {
  --radius-none: 0;
  --radius-sm: 4px; /* Small elements */
  --radius-md: 8px; /* Input fields */
  --radius-lg: 12px; /* Buttons */
  --radius-xl: 16px; /* Cards */
  --radius-2xl: 20px; /* Hero cards */
  --radius-3xl: 24px; /* Modal, bottom sheet */
  --radius-full: 9999px; /* Circle, chips */

  /* Component-specific */
  --radius-button: var(--radius-lg); /* 12px */
  --radius-card: var(--radius-xl); /* 16px */
  --radius-modal: var(--radius-2xl); /* 20px */
  --radius-chip: var(--radius-full); /* pill */
  --radius-input: var(--radius-md); /* 8px */
}
```

---

## 5. Glass Effect System

### 5.1 Glass Levels

4 levels of glass effect to express visual depth.

```css
:root {
  /* === Level 1: Subtle (Lightest) === */
  /* Usage: Background separation, list items */
  --glass-1-bg: rgba(255, 255, 255, 0.4);
  --glass-1-blur: 4px;
  --glass-1-border: rgba(255, 255, 255, 0.2);
  --glass-1-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

  /* === Level 2: Light (Default) === */
  /* Usage: Cards, input fields */
  --glass-2-bg: rgba(255, 255, 255, 0.6);
  --glass-2-blur: 8px;
  --glass-2-border: rgba(255, 255, 255, 0.4);
  --glass-2-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);

  /* === Level 3: Medium (Emphasis) === */
  /* Usage: Hero cards, modals */
  --glass-3-bg: rgba(255, 255, 255, 0.75);
  --glass-3-blur: 12px;
  --glass-3-border: rgba(255, 255, 255, 0.5);
  --glass-3-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);

  /* === Level 4: Heavy (Maximum) === */
  /* Usage: Bottom sheets, overlays */
  --glass-4-bg: rgba(255, 255, 255, 0.85);
  --glass-4-blur: 16px;
  --glass-4-border: rgba(255, 255, 255, 0.6);
  --glass-4-shadow: 0 12px 48px rgba(0, 0, 0, 0.12);
}
```

### 5.2 Dark Mode Glass

```css
[data-theme='dark'] {
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

### 5.3 Glass Utility Classes

```css
/* Glass Card - Level 2 (Default) */
.glass-card {
  background: var(--glass-2-bg);
  backdrop-filter: blur(var(--glass-2-blur));
  -webkit-backdrop-filter: blur(var(--glass-2-blur));
  border: 1px solid var(--glass-2-border);
  box-shadow: var(--glass-2-shadow);
  border-radius: var(--radius-card);
}

/* Glass Hero - Level 3 (Emphasis) */
.glass-hero {
  background: var(--glass-3-bg);
  backdrop-filter: blur(var(--glass-3-blur));
  -webkit-backdrop-filter: blur(var(--glass-3-blur));
  border: 1px solid var(--glass-3-border);
  box-shadow: var(--glass-3-shadow);
  border-radius: var(--radius-2xl);
}

/* Glass Overlay - Level 4 (Bottom Sheet) */
.glass-overlay {
  background: var(--glass-4-bg);
  backdrop-filter: blur(var(--glass-4-blur));
  -webkit-backdrop-filter: blur(var(--glass-4-blur));
  border: 1px solid var(--glass-4-border);
  box-shadow: var(--glass-4-shadow);
}
```

### 5.4 Gradient Backgrounds

```css
:root {
  /* Mesh Gradient Background (Use with Glass) */
  --gradient-mesh:
    radial-gradient(at 20% 20%, oklch(95% 0.08 250 / 0.4) 0%, transparent 50%),
    radial-gradient(at 80% 80%, oklch(95% 0.06 300 / 0.3) 0%, transparent 50%),
    radial-gradient(at 40% 60%, oklch(96% 0.04 180 / 0.2) 0%, transparent 50%);

  /* Simple Gradient */
  --gradient-page: linear-gradient(180deg, oklch(98% 0.01 250) 0%, oklch(100% 0 0) 100%);
}
```

### 5.5 Accessibility Fallback

```css
/* Browsers without backdrop-filter support */
@supports not (backdrop-filter: blur(1px)) {
  .glass-card,
  .glass-hero,
  .glass-overlay {
    background: var(--surface-default);
    border: 1px solid var(--border-default);
  }
}

/* Respect reduced transparency preference */
@media (prefers-reduced-transparency: reduce) {
  .glass-card,
  .glass-hero,
  .glass-overlay {
    background: var(--surface-default);
    backdrop-filter: none;
  }
}

/* Text readability on glass */
.glass-text-readable {
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
```

---

## 6. Components

### 6.1 Buttons

```css
/* === Button Base === */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);

  height: var(--touch-target-large); /* 56px */
  padding: 0 var(--space-6); /* 24px */

  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  line-height: var(--leading-tight);

  border-radius: var(--radius-button);
  border: none;
  cursor: pointer;

  transition: all 200ms var(--ease-default);
}

/* Primary Button */
.btn-primary {
  background: var(--color-primary-500);
  color: var(--text-inverse);
}

.btn-primary:hover {
  background: var(--color-primary-600);
  transform: translateY(-1px);
  box-shadow: var(--shadow-primary);
}

.btn-primary:active {
  background: var(--color-primary-700);
  transform: translateY(0);
}

/* Secondary Button */
.btn-secondary {
  background: var(--bg-muted);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
}

.btn-secondary:hover {
  background: var(--bg-emphasis);
  border-color: var(--border-emphasis);
}

/* Ghost Button */
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
}

.btn-ghost:hover {
  background: var(--bg-muted);
  color: var(--text-primary);
}

/* Done Button (Check-in) */
.btn-done {
  background: var(--color-done);
  color: white;
}

.btn-done:hover {
  background: oklch(68% 0.18 145);
}

/* Skip Button (Check-in) */
.btn-skip {
  background: var(--color-skip-bg);
  color: var(--color-skip);
  border: 1px solid var(--color-skip-border);
}

.btn-skip:hover {
  background: var(--bg-emphasis);
}

/* Button Sizes */
.btn-sm {
  height: var(--touch-target-min); /* 44px */
  padding: 0 var(--space-4); /* 16px */
  font-size: var(--text-sm);
}

.btn-lg {
  height: 64px;
  padding: 0 var(--space-8); /* 32px */
  font-size: var(--text-lg);
}

/* Full Width */
.btn-full {
  width: 100%;
}
```

### 6.2 Cards

```css
/* === Task Card (Check-in Card) === */
.task-card {
  background: var(--glass-2-bg);
  backdrop-filter: blur(var(--glass-2-blur));
  border: 1px solid var(--glass-2-border);
  box-shadow: var(--glass-2-shadow);

  padding: var(--card-padding);
  border-radius: var(--radius-card);

  transition: all 300ms var(--ease-default);
}

/* Hero Card (Current Task) */
.task-card-hero {
  background: var(--glass-3-bg);
  backdrop-filter: blur(var(--glass-3-blur));
  border: 1px solid var(--glass-3-border);
  box-shadow: var(--glass-3-shadow);

  padding: var(--card-padding-lg);
  border-radius: var(--radius-2xl);
}

/* State: Done */
.task-card[data-status='done'] {
  background: var(--color-done-bg);
  border-color: var(--color-done-border);
}

/* State: Skip */
.task-card[data-status='skip'] {
  background: var(--color-skip-bg);
  border-color: var(--color-skip-border);
  opacity: 0.8;
}

/* State: Miss */
.task-card[data-status='miss'] {
  background: var(--color-miss-bg);
  border-color: var(--color-miss-border);
}

/* AI Insight Card */
.ai-card {
  background: var(--color-ai-bg);
  border: 1px solid oklch(90% 0.04 290);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
}
```

### 6.3 Chips & Badges

```css
/* === Area Chip === */
.area-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);

  height: 24px;
  padding: 0 var(--space-2);

  font-size: var(--text-xs);
  font-weight: var(--font-medium);

  background: var(--area-color-light, var(--bg-muted));
  color: var(--area-color, var(--text-secondary));
  border-radius: var(--radius-full);
}

/* Streak Badge */
.streak-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);

  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);

  color: var(--color-streak);
}

.streak-badge::before {
  content: '🔥';
}

/* Selection Chip (Onboarding, etc.) */
.selection-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  min-height: 48px;
  padding: var(--space-3) var(--space-4);

  font-size: var(--text-base);
  font-weight: var(--font-medium);

  background: var(--surface-default);
  border: 2px solid var(--border-default);
  border-radius: var(--radius-lg);

  cursor: pointer;
  transition: all 150ms var(--ease-default);
}

.selection-chip:hover {
  border-color: var(--color-primary-300);
  background: var(--color-primary-50);
}

.selection-chip[data-selected='true'] {
  border-color: var(--color-primary-500);
  background: var(--color-primary-100);
  color: var(--color-primary-700);
}
```

### 6.4 Progress Indicators

```css
/* === Progress Bar === */
.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--bg-emphasis);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--color-primary-500);
  border-radius: var(--radius-full);
  transition: width 300ms var(--ease-out);
}

/* Phase Indicator */
.phase-indicator {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.phase-dot {
  width: 12px;
  height: 12px;
  border-radius: var(--radius-full);
  background: var(--bg-emphasis);
  border: 2px solid var(--border-default);
}

.phase-dot[data-state='completed'] {
  background: var(--color-done);
  border-color: var(--color-done);
}

.phase-dot[data-state='current'] {
  background: var(--color-primary-500);
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 4px var(--color-primary-100);
}

.phase-line {
  flex: 1;
  height: 2px;
  background: var(--border-default);
}

.phase-line[data-completed='true'] {
  background: var(--color-done);
}
```

### 6.5 Bottom Sheet

```css
/* === Bottom Sheet === */
.bottom-sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
  z-index: var(--z-modal-backdrop);
}

.bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;

  max-height: 90vh;

  background: var(--glass-4-bg);
  backdrop-filter: blur(var(--glass-4-blur));
  border: 1px solid var(--glass-4-border);
  border-bottom: none;

  border-radius: var(--radius-3xl) var(--radius-3xl) 0 0;

  padding: var(--space-4);
  padding-bottom: calc(var(--space-4) + var(--safe-area-bottom));

  z-index: var(--z-modal);
}

/* Drag Handle */
.bottom-sheet-handle {
  width: 36px;
  height: 4px;
  background: var(--border-emphasis);
  border-radius: var(--radius-full);
  margin: 0 auto var(--space-4);
}
```

### 6.6 Input Fields

```css
/* === Text Input === */
.input {
  width: 100%;
  height: var(--touch-target-comfortable);
  padding: 0 var(--space-4);

  font-size: var(--text-base);
  color: var(--text-primary);

  background: var(--glass-1-bg);
  backdrop-filter: blur(var(--glass-1-blur));
  border: 1px solid var(--border-default);
  border-radius: var(--radius-input);

  transition: all 150ms var(--ease-default);
}

.input::placeholder {
  color: var(--text-placeholder);
}

.input:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px var(--color-primary-100);
}

/* Textarea */
.textarea {
  min-height: 120px;
  padding: var(--space-3) var(--space-4);
  resize: vertical;
}
```

---

## 7. Motion & Animation

### 7.1 Timing Functions

```css
:root {
  /* === Easing Curves === */
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1); /* Natural */
  --ease-in: cubic-bezier(0.4, 0, 1, 1); /* Accelerate */
  --ease-out: cubic-bezier(0, 0, 0.2, 1); /* Decelerate */
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1); /* Smooth */
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55); /* Elastic */
  --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275); /* Spring */

  /* === Duration === */
  --duration-instant: 50ms; /* Immediate response */
  --duration-fast: 150ms; /* Quick transition */
  --duration-normal: 250ms; /* Default transition */
  --duration-slow: 400ms; /* Slow transition */
  --duration-slower: 600ms; /* Complex transition */
}
```

### 7.2 Check-in Animations

```css
/* Particle burst on check-in complete */
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

.checkin-particle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 200px;
  height: 200px;
  pointer-events: none;
}

.checkin-particle::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, var(--color-done) 0%, transparent 70%);
  animation: particle-burst 400ms var(--ease-out) forwards;
}

/* Streak update animation */
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

.streak-updated {
  animation: streak-pop 300ms var(--ease-spring);
}
```

### 7.3 Milestone Confetti (Every 5th Streak)

```css
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

.confetti-piece {
  position: fixed;
  top: 0;
  width: 10px;
  height: 10px;
  background: var(--color-streak);
  animation: confetti-fall 2s var(--ease-in) forwards;
}

.confetti-piece:nth-child(odd) {
  background: var(--color-primary-500);
}

.confetti-piece:nth-child(3n) {
  background: var(--color-done);
}
```

### 7.4 Page Transitions

```css
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

.page-transition-enter {
  animation: page-enter var(--duration-normal) var(--ease-out);
}

.page-transition-exit {
  animation: page-exit var(--duration-fast) var(--ease-in);
}
```

### 7.5 Micro-interactions

```css
/* Button hover/press */
.btn {
  transition:
    background var(--duration-fast) var(--ease-default),
    transform var(--duration-fast) var(--ease-default),
    box-shadow var(--duration-fast) var(--ease-default);
}

.btn:hover {
  transform: translateY(-1px);
}

.btn:active {
  transform: translateY(0) scale(0.98);
}

/* Card hover */
.task-card {
  transition:
    transform var(--duration-normal) var(--ease-default),
    box-shadow var(--duration-normal) var(--ease-default);
}

.task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

/* Chip selection */
.selection-chip {
  transition:
    border-color var(--duration-fast) var(--ease-default),
    background var(--duration-fast) var(--ease-default),
    transform var(--duration-fast) var(--ease-spring);
}

.selection-chip[data-selected='true'] {
  transform: scale(1.02);
}
```

### 7.6 Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  .checkin-particle,
  .confetti-piece {
    display: none;
  }
}
```

---

## 8. Iconography

### 8.1 Icon Style Guide

| Property     | Value        | Description          |
| ------------ | ------------ | -------------------- |
| Style        | Solid        | Simple solid icons   |
| Stroke       | 2px          | Consistent thickness |
| Corners      | 2px radius   | Rounded corners      |
| Default Size | 24px         | Most UI elements     |
| Color        | currentColor | Inherits text color  |

### 8.2 Icon Sizes

```css
:root {
  --icon-xs: 16px; /* Inside badges */
  --icon-sm: 20px; /* Secondary icons */
  --icon-md: 24px; /* Default */
  --icon-lg: 28px; /* Emphasis */
  --icon-xl: 32px; /* Large */
  --icon-2xl: 40px; /* Empty states */
}
```

### 8.3 Navigation Icons

**Bottom Tab (4):**
| Tab | Icon | Description |
|-----|------|-------------|
| Today | `home` | Home icon |
| Roadmap | `map` | Map icon |
| Calendar | `calendar` | Calendar icon |
| Review | `chart-bar` | Bar chart |

**Top Bar (4):**
| Element | Icon | Description |
|---------|------|-------------|
| Inbox | `inbox` | Inbox |
| AI Hub | `sparkles` | Sparkles |
| Search | `search` | Magnifying glass |
| Profile | `user-circle` | User |

### 8.4 Action Icons

| Action   | Icon                  | Description      |
| -------- | --------------------- | ---------------- |
| Done     | `check-circle`        | Checkmark circle |
| Skip     | `forward`             | Forward          |
| Add      | `plus`                | Plus             |
| Edit     | `pencil`              | Pencil           |
| Delete   | `trash`               | Trash            |
| More     | `ellipsis-horizontal` | Horizontal dots  |
| Close    | `x-mark`              | X mark           |
| Back     | `arrow-left`          | Left arrow       |
| Expand   | `chevron-down`        | Down chevron     |
| Collapse | `chevron-up`          | Up chevron       |

### 8.5 Emoji Usage

**Area Default Emojis:**
| Area | Emoji |
|------|-------|
| Health | 💪 |
| Career | 📈 |
| Finance | 💰 |
| Relationships | ❤️ |
| Hobbies/Growth | 🎨 |
| Mental | 🧘 |
| Learning | 📚 |
| Daily | 🌱 |

**Time Slot Emojis:**
| Time Slot | Emoji |
|-----------|-------|
| Morning (6-9) | ☀️ |
| Late Morning (9-12) | 🌤 |
| Afternoon (12-18) | 🌞 |
| Evening (18-21) | 🌆 |
| Night (21-24) | 🌙 |

**Status/Feedback Emojis:**
| Status | Emoji |
|--------|-------|
| Streak | 🔥 |
| Complete | ✅ |
| Skip | ⏭ |
| Celebration | 🎉 |
| AI | ✨ |

**Mood Selection (5 levels):**

```
😫 → 😕 → 😐 → 🙂 → 😄
```

### 8.6 Icon Component

```css
.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  width: var(--icon-md);
  height: var(--icon-md);

  color: currentColor;
  flex-shrink: 0;
}

.icon-sm {
  width: var(--icon-sm);
  height: var(--icon-sm);
}
.icon-lg {
  width: var(--icon-lg);
  height: var(--icon-lg);
}
.icon-xl {
  width: var(--icon-xl);
  height: var(--icon-xl);
}

/* Interactive icon button */
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  width: var(--touch-target-min);
  height: var(--touch-target-min);

  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--radius-full);

  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.icon-btn:hover {
  color: var(--text-primary);
  background: var(--bg-muted);
}
```

---

## 9. Shadows & Elevation

### 9.1 Shadow Scale

```css
:root {
  /* === Elevation System === */
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  --shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);

  /* === Component Shadows === */
  --shadow-card: 0 4px 16px rgba(0, 0, 0, 0.08);
  --shadow-card-hover: 0 8px 24px rgba(0, 0, 0, 0.12);
  --shadow-button: 0 2px 8px rgba(0, 0, 0, 0.1);
  --shadow-modal: 0 24px 48px rgba(0, 0, 0, 0.2);

  /* === Colored Shadows (CTA) === */
  --shadow-primary: 0 4px 14px oklch(58% 0.18 250 / 0.4);
  --shadow-done: 0 4px 14px oklch(72% 0.18 145 / 0.4);
}
```

### 9.2 Z-Index Scale

```css
:root {
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
}
```

---

## 10. Responsive Design

### 10.1 Breakpoints

```css
/* Mobile First Approach */

/* Small (default): 0px ~ 639px - Mobile */
/* Base styles */

/* Medium: 640px+ - Tablet Portrait */
@media (min-width: 640px) {
  :root {
    --page-margin: var(--space-6);
  }
}

/* Large: 768px+ - Tablet Landscape */
@media (min-width: 768px) {
  :root {
    --page-margin: var(--space-6);
  }
}

/* X-Large: 1024px+ - Desktop */
@media (min-width: 1024px) {
  :root {
    --page-margin: var(--space-8);
  }

  /* Desktop: Bottom Tab -> Left Sidebar */
  .bottom-nav {
    display: none;
  }

  .sidebar-nav {
    display: flex;
  }
}

/* 2X-Large: 1280px+ - Wide Desktop */
@media (min-width: 1280px) {
  /* 3-column layout possible */
}
```

### 10.2 Container

```css
.container {
  width: 100%;
  max-width: var(--container-max-width);
  margin: 0 auto;
  padding: 0 var(--page-margin-mobile);
}

@media (min-width: 640px) {
  .container {
    padding: 0 var(--page-margin-tablet);
  }
}

@media (min-width: 1024px) {
  .container {
    padding: 0 var(--page-margin-desktop);
  }
}
```

---

## 11. Accessibility

### 11.1 WCAG Compliance

| Item                   | Requirement     | Implementation           |
| ---------------------- | --------------- | ------------------------ |
| Contrast (Normal Text) | 4.5:1 minimum   | All text colors verified |
| Contrast (Large Text)  | 3:1 minimum     | 18px+ or 14px bold       |
| Touch Target           | 44x44px minimum | Use `--touch-target-min` |
| Focus Indicator        | Clear outline   | 3px Primary ring         |

### 11.2 Respect System Preferences

```css
/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* Reduced Transparency */
@media (prefers-reduced-transparency: reduce) {
  .glass-card,
  .glass-hero,
  .glass-overlay {
    background: var(--surface-default);
    backdrop-filter: none;
  }
}

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  :root {
    /* Dark mode variables */
  }
}

/* High Contrast */
@media (prefers-contrast: more) {
  :root {
    --border-default: oklch(60% 0.01 260);
    --text-secondary: oklch(30% 0.01 260);
  }
}
```

### 11.3 Focus Styles

```css
/* Default focus style */
:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 3px var(--color-primary-100),
    0 0 0 4px var(--color-primary-500);
}

/* Button focus */
.btn:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 3px var(--color-primary-100),
    0 0 0 4px var(--color-primary-500);
}

/* Skip to content link */
.skip-link {
  position: absolute;
  top: -100%;
  left: 0;
  padding: var(--space-2) var(--space-4);
  background: var(--color-primary-500);
  color: white;
  z-index: var(--z-max);
}

.skip-link:focus {
  top: 0;
}
```

### 11.4 Keyboard Navigation

All interactive elements must be keyboard accessible:

| Key        | Action                                   |
| ---------- | ---------------------------------------- |
| Tab        | Move focus to next interactive element   |
| Shift+Tab  | Move focus to previous element           |
| Enter      | Activate button, submit form             |
| Space      | Toggle checkbox, activate button         |
| Escape     | Close modal/dropdown                     |
| Arrow keys | Navigate within components (tabs, lists) |

**Global Keyboard Shortcuts** (Today Screen):

```
d → Done (current task)
s → Skip (current task)
j → Next task
k → Previous task
g t → Go to Today
g r → Go to Roadmap
g c → Go to Calendar
g v → Go to Review
/ → Search
? → Show shortcuts help
```

### 11.5 ARIA Patterns

| Component         | Required ARIA                                                           |
| ----------------- | ----------------------------------------------------------------------- |
| **Modal**         | `role="dialog"`, `aria-modal="true"`, `aria-labelledby`                 |
| **Bottom Sheet**  | `role="dialog"`, `aria-modal="true"`                                    |
| **Tab Bar**       | `role="tablist"`, `role="tab"`, `aria-selected`                         |
| **Progress Bar**  | `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax` |
| **Toast**         | `role="status"`, `aria-live="polite"`                                   |
| **Error Message** | `role="alert"`, `aria-live="assertive"`                                 |
| **Loading State** | `aria-busy="true"`, `aria-label="Loading"`                              |
| **Dropdown**      | `aria-haspopup="true"`, `aria-expanded`                                 |

**Example: TaskCard with ARIA**

```tsx
<article
  role="article"
  aria-labelledby={`task-${task.id}-title`}
  aria-describedby={`task-${task.id}-desc`}
>
  <h3 id={`task-${task.id}-title`}>
    <span aria-hidden="true">{task.emoji}</span>
    {task.name}
  </h3>
  <p id={`task-${task.id}-desc`} className="sr-only">
    {task.area.name} 영역, {task.streak_count}일 연속
  </p>
  <div role="group" aria-label="체크인 액션">
    <button aria-label={`${task.name} 완료`}>Done</button>
    <button aria-label={`${task.name} 건너뛰기`}>Skip</button>
  </div>
</article>
```

### 11.6 Color Contrast Verification

All color combinations verified against WCAG 2.1 AA:

| Combination                  | Ratio  | Result            |
| ---------------------------- | ------ | ----------------- |
| text-primary on bg-primary   | 17.5:1 | AAA               |
| text-secondary on bg-primary | 5.6:1  | AA                |
| primary-500 on bg-primary    | 4.1:1  | AA (large text)   |
| done on done-bg              | 3.2:1  | AA (large text)   |
| skip on skip-bg              | 5.1:1  | AA                |
| miss on miss-bg              | 2.9:1  | **Use with icon** |
| streak on streak-bg          | 3.1:1  | AA (large text)   |

**Important**: Miss status requires icon + text, not color alone.

### 11.7 Screen Reader Support

```css
/* Screen reader only content */
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

/* Live region for dynamic updates */
.live-region {
  position: absolute;
  left: -10000px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}
```

**Live Region Usage**:

```tsx
// Announce check-in completion
<div role="status" aria-live="polite" className="sr-only">
  {isCheckedIn && `${task.name} 체크인 완료!`}
</div>

// Announce errors immediately
<div role="alert" aria-live="assertive" className="sr-only">
  {error && error.message}
</div>
```

### 11.8 Focus Management

```tsx
// Focus trap for modals
function useFocusTrap(containerRef: RefObject<HTMLElement>) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    // Trap focus within modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey && document.activeElement === firstElement) {
        lastElement.focus()
        e.preventDefault()
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        firstElement.focus()
        e.preventDefault()
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    firstElement?.focus()

    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [containerRef])
}
```

**Focus Restoration**:

- When opening modal: Save trigger element, focus first interactive element in modal
- When closing modal: Return focus to saved trigger element
- When adding dynamic content: Focus the new content with `tabindex="-1"` then remove

---

## 12. Complete CSS Variables

All CSS variables in one place for easy reference.

```css
:root {
  /* === Colors === */
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

  --color-done: oklch(72% 0.18 145);
  --color-done-bg: oklch(95% 0.05 145);
  --color-skip: oklch(60% 0.01 260);
  --color-skip-bg: oklch(96% 0.005 260);
  --color-miss: oklch(65% 0.15 25);
  --color-miss-bg: oklch(97% 0.03 25);
  --color-streak: oklch(70% 0.18 55);
  --color-ai: oklch(65% 0.16 290);

  --bg-base: oklch(100% 0 0);
  --bg-subtle: oklch(98.5% 0.003 260);
  --bg-muted: oklch(96% 0.005 260);
  --bg-emphasis: oklch(93% 0.008 260);

  --text-primary: oklch(15% 0.01 260);
  --text-secondary: oklch(40% 0.01 260);
  --text-tertiary: oklch(55% 0.01 260);
  --text-placeholder: oklch(65% 0.005 260);
  --text-inverse: oklch(100% 0 0);

  --border-default: oklch(90% 0.008 260);
  --border-subtle: oklch(94% 0.005 260);
  --border-emphasis: oklch(80% 0.01 260);

  /* === Typography === */
  --font-sans: 'Pretendard Variable', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

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

  /* === Spacing === */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;

  /* === Glass === */
  --glass-1-bg: rgba(255, 255, 255, 0.4);
  --glass-1-blur: 4px;
  --glass-2-bg: rgba(255, 255, 255, 0.6);
  --glass-2-blur: 8px;
  --glass-3-bg: rgba(255, 255, 255, 0.75);
  --glass-3-blur: 12px;
  --glass-4-bg: rgba(255, 255, 255, 0.85);
  --glass-4-blur: 16px;

  /* === Radius === */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 20px;
  --radius-3xl: 24px;
  --radius-full: 9999px;

  /* === Animation === */
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);

  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;

  /* === Shadows === */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-card: 0 4px 16px rgba(0, 0, 0, 0.08);
  --shadow-primary: 0 4px 14px oklch(58% 0.18 250 / 0.4);

  /* === Z-Index === */
  --z-dropdown: 10;
  --z-sticky: 20;
  --z-fixed: 30;
  --z-modal-backdrop: 40;
  --z-modal: 50;
  --z-toast: 80;

  /* === Layout === */
  --touch-target-min: 44px;
  --touch-target-large: 56px;
  --page-margin-mobile: 16px;
  --page-margin-tablet: 24px;
  --page-margin-desktop: 32px;
  --content-max-width: 640px;
  --bottombar-height: 56px;
  --safe-area-bottom: 34px;
}
```

---

## References

- [Toss Design System (TDS)](https://toss.tech/article/toss-design-system)
- [Toss Color System Update](https://toss.tech/article/tds-color-system-update)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Nielsen Norman Group - Glassmorphism](https://www.nngroup.com/articles/glassmorphism/)
- [Axess Lab - Glassmorphism Accessibility](https://axesslab.com/glassmorphism-meets-accessibility-can-frosted-glass-be-inclusive/)
- [Pretendard Font](https://github.com/orioncactus/pretendard)
- [Glass UI CSS Generator](https://ui.glass/generator/)
- [WCAG Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
