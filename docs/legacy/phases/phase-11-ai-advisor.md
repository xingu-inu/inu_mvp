# Phase 11: AI Advisor (MVP - Rule-based)

> **Goal**: Implement rule-based AI messaging system with contextual triggers

---

## 📚 Reference Documents

- `docs/plan/reference/features/ai-advisor.md` - AI 어드바이저 기능 정의
- `docs/plan/screens/ai-hub/spec.md` + `wireframe.md` - AI 허브 화면 설계
- [Phase 10: Secondary Screens](./phase-10-secondary.md) - AI Hub UI 컴포넌트 (연계)

---

## 🔗 Phase 10 연계 사항

Phase 10에서 구현한 AI Hub UI 컴포넌트들과 Phase 11의 AI 로직을 연결합니다:

| Phase 10 컴포넌트       | Phase 11 연결        | 설명                       |
| ----------------------- | -------------------- | -------------------------- |
| `AIHubHeader`           | `useUnreadCount`     | 미읽음 메시지 카운트 표시  |
| `AIFeatureCards`        | Coming Soon → 활성화 | Phase 2에서 각 기능 활성화 |
| `AIConversationHistory` | `useAIConversations` | 대화 히스토리 연결         |
| `AIHubEmptyState`       | Rule Engine 연동     | 첫 메시지 트리거           |
| `QuickPrompts`          | AI Chat API          | Phase 2에서 LLM 연결       |
| `ChatInterface`         | AI Chat API          | Phase 2에서 LLM 연결       |

### Phase 10 → Phase 11 연결 흐름

```
[Phase 10: UI Layer]                    [Phase 11: Logic Layer]

AIHubPage
  ├── AIHubHeader ──────────────────────► useUnreadCount()
  ├── AIFeatureCards                         ↓
  │     ├── 자유 대화 ─────────(Phase 2)─► AI Chat API
  │     ├── 주간 인사이트 ────(Phase 2)─► Weekly Analysis
  │     ├── TODO 제안 ────────(Phase 2)─► Task Suggestion
  │     └── 타임라인 최적화 ──(Phase 2)─► Timeline Optimizer
  ├── AIConversationHistory ────────────► useAIConversations()
  └── ChatInterface ────────(Phase 2)──► AI Chat API

TodayPage
  └── AIInsightCard ────────────────────► useAIMessages()
                                              ↓
TopBar                                       Rule Engine
  └── AI Badge ─────────────────────────► useUnreadCount()
                                              ↓
CheckIn Flow                                 evaluateTriggers()
  └── useCheckIn ───────────────────────► AI Service
```

---

## 🌐 Environment Variables

```bash
# .env.local

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Required: Upstash Redis (Rate Limiting)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxx

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Phase 2+: OpenAI (LLM Integration)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OPENAI_API_KEY=sk-xxx
OPENAI_MODEL=gpt-4o-mini
```

---

## 📁 File Structure

```
src/
├── lib/
│   └── ai/
│       ├── triggers.ts           # 트리거 조건 정의
│       ├── templates.ts          # 메시지 템플릿 (다국어)
│       ├── engine/
│       │   └── rule-engine.ts    # 규칙 엔진 클래스
│       ├── context-builder.ts    # 사용자 컨텍스트 구축
│       └── rate-limit.ts         # Rate Limiting (Upstash)
├── services/
│   └── ai.service.ts             # AI 서비스 (메시지 CRUD)
├── stores/
│   └── ai.store.ts               # AI 상태 관리 (Zustand)
├── queries/
│   └── use-ai-messages.ts        # TanStack Query hooks
├── actions/
│   └── ai.actions.ts             # Server Actions
├── features/
│   ├── today/
│   │   └── components/
│   │       └── ai-insight-card.tsx
│   └── ai-hub/                   # (Phase 10에서 생성)
│       └── components/
│           ├── ai-usage-indicator.tsx   # Phase 11 추가
│           └── ai-message-list.tsx      # Phase 11 추가
└── app/
    └── api/
        └── ai/
            ├── usage/route.ts    # Rate Limit 조회
            └── chat/route.ts     # Phase 2: LLM Chat
```

---

## 11.1 Database Schema

### 11.1.1 AI Messages Table

```sql
-- supabase/migrations/20260205_ai_messages.sql

CREATE TYPE message_type AS ENUM (
  'celebration',
  'encouragement',
  'insight',
  'suggestion',
  'reminder'
);

CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type message_type NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  related_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  related_goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  trigger_id TEXT,                    -- 어떤 트리거로 생성됐는지
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ai_messages_user_id ON ai_messages(user_id);
CREATE INDEX idx_ai_messages_is_read ON ai_messages(is_read) WHERE is_read = false;
CREATE INDEX idx_ai_messages_created_at ON ai_messages(created_at DESC);
CREATE INDEX idx_ai_messages_trigger_id ON ai_messages(trigger_id);

-- RLS
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own AI messages" ON ai_messages
  FOR SELECT USING (auth.uid() = user_id);

-- Service role만 INSERT 가능 (서버 사이드)
CREATE POLICY "Service can insert AI messages" ON ai_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own AI messages" ON ai_messages
  FOR UPDATE USING (auth.uid() = user_id);
```

### 11.1.2 AI Conversations Table (Phase 2+ 준비)

```sql
-- supabase/migrations/20260205_ai_conversations.sql
-- Phase 2+에서 LLM 대화 저장용

CREATE TYPE conversation_type AS ENUM (
  'chat',
  'goal_review',
  'weekly_insight',
  'todo_suggestion',
  'timeline_optimization'
);

CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type conversation_type NOT NULL,
  title TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  related_goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_type ON ai_conversations(type);
CREATE INDEX idx_ai_conversations_created_at ON ai_conversations(created_at DESC);

-- RLS
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own conversations" ON ai_conversations
  FOR ALL USING (auth.uid() = user_id);

-- Updated trigger
CREATE TRIGGER update_ai_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 11.1.3 AI Trigger Cooldowns Table

```sql
-- supabase/migrations/20260205_ai_trigger_cooldowns.sql
-- 트리거별 쿨다운 관리 (서버 사이드 쿨다운 대신 DB 기반)

CREATE TABLE ai_trigger_cooldowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_id TEXT NOT NULL,
  last_triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, trigger_id)
);

-- Index
CREATE INDEX idx_ai_trigger_cooldowns_user ON ai_trigger_cooldowns(user_id, trigger_id);

-- RLS
ALTER TABLE ai_trigger_cooldowns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service can manage cooldowns" ON ai_trigger_cooldowns
  FOR ALL WITH CHECK (true);
```

### 11.1.4 Type Definitions

```typescript
// src/types/database.ts - 추가

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI Message Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export type MessageType = 'celebration' | 'encouragement' | 'insight' | 'suggestion' | 'reminder'

export interface AIMessage {
  id: string
  user_id: string
  type: MessageType
  title: string
  content: string
  is_read: boolean
  related_task_id: string | null
  related_goal_id: string | null
  trigger_id: string | null
  created_at: string
}

export interface AIMessageInsert {
  type: MessageType
  title: string
  content: string
  related_task_id?: string | null
  related_goal_id?: string | null
  trigger_id?: string | null
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI Conversation Types (Phase 2+)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export type ConversationType =
  | 'chat'
  | 'goal_review'
  | 'weekly_insight'
  | 'todo_suggestion'
  | 'timeline_optimization'

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface AIConversation {
  id: string
  user_id: string
  type: ConversationType
  title: string
  messages: ConversationMessage[]
  related_goal_id: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface AIConversationInsert {
  type: ConversationType
  title: string
  messages?: ConversationMessage[]
  related_goal_id?: string | null
}
```

---

## 11.2 AI Store

```typescript
// src/stores/ai.store.ts
import { create } from 'zustand'
import type { MessageType } from '@/types/database'

interface AIState {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Message Filter
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  filter: MessageType | 'all'
  setFilter: (filter: MessageType | 'all') => void

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Chat State (Phase 2)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  isChatOpen: boolean
  openChat: () => void
  closeChat: () => void

  chatType: 'free' | 'goal_review' | 'weekly_insight' | 'todo_suggestion' | 'timeline'
  setChatType: (type: AIState['chatType']) => void

  relatedGoalId: string | null
  setRelatedGoalId: (goalId: string | null) => void

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Streaming State
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  isStreaming: boolean
  setIsStreaming: (streaming: boolean) => void
  streamingContent: string
  appendStreamingContent: (chunk: string) => void
  resetStreamingContent: () => void
}

export const useAIStore = create<AIState>((set) => ({
  // Message Filter
  filter: 'all',
  setFilter: (filter) => set({ filter }),

  // Chat State
  isChatOpen: false,
  openChat: () => set({ isChatOpen: true }),
  closeChat: () => set({ isChatOpen: false, relatedGoalId: null }),

  chatType: 'free',
  setChatType: (chatType) => set({ chatType }),

  relatedGoalId: null,
  setRelatedGoalId: (relatedGoalId) => set({ relatedGoalId }),

  // Streaming State
  isStreaming: false,
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  streamingContent: '',
  appendStreamingContent: (chunk) =>
    set((state) => ({ streamingContent: state.streamingContent + chunk })),
  resetStreamingContent: () => set({ streamingContent: '' }),
}))
```

---

## 11.3 AI Message Types & Triggers

### Message Types

| Type            | 한국어   | Purpose          | Trigger                |
| --------------- | -------- | ---------------- | ---------------------- |
| `celebration`   | 축하     | 성취 축하        | 마일스톤 달성          |
| `encouragement` | 격려     | 힘든 날 응원     | 낮은 완료율, Skip 연속 |
| `insight`       | 인사이트 | 데이터 기반 관찰 | 패턴 감지              |
| `suggestion`    | 제안     | 행동 추천        | 컨텍스트 기반          |
| `reminder`      | 리마인더 | 부드러운 알림    | 시간 기반              |

### Trigger Conditions

```typescript
// src/lib/ai/triggers.ts
import type { Task, CheckIn, Goal } from '@/types/database'
import { isToday, differenceInDays } from 'date-fns'

export interface TriggerContext {
  tasks: Task[]
  checkIns: CheckIn[]
  goals: Goal[]
  userId: string
  stats: {
    completedToday: number
    totalToday: number
    currentStreak: number
    lastActiveDate: string
    areaStats: Record<string, number>
  }
}

export interface TriggerConfig {
  check: (ctx: TriggerContext) => Task | Goal | boolean | undefined
  priority: number
  cooldownMs: number
}

export const AI_TRIGGERS: Record<string, TriggerConfig> = {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Celebration Triggers (축하)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STREAK_MILESTONE: {
    check: (ctx) => {
      const milestones = [3, 5, 7, 10, 14, 21, 30, 50, 100]
      return ctx.tasks.find((t) => milestones.includes(t.streak_count ?? 0))
    },
    priority: 25,
    cooldownMs: 24 * 60 * 60 * 1000, // 24시간
  },

  PERFECT_DAY: {
    check: (ctx) => ctx.stats.completedToday === ctx.stats.totalToday && ctx.stats.totalToday > 0,
    priority: 20,
    cooldownMs: 24 * 60 * 60 * 1000,
  },

  GOAL_COMPLETED: {
    check: (ctx) =>
      ctx.goals.find((g) => g.status === 'completed' && isToday(new Date(g.updated_at))),
    priority: 30,
    cooldownMs: 0, // 즉시
  },

  FIRST_CHECKIN: {
    check: (ctx) => ctx.checkIns.length === 1 && ctx.checkIns[0].status === 'done',
    priority: 15,
    cooldownMs: Infinity, // 한 번만
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Encouragement Triggers (격려)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SKIP_STREAK: {
    check: (ctx) => {
      const todaySkips = ctx.checkIns.filter((c) => c.status === 'skip').length
      return todaySkips >= 3
    },
    priority: 12,
    cooldownMs: 24 * 60 * 60 * 1000,
  },

  LOW_COMPLETION: {
    check: (ctx) =>
      ctx.stats.totalToday > 0 && ctx.stats.completedToday / ctx.stats.totalToday < 0.3,
    priority: 10,
    cooldownMs: 24 * 60 * 60 * 1000,
  },

  RETURNING_USER: {
    check: (ctx) => {
      const lastActive = new Date(ctx.stats.lastActiveDate)
      const daysSince = differenceInDays(new Date(), lastActive)
      return daysSince >= 3
    },
    priority: 15,
    cooldownMs: 3 * 24 * 60 * 60 * 1000, // 3일
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Insight Triggers (인사이트) - Phase 2
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  AREA_IMBALANCE: {
    check: (ctx) => {
      const values = Object.values(ctx.stats.areaStats)
      if (values.length < 2) return false
      const max = Math.max(...values)
      const min = Math.min(...values)
      return max - min > 50
    },
    priority: 8,
    cooldownMs: 7 * 24 * 60 * 60 * 1000, // 7일
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Reminder Triggers (리마인더)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  HIGH_STREAK_AT_RISK: {
    check: (ctx) => {
      const hour = new Date().getHours()
      if (hour < 18) return undefined // 저녁 이후에만

      return ctx.tasks.find(
        (t) =>
          (t.streak_count ?? 0) >= 5 &&
          !ctx.checkIns.some((c) => c.task_id === t.id && c.status === 'done')
      )
    },
    priority: 18,
    cooldownMs: 6 * 60 * 60 * 1000, // 6시간
  },

  GOAL_STALLED: {
    check: (ctx) => {
      return ctx.goals.find((g) => {
        const daysSince = differenceInDays(new Date(), new Date(g.updated_at))
        return daysSince >= 7 && g.status === 'active'
      })
    },
    priority: 10,
    cooldownMs: 7 * 24 * 60 * 60 * 1000,
  },
} as const

export type TriggerId = keyof typeof AI_TRIGGERS
```

---

## 11.4 Message Templates (다국어)

```typescript
// src/lib/ai/templates.ts
import type { MessageType } from '@/types/database'

export interface MessageTemplate {
  type: MessageType
  ko: { title: string; content: string }
  en: { title: string; content: string }
  variables?: string[]
}

export const MESSAGE_TEMPLATES: Record<string, MessageTemplate[]> = {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Celebration Messages (축하)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STREAK_MILESTONE: [
    {
      type: 'celebration',
      ko: {
        title: '{{streak}}일 연속 달성!',
        content: '"{{taskName}}" {{streak}}일째 해내고 있어요. 정말 대단해요!',
      },
      en: {
        title: '{{streak}}-day streak!',
        content: 'You\'ve been consistent with "{{taskName}}" for {{streak}} days. Amazing!',
      },
      variables: ['streak', 'taskName'],
    },
    {
      type: 'celebration',
      ko: {
        title: '{{streak}}일 스트릭 달성!',
        content: '"{{taskName}}" 습관이 쌓이고 있어요. 꾸준함이 힘이에요!',
      },
      en: {
        title: 'Streak milestone!',
        content: '{{streak}} days of "{{taskName}}"! Consistency builds momentum.',
      },
      variables: ['streak', 'taskName'],
    },
  ],

  PERFECT_DAY: [
    {
      type: 'celebration',
      ko: {
        title: '오늘 할 일 완료!',
        content: '{{count}}개 태스크를 모두 완료했어요. 오늘 하루 고생했어요!',
      },
      en: {
        title: 'Perfect day!',
        content: 'You completed all {{count}} tasks today. Well done!',
      },
      variables: ['count'],
    },
    {
      type: 'celebration',
      ko: {
        title: '완벽한 하루!',
        content: '오늘 계획한 {{count}}개를 모두 해냈어요. 이게 바로 성장이에요!',
      },
      en: {
        title: 'All done!',
        content: "You've completed all {{count}} tasks today. That's progress!",
      },
      variables: ['count'],
    },
  ],

  GOAL_COMPLETED: [
    {
      type: 'celebration',
      ko: {
        title: '목표 달성!',
        content: '"{{goalName}}"을 완료했어요! 이 성취를 기억해두세요.',
      },
      en: {
        title: 'Goal achieved!',
        content: 'Congratulations on completing "{{goalName}}"! Celebrate this moment.',
      },
      variables: ['goalName'],
    },
  ],

  FIRST_CHECKIN: [
    {
      type: 'celebration',
      ko: {
        title: '첫 발을 내딛었어요!',
        content: '첫 체크인을 완료했어요. 모든 여정은 첫 걸음부터 시작해요.',
      },
      en: {
        title: 'First step taken!',
        content: 'You completed your first check-in. Every journey begins with a single step.',
      },
    },
  ],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Encouragement Messages (격려)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SKIP_STREAK: [
    {
      type: 'encouragement',
      ko: {
        title: '쉬어가는 것도 과정이에요',
        content: '몇 번 건너뛰어도 괜찮아요. 준비되면 다시 시작하면 돼요.',
      },
      en: {
        title: 'Rest is part of the process',
        content: "It's okay to skip sometimes. When you're ready, start fresh.",
      },
    },
    {
      type: 'encouragement',
      ko: {
        title: '잠시 쉬어가도 괜찮아요',
        content: '컨디션이 안 좋을 때도 있죠. 중요한 건 다시 시작하는 거예요.',
      },
      en: {
        title: 'Taking a break?',
        content: 'Bad days happen. What matters is getting back on track.',
      },
    },
  ],

  LOW_COMPLETION: [
    {
      type: 'encouragement',
      ko: {
        title: '작은 진전도 진전이에요',
        content: '하나라도 했다면 충분해요. 오늘 할 수 있는 것에 집중해보세요.',
      },
      en: {
        title: 'Small steps count',
        content: 'Even completing one task is progress. Focus on what you can do.',
      },
    },
  ],

  RETURNING_USER: [
    {
      type: 'encouragement',
      ko: {
        title: '다시 만나서 반가워요!',
        content: '잠시 떠나있었어도 괜찮아요. 작은 것 하나부터 시작해볼까요?',
      },
      en: {
        title: 'Welcome back!',
        content: "It's been a while. No pressure—just pick one small thing to start.",
      },
    },
  ],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Insight Messages (인사이트)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  AREA_IMBALANCE: [
    {
      type: 'insight',
      ko: {
        title: '영역 밸런스 체크',
        content: '최근 {{highArea}}에 집중하고 있네요. {{lowArea}}에도 시간을 내보는 건 어떨까요?',
      },
      en: {
        title: 'Life balance check',
        content: "You've been focused on {{highArea}}. Consider {{lowArea}} too.",
      },
      variables: ['highArea', 'lowArea'],
    },
  ],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Reminder Messages (리마인더)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  HIGH_STREAK_AT_RISK: [
    {
      type: 'reminder',
      ko: {
        title: '{{streak}}일 스트릭을 지켜요!',
        content: '"{{taskName}}" 아직 안 했어요. 스트릭이 끊기기 전에 해볼까요?',
      },
      en: {
        title: "Don't break your {{streak}}-day streak!",
        content: '"{{taskName}}" is waiting. Keep the momentum going!',
      },
      variables: ['streak', 'taskName'],
    },
  ],

  GOAL_STALLED: [
    {
      type: 'suggestion',
      ko: {
        title: '"{{goalName}}" 다시 살펴볼까요?',
        content: '일주일 넘게 진행이 없었어요. 목표를 다르게 나눠볼까요?',
      },
      en: {
        title: 'Time to revisit "{{goalName}}"?',
        content: 'No progress in a week. Would you like to break it down differently?',
      },
      variables: ['goalName'],
    },
  ],
}

/**
 * 템플릿 변수 보간
 */
export function interpolateTemplate(
  template: MessageTemplate,
  variables: Record<string, unknown>,
  locale: 'ko' | 'en' = 'ko'
): { type: MessageType; title: string; content: string } {
  let { title, content } = template[locale]

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    title = title.replace(regex, String(value))
    content = content.replace(regex, String(value))
  })

  return { type: template.type, title, content }
}

/**
 * 랜덤 템플릿 선택
 */
export function getRandomTemplate(templateKey: string): MessageTemplate | null {
  const templates = MESSAGE_TEMPLATES[templateKey]
  if (!templates || templates.length === 0) return null
  return templates[Math.floor(Math.random() * templates.length)]
}
```

---

## 11.5 Rule Engine

```typescript
// src/lib/ai/engine/rule-engine.ts
import { createClient } from '@/lib/supabase/server'
import { AI_TRIGGERS, type TriggerContext, type TriggerId } from '../triggers'
import { MESSAGE_TEMPLATES, interpolateTemplate, getRandomTemplate } from '../templates'
import type { MessageType, Task, Goal } from '@/types/database'

interface RuleResult {
  triggerId: TriggerId
  message: {
    type: MessageType
    title: string
    content: string
  }
  relatedTaskId?: string
  relatedGoalId?: string
}

export class RuleEngine {
  private locale: 'ko' | 'en' = 'ko'

  setLocale(locale: 'ko' | 'en') {
    this.locale = locale
  }

  /**
   * 컨텍스트를 분석하고 적용할 규칙 평가
   */
  async evaluate(context: TriggerContext): Promise<RuleResult[]> {
    const results: RuleResult[] = []
    const supabase = await createClient()

    // 우선순위 높은 순으로 트리거 정렬
    const sortedTriggers = Object.entries(AI_TRIGGERS).sort(
      ([, a], [, b]) => b.priority - a.priority
    )

    for (const [triggerId, trigger] of sortedTriggers) {
      // 쿨다운 체크 (DB 기반)
      const canTrigger = await this.checkCooldown(
        context.userId,
        triggerId,
        trigger.cooldownMs,
        supabase
      )
      if (!canTrigger) continue

      // 조건 체크
      const triggerResult = trigger.check(context)
      if (!triggerResult) continue

      // 템플릿 가져오기
      const template = getRandomTemplate(triggerId)
      if (!template) continue

      // 변수 추출
      const variables = this.extractVariables(triggerId, context, triggerResult)

      // 메시지 생성
      const message = interpolateTemplate(template, variables, this.locale)

      // 쿨다운 기록
      await this.recordTrigger(context.userId, triggerId, supabase)

      results.push({
        triggerId: triggerId as TriggerId,
        message,
        relatedTaskId: variables.taskId as string | undefined,
        relatedGoalId: variables.goalId as string | undefined,
      })
    }

    return results
  }

  /**
   * 단일 최우선 메시지만 반환 (Today 화면용)
   */
  async evaluateTop(context: TriggerContext): Promise<RuleResult | null> {
    const results = await this.evaluate(context)
    return results[0] ?? null
  }

  private async checkCooldown(
    userId: string,
    triggerId: string,
    cooldownMs: number,
    supabase: Awaited<ReturnType<typeof createClient>>
  ): Promise<boolean> {
    if (cooldownMs === 0) return true
    if (cooldownMs === Infinity) {
      // 한 번만 트리거 (예: FIRST_CHECKIN)
      const { data } = await supabase
        .from('ai_trigger_cooldowns')
        .select('id')
        .eq('user_id', userId)
        .eq('trigger_id', triggerId)
        .maybeSingle()
      return !data
    }

    const { data } = await supabase
      .from('ai_trigger_cooldowns')
      .select('last_triggered_at')
      .eq('user_id', userId)
      .eq('trigger_id', triggerId)
      .maybeSingle()

    if (!data) return true

    const lastTime = new Date(data.last_triggered_at).getTime()
    return Date.now() - lastTime >= cooldownMs
  }

  private async recordTrigger(
    userId: string,
    triggerId: string,
    supabase: Awaited<ReturnType<typeof createClient>>
  ) {
    await supabase.from('ai_trigger_cooldowns').upsert({
      user_id: userId,
      trigger_id: triggerId,
      last_triggered_at: new Date().toISOString(),
    })
  }

  private extractVariables(
    triggerId: string,
    context: TriggerContext,
    triggerResult: unknown
  ): Record<string, unknown> {
    const variables: Record<string, unknown> = {}

    switch (triggerId) {
      case 'STREAK_MILESTONE': {
        const task = triggerResult as Task | undefined
        if (task) {
          variables.streak = task.streak_count
          variables.taskName = task.name
          variables.taskId = task.id
          variables.goalId = task.goal_id
        }
        break
      }

      case 'PERFECT_DAY':
      case 'LOW_COMPLETION':
        variables.count = context.stats.completedToday
        variables.total = context.stats.totalToday
        break

      case 'GOAL_COMPLETED': {
        const goal = triggerResult as Goal | undefined
        if (goal) {
          variables.goalName = goal.name
          variables.goalId = goal.id
        }
        break
      }

      case 'HIGH_STREAK_AT_RISK': {
        const task = triggerResult as Task | undefined
        if (task) {
          variables.streak = task.streak_count
          variables.taskName = task.name
          variables.taskId = task.id
          variables.goalId = task.goal_id
        }
        break
      }

      case 'GOAL_STALLED': {
        const goal = triggerResult as Goal | undefined
        if (goal) {
          variables.goalName = goal.name
          variables.goalId = goal.id
        }
        break
      }

      case 'AREA_IMBALANCE': {
        const entries = Object.entries(context.stats.areaStats)
        if (entries.length >= 2) {
          const sorted = entries.sort(([, a], [, b]) => b - a)
          variables.highArea = sorted[0][0]
          variables.lowArea = sorted[sorted.length - 1][0]
        }
        break
      }
    }

    return variables
  }
}

// 싱글톤 인스턴스
export const ruleEngine = new RuleEngine()
```

---

## 11.6 AI Service

```typescript
// src/services/ai.service.ts
import { createClient } from '@/lib/supabase/client'
import { ruleEngine } from '@/lib/ai/engine/rule-engine'
import type { AIMessage, AIMessageInsert, TriggerContext } from '@/types/database'

export const aiService = {
  /**
   * 트리거 평가 및 메시지 생성
   */
  async evaluateTriggers(context: TriggerContext): Promise<void> {
    const results = await ruleEngine.evaluate(context)

    if (results.length === 0) return

    // 메시지 생성
    const messages: AIMessageInsert[] = results.map((result) => ({
      type: result.message.type,
      title: result.message.title,
      content: result.message.content,
      related_task_id: result.relatedTaskId ?? null,
      related_goal_id: result.relatedGoalId ?? null,
      trigger_id: result.triggerId,
    }))

    // 저장
    await this.createMessages(context.userId, messages)
  },

  /**
   * 메시지 생성 (중복 제거)
   */
  async createMessages(userId: string, messages: AIMessageInsert[]): Promise<void> {
    const supabase = createClient()

    // 기존 미읽음 메시지의 trigger_id 조회 (중복 방지)
    const { data: existing } = await supabase
      .from('ai_messages')
      .select('trigger_id')
      .eq('user_id', userId)
      .eq('is_read', false)

    const existingTriggers = new Set(existing?.map((m) => m.trigger_id).filter(Boolean) ?? [])

    // 중복 필터링
    const newMessages = messages.filter((m) => !m.trigger_id || !existingTriggers.has(m.trigger_id))

    if (newMessages.length === 0) return

    // 삽입
    const { error } = await supabase.from('ai_messages').insert(
      newMessages.map((m) => ({
        user_id: userId,
        ...m,
      }))
    )

    if (error) {
      console.error('Failed to create AI messages:', error)
    }
  },

  /**
   * 메시지 조회
   */
  async getMessages(
    userId: string,
    options?: { unreadOnly?: boolean; limit?: number }
  ): Promise<AIMessage[]> {
    const supabase = createClient()
    const { unreadOnly = false, limit = 50 } = options ?? {}

    let query = supabase
      .from('ai_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data, error } = await query
    if (error) throw error
    return data ?? []
  },

  /**
   * 메시지 읽음 처리
   */
  async markAsRead(messageId: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('ai_messages')
      .update({ is_read: true })
      .eq('id', messageId)

    if (error) throw error
  },

  /**
   * 모든 메시지 읽음 처리
   */
  async markAllAsRead(userId: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('ai_messages')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) throw error
  },

  /**
   * 미읽음 카운트
   */
  async getUnreadCount(userId: string): Promise<number> {
    const supabase = createClient()
    const { count, error } = await supabase
      .from('ai_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) throw error
    return count ?? 0
  },

  /**
   * 메시지 삭제
   */
  async deleteMessage(messageId: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('ai_messages').delete().eq('id', messageId)

    if (error) throw error
  },
}
```

---

## 11.7 TanStack Query Hooks

```typescript
// src/queries/use-ai-messages.ts
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { aiService } from '@/services/ai.service'
import { useUser } from '@/hooks/use-user'
import { toast } from 'sonner'
import type { MessageType } from '@/types/database'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Query Keys
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const aiQueryKeys = {
  messages: {
    all: (userId: string) => ['ai-messages', userId] as const,
    unread: (userId: string) => ['ai-messages', userId, 'unread'] as const,
    byType: (userId: string, type: MessageType) => ['ai-messages', userId, type] as const,
  },
  count: (userId: string) => ['ai-messages-count', userId] as const,
  usage: (userId: string) => ['ai-usage', userId] as const,
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Queries
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * AI 메시지 목록 조회
 */
export function useAIMessages(options?: { unreadOnly?: boolean }) {
  const { user } = useUser()
  const { unreadOnly = false } = options ?? {}

  return useQuery({
    queryKey: unreadOnly
      ? aiQueryKeys.messages.unread(user?.id ?? '')
      : aiQueryKeys.messages.all(user?.id ?? ''),
    queryFn: () => aiService.getMessages(user!.id, { unreadOnly }),
    enabled: !!user?.id,
    staleTime: 30_000, // 30초
  })
}

/**
 * 미읽음 카운트
 */
export function useUnreadCount() {
  const { user } = useUser()

  const { data: count = 0 } = useQuery({
    queryKey: aiQueryKeys.count(user?.id ?? ''),
    queryFn: () => aiService.getUnreadCount(user!.id),
    enabled: !!user?.id,
    refetchInterval: 60_000, // 1분마다 갱신
  })

  return count
}

/**
 * AI 사용량 조회 (Rate Limit)
 */
export function useAIUsage() {
  const { user } = useUser()

  return useQuery({
    queryKey: aiQueryKeys.usage(user?.id ?? ''),
    queryFn: async () => {
      const res = await fetch('/api/ai/usage')
      if (!res.ok) throw new Error('Failed to fetch usage')
      return res.json() as Promise<{
        remaining: number
        limit: number
        resetAt: string
      }>
    },
    enabled: !!user?.id,
    refetchInterval: 60_000,
  })
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Mutations
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 메시지 읽음 처리
 */
export function useMarkAsRead() {
  const { user } = useUser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (messageId: string) => aiService.markAsRead(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: aiQueryKeys.messages.all(user?.id ?? ''),
      })
      queryClient.invalidateQueries({
        queryKey: aiQueryKeys.messages.unread(user?.id ?? ''),
      })
      queryClient.invalidateQueries({
        queryKey: aiQueryKeys.count(user?.id ?? ''),
      })
    },
  })
}

/**
 * 모든 메시지 읽음 처리
 */
export function useMarkAllAsRead() {
  const { user } = useUser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => aiService.markAllAsRead(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: aiQueryKeys.messages.all(user?.id ?? ''),
      })
      queryClient.invalidateQueries({
        queryKey: aiQueryKeys.messages.unread(user?.id ?? ''),
      })
      queryClient.invalidateQueries({
        queryKey: aiQueryKeys.count(user?.id ?? ''),
      })
      toast.success('모든 메시지를 읽음 처리했어요')
    },
  })
}

/**
 * 메시지 삭제
 */
export function useDeleteMessage() {
  const { user } = useUser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (messageId: string) => aiService.deleteMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: aiQueryKeys.messages.all(user?.id ?? ''),
      })
      queryClient.invalidateQueries({
        queryKey: aiQueryKeys.count(user?.id ?? ''),
      })
    },
  })
}
```

---

## 11.8 Server Actions

```typescript
// src/actions/ai.actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { AIMessageInsert } from '@/types/database'

/**
 * AI 메시지 생성 (서버 전용)
 */
export async function createAIMessage(input: AIMessageInsert) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('ai_messages')
    .insert({
      user_id: user.id,
      ...input,
    })
    .select()
    .single()

  if (error) throw error

  revalidatePath('/today')
  revalidatePath('/ai-hub')
  return data
}

/**
 * AI 메시지 읽음 처리
 */
export async function markMessageAsRead(messageId: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('ai_messages').update({ is_read: true }).eq('id', messageId)

  if (error) throw error

  revalidatePath('/today')
  revalidatePath('/ai-hub')
}

/**
 * 모든 AI 메시지 읽음 처리
 */
export async function markAllMessagesAsRead() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('ai_messages')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (error) throw error

  revalidatePath('/today')
  revalidatePath('/ai-hub')
}

/**
 * AI 메시지 삭제
 */
export async function deleteAIMessage(messageId: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('ai_messages').delete().eq('id', messageId)

  if (error) throw error

  revalidatePath('/ai-hub')
}
```

---

## 11.9 Check-in with AI Trigger

체크인 완료 시 자동으로 AI 트리거를 평가합니다.

```typescript
// src/features/checkin/hooks/use-checkin-with-ai.ts
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format, getDay } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { aiService } from '@/services/ai.service'
import { useUser } from '@/hooks/use-user'
import { toast } from 'sonner'
import type { CheckInStatus, Task, TriggerContext } from '@/types/database'

interface CheckInInput {
  task_id: string
  date: string
  status: CheckInStatus
}

export function useCheckInWithAI() {
  const { user } = useUser()
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (input: CheckInInput) => {
      if (!user?.id) throw new Error('User not found')

      // 1. 체크인 생성/업데이트
      const { data: checkIn, error: checkInError } = await supabase
        .from('check_ins')
        .upsert({
          user_id: user.id,
          task_id: input.task_id,
          date: input.date,
          status: input.status,
          completed_at: input.status === 'done' ? new Date().toISOString() : null,
        })
        .select()
        .single()

      if (checkInError) throw checkInError

      // 2. 스트릭 업데이트 (done인 경우)
      if (input.status === 'done') {
        await supabase.rpc('increment_streak', { p_task_id: input.task_id })
      }

      // 3. AI 트리거 평가 (비동기, 실패해도 체크인은 성공)
      evaluateAITriggers(user.id, supabase).catch(console.error)

      return checkIn
    },
    onSuccess: (_, variables) => {
      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['tasks', 'today'] })
      queryClient.invalidateQueries({ queryKey: ['check-ins', variables.date] })
      queryClient.invalidateQueries({ queryKey: ['ai-messages'] })
      queryClient.invalidateQueries({ queryKey: ['ai-messages-count'] })
    },
    onError: (error) => {
      toast.error('체크인에 실패했어요', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    },
  })
}

/**
 * AI 트리거 평가 (비동기)
 */
async function evaluateAITriggers(userId: string, supabase: ReturnType<typeof createClient>) {
  const today = format(new Date(), 'yyyy-MM-dd')

  // 컨텍스트 데이터 조회
  const [tasksResult, checkInsResult, goalsResult, lastCheckInResult] = await Promise.all([
    supabase.from('tasks').select('*, goal:goals(name, area:areas(name))').eq('user_id', userId),
    supabase.from('check_ins').select('*').eq('user_id', userId).eq('date', today),
    supabase.from('goals').select('*').eq('user_id', userId).in('status', ['active', 'completed']),
    supabase
      .from('check_ins')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const tasks = (tasksResult.data ?? []) as Task[]
  const checkIns = checkInsResult.data ?? []
  const goals = goalsResult.data ?? []

  // 오늘 체크인 대상 Task 필터링
  const todayTasks = tasks.filter((t) => shouldCheckInToday(t))

  // 통계 계산
  const completedToday = checkIns.filter((c) => c.status === 'done').length
  const totalToday = todayTasks.length

  // Area별 통계
  const areaStats: Record<string, number> = {}
  for (const task of tasks) {
    const areaName = (task as any).goal?.area?.name ?? 'Unknown'
    const isCompleted = checkIns.some((c) => c.task_id === task.id && c.status === 'done')
    if (isCompleted) {
      areaStats[areaName] = (areaStats[areaName] ?? 0) + 1
    }
  }

  const context: TriggerContext = {
    userId,
    tasks,
    checkIns,
    goals,
    stats: {
      completedToday,
      totalToday,
      currentStreak: Math.max(...tasks.map((t) => t.streak_count ?? 0), 0),
      lastActiveDate: lastCheckInResult.data?.date ?? today,
      areaStats,
    },
  }

  // AI 서비스로 평가 실행
  await aiService.evaluateTriggers(context)
}

function shouldCheckInToday(task: Task): boolean {
  const dayOfWeek = getDay(new Date()) // 0 = Sunday

  switch (task.repeat_type) {
    case 'daily':
      return true
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5
    case 'weekly':
    case 'custom':
      return task.repeat_days?.includes(dayOfWeek) ?? false
    default:
      return false
  }
}
```

---

## 11.10 AI Insight Card (Today 화면)

Today 화면에 표시되는 AI 인사이트 카드입니다.

```typescript
// src/features/today/components/ai-insight-card.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X, Sparkles, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAIMessages, useMarkAsRead, useUnreadCount } from '@/queries/use-ai-messages'
import { cn } from '@/lib/utils'
import type { MessageType } from '@/types/database'

const TYPE_STYLES: Record<MessageType, string> = {
  celebration: 'bg-done/10 border-done/20',
  encouragement: 'bg-ai/10 border-ai/20',
  insight: 'bg-primary-100 border-primary-200',
  suggestion: 'bg-warning/10 border-warning/20',
  reminder: 'bg-streak/10 border-streak/20',
}

export function AIInsightCard() {
  const { data: messages = [] } = useAIMessages({ unreadOnly: true })
  const markAsRead = useMarkAsRead()
  const unreadCount = useUnreadCount()
  const [isDismissing, setIsDismissing] = useState(false)

  // 가장 최근 미읽음 메시지
  const latestMessage = messages[0]

  if (!latestMessage) return null

  const handleDismiss = async () => {
    setIsDismissing(true)
    try {
      await markAsRead.mutateAsync(latestMessage.id)
    } finally {
      setIsDismissing(false)
    }
  }

  return (
    <Card
      className={cn(
        'relative p-4 transition-all duration-300',
        TYPE_STYLES[latestMessage.type] ?? 'bg-ai/10 border-ai/20',
        isDismissing && 'opacity-50 scale-95'
      )}
    >
      {/* 닫기 버튼 */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDismiss}
        disabled={isDismissing}
        className="absolute top-3 right-3 h-7 w-7"
        aria-label="닫기"
      >
        <X className="w-4 h-4" />
      </Button>

      {/* 메시지 내용 */}
      <div className="flex items-start gap-3 pr-8">
        <div className="w-10 h-10 rounded-full bg-ai/20 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-ai" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold">{latestMessage.title}</h3>
          <p className="text-sm text-foreground-secondary mt-1 leading-relaxed">
            {latestMessage.content}
          </p>
        </div>
      </div>

      {/* AI Hub 링크 */}
      {unreadCount > 1 && (
        <Link
          href="/ai-hub"
          className="flex items-center gap-1 text-sm text-ai font-medium mt-4 hover:underline"
        >
          <span>모든 인사이트 보기 ({unreadCount})</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </Card>
  )
}
```

---

## 11.11 AI Message List (AI Hub)

Phase 10의 AI Hub와 연결되는 메시지 목록 컴포넌트입니다.

```typescript
// src/features/ai-hub/components/ai-message-list.tsx
'use client'

import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Check, Trash2, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAIMessages, useMarkAsRead, useDeleteMessage, useMarkAllAsRead } from '@/queries/use-ai-messages'
import { useAIStore } from '@/stores/ai.store'
import { cn } from '@/lib/utils'
import type { AIMessage, MessageType } from '@/types/database'

const TYPE_LABELS: Record<MessageType, string> = {
  celebration: '축하',
  encouragement: '격려',
  insight: '인사이트',
  suggestion: '제안',
  reminder: '리마인더',
}

const TYPE_COLORS: Record<MessageType, string> = {
  celebration: 'bg-done/10 text-done',
  encouragement: 'bg-ai/10 text-ai',
  insight: 'bg-primary-100 text-primary',
  suggestion: 'bg-warning/10 text-warning',
  reminder: 'bg-streak/10 text-streak',
}

export function AIMessageList() {
  const { data: messages = [], isLoading } = useAIMessages()
  const { filter } = useAIStore()
  const markAsRead = useMarkAsRead()
  const markAllAsRead = useMarkAllAsRead()
  const deleteMessage = useDeleteMessage()

  // 필터 적용
  const filteredMessages =
    filter === 'all' ? messages : messages.filter((m) => m.type === filter)

  const unreadMessages = messages.filter((m) => !m.is_read)

  if (isLoading) {
    return <AIMessageListSkeleton />
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Sparkles className="w-12 h-12 text-foreground-tertiary mb-4" />
        <p className="text-foreground-secondary">아직 AI 메시지가 없어요</p>
        <p className="text-sm text-foreground-tertiary mt-1">
          체크인을 하면 AI가 응원 메시지를 보내드려요
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 일괄 읽음 처리 */}
      {unreadMessages.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
          >
            <Check className="w-4 h-4 mr-1" />
            모두 읽음
          </Button>
        </div>
      )}

      {/* 메시지 목록 */}
      <div className="space-y-3">
        {filteredMessages.map((message) => (
          <AIMessageCard
            key={message.id}
            message={message}
            onMarkAsRead={() => markAsRead.mutate(message.id)}
            onDelete={() => deleteMessage.mutate(message.id)}
          />
        ))}
      </div>
    </div>
  )
}

interface AIMessageCardProps {
  message: AIMessage
  onMarkAsRead: () => void
  onDelete: () => void
}

function AIMessageCard({ message, onMarkAsRead, onDelete }: AIMessageCardProps) {
  return (
    <Card
      className={cn(
        'p-4 transition-all',
        !message.is_read && 'border-ai/30 bg-ai/5'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Type Badge */}
          <span
            className={cn(
              'inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2',
              TYPE_COLORS[message.type]
            )}
          >
            {TYPE_LABELS[message.type]}
          </span>

          {/* Title */}
          <h4 className="font-medium">{message.title}</h4>

          {/* Content */}
          <p className="text-sm text-foreground-secondary mt-1">
            {message.content}
          </p>

          {/* Date */}
          <p className="text-xs text-foreground-tertiary mt-2">
            {format(new Date(message.created_at), 'M월 d일 (EEE) HH:mm', {
              locale: ko,
            })}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {!message.is_read && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onMarkAsRead}
              aria-label="읽음 처리"
            >
              <Check className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-foreground-tertiary hover:text-miss"
            onClick={onDelete}
            aria-label="삭제"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}

function AIMessageListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="p-4 animate-pulse">
          <div className="h-4 bg-surface-secondary rounded w-16 mb-2" />
          <div className="h-5 bg-surface-secondary rounded w-3/4 mb-2" />
          <div className="h-4 bg-surface-secondary rounded w-full" />
        </Card>
      ))}
    </div>
  )
}
```

---

## 11.12 Navigation Badge

상단 바에 미읽음 배지를 표시합니다.

```typescript
// src/components/layout/top-bar.tsx (수정 부분)
'use client'

import Link from 'next/link'
import { Inbox, Bot, User } from 'lucide-react'
import { useUnreadCount } from '@/queries/use-ai-messages'
import { useInboxItems } from '@/features/inbox/hooks/use-inbox-items'
import { cn } from '@/lib/utils'

export function TopBar() {
  const aiUnreadCount = useUnreadCount()
  const { data: inboxItems = [] } = useInboxItems()
  const inboxActiveCount = inboxItems.filter((i) => i.status === 'active').length

  return (
    <header className="sticky top-0 z-40 bg-surface-primary/80 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Logo */}
        <Link href="/today" className="text-xl font-bold">
          inu
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Inbox */}
          <Link
            href="/inbox"
            className="relative p-2 rounded-lg hover:bg-surface-secondary transition-colors"
            aria-label="인박스"
          >
            <Inbox className="w-5 h-5" />
            {inboxActiveCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-xs font-medium">
                {inboxActiveCount > 9 ? '9+' : inboxActiveCount}
              </span>
            )}
          </Link>

          {/* AI Hub with Badge */}
          <Link
            href="/ai-hub"
            className="relative p-2 rounded-lg hover:bg-surface-secondary transition-colors"
            aria-label="AI 허브"
          >
            <Bot className="w-5 h-5" />
            {aiUnreadCount > 0 && (
              <span
                className={cn(
                  'absolute -top-0.5 -right-0.5 flex items-center justify-center',
                  'min-w-[18px] h-[18px] px-1 rounded-full',
                  'bg-ai text-white text-xs font-medium'
                )}
              >
                {aiUnreadCount > 9 ? '9+' : aiUnreadCount}
              </span>
            )}
          </Link>

          {/* Profile */}
          <Link
            href="/profile"
            className="p-2 rounded-lg hover:bg-surface-secondary transition-colors"
            aria-label="프로필"
          >
            <User className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </header>
  )
}
```

---

## 11.13 AI Rate Limiting

Free/Pro 사용자별 AI 요청 제한을 구현합니다.

### Rate Limit Configuration

```typescript
// src/lib/ai/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Upstash Redis 클라이언트
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

/**
 * Free 사용자: 하루 3회
 */
export const freeAILimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '24 h'),
  analytics: true,
  prefix: 'ai:free',
})

/**
 * Pro 사용자: 분당 30회 (어뷰징 방지)
 */
export const proAILimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  analytics: true,
  prefix: 'ai:pro',
})

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  limit: number
}

/**
 * AI Rate Limit 체크
 */
export async function checkAIRateLimit(userId: string, isPro: boolean): Promise<RateLimitResult> {
  const limiter = isPro ? proAILimit : freeAILimit
  const { success, limit, remaining, reset } = await limiter.limit(userId)

  return {
    allowed: success,
    remaining,
    resetAt: new Date(reset),
    limit,
  }
}

/**
 * 남은 AI 사용 횟수 조회
 */
export async function getAIRemainingCount(
  userId: string,
  isPro: boolean
): Promise<{ remaining: number; limit: number; resetAt: Date }> {
  const limiter = isPro ? proAILimit : freeAILimit
  const { remaining, limit, reset } = await limiter.getRemaining(userId)

  return {
    remaining,
    limit,
    resetAt: new Date(reset),
  }
}
```

### Usage API Route

```typescript
// src/app/api/ai/usage/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAIRemainingCount } from '@/lib/ai/rate-limit'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Pro 사용자 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_pro')
      .eq('id', user.id)
      .single()

    const isPro = profile?.is_pro ?? false

    // Rate Limit 조회
    const usage = await getAIRemainingCount(user.id, isPro)

    return NextResponse.json({
      remaining: usage.remaining,
      limit: usage.limit,
      resetAt: usage.resetAt.toISOString(),
      isPro,
    })
  } catch (error) {
    console.error('AI usage error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
```

### Usage Indicator Component

```typescript
// src/features/ai-hub/components/ai-usage-indicator.tsx
'use client'

import { Sparkles } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useAIUsage } from '@/queries/use-ai-messages'
import { useUser } from '@/hooks/use-user'

export function AIUsageIndicator() {
  const { profile } = useUser()
  const { data: usage, isLoading } = useAIUsage()

  // Pro 사용자는 표시 안 함
  if (profile?.is_pro) return null

  if (isLoading || !usage) return null

  const isExhausted = usage.remaining === 0

  return (
    <div className="flex items-center gap-2 text-sm text-foreground-secondary">
      <Sparkles className="w-4 h-4 text-ai" />
      <span>
        오늘 {usage.remaining}/{usage.limit}회 남음
      </span>
      {isExhausted && (
        <span className="text-xs text-foreground-tertiary">
          (
          {formatDistanceToNow(new Date(usage.resetAt), {
            addSuffix: true,
            locale: ko,
          })}{' '}
          초기화)
        </span>
      )}
    </div>
  )
}
```

---

## 11.14 LLM Integration (Phase 2+ Preview)

Pro 사용자를 위한 LLM 통합입니다. MVP 이후 구현됩니다.

### Context Builder

```typescript
// src/lib/ai/context-builder.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { format, subDays } from 'date-fns'

export interface UserContext {
  currentStreak: number
  completedToday: number
  totalToday: number
  activeGoals: Array<{ id: string; name: string; status: string }>
  areas: Array<{ id: string; name: string; emoji: string }>
  recentCheckIns: Array<{ date: string; completed: number; total: number }>
  direction: string | null
}

export async function buildUserContext(
  userId: string,
  supabase: SupabaseClient
): Promise<UserContext> {
  const today = format(new Date(), 'yyyy-MM-dd')
  const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd')

  // 병렬 쿼리
  const [tasksResult, goalsResult, areasResult, checkInsResult, directionResult] =
    await Promise.all([
      supabase.from('tasks').select('id, name, streak_count').eq('user_id', userId),
      supabase
        .from('goals')
        .select('id, name, status')
        .eq('user_id', userId)
        .eq('status', 'active'),
      supabase.from('areas').select('id, name, emoji').eq('user_id', userId),
      supabase.from('check_ins').select('date, status').eq('user_id', userId).gte('date', weekAgo),
      supabase.from('directions').select('text').eq('user_id', userId).maybeSingle(),
    ])

  const tasks = tasksResult.data ?? []
  const goals = goalsResult.data ?? []
  const areas = areasResult.data ?? []
  const checkIns = checkInsResult.data ?? []

  // 오늘 통계
  const todayCheckIns = checkIns.filter((c) => c.date === today)
  const completedToday = todayCheckIns.filter((c) => c.status === 'done').length
  const totalToday = tasks.length

  // 최고 스트릭
  const currentStreak = Math.max(...tasks.map((t) => t.streak_count ?? 0), 0)

  // 최근 7일 체크인 요약
  const recentCheckIns = Array.from({ length: 7 }, (_, i) => {
    const date = format(subDays(new Date(), i), 'yyyy-MM-dd')
    const dayCheckIns = checkIns.filter((c) => c.date === date)
    return {
      date,
      completed: dayCheckIns.filter((c) => c.status === 'done').length,
      total: tasks.length,
    }
  })

  return {
    currentStreak,
    completedToday,
    totalToday,
    activeGoals: goals,
    areas,
    recentCheckIns,
    direction: directionResult.data?.text ?? null,
  }
}
```

### AI Chat API Route

```typescript
// src/app/api/ai/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { checkAIRateLimit } from '@/lib/ai/rate-limit'
import { buildUserContext, type UserContext } from '@/lib/ai/context-builder'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    // 1. 인증 확인
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message: '로그인이 필요해요' } },
        { status: 401 }
      )
    }

    // 2. Pro 사용자 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_pro')
      .eq('id', user.id)
      .single()

    const isPro = profile?.is_pro ?? false

    // 3. Rate Limit 확인
    const rateCheck = await checkAIRateLimit(user.id, isPro)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AI_QUOTA_EXCEEDED',
            message: isPro
              ? '잠시 후 다시 시도해주세요'
              : `오늘 AI 사용 횟수를 모두 사용했어요. ${formatDistanceToNow(rateCheck.resetAt, { addSuffix: true, locale: ko })} 초기화돼요.`,
            resetAt: rateCheck.resetAt.toISOString(),
          },
        },
        { status: 429 }
      )
    }

    // 4. 요청 파싱
    const { message, conversationType } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: '메시지를 입력해주세요' } },
        { status: 400 }
      )
    }

    // 5. 사용자 컨텍스트 구축
    const context = await buildUserContext(user.id, supabase)

    // 6. Streaming 응답
    const stream = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(context, conversationType),
        },
        { role: 'user', content: message },
      ],
      stream: true,
      max_tokens: 500,
      temperature: 0.7,
    })

    // 7. Stream 반환
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || ''
          controller.enqueue(encoder.encode(text))
        }
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-AI-Remaining': String(rateCheck.remaining - 1),
      },
    })
  } catch (error) {
    console.error('AI Chat error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '문제가 발생했어요' } },
      { status: 500 }
    )
  }
}

function buildSystemPrompt(context: UserContext, type?: string): string {
  const basePrompt = `당신은 inu의 AI 코치입니다. 사용자가 인생 목표를 달성하도록 돕습니다.

사용자 현황:
- 인생 방향: ${context.direction ?? '설정되지 않음'}
- 현재 스트릭: ${context.currentStreak}일
- 오늘 완료: ${context.completedToday}/${context.totalToday}
- 활성 목표: ${context.activeGoals.map((g) => g.name).join(', ') || '없음'}
- 집중 영역: ${context.areas.map((a) => `${a.emoji} ${a.name}`).join(', ') || '없음'}

가이드라인:
- 격려하되 빈말하지 않기
- 구체적이고 실행 가능한 조언 제공
- 사용자의 실제 목표와 진행 상황 참조
- 간결하게 (최대 3문장)
- 성장 마인드셋 언어 사용
- "왜 못했어요?"가 아닌 "어떤 어려움이 있었나요?"
- 한국어로 응답`

  const typePrompts: Record<string, string> = {
    goal_review: `\n\n추가 맥락: 사용자가 목표 점검을 요청했습니다. 현재 진행 상황을 분석하고 다음 단계를 제안해주세요.`,
    weekly_insight: `\n\n추가 맥락: 사용자가 주간 인사이트를 요청했습니다. 이번 주 패턴을 분석하고 개선점을 제안해주세요.`,
    todo_suggestion: `\n\n추가 맥락: 사용자가 다음 할 일 제안을 요청했습니다. 현재 목표와 진행 상황을 고려해 구체적인 Task를 제안해주세요.`,
    timeline_optimization: `\n\n추가 맥락: 사용자가 시간 배치 최적화를 요청했습니다. 현재 Task들의 시간대를 분석하고 효율적인 배치를 제안해주세요.`,
  }

  return basePrompt + (type ? (typePrompts[type] ?? '') : '')
}
```

---

## 🤖 AI Testing Verification

Phase 완료 후 Claude가 Playwright MCP로 직접 검증합니다:

```
1. pnpm dev 실행
2. AI Advisor 기능 E2E 테스트

### Rule Engine 테스트
browser_navigate("http://localhost:3000/today")

1. 체크인으로 스트릭 증가 테스트
   - 첫 번째 Task "Done" 클릭
   - browser_navigate("/ai-hub")
   - 축하 메시지 생성 확인 (스트릭 3, 5, 7일 등)

2. Perfect Day 테스트
   - 모든 Task 완료
   - "오늘 할 일 완료!" 메시지 확인

3. Skip 연속 테스트
   - 3개 이상 Skip
   - 격려 메시지 확인

### AI Insight Card 테스트
browser_navigate("http://localhost:3000/today")
- [ ] AI 카드 렌더링 확인
- [ ] 메시지 타입별 스타일 (색상)
- [ ] "X" 버튼 클릭 → 카드 사라짐 (읽음 처리)
- [ ] "모든 인사이트 보기" 링크 → AI Hub 이동

### Navigation Badge 테스트
1. AI 메시지 생성 후
   - [ ] TopBar의 AI Hub 아이콘에 배지 표시
   - [ ] 숫자 정확성 (9+ 표시)
2. AI Hub 방문 후
   - [ ] 메시지 읽음 처리
   - [ ] 배지 숫자 감소/제거

### AI Message List 테스트 (AI Hub)
browser_navigate("http://localhost:3000/ai-hub")
- [ ] 메시지 목록 렌더링
- [ ] 타입별 배지 표시 (축하/격려/인사이트/제안/리마인더)
- [ ] 읽음 처리 버튼
- [ ] 삭제 버튼
- [ ] "모두 읽음" 버튼

### Rate Limit 테스트 (Phase 2+)
1. Free 사용자로 3회 AI 요청
2. 4회째 요청 → 429 에러 + 리셋 시간 표시
3. 사용량 표시기 확인
```

---

## ✅ Completion Checklist

### Database

- [ ] `ai_messages` 테이블 생성 (마이그레이션)
- [ ] `ai_conversations` 테이블 생성 (Phase 2+ 준비)
- [ ] `ai_trigger_cooldowns` 테이블 생성
- [ ] RLS 정책 설정
- [ ] Types 추가 (`src/types/database.ts`)

### Store

- [ ] `ai.store.ts` - Zustand 상태 관리

### Rule Engine

- [ ] `triggers.ts` - 트리거 조건 정의
- [ ] `templates.ts` - 메시지 템플릿 (다국어)
- [ ] `rule-engine.ts` - 규칙 엔진 클래스
- [ ] DB 기반 쿨다운 로직

### AI Service

- [ ] `ai.service.ts` 구현
- [ ] `evaluateTriggers` 함수
- [ ] `createMessages` (중복 제거)
- [ ] `getMessages`, `markAsRead`, `markAllAsRead`

### Hooks & Queries

- [ ] `useAIMessages` hook
- [ ] `useUnreadCount` hook
- [ ] `useAIUsage` hook
- [ ] `useMarkAsRead` mutation
- [ ] `useMarkAllAsRead` mutation
- [ ] `useDeleteMessage` mutation
- [ ] `useCheckInWithAI` hook

### Components

- [ ] `AIInsightCard` (Today 화면)
- [ ] `AIMessageList` (AI Hub)
- [ ] `AIUsageIndicator` (Rate Limit 표시)
- [ ] Navigation Badge (TopBar)

### Server Actions

- [ ] `createAIMessage`
- [ ] `markMessageAsRead`
- [ ] `markAllMessagesAsRead`
- [ ] `deleteAIMessage`

### API Routes

- [ ] `GET /api/ai/usage` - Rate Limit 조회
- [ ] `POST /api/ai/chat` - LLM 대화 (Phase 2+)

### Rate Limiting

- [ ] Upstash Redis 설정
- [ ] `rate-limit.ts` 구현
- [ ] Free/Pro 분리

### Phase 10 연계

- [ ] AI Hub 컴포넌트와 hooks 연결
- [ ] `AIConversationHistory` → `useAIConversations` 연결 (Phase 2)
- [ ] `AIFeatureCards` Coming Soon → 활성화 (Phase 2)

### Testing

- [ ] Rule Engine 단위 테스트
- [ ] AI Service 단위 테스트
- [ ] Hooks 테스트
- [ ] E2E 테스트 (Playwright)

---

## 🔗 Navigation

← [Phase 10: Secondary Screens](./phase-10-secondary.md)
→ [Phase 12: Testing & QA](./phase-12-testing.md)

---

_Version: 2.0 | Last Updated: 2026-02-04_
