# Phase 3: Supabase Backend Setup

> **Goal**: Configure Supabase project, create database schema, and set up authentication

---

## 📚 Reference Documents

- `docs/plan/core/data-model.md`
- `docs/code-architecture.md` (Supabase section)

---

## 3.1 Supabase Project Setup

### Create Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Note down:
   - Project URL
   - Anon Key
   - Service Role Key

### Install Supabase CLI

```bash
# Install CLI
pnpm add -D supabase

# Initialize (optional, for local development)
pnpm supabase init

# Login
pnpm supabase login

# Link to project
pnpm supabase link --project-ref <project-id>
```

### Environment Variables

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

---

## 3.2 Database Schema

### SQL Migration: Create Tables

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS (extends Supabase auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'Asia/Seoul',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DIRECTIONS (Life Direction - Top Level)
-- ============================================
CREATE TABLE public.directions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  statement TEXT NOT NULL,
  why TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AREAS (Life Domains)
-- ============================================
CREATE TYPE area_type AS ENUM (
  'health', 'career', 'finance', 'relationships',
  'hobbies', 'mental', 'learning', 'daily', 'custom'
);

CREATE TABLE public.areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type area_type NOT NULL DEFAULT 'custom',
  emoji TEXT NOT NULL DEFAULT '📌',
  color TEXT NOT NULL DEFAULT '#6b7280',
  why TEXT,
  sort_order TEXT DEFAULT '0',  -- Fractional indexing용 TEXT
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- GOALS
-- ============================================
CREATE TYPE goal_status AS ENUM (
  'active', 'backlog', 'completed', 'maintenance', 'paused', 'archived'
);

CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  why TEXT,
  vision TEXT,
  status goal_status NOT NULL DEFAULT 'active',
  target_date DATE,
  completed_at TIMESTAMPTZ,
  sort_order TEXT DEFAULT '0',  -- Fractional indexing용 TEXT
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PHASES (Optional milestones within goals)
-- ============================================
CREATE TYPE phase_status AS ENUM ('pending', 'active', 'completed');

CREATE TABLE public.phases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  why TEXT,  -- Why Chain: "이 단계를 왜 먼저 해야 하는가"
  description TEXT,
  status phase_status NOT NULL DEFAULT 'pending',
  sort_order TEXT DEFAULT '0',  -- Fractional indexing용 TEXT
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TASKS (Repeatable actions)
-- ============================================
CREATE TYPE repeat_type AS ENUM (
  'daily', 'weekdays', 'weekends', 'weekly', 'custom'
);

CREATE TYPE time_slot AS ENUM (
  'early_morning', 'morning', 'late_morning',
  'afternoon', 'evening', 'night', 'anytime'
);

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  phase_id UUID REFERENCES public.phases(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  why TEXT,
  repeat_type repeat_type NOT NULL DEFAULT 'daily',
  repeat_days INTEGER[] DEFAULT NULL, -- 0=Sun, 1=Mon, etc. for custom
  duration_minutes INTEGER DEFAULT 15,
  time_slot time_slot NOT NULL DEFAULT 'anytime',
  specific_time TIME,
  streak_count INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_check_in_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order TEXT DEFAULT '0',  -- Fractional indexing용 TEXT
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CHECK-INS (Daily task completion records)
-- ============================================
CREATE TYPE checkin_status AS ENUM ('done', 'skip', 'miss');

CREATE TABLE public.check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status checkin_status NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One check-in per task per day
  UNIQUE(task_id, date)
);

-- ============================================
-- DAILY REFLECTIONS
-- ============================================
CREATE TYPE mood_level AS ENUM ('terrible', 'bad', 'neutral', 'good', 'great');

CREATE TABLE public.daily_reflections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mood mood_level,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One reflection per day
  UNIQUE(user_id, date)
);

-- ============================================
-- AI MESSAGES (Rule-based advisor messages)
-- ============================================
CREATE TYPE message_type AS ENUM (
  'celebration', 'encouragement', 'insight', 'suggestion', 'reminder'
);

CREATE TABLE public.ai_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type message_type NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  related_goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  related_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_directions_user ON public.directions(user_id);
CREATE INDEX idx_areas_user ON public.areas(user_id);
CREATE INDEX idx_goals_user ON public.goals(user_id);
CREATE INDEX idx_goals_area ON public.goals(area_id);
CREATE INDEX idx_goals_status ON public.goals(status);
CREATE INDEX idx_phases_goal ON public.phases(goal_id);
CREATE INDEX idx_tasks_user ON public.tasks(user_id);
CREATE INDEX idx_tasks_goal ON public.tasks(goal_id);
CREATE INDEX idx_check_ins_task ON public.check_ins(task_id);
CREATE INDEX idx_check_ins_user_date ON public.check_ins(user_id, date);
CREATE INDEX idx_reflections_user_date ON public.daily_reflections(user_id, date);
CREATE INDEX idx_ai_messages_user ON public.ai_messages(user_id, is_read);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER directions_updated_at
  BEFORE UPDATE ON public.directions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER areas_updated_at
  BEFORE UPDATE ON public.areas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER phases_updated_at
  BEFORE UPDATE ON public.phases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER reflections_updated_at
  BEFORE UPDATE ON public.daily_reflections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 3.3 Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- DIRECTIONS POLICIES
-- ============================================
CREATE POLICY "Users can CRUD own directions"
  ON public.directions FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- AREAS POLICIES
-- ============================================
CREATE POLICY "Users can CRUD own areas"
  ON public.areas FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- GOALS POLICIES
-- ============================================
CREATE POLICY "Users can CRUD own goals"
  ON public.goals FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- PHASES POLICIES
-- ============================================
CREATE POLICY "Users can CRUD own phases"
  ON public.phases FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.goals
      WHERE goals.id = phases.goal_id
      AND goals.user_id = auth.uid()
    )
  );

-- ============================================
-- TASKS POLICIES
-- ============================================
CREATE POLICY "Users can CRUD own tasks"
  ON public.tasks FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- CHECK-INS POLICIES
-- ============================================
CREATE POLICY "Users can CRUD own check-ins"
  ON public.check_ins FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- DAILY REFLECTIONS POLICIES
-- ============================================
CREATE POLICY "Users can CRUD own reflections"
  ON public.daily_reflections FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- AI MESSAGES POLICIES
-- ============================================
CREATE POLICY "Users can read own AI messages"
  ON public.ai_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own AI messages"
  ON public.ai_messages FOR UPDATE
  USING (auth.uid() = user_id);
```

---

## 3.4 Supabase Client Setup

### src/lib/supabase/client.ts

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### src/lib/supabase/server.ts

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

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
            // Called from Server Component
          }
        },
      },
    }
  )
}
```

### src/lib/supabase/middleware.ts

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
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
  const protectedPaths = [
    '/today',
    '/roadmap',
    '/calendar',
    '/review',
    '/inbox',
    '/search',
    '/profile',
    '/ai-hub',
  ]
  const isProtectedPath = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path))

  if (!user && isProtectedPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect logged-in users away from auth pages
  const authPaths = ['/login', '/signup']
  const isAuthPath = authPaths.some((path) => request.nextUrl.pathname.startsWith(path))

  if (user && isAuthPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/today'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

### src/proxy.ts

> **Note**: Next.js 16+에서는 `middleware.ts` 대신 `proxy.ts`를 사용합니다.

```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

---

## 3.5 Generate TypeScript Types

```bash
# Generate types from Supabase schema
pnpm supabase gen types typescript --project-id <project-id> > src/types/database.ts
```

### src/types/database.ts (Generated)

```typescript
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          avatar_url: string | null
          timezone: string
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          avatar_url?: string | null
          timezone?: string
          onboarding_completed?: boolean
        }
        Update: {
          name?: string | null
          avatar_url?: string | null
          timezone?: string
          onboarding_completed?: boolean
        }
      }
      // ... other tables
    }
    Enums: {
      area_type:
        | 'health'
        | 'career'
        | 'finance'
        | 'relationships'
        | 'hobbies'
        | 'mental'
        | 'learning'
        | 'daily'
        | 'custom'
      goal_status: 'active' | 'backlog' | 'completed' | 'maintenance' | 'paused' | 'archived'
      phase_status: 'pending' | 'active' | 'completed'
      repeat_type: 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom'
      time_slot:
        | 'early_morning'
        | 'morning'
        | 'late_morning'
        | 'afternoon'
        | 'evening'
        | 'night'
        | 'anytime'
      checkin_status: 'done' | 'skip' | 'miss'
      mood_level: 'terrible' | 'bad' | 'neutral' | 'good' | 'great'
      message_type: 'celebration' | 'encouragement' | 'insight' | 'suggestion' | 'reminder'
    }
  }
}
```

---

## 3.6 Auth Trigger (Create Profile on Signup)

```sql
-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 3.7 RLS 최적화 인덱스

RLS 정책이 실행될 때 빈번하게 사용되는 쿼리 패턴에 대한 복합 인덱스를 추가합니다.

### Why: RLS 성능 문제

```
┌─────────────────────────────────────────────────────────────────┐
│  기본 인덱스만 있는 경우                                         │
│                                                                 │
│  SELECT * FROM tasks WHERE user_id = ?                          │
│                          AND is_active = TRUE                   │
│                                                                 │
│  → idx_tasks_user 사용 후 나머지 조건은 Full Scan               │
│  → 느림 😢                                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  복합 인덱스 추가 후                                             │
│                                                                 │
│  SELECT * FROM tasks WHERE user_id = ?                          │
│                          AND is_active = TRUE                   │
│                                                                 │
│  → idx_tasks_user_active 사용하여 Index Only Scan               │
│  → 빠름 ⚡                                                       │
└─────────────────────────────────────────────────────────────────┘
```

### SQL Migration: 성능 최적화 인덱스

```sql
-- ============================================
-- 복합 인덱스 (자주 사용되는 쿼리 패턴)
-- ============================================

-- Today 화면: 활성 태스크 + 시간대별 조회
CREATE INDEX idx_tasks_user_active_time
ON public.tasks(user_id, is_active, time_slot);

-- 활성 태스크만 조회 (Partial Index)
CREATE INDEX idx_tasks_user_active
ON public.tasks(user_id)
WHERE is_active = TRUE;

-- Goals 상태별 조회
CREATE INDEX idx_goals_user_status
ON public.goals(user_id, status);

-- Check-ins 날짜별 조회 (가장 빈번)
CREATE INDEX idx_checkins_user_date
ON public.check_ins(user_id, date DESC);

-- Phases 활성 상태 조회 (Partial Index)
CREATE INDEX idx_phases_goal_active
ON public.phases(goal_id, status)
WHERE status = 'active';

-- ============================================
-- Fractional Indexing 정렬용
-- (Tree 구조 노드 드래그 앤 드롭에 사용)
-- ============================================
-- Note: sort_order는 이미 TEXT 타입으로 생성됨 (Fractional Indexing 지원)

-- 정렬 인덱스
CREATE INDEX idx_tasks_order ON public.tasks(user_id, sort_order);
CREATE INDEX idx_goals_order ON public.goals(area_id, sort_order);
CREATE INDEX idx_areas_order ON public.areas(user_id, sort_order);
CREATE INDEX idx_phases_order ON public.phases(goal_id, sort_order);
```

---

## 3.8 RPC 함수

여러 테이블을 조인하는 데이터 조회를 단일 RPC 호출로 통합하여 네트워크 왕복을 최소화합니다.

### Why: 네트워크 왕복 최소화

```
🔴 Before: 5번 왕복 (~500ms)
┌────────┐     ┌────────┐
│ Client │────►│Supabase│  GET /tasks
│        │◄────│        │
│        │────►│        │  GET /check_ins
│        │◄────│        │
│        │────►│        │  GET /stats
│        │◄────│        │
│        │────►│        │  GET /goals
│        │◄────│        │
│        │────►│        │  GET /profile
│        │◄────│        │
└────────┘     └────────┘

🟢 After: 1번 왕복 (~100ms)
┌────────┐     ┌────────┐
│ Client │────►│Supabase│  RPC get_today_dashboard
│        │◄────│        │  { tasks, stats, recentCheckins, ... }
└────────┘     └────────┘
```

### SQL Migration: RPC 함수

```sql
-- ============================================
-- TODAY 화면 전용 (가장 자주 호출)
-- ============================================
CREATE OR REPLACE FUNCTION get_today_dashboard(p_user_id UUID)
RETURNS JSON AS $$
SELECT json_build_object(
  'tasks', (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', t.id,
        'name', t.name,
        'goalId', t.goal_id,
        'timeSlot', t.time_slot,
        'durationMinutes', t.duration_minutes,
        'streakCount', t.streak_count,
        'sortOrder', t.sort_order,
        'todayCheckIn', (
          SELECT json_build_object('status', c.status, 'note', c.note)
          FROM check_ins c
          WHERE c.task_id = t.id AND c.date = CURRENT_DATE
        )
      ) ORDER BY t.sort_order
    ), '[]')
    FROM tasks t
    WHERE t.user_id = p_user_id
      AND t.is_active = TRUE
      AND (
        t.repeat_type = 'daily'
        OR (t.repeat_type = 'weekdays' AND EXTRACT(DOW FROM CURRENT_DATE) BETWEEN 1 AND 5)
        OR (t.repeat_type = 'weekends' AND EXTRACT(DOW FROM CURRENT_DATE) IN (0, 6))
        OR (t.repeat_type = 'custom' AND EXTRACT(DOW FROM CURRENT_DATE) = ANY(t.repeat_days))
      )
  ),
  'stats', (
    SELECT json_build_object(
      'completedToday', (
        SELECT COUNT(*) FROM check_ins c
        WHERE c.user_id = p_user_id
        AND c.date = CURRENT_DATE
        AND c.status = 'done'
      ),
      'totalToday', (
        SELECT COUNT(*) FROM tasks t
        WHERE t.user_id = p_user_id
        AND t.is_active = TRUE
      ),
      'currentStreak', COALESCE((
        SELECT MAX(t.streak_count) FROM tasks t
        WHERE t.user_id = p_user_id AND t.is_active = TRUE
      ), 0)
    )
  ),
  'recentCheckins', (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', c.id,
        'taskId', c.task_id,
        'status', c.status,
        'note', c.note,
        'createdAt', c.created_at
      ) ORDER BY c.created_at DESC
    ), '[]')
    FROM check_ins c
    WHERE c.user_id = p_user_id
    AND c.date = CURRENT_DATE
    LIMIT 20
  )
);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================
-- TODAY 화면 - 오늘의 Task 목록만 (간단 버전)
-- ============================================
CREATE OR REPLACE FUNCTION get_today_tasks(
  p_user_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON AS $$
SELECT COALESCE(json_agg(
  json_build_object(
    'id', t.id,
    'name', t.name,
    'why', t.why,
    'goalId', t.goal_id,
    'phaseId', t.phase_id,
    'timeSlot', t.time_slot,
    'specificTime', t.specific_time,
    'durationMinutes', t.duration_minutes,
    'streakCount', t.streak_count,
    'bestStreak', t.best_streak,
    'sortOrder', t.sort_order,
    'goal', (
      SELECT json_build_object(
        'id', g.id,
        'name', g.name,
        'areaId', g.area_id,
        'area', (
          SELECT json_build_object('id', a.id, 'name', a.name, 'emoji', a.emoji, 'color', a.color)
          FROM areas a WHERE a.id = g.area_id
        )
      )
      FROM goals g WHERE g.id = t.goal_id
    ),
    'phase', (
      SELECT json_build_object('id', p.id, 'name', p.name)
      FROM phases p WHERE p.id = t.phase_id
    ),
    'todayCheckIn', (
      SELECT json_build_object('id', c.id, 'status', c.status, 'note', c.note, 'createdAt', c.created_at)
      FROM check_ins c
      WHERE c.task_id = t.id AND c.date = p_date
    )
  ) ORDER BY t.sort_order
), '[]')
FROM tasks t
WHERE t.user_id = p_user_id
  AND t.is_active = TRUE
  AND (
    t.repeat_type = 'daily'
    OR (t.repeat_type = 'weekdays' AND EXTRACT(DOW FROM p_date) BETWEEN 1 AND 5)
    OR (t.repeat_type = 'weekends' AND EXTRACT(DOW FROM p_date) IN (0, 6))
    OR (t.repeat_type = 'weekly' AND EXTRACT(DOW FROM p_date) = ANY(t.repeat_days))
    OR (t.repeat_type = 'custom' AND EXTRACT(DOW FROM p_date) = ANY(t.repeat_days))
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================
-- ROADMAP 화면 전용
-- ============================================
CREATE OR REPLACE FUNCTION get_roadmap_data(p_user_id UUID)
RETURNS JSON AS $$
SELECT json_build_object(
  'directions', (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', d.id,
        'statement', d.statement,
        'why', d.why,
        'createdAt', d.created_at
      )
    ), '[]')
    FROM directions d WHERE d.user_id = p_user_id
  ),
  'areas', (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', a.id,
        'name', a.name,
        'type', a.type,
        'emoji', a.emoji,
        'color', a.color,
        'sortOrder', a.sort_order,
        'isActive', a.is_active
      ) ORDER BY a.sort_order
    ), '[]')
    FROM areas a WHERE a.user_id = p_user_id AND a.is_active = TRUE
  ),
  'goals', (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', g.id,
        'name', g.name,
        'areaId', g.area_id,
        'status', g.status,
        'targetDate', g.target_date,
        'sortOrder', g.sort_order,
        'taskCount', (SELECT COUNT(*) FROM tasks t WHERE t.goal_id = g.id AND t.is_active = TRUE),
        'completedTaskCount', (
          SELECT COUNT(*) FROM tasks t
          JOIN check_ins c ON c.task_id = t.id
          WHERE t.goal_id = g.id AND c.date = CURRENT_DATE AND c.status = 'done'
        )
      ) ORDER BY g.sort_order
    ), '[]')
    FROM goals g WHERE g.user_id = p_user_id AND g.status != 'archived'
  )
);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================
-- CHECK-IN 생성 + 스트릭 자동 업데이트
-- ============================================
CREATE OR REPLACE FUNCTION create_checkin_with_streak(
  p_task_id UUID,
  p_user_id UUID,
  p_status checkin_status,
  p_note TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_checkin_id UUID;
  v_new_streak INTEGER;
  v_best_streak INTEGER;
  v_last_date DATE;
BEGIN
  -- Check-in 생성 (UPSERT)
  INSERT INTO check_ins (task_id, user_id, date, status, note)
  VALUES (p_task_id, p_user_id, CURRENT_DATE, p_status, p_note)
  ON CONFLICT (task_id, date) DO UPDATE SET status = p_status, note = p_note
  RETURNING id INTO v_checkin_id;

  -- 스트릭 계산
  SELECT last_check_in_date, streak_count, best_streak
  INTO v_last_date, v_new_streak, v_best_streak
  FROM tasks WHERE id = p_task_id;

  IF p_status = 'done' THEN
    -- 연속 체크인 확인
    IF v_last_date = CURRENT_DATE - 1 OR v_last_date IS NULL THEN
      v_new_streak := COALESCE(v_new_streak, 0) + 1;
    ELSIF v_last_date != CURRENT_DATE THEN
      v_new_streak := 1; -- 스트릭 리셋
    END IF;

    -- 최고 스트릭 갱신
    IF v_new_streak > COALESCE(v_best_streak, 0) THEN
      v_best_streak := v_new_streak;
    END IF;

    -- Task 업데이트
    UPDATE tasks SET
      streak_count = v_new_streak,
      best_streak = v_best_streak,
      last_check_in_date = CURRENT_DATE
    WHERE id = p_task_id;
  END IF;

  RETURN json_build_object(
    'checkinId', v_checkin_id,
    'newStreak', v_new_streak,
    'bestStreak', v_best_streak
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 배치 업데이트 (드래그 앤 드롭 순서 변경)
-- ============================================
CREATE OR REPLACE FUNCTION batch_update_sort_order(
  p_table_name TEXT,
  p_updates JSONB
)
RETURNS void AS $$
DECLARE
  item JSONB;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    EXECUTE format(
      'UPDATE %I SET sort_order = $1, updated_at = NOW() WHERE id = $2',
      p_table_name
    ) USING item->>'sortOrder', (item->>'id')::UUID;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### TypeScript에서 RPC 호출

```typescript
// src/actions/today.actions.ts
export async function getTodayDashboard(): Promise<TodayDashboard> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase.rpc('get_today_dashboard', { p_user_id: user!.id })

  if (error) throw error
  return data
}

// src/actions/roadmap.actions.ts
export async function getRoadmapData(): Promise<RoadmapData> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase.rpc('get_roadmap_data', { p_user_id: user!.id })

  if (error) throw error
  return data
}

// src/actions/checkin.actions.ts
export async function createCheckIn(
  taskId: string,
  status: CheckinStatus,
  note?: string
): Promise<CheckinResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase.rpc('create_checkin_with_streak', {
    p_task_id: taskId,
    p_user_id: user!.id,
    p_status: status,
    p_note: note,
  })

  if (error) throw error
  revalidateTag('today')
  return data
}
```

---

## 3.9 Storage 설정 (프로필 이미지)

프로필 이미지 업로드를 위한 Storage 버킷과 RLS 정책을 설정합니다.

### SQL Migration: Storage

```sql
-- ============================================
-- Storage bucket 생성
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- ============================================
-- Storage RLS 정책
-- ============================================

-- 사용자는 자신의 아바타만 업로드 가능
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 사용자는 자신의 아바타만 수정 가능
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 사용자는 자신의 아바타만 삭제 가능
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 아바타는 누구나 조회 가능 (public)
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
```

### TypeScript에서 Storage 사용

> **Note**: Storage는 파일 업로드 특수 케이스로, `src/lib/storage.ts`에 유틸리티로 배치합니다.
> Supabase Storage RLS가 이미 `auth.uid()` 기반 보안을 제공합니다.

```typescript
// src/lib/storage.ts
import { createClient } from '@/lib/supabase/client'

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const supabase = createClient()
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/avatar.${fileExt}`

  const { error } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true })

  if (error) throw error

  const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)

  return data.publicUrl
}

export async function deleteAvatar(userId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.storage
    .from('avatars')
    .remove([`${userId}/avatar.png`, `${userId}/avatar.jpg`, `${userId}/avatar.jpeg`])

  if (error) throw error
}
```

---

## 3.10 추가 RPC 함수

### 스트릭 리셋 (Cron Job용)

매일 자정에 실행되어, 어제 체크인하지 않은 daily 태스크의 스트릭을 리셋합니다.

```sql
CREATE OR REPLACE FUNCTION reset_missed_streaks()
RETURNS void AS $$
BEGIN
  -- 어제 체크인하지 않은 daily 태스크의 스트릭 리셋
  UPDATE tasks
  SET streak_count = 0
  WHERE is_active = TRUE
    AND repeat_type = 'daily'
    AND last_check_in_date < CURRENT_DATE - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 주간 통계 계산 (Review 화면용)

```sql
CREATE OR REPLACE FUNCTION get_weekly_stats(
  p_user_id UUID,
  p_week_start DATE
)
RETURNS JSON AS $$
SELECT json_build_object(
  'totalTasks', (
    SELECT COUNT(DISTINCT c.task_id)
    FROM check_ins c
    WHERE c.user_id = p_user_id
      AND c.date >= p_week_start
      AND c.date < p_week_start + INTERVAL '7 days'
  ),
  'completedCount', (
    SELECT COUNT(*)
    FROM check_ins c
    WHERE c.user_id = p_user_id
      AND c.date >= p_week_start
      AND c.date < p_week_start + INTERVAL '7 days'
      AND c.status = 'done'
  ),
  'skippedCount', (
    SELECT COUNT(*)
    FROM check_ins c
    WHERE c.user_id = p_user_id
      AND c.date >= p_week_start
      AND c.date < p_week_start + INTERVAL '7 days'
      AND c.status = 'skip'
  ),
  'dailyBreakdown', (
    SELECT COALESCE(json_agg(
      json_build_object(
        'date', d.date,
        'done', d.done_count,
        'skip', d.skip_count
      ) ORDER BY d.date
    ), '[]')
    FROM (
      SELECT
        c.date,
        COUNT(*) FILTER (WHERE c.status = 'done') as done_count,
        COUNT(*) FILTER (WHERE c.status = 'skip') as skip_count
      FROM check_ins c
      WHERE c.user_id = p_user_id
        AND c.date >= p_week_start
        AND c.date < p_week_start + INTERVAL '7 days'
      GROUP BY c.date
    ) d
  ),
  'areaBreakdown', (
    SELECT COALESCE(json_agg(
      json_build_object(
        'areaId', a.area_id,
        'areaName', ar.name,
        'done', a.done_count,
        'total', a.total_count
      )
    ), '[]')
    FROM (
      SELECT
        g.area_id,
        COUNT(*) FILTER (WHERE c.status = 'done') as done_count,
        COUNT(*) as total_count
      FROM check_ins c
      JOIN tasks t ON t.id = c.task_id
      JOIN goals g ON g.id = t.goal_id
      WHERE c.user_id = p_user_id
        AND c.date >= p_week_start
        AND c.date < p_week_start + INTERVAL '7 days'
      GROUP BY g.area_id
    ) a
    JOIN areas ar ON ar.id = a.area_id
  )
);
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### 온보딩 완료 처리 (트랜잭션)

Direction, Areas, First Goal을 한 번의 트랜잭션으로 생성합니다.

```sql
CREATE OR REPLACE FUNCTION complete_onboarding(
  p_user_id UUID,
  p_direction JSONB,
  p_areas JSONB,
  p_first_goal JSONB DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_direction_id UUID;
  v_first_area_id UUID;
  v_goal_id UUID;
BEGIN
  -- 1. Direction 생성
  INSERT INTO directions (user_id, statement, why)
  VALUES (
    p_user_id,
    p_direction->>'statement',
    p_direction->>'why'
  )
  RETURNING id INTO v_direction_id;

  -- 2. Areas 생성
  WITH inserted_areas AS (
    INSERT INTO areas (user_id, name, type, emoji, color, sort_order)
    SELECT
      p_user_id,
      (area->>'name'),
      (area->>'type')::area_type,
      (area->>'emoji'),
      (area->>'color'),
      (area->>'sort_order')::int
    FROM jsonb_array_elements(p_areas) AS area
    RETURNING id, sort_order
  )
  SELECT id INTO v_first_area_id
  FROM inserted_areas
  ORDER BY sort_order
  LIMIT 1;

  -- 3. First Goal 생성 (선택적)
  IF p_first_goal IS NOT NULL AND p_first_goal->>'name' IS NOT NULL THEN
    INSERT INTO goals (user_id, area_id, name, why, status)
    VALUES (
      p_user_id,
      v_first_area_id,
      p_first_goal->>'name',
      p_first_goal->>'why',
      'active'
    )
    RETURNING id INTO v_goal_id;
  END IF;

  -- 4. 프로필 온보딩 완료 표시
  UPDATE profiles
  SET onboarding_completed = TRUE
  WHERE id = p_user_id;

  RETURN json_build_object(
    'directionId', v_direction_id,
    'firstAreaId', v_first_area_id,
    'firstGoalId', v_goal_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### TypeScript에서 추가 RPC 호출

```typescript
// src/actions/stats.actions.ts
export async function getWeeklyStats(weekStart: string): Promise<WeeklyStats> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase.rpc('get_weekly_stats', {
    p_user_id: user!.id,
    p_week_start: weekStart,
  })

  if (error) throw error
  return data
}

// src/actions/onboarding.actions.ts
export async function completeOnboarding(
  direction: DirectionInput,
  areas: AreaInput[],
  firstGoal?: GoalInput
): Promise<OnboardingResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase.rpc('complete_onboarding', {
    p_user_id: user!.id,
    p_direction: direction,
    p_areas: areas,
    p_first_goal: firstGoal || null,
  })

  if (error) throw error
  revalidatePath('/')
  return data
}
```

---

## 3.11 Realtime 설정

멀티 디바이스 동기화를 위해 특정 테이블에 Realtime을 활성화합니다.

### Supabase Dashboard에서 설정 (권장)

1. Supabase Dashboard → Database → Replication
2. `check_ins` 테이블 활성화
3. `ai_messages` 테이블 활성화

### 또는 SQL로 설정

```sql
-- Realtime Publication에 테이블 추가
ALTER PUBLICATION supabase_realtime ADD TABLE check_ins;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_messages;
```

### Realtime 대상 테이블

| 테이블        | Realtime | 이유                                |
| ------------- | -------- | ----------------------------------- |
| `check_ins`   | ✅       | 체크인 즉시 반영 (멀티 탭 동기화)   |
| `ai_messages` | ✅       | 새 메시지 즉시 알림                 |
| `tasks`       | ❌       | 변경 빈도 낮음 (staleTime으로 충분) |
| `goals`       | ❌       | 변경 빈도 낮음                      |

---

## 3.12 추가 인덱스

### 월간/주간 통계용 인덱스

```sql
-- 월간 통계 조회 최적화
CREATE INDEX idx_checkins_user_month
ON public.check_ins(user_id, date_trunc('month', date));

-- AI 메시지 생성일 기준 조회
CREATE INDEX idx_ai_messages_created
ON public.ai_messages(user_id, created_at DESC);

-- 활성 목표만 조회 (Partial Index)
CREATE INDEX idx_goals_user_active
ON public.goals(user_id)
WHERE status = 'active';
```

---

## ✅ Completion Checklist

### Supabase 설정

- [x] Supabase project created
- [x] Environment variables configured
- [x] Supabase CLI installed and linked

### Database Schema

- [x] Database schema created (all tables)
- [x] Enums created (area_type, goal_status, etc.)
- [x] Base indexes created for performance
- [x] Updated_at triggers created

### RLS

- [x] RLS enabled on all tables
- [x] RLS policies created

### Client Setup

- [x] Browser client setup (`lib/supabase/client.ts`)
- [x] Server client setup (`lib/supabase/server.ts`)
- [x] Middleware helper setup (`lib/supabase/middleware.ts`)
- [x] Root proxy configured (`src/proxy.ts` - Next.js 16+)

### Types

- [x] TypeScript types generated (`supabase gen types`)

### Auth

- [x] Auth trigger for profile creation

### 성능 최적화 (3.7)

- [x] RLS 최적화 복합 인덱스 생성
- [x] Fractional indexing용 sort_order TEXT 변환

### RPC 함수 (3.8)

- [x] `get_today_tasks` (오늘의 Task 목록)
- [x] `get_today_dashboard` (대시보드 전체)
- [x] `get_roadmap_data`
- [x] `create_checkin_with_streak`
- [x] `batch_update_sort_order`

### Storage (3.9)

- [x] `avatars` 버킷 생성
- [x] Storage RLS 정책 설정

### 추가 RPC 함수 (3.10)

- [x] `reset_missed_streaks` (Cron Job용)
- [x] `get_weekly_stats` (Review 화면용)
- [x] `complete_onboarding` (트랜잭션)

### Realtime (3.11)

- [x] `check_ins` 테이블 Realtime 활성화
- [x] `ai_messages` 테이블 Realtime 활성화

### 추가 인덱스 (3.12)

- [x] 월간 통계용 인덱스
- [x] AI 메시지 조회용 인덱스
- [x] 활성 목표 Partial Index

---

## 🔗 Navigation

← [Phase 2: Layout & Navigation](./phase-2-layout.md)
→ [Phase 4: Types & Services](./phase-4-services.md)

---

_Version: 1.0 | Last Updated: 2026-02-03_
