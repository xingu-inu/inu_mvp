# Phase 14: Deployment & Launch

> **Goal**: Deploy to production, set up monitoring, and launch MVP

---

## 📚 Reference Documents

- `docs/plan/reference/strategy/mvp-scope.md`
- `docs/plan/reference/strategy/pricing.md`
- `docs/plan/reference/strategy/competition.md`

---

## 14.1 Vercel Deployment

### Connect to Vercel

```bash
# Install Vercel CLI
pnpm add -g vercel

# Login
vercel login

# Link project
vercel link

# Deploy preview
vercel

# Deploy production
vercel --prod
```

### vercel.json

```json
{
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["icn1"],
  "headers": [
    {
      "source": "/fonts/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### Environment Variables (Vercel Dashboard)

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

## 14.2 Domain Configuration

### Custom Domain Setup

1. Add domain in Vercel Dashboard → Domains
2. Configure DNS:
   - A Record: `76.76.21.21`
   - CNAME: `cname.vercel-dns.com`
3. Enable HTTPS (automatic)

### Redirect Configuration

```json
// vercel.json
{
  "redirects": [
    {
      "source": "/",
      "destination": "/today",
      "permanent": false,
      "has": [
        {
          "type": "cookie",
          "key": "sb-access-token"
        }
      ]
    }
  ]
}
```

---

## 14.3 Error Tracking (Sentry)

### Install Sentry

```bash
pnpm add @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

### sentry.client.config.ts

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    new Sentry.Replay({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
})
```

### sentry.server.config.ts

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
})
```

### Error Boundary

```typescript
'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <p className="text-foreground-secondary mb-6">
            We&apos;ve been notified and are working on a fix.
          </p>
          <Button onClick={reset}>Try again</Button>
        </div>
      </body>
    </html>
  )
}
```

---

## 14.4 Analytics

### Vercel Analytics

```bash
pnpm add @vercel/analytics
```

```typescript
// src/app/layout.tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

### Speed Insights

```bash
pnpm add @vercel/speed-insights
```

```typescript
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
```

---

## 14.5 Pre-launch Checklist

### Functionality

- [ ] All E2E tests pass
- [ ] Authentication flow works
- [ ] Onboarding completes successfully
- [ ] Check-in creates records
- [ ] Streak calculations are accurate
- [ ] AI messages trigger correctly
- [ ] Dark mode works

### Performance

- [ ] Lighthouse Performance > 90
- [ ] LCP < 2.5s
- [ ] CLS < 0.1
- [ ] Bundle size optimized

### Security

- [ ] Environment variables secured
- [ ] RLS policies verified
- [ ] No exposed API keys
- [ ] HTTPS enabled
- [ ] CSP headers configured

### SEO & Meta

- [ ] Meta tags configured
- [ ] Open Graph images
- [ ] Favicon set
- [ ] robots.txt configured
- [ ] sitemap.xml generated

### Accessibility

- [ ] Lighthouse Accessibility > 90
- [ ] Keyboard navigation works
- [ ] Screen reader tested
- [ ] Color contrast verified

---

## 14.6 SEO Configuration

### src/app/layout.tsx

```typescript
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'inu - Life Roadmap & Goal Management',
    template: '%s | inu',
  },
  description:
    'Create your life roadmap and manage goals within your time. Build habits, track progress, and achieve more with inu.',
  keywords: ['goal tracking', 'habit tracker', 'life planning', 'productivity'],
  authors: [{ name: 'inu' }],
  creator: 'inu',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://inu.app',
    siteName: 'inu',
    title: 'inu - Life Roadmap & Goal Management',
    description: 'Create your life roadmap and manage goals within your time.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'inu - Life Roadmap',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'inu - Life Roadmap & Goal Management',
    description: 'Create your life roadmap and manage goals within your time.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}
```

### public/robots.txt

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /onboarding

Sitemap: https://inu.app/sitemap.xml
```

---

## 14.7 Monitoring Dashboard

### Key Metrics to Track

| Metric             | Tool               | Target  |
| ------------------ | ------------------ | ------- |
| Error Rate         | Sentry             | < 0.1%  |
| Page Load Time     | Vercel Analytics   | < 2s    |
| API Response Time  | Supabase Dashboard | < 200ms |
| Uptime             | Vercel Status      | 99.9%   |
| Daily Active Users | Custom Analytics   | Growth  |
| Check-in Rate      | Custom Analytics   | > 50%   |

### Alerts Setup

- Error spike (> 10 errors/minute)
- Response time degradation
- Database connection issues
- Authentication failures

---

## 14.8 Launch Sequence

### Day -7: Final Testing

- [ ] Complete QA pass
- [ ] Load testing
- [ ] Security audit
- [ ] Backup procedures tested

### Day -3: Soft Launch

- [ ] Deploy to production
- [ ] Invite beta testers
- [ ] Monitor for issues
- [ ] Fix critical bugs

### Day 0: Public Launch

- [ ] Announce on social media
- [ ] Monitor metrics closely
- [ ] Respond to user feedback
- [ ] Be ready to hotfix

### Day +7: Post-launch

- [ ] Review analytics
- [ ] Prioritize feedback
- [ ] Plan next iteration

---

## 14.9 Rollback Plan

### Quick Rollback

```bash
# Vercel instant rollback
vercel rollback [deployment-url]
```

### Database Rollback

```sql
-- Supabase point-in-time recovery
-- Configure in Supabase Dashboard → Database → Backups
```

### Feature Flags (Optional)

```typescript
// Simple feature flag implementation
const FEATURES = {
  AI_ADVISOR: process.env.NEXT_PUBLIC_ENABLE_AI === 'true',
  NEW_CALENDAR: process.env.NEXT_PUBLIC_ENABLE_NEW_CALENDAR === 'true',
}

export function useFeature(feature: keyof typeof FEATURES) {
  return FEATURES[feature]
}
```

---

## ✅ Completion Checklist

- [ ] Vercel project created
- [ ] Environment variables configured
- [ ] Custom domain connected
- [ ] SSL certificate active
- [ ] Sentry error tracking
- [ ] Vercel Analytics enabled
- [ ] Speed Insights enabled
- [ ] SEO meta tags configured
- [ ] robots.txt configured
- [ ] Pre-launch checklist complete
- [ ] Monitoring dashboard set up
- [ ] Rollback plan documented
- [ ] Production deployment successful

---

## 🔗 Navigation

← [Phase 13: Performance Optimization](./phase-13-performance.md)
→ [Phase 15: Post-MVP Features](./phase-15-post-mvp.md)

---

_Version: 1.0 | Last Updated: 2026-02-03_
