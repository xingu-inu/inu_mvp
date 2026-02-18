# Phase 15: Post-MVP Features

> **Goal**: Plan and implement advanced features after MVP launch

---

## 📚 Reference Documents

- `docs/plan/reference/features/life-reset.md`
- `docs/plan/reference/features/ai-advisor.md` (Phase 2 section)

---

## 15.1 Advanced AI Advisor (LLM-based)

### Overview

Upgrade from rule-based to conversational AI using OpenAI or Anthropic APIs.

### Implementation Plan

#### API Integration

```typescript
// src/lib/ai/chat.ts
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function generateAIResponse(userMessage: string, context: AIContext): Promise<string> {
  const systemPrompt = buildSystemPrompt(context)

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    max_tokens: 500,
    temperature: 0.7,
  })

  return response.choices[0].message.content || ''
}

function buildSystemPrompt(context: AIContext): string {
  return `You are a supportive life coach AI for the inu app.

User Context:
- Direction: ${context.direction}
- Active Goals: ${context.goals.map((g) => g.name).join(', ')}
- Recent Activity: ${context.recentActivity}
- Current Streak: ${context.currentStreak} days

Guidelines:
- Be encouraging but realistic
- Focus on small, actionable steps
- Never shame for missed tasks
- Celebrate progress, no matter how small
- Ask clarifying questions when needed

Respond in a warm, conversational tone.`
}
```

#### Rate Limiting

```typescript
// Free tier: 3 AI interactions/day
// Pro tier: Unlimited

export async function checkAIQuota(userId: string): Promise<boolean> {
  const supabase = getSupabaseClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single()

  if (profile?.subscription_tier === 'pro') return true

  // Count today's AI interactions
  const today = new Date().toISOString().split('T')[0]
  const { count } = await supabase
    .from('ai_interactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', today)

  return (count || 0) < 3
}
```

---

## 15.2 Google Calendar Integration

### Overview

Two-way sync between inu tasks and Google Calendar.

### Implementation Plan

#### OAuth Setup

```typescript
// src/lib/google/auth.ts
import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
)

export function getAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
  })
}
```

#### Sync Logic

```typescript
// src/services/calendar-sync.service.ts

export const calendarSyncService = {
  async syncTaskToGoogle(task: Task, tokens: GoogleTokens) {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    const event = {
      summary: `[inu] ${task.name}`,
      description: task.why || '',
      start: {
        dateTime: getTaskStartTime(task),
        timeZone: 'Asia/Seoul',
      },
      end: {
        dateTime: getTaskEndTime(task),
        timeZone: 'Asia/Seoul',
      },
      recurrence: getRecurrenceRule(task),
    }

    await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    })
  },

  async importFromGoogle(tokens: GoogleTokens) {
    // Import Google Calendar events as tasks
  },
}
```

---

## 15.3 Life Reset Mode

### Overview

Feature for users experiencing major life changes who need to restructure their roadmap.

### Implementation Plan

#### Life Reset Flow

```typescript
// src/features/life-reset/types.ts

export interface LifeResetSession {
  id: string
  user_id: string
  trigger_reason: LifeResetReason
  started_at: string
  completed_at: string | null
  archived_snapshot: {
    direction: Direction
    areas: Area[]
    goals: Goal[]
    tasks: Task[]
  }
  new_direction: string | null
  reflection: string | null
}

export type LifeResetReason =
  | 'career_change'
  | 'relationship_change'
  | 'health_event'
  | 'relocation'
  | 'burnout'
  | 'new_priorities'
  | 'other'
```

#### Reset Components

```typescript
// Life Reset Steps:
// 1. Trigger Selection - Why are you resetting?
// 2. Reflection - What did you learn from your previous roadmap?
// 3. Archive - Save current state for reference
// 4. Clean Slate - Clear or archive existing goals
// 5. New Direction - Redefine life direction
// 6. Rebuild - Create new areas and goals
```

---

## 15.4 Social Features (Optional)

### Accountability Partners

```typescript
// Share progress with trusted friends

export interface AccountabilityPartner {
  id: string
  user_id: string
  partner_user_id: string
  status: 'pending' | 'accepted'
  share_settings: {
    share_streaks: boolean
    share_completion_rate: boolean
    share_goals: boolean
  }
}
```

### Achievement Sharing

```typescript
// Share milestones on social media

export function generateShareCard(achievement: Achievement) {
  // Generate shareable image with:
  // - User's streak count
  // - Goal completed
  // - Milestone reached
  // Uses @vercel/og for image generation
}
```

---

## 15.5 Mobile App (PWA Enhancement)

### Progressive Web App Optimization

```json
// public/manifest.json
{
  "name": "inu - Life Roadmap",
  "short_name": "inu",
  "description": "Create your life roadmap and manage goals",
  "start_url": "/today",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2186ff",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Push Notifications

```typescript
// src/lib/notifications/push.ts

export async function registerPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  })

  // Save subscription to database
  await saveSubscription(subscription)

  return true
}

// Notification types:
// - Morning reminder (configurable time)
// - Streak at risk (end of day)
// - Weekly review prompt
// - AI insights
```

---

## 15.6 Native Mobile Apps

### React Native / Expo

```
Future consideration for native iOS/Android apps:
- Shared design system
- Offline-first architecture
- Widget support
- Native notifications
- Apple Watch / Wear OS companion
```

---

## 15.7 Advanced Analytics

### Personal Insights Dashboard

```typescript
// Additional metrics to track:

export interface AdvancedAnalytics {
  // Time patterns
  mostProductiveTimeSlot: TimeSlot
  mostProductiveDayOfWeek: number
  averageSessionDuration: number

  // Goal patterns
  averageGoalDuration: number
  goalCompletionRate: number
  mostSuccessfulArea: Area

  // Behavior insights
  skipPatterns: {
    commonReasons: string[]
    timeOfDay: Record<TimeSlot, number>
  }

  // Predictions
  predictedCompletionDate: Record<string, Date> // goalId -> date
  burnoutRisk: 'low' | 'medium' | 'high'
}
```

---

## 15.8 Monetization (Pro Features)

### Pricing Tiers

| Feature              | Free  | Pro (₩3,900/mo) |
| -------------------- | ----- | --------------- |
| Core check-in loop   | ✓     | ✓               |
| Unlimited goals      | ✓     | ✓               |
| AI interactions/day  | 3     | Unlimited       |
| Advanced analytics   | Basic | Full            |
| Google Calendar sync | -     | ✓               |
| Export data          | -     | ✓               |
| Priority support     | -     | ✓               |

### Subscription Implementation

```typescript
// Use Stripe or Paddle for payments

export async function createCheckoutSession(userId: string, plan: 'monthly' | 'yearly') {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  const session = await stripe.checkout.sessions.create({
    customer_email: await getUserEmail(userId),
    payment_method_types: ['card'],
    line_items: [
      {
        price: plan === 'monthly' ? MONTHLY_PRICE_ID : YEARLY_PRICE_ID,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?canceled=true`,
    metadata: {
      userId,
    },
  })

  return session.url
}
```

---

## 15.9 Roadmap Priority

### High Priority (Q2 2026)

1. Advanced AI Advisor
2. Push Notifications
3. Pro Subscription

### Medium Priority (Q3 2026)

4. Google Calendar Integration
5. Advanced Analytics
6. Life Reset Mode

### Low Priority (Q4 2026+)

7. Social Features
8. Native Mobile Apps
9. API for third-party integrations

---

## ✅ Post-MVP Planning Checklist

- [ ] User feedback collection system
- [ ] Feature request voting
- [ ] A/B testing infrastructure
- [ ] Analytics for feature usage
- [ ] Technical debt tracking
- [ ] Performance monitoring baseline
- [ ] Scalability plan

---

## 🎯 Success Metrics

| Metric          | MVP Target | 6-Month Target |
| --------------- | ---------- | -------------- |
| DAU             | 100        | 1,000          |
| Check-in rate   | 40%        | 60%            |
| 7-day retention | 30%        | 50%            |
| Pro conversion  | -          | 5%             |
| NPS             | 30         | 50             |

---

## 📝 Notes

This phase is intentionally high-level as specific implementations will depend on:

- User feedback from MVP launch
- Resource availability
- Market conditions
- Technical learnings

Prioritize based on user demand and business impact.

---

## 🔗 Navigation

← [Phase 14: Deployment](./phase-14-deployment.md)

---

_Version: 1.0 | Last Updated: 2026-02-03_
