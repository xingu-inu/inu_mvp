# Phase 10: Secondary Screens

> **Goal**: Implement Inbox (quick capture), Search, Profile, and AI Hub screens

---

## 📚 Reference Documents

- `docs/plan/screens/inbox/spec.md` + `wireframe.md` - 빠른 캡처 & 미정리 항목 관리
- `docs/plan/screens/search/spec.md` + `wireframe.md` - 통합 검색
- `docs/plan/screens/profile/spec.md` + `wireframe.md` - 개인 설정 관리
- `docs/plan/screens/ai-hub/spec.md` + `wireframe.md` - AI 기능 허브
- `docs/plan/reference/features/ai-advisor.md` - AI 어드바이저 기능
- `docs/plan/reference/features/daily-life.md` - 인박스 & 일상

---

## 10.1 Inbox Screen (빠른 캡처)

Inbox는 **빠른 아이디어 캡처**와 **미정리 항목 관리**를 위한 화면입니다.
로드맵에 연결하기 전 임시 저장소 역할을 합니다.

### 10.1.1 Database Schema

```sql
-- supabase/migrations/20260204_inbox_items.sql
CREATE TYPE inbox_status AS ENUM ('active', 'archived', 'linked');

CREATE TABLE inbox_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status inbox_status NOT NULL DEFAULT 'active',
  linked_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_inbox_items_user_id ON inbox_items(user_id);
CREATE INDEX idx_inbox_items_status ON inbox_items(status);

-- RLS
ALTER TABLE inbox_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own inbox items" ON inbox_items
  FOR ALL USING (auth.uid() = user_id);

-- Updated trigger
CREATE TRIGGER update_inbox_items_updated_at
  BEFORE UPDATE ON inbox_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 10.1.2 Type Definitions

```typescript
// src/types/database.ts - 추가
export type InboxStatus = 'active' | 'archived' | 'linked'

export interface InboxItem {
  id: string
  user_id: string
  content: string
  status: InboxStatus
  linked_task_id: string | null
  created_at: string
  updated_at: string
}

// Insert/Update types
export interface InboxItemInsert {
  content: string
  status?: InboxStatus
}

export interface InboxItemUpdate {
  content?: string
  status?: InboxStatus
  linked_task_id?: string | null
}
```

### 10.1.3 Page Structure

```typescript
// src/app/(secondary)/inbox/page.tsx
import { Suspense } from 'react'
import { PageContainer } from '@/components/layout/page-container'
import { InboxHeader } from '@/features/inbox/components/inbox-header'
import { InboxQuickAdd } from '@/features/inbox/components/inbox-quick-add'
import { InboxItemList } from '@/features/inbox/components/inbox-item-list'
import { InboxSkeleton } from '@/features/inbox/components/inbox-skeleton'

export default function InboxPage() {
  return (
    <PageContainer>
      <InboxHeader />

      <div className="mt-4">
        <InboxQuickAdd />
      </div>

      <Suspense fallback={<InboxSkeleton />}>
        <div className="mt-6">
          <InboxItemList />
        </div>
      </Suspense>
    </PageContainer>
  )
}
```

### 10.1.4 Inbox Store

```typescript
// src/stores/inbox.store.ts
import { create } from 'zustand'

type InboxFilter = 'active' | 'archived' | 'all'

interface InboxState {
  filter: InboxFilter
  setFilter: (filter: InboxFilter) => void

  isAddModalOpen: boolean
  openAddModal: () => void
  closeAddModal: () => void

  isLinkModalOpen: boolean
  selectedItemId: string | null
  openLinkModal: (itemId: string) => void
  closeLinkModal: () => void
}

export const useInboxStore = create<InboxState>((set) => ({
  filter: 'active',
  setFilter: (filter) => set({ filter }),

  isAddModalOpen: false,
  openAddModal: () => set({ isAddModalOpen: true }),
  closeAddModal: () => set({ isAddModalOpen: false }),

  isLinkModalOpen: false,
  selectedItemId: null,
  openLinkModal: (itemId) => set({ isLinkModalOpen: true, selectedItemId: itemId }),
  closeLinkModal: () => set({ isLinkModalOpen: false, selectedItemId: null }),
}))
```

### 10.1.5 Inbox Header

```typescript
// src/features/inbox/components/inbox-header.tsx
'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useInboxStore } from '@/stores/inbox.store'
import { useInboxItems } from '@/features/inbox/hooks/use-inbox-items'

export function InboxHeader() {
  const { openAddModal } = useInboxStore()
  const { data: items = [] } = useInboxItems()

  const activeCount = items.filter((item) => item.status === 'active').length

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">📥 인박스</h1>
        {activeCount > 0 && (
          <p className="text-sm text-foreground-secondary mt-1">
            {activeCount}개의 미정리 항목
          </p>
        )}
      </div>
      <Button onClick={openAddModal} size="icon" aria-label="Add new item">
        <Plus className="w-5 h-5" />
      </Button>
    </div>
  )
}
```

### 10.1.6 Quick Add Component

```typescript
// src/features/inbox/components/inbox-quick-add.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCreateInboxItem } from '@/features/inbox/hooks/use-inbox-items'

export function InboxQuickAdd() {
  const [content, setContent] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const createItem = useCreateInboxItem()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    await createItem.mutateAsync({ content: content.trim() })
    setContent('')
    inputRef.current?.focus()
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        ref={inputRef}
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="빠르게 메모하세요... (Enter로 저장)"
        className="flex-1 h-12 px-4 rounded-lg glass-2 border border-border focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        disabled={createItem.isPending}
      />
      <Button
        type="submit"
        disabled={!content.trim() || createItem.isPending}
        isLoading={createItem.isPending}
        aria-label="Save memo"
      >
        <Send className="w-5 h-5" />
      </Button>
    </form>
  )
}
```

### 10.1.7 Inbox Item List

```typescript
// src/features/inbox/components/inbox-item-list.tsx
'use client'

import { useInboxItems } from '@/features/inbox/hooks/use-inbox-items'
import { useInboxStore } from '@/stores/inbox.store'
import { InboxItemCard } from './inbox-item-card'
import { InboxEmptyState } from './inbox-empty-state'
import { InboxArchiveSection } from './inbox-archive-section'

export function InboxItemList() {
  const { data: items = [], isLoading } = useInboxItems()
  const { filter } = useInboxStore()

  if (isLoading) return null

  const activeItems = items.filter((item) => item.status === 'active')
  const archivedItems = items.filter((item) => item.status === 'archived')

  if (activeItems.length === 0 && filter === 'active') {
    return <InboxEmptyState />
  }

  const displayItems = filter === 'active' ? activeItems :
                       filter === 'archived' ? archivedItems : items

  return (
    <div className="space-y-6">
      {/* Active Items */}
      <div className="space-y-3">
        {displayItems.map((item) => (
          <InboxItemCard key={item.id} item={item} />
        ))}
      </div>

      {/* Archive Section (collapsed by default) */}
      {filter === 'active' && archivedItems.length > 0 && (
        <InboxArchiveSection items={archivedItems} />
      )}
    </div>
  )
}
```

### 10.1.8 Inbox Item Card

```typescript
// src/features/inbox/components/inbox-item-card.tsx
'use client'

import { useState } from 'react'
import { Link2, Archive, Trash2, MoreHorizontal } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useInboxStore } from '@/stores/inbox.store'
import { useDeleteInboxItem, useArchiveInboxItem } from '@/features/inbox/hooks/use-inbox-items'
import { cn } from '@/lib/utils'
import type { InboxItem } from '@/types/database'

interface InboxItemCardProps {
  item: InboxItem
}

export function InboxItemCard({ item }: InboxItemCardProps) {
  const [showActions, setShowActions] = useState(false)
  const { openLinkModal } = useInboxStore()
  const deleteItem = useDeleteInboxItem()
  const archiveItem = useArchiveInboxItem()

  const handleLink = () => {
    openLinkModal(item.id)
  }

  const handleArchive = async () => {
    await archiveItem.mutateAsync(item.id)
  }

  const handleDelete = async () => {
    if (confirm('이 메모를 삭제할까요?')) {
      await deleteItem.mutateAsync(item.id)
    }
  }

  return (
    <Card
      className={cn(
        'group relative',
        item.status === 'archived' && 'opacity-60'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-relaxed">{item.content}</p>
          <p className="text-xs text-foreground-tertiary mt-2">
            {formatDistanceToNow(new Date(item.created_at), {
              addSuffix: true,
              locale: ko,
            })}
          </p>
        </div>

        {/* Desktop: Always visible actions */}
        <div className="hidden sm:flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLink}
            aria-label="로드맵에 연결"
            className="h-8 w-8"
          >
            <Link2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleArchive}
            aria-label="보관"
            className="h-8 w-8"
          >
            <Archive className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            aria-label="삭제"
            className="h-8 w-8 text-miss hover:text-miss"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Mobile: Toggle button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowActions(!showActions)}
          className="sm:hidden h-8 w-8"
          aria-label="Actions"
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </div>

      {/* Mobile: Expanded actions */}
      {showActions && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border sm:hidden">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleLink}
            className="flex-1"
          >
            <Link2 className="w-4 h-4 mr-1" />
            연결
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleArchive}
            className="flex-1"
          >
            <Archive className="w-4 h-4 mr-1" />
            보관
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
    </Card>
  )
}
```

### 10.1.9 Link to Roadmap Modal

```typescript
// src/features/inbox/components/inbox-link-modal.tsx
'use client'

import { useState } from 'react'
import { X, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Chip } from '@/components/ui/chip'
import { useInboxStore } from '@/stores/inbox.store'
import { useInboxItems, useLinkToRoadmap } from '@/features/inbox/hooks/use-inbox-items'
import { useGoals } from '@/queries/use-goals'
import { useAreas } from '@/queries/use-areas'
import type { Goal, Area } from '@/types/database'

export function InboxLinkModal() {
  const { isLinkModalOpen, selectedItemId, closeLinkModal } = useInboxStore()
  const { data: items = [] } = useInboxItems()
  const { data: areas = [] } = useAreas()
  const { data: goals = [] } = useGoals()
  const linkToRoadmap = useLinkToRoadmap()

  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null)
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)

  if (!isLinkModalOpen || !selectedItemId) return null

  const selectedItem = items.find((item) => item.id === selectedItemId)
  if (!selectedItem) return null

  const filteredGoals = selectedAreaId
    ? goals.filter((g) => g.area_id === selectedAreaId)
    : goals

  const handleLink = async (goalId: string) => {
    await linkToRoadmap.mutateAsync({
      itemId: selectedItemId,
      goalId,
      content: selectedItem.content,
    })
    closeLinkModal()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="w-full sm:max-w-lg bg-surface-primary rounded-t-2xl sm:rounded-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">🔗 로드맵에 연결</h2>
          <Button variant="ghost" size="icon" onClick={closeLinkModal}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {/* Selected item preview */}
          <Card className="mb-4 bg-surface-secondary">
            <p className="text-sm">&quot;{selectedItem.content}&quot;</p>
          </Card>

          <p className="text-sm text-foreground-secondary mb-4">
            어떤 목표에 Task로 연결할까요?
          </p>

          {/* Area filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Chip
              variant={selectedAreaId === null ? 'selection' : 'area'}
              onClick={() => setSelectedAreaId(null)}
              className="cursor-pointer"
            >
              전체
            </Chip>
            {areas.map((area) => (
              <Chip
                key={area.id}
                variant={selectedAreaId === area.id ? 'selection' : 'area'}
                emoji={area.emoji}
                color={area.color}
                onClick={() => setSelectedAreaId(area.id)}
                className="cursor-pointer"
              >
                {area.name}
              </Chip>
            ))}
          </div>

          {/* Goals list */}
          <div className="space-y-2">
            {filteredGoals
              .filter((g) => g.status === 'active')
              .map((goal) => {
                const area = areas.find((a) => a.id === goal.area_id)
                return (
                  <button
                    key={goal.id}
                    onClick={() => handleLink(goal.id)}
                    className="w-full text-left p-3 rounded-lg border border-border hover:border-primary-500 hover:bg-primary-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {area && (
                          <span className="text-lg">{area.emoji}</span>
                        )}
                        <span className="font-medium">🎯 {goal.name}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-foreground-tertiary" />
                    </div>
                    {area && (
                      <p className="text-xs text-foreground-tertiary mt-1 ml-7">
                        {area.name}
                      </p>
                    )}
                  </button>
                )
              })}
          </div>

          {/* Create new goal option */}
          <button
            className="w-full mt-4 p-3 rounded-lg border border-dashed border-border hover:border-primary-500 text-foreground-secondary hover:text-primary-500 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>새 Goal 만들기</span>
          </button>
        </div>
      </div>
    </div>
  )
}
```

### 10.1.10 Empty State

```typescript
// src/features/inbox/components/inbox-empty-state.tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useInboxStore } from '@/stores/inbox.store'

export function InboxEmptyState() {
  const { openAddModal } = useInboxStore()

  return (
    <div className="text-center py-16">
      <div className="text-6xl mb-4">📭</div>
      <h3 className="text-xl font-semibold mb-2">인박스가 비어있어요</h3>
      <p className="text-foreground-secondary mb-6 max-w-sm mx-auto">
        빠르게 떠오르는 아이디어나 할 일을 캡처하세요.
        나중에 로드맵에 연결할 수 있어요.
      </p>
      <Button onClick={openAddModal}>
        첫 메모 추가하기
      </Button>
    </div>
  )
}
```

### 10.1.11 Inbox Hooks

```typescript
// src/features/inbox/hooks/use-inbox-items.ts
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { toast } from 'sonner'
import type { InboxItem, InboxItemInsert } from '@/types/database'

const queryKeys = {
  inboxItems: (userId: string) => ['inbox-items', userId] as const,
}

// Fetch all inbox items
export function useInboxItems() {
  const { user } = useUser()
  const supabase = createClient()

  return useQuery({
    queryKey: queryKeys.inboxItems(user?.id ?? ''),
    queryFn: async () => {
      if (!user?.id) throw new Error('User not found')

      const { data, error } = await supabase
        .from('inbox_items')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'linked')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as InboxItem[]
    },
    enabled: !!user?.id,
  })
}

// Create inbox item
export function useCreateInboxItem() {
  const { user } = useUser()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: InboxItemInsert) => {
      if (!user?.id) throw new Error('User not found')

      const { data, error } = await supabase
        .from('inbox_items')
        .insert({
          user_id: user.id,
          content: input.content,
          status: input.status ?? 'active',
        })
        .select()
        .single()

      if (error) throw error
      return data as InboxItem
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inboxItems(user?.id ?? '') })
      toast.success('메모가 저장되었어요')
    },
    onError: (error) => {
      toast.error('저장에 실패했어요', { description: error.message })
    },
  })
}

// Delete inbox item
export function useDeleteInboxItem() {
  const { user } = useUser()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from('inbox_items').delete().eq('id', itemId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inboxItems(user?.id ?? '') })
      toast.success('메모가 삭제되었어요')
    },
    onError: (error) => {
      toast.error('삭제에 실패했어요', { description: error.message })
    },
  })
}

// Archive inbox item
export function useArchiveInboxItem() {
  const { user } = useUser()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('inbox_items')
        .update({ status: 'archived' })
        .eq('id', itemId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inboxItems(user?.id ?? '') })
      toast.success('보관함으로 이동했어요')
    },
    onError: (error) => {
      toast.error('보관에 실패했어요', { description: error.message })
    },
  })
}

// Link to roadmap (create task from inbox item)
export function useLinkToRoadmap() {
  const { user } = useUser()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      itemId,
      goalId,
      content,
    }: {
      itemId: string
      goalId: string
      content: string
    }) => {
      if (!user?.id) throw new Error('User not found')

      // 1. Create task from inbox content
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          goal_id: goalId,
          name: content,
          repeat_type: 'daily',
        })
        .select()
        .single()

      if (taskError) throw taskError

      // 2. Update inbox item status to linked
      const { error: inboxError } = await supabase
        .from('inbox_items')
        .update({
          status: 'linked',
          linked_task_id: task.id,
        })
        .eq('id', itemId)

      if (inboxError) throw inboxError

      return task
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inboxItems(user?.id ?? '') })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('로드맵에 연결되었어요! 🎯')
    },
    onError: (error) => {
      toast.error('연결에 실패했어요', { description: error.message })
    },
  })
}
```

### 10.1.12 Server Actions

```typescript
// src/actions/inbox.actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { InboxItemInsert, InboxItemUpdate } from '@/types/database'

export async function createInboxItem(input: InboxItemInsert) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('inbox_items')
    .insert({
      user_id: user.id,
      ...input,
    })
    .select()
    .single()

  if (error) throw error

  revalidatePath('/inbox')
  return data
}

export async function updateInboxItem(id: string, input: InboxItemUpdate) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inbox_items')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  revalidatePath('/inbox')
  return data
}

export async function deleteInboxItem(id: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('inbox_items').delete().eq('id', id)

  if (error) throw error

  revalidatePath('/inbox')
}

export async function linkInboxItemToTask(itemId: string, goalId: string, content: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  // Create task
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      goal_id: goalId,
      name: content,
      repeat_type: 'daily',
    })
    .select()
    .single()

  if (taskError) throw taskError

  // Update inbox item
  const { error: inboxError } = await supabase
    .from('inbox_items')
    .update({
      status: 'linked',
      linked_task_id: task.id,
    })
    .eq('id', itemId)

  if (inboxError) throw inboxError

  revalidatePath('/inbox')
  revalidatePath('/roadmap')

  return task
}
```

---

## 10.2 Search Screen

통합 검색 화면으로 Goals, Tasks, Phases, Areas, Reflections, Inbox를 검색합니다.

### 10.2.1 Page Structure

```typescript
// src/app/(secondary)/search/page.tsx
import { PageContainer } from '@/components/layout/page-container'
import { SearchInput } from '@/features/search/components/search-input'
import { SearchFilters } from '@/features/search/components/search-filters'
import { RecentSearches } from '@/features/search/components/recent-searches'
import { SearchResults } from '@/features/search/components/search-results'

export default function SearchPage() {
  return (
    <PageContainer>
      <h1 className="text-2xl font-bold mb-4">🔍 검색</h1>

      <SearchInput />

      <div className="mt-4">
        <SearchFilters />
      </div>

      <div className="mt-6">
        <RecentSearches />
        <SearchResults />
      </div>
    </PageContainer>
  )
}
```

### 10.2.2 Search Store

```typescript
// src/stores/search.store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type SearchFilter = 'all' | 'goals' | 'tasks' | 'reflections' | 'inbox'

interface SearchState {
  query: string
  setQuery: (query: string) => void

  filter: SearchFilter
  setFilter: (filter: SearchFilter) => void

  recentSearches: string[]
  addRecentSearch: (search: string) => void
  removeRecentSearch: (search: string) => void
  clearRecentSearches: () => void
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      query: '',
      setQuery: (query) => set({ query }),

      filter: 'all',
      setFilter: (filter) => set({ filter }),

      recentSearches: [],
      addRecentSearch: (search) => {
        const { recentSearches } = get()
        const filtered = recentSearches.filter((s) => s !== search)
        set({ recentSearches: [search, ...filtered].slice(0, 10) })
      },
      removeRecentSearch: (search) => {
        const { recentSearches } = get()
        set({ recentSearches: recentSearches.filter((s) => s !== search) })
      },
      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    {
      name: 'search-storage',
      partialize: (state) => ({ recentSearches: state.recentSearches }),
    }
  )
)
```

### 10.2.3 Search Input with Debounce

```typescript
// src/features/search/components/search-input.tsx
'use client'

import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { useSearchStore } from '@/stores/search.store'
import { useDebounce } from '@/hooks/use-debounce'

export function SearchInput() {
  const { query, setQuery, addRecentSearch } = useSearchStore()
  const [localQuery, setLocalQuery] = useState(query)
  const debouncedQuery = useDebounce(localQuery, 300)

  useEffect(() => {
    setQuery(debouncedQuery)
    if (debouncedQuery.trim().length >= 2) {
      addRecentSearch(debouncedQuery.trim())
    }
  }, [debouncedQuery, setQuery, addRecentSearch])

  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-tertiary" />
      <input
        type="text"
        value={localQuery}
        onChange={(e) => setLocalQuery(e.target.value)}
        placeholder="목표, 실천, 기록 검색..."
        className="w-full h-12 pl-12 pr-10 rounded-lg glass-2 border border-border focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        autoFocus
      />
      {localQuery && (
        <button
          onClick={() => {
            setLocalQuery('')
            setQuery('')
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-surface-secondary"
          aria-label="Clear search"
        >
          <X className="w-4 h-4 text-foreground-tertiary" />
        </button>
      )}
    </div>
  )
}
```

### 10.2.4 Search Filters

```typescript
// src/features/search/components/search-filters.tsx
'use client'

import { Chip } from '@/components/ui/chip'
import { useSearchStore } from '@/stores/search.store'

const FILTERS = [
  { value: 'all', label: '전체', emoji: '📋' },
  { value: 'goals', label: '목표', emoji: '🎯' },
  { value: 'tasks', label: '실천', emoji: '✅' },
  { value: 'reflections', label: '기록', emoji: '📝' },
  { value: 'inbox', label: '인박스', emoji: '📥' },
] as const

export function SearchFilters() {
  const { filter, setFilter } = useSearchStore()

  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((f) => (
        <Chip
          key={f.value}
          variant={filter === f.value ? 'selection' : 'area'}
          emoji={f.emoji}
          onClick={() => setFilter(f.value)}
          className="cursor-pointer"
        >
          {f.label}
        </Chip>
      ))}
    </div>
  )
}
```

### 10.2.5 Recent Searches

```typescript
// src/features/search/components/recent-searches.tsx
'use client'

import { Clock, X } from 'lucide-react'
import { useSearchStore } from '@/stores/search.store'

export function RecentSearches() {
  const { query, recentSearches, setQuery, removeRecentSearch, clearRecentSearches } = useSearchStore()

  // Don't show when there's an active query or no recent searches
  if (query || recentSearches.length === 0) return null

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground-secondary flex items-center gap-2">
          <Clock className="w-4 h-4" />
          최근 검색어
        </h3>
        <button
          onClick={clearRecentSearches}
          className="text-xs text-foreground-tertiary hover:text-foreground-secondary"
        >
          전체 삭제
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {recentSearches.map((search) => (
          <div
            key={search}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-secondary text-sm"
          >
            <button
              onClick={() => setQuery(search)}
              className="hover:text-primary-500"
            >
              {search}
            </button>
            <button
              onClick={() => removeRecentSearch(search)}
              className="p-0.5 rounded-full hover:bg-surface-tertiary"
              aria-label={`Remove ${search}`}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 10.2.6 Search Results

```typescript
// src/features/search/components/search-results.tsx
'use client'

import Link from 'next/link'
import { Target, CheckSquare, BookOpen, Inbox } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Chip } from '@/components/ui/chip'
import { useSearchStore } from '@/stores/search.store'
import { useSearch } from '@/features/search/hooks/use-search'
import { SearchEmptyState } from './search-empty-state'

export function SearchResults() {
  const { query, filter } = useSearchStore()
  const { data: results, isLoading } = useSearch(query, filter)

  if (!query || query.length < 2) return null

  if (isLoading) {
    return (
      <div className="text-center py-8 text-foreground-secondary">
        검색 중...
      </div>
    )
  }

  if (!results || results.total === 0) {
    return <SearchEmptyState query={query} />
  }

  return (
    <div className="space-y-6">
      {/* Goals Section */}
      {results.goals.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-foreground-secondary mb-3 flex items-center gap-2">
            <Target className="w-4 h-4" />
            목표 ({results.goals.length})
          </h3>
          <div className="space-y-2">
            {results.goals.map((goal) => (
              <Link key={goal.id} href={`/roadmap?goal=${goal.id}`}>
                <Card variant="list" padding="sm" className="hover:border-primary-500">
                  <div className="flex items-center gap-2">
                    {goal.area && (
                      <Chip variant="area" emoji={goal.area.emoji} color={goal.area.color}>
                        {goal.area.name}
                      </Chip>
                    )}
                    <span className="font-medium">🎯 {goal.name}</span>
                  </div>
                  {goal.why && (
                    <p className="text-sm text-foreground-tertiary mt-1 line-clamp-1">
                      {goal.why}
                    </p>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Tasks Section */}
      {results.tasks.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-foreground-secondary mb-3 flex items-center gap-2">
            <CheckSquare className="w-4 h-4" />
            실천 ({results.tasks.length})
          </h3>
          <div className="space-y-2">
            {results.tasks.map((task) => (
              <Link key={task.id} href={`/today`}>
                <Card variant="list" padding="sm" className="hover:border-primary-500">
                  <div className="flex items-center justify-between">
                    <span>{task.name}</span>
                    <span className="text-sm text-foreground-tertiary">
                      🔥 {task.streak_count ?? 0}
                    </span>
                  </div>
                  {task.goal && (
                    <p className="text-xs text-foreground-tertiary mt-1">
                      {task.goal.area?.emoji} {task.goal.name}
                    </p>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Reflections Section */}
      {results.reflections.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-foreground-secondary mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            기록 ({results.reflections.length})
          </h3>
          <div className="space-y-2">
            {results.reflections.map((reflection) => (
              <Link key={reflection.id} href={`/review?date=${reflection.date}`}>
                <Card variant="list" padding="sm" className="hover:border-primary-500">
                  <div className="flex items-center justify-between">
                    <span className="line-clamp-1">{reflection.summary}</span>
                    <span className="text-sm text-foreground-tertiary">
                      {reflection.date}
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Inbox Section */}
      {results.inbox.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-foreground-secondary mb-3 flex items-center gap-2">
            <Inbox className="w-4 h-4" />
            인박스 ({results.inbox.length})
          </h3>
          <div className="space-y-2">
            {results.inbox.map((item) => (
              <Link key={item.id} href="/inbox">
                <Card variant="list" padding="sm" className="hover:border-primary-500">
                  <span className="line-clamp-1">{item.content}</span>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
```

### 10.2.7 Search Empty State

```typescript
// src/features/search/components/search-empty-state.tsx
interface SearchEmptyStateProps {
  query: string
}

export function SearchEmptyState({ query }: SearchEmptyStateProps) {
  return (
    <div className="text-center py-12">
      <div className="text-5xl mb-4">🔍</div>
      <h3 className="text-lg font-semibold mb-2">
        &quot;{query}&quot; 검색 결과가 없어요
      </h3>
      <p className="text-foreground-secondary">
        다른 키워드로 검색해보세요
      </p>
    </div>
  )
}
```

### 10.2.8 Search Hook

```typescript
// src/features/search/hooks/use-search.ts
'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'

type SearchFilter = 'all' | 'goals' | 'tasks' | 'reflections' | 'inbox'

interface SearchResults {
  goals: Array<{
    id: string
    name: string
    why: string | null
    area: { id: string; name: string; emoji: string; color: string } | null
  }>
  tasks: Array<{
    id: string
    name: string
    streak_count: number | null
    goal: { name: string; area: { emoji: string } | null } | null
  }>
  reflections: Array<{
    id: string
    date: string
    summary: string | null
  }>
  inbox: Array<{
    id: string
    content: string
  }>
  total: number
}

export function useSearch(query: string, filter: SearchFilter = 'all') {
  const { user } = useUser()
  const supabase = createClient()

  return useQuery({
    queryKey: ['search', query, filter, user?.id],
    queryFn: async (): Promise<SearchResults> => {
      if (!user?.id || query.length < 2) {
        return { goals: [], tasks: [], reflections: [], inbox: [], total: 0 }
      }

      const searchPattern = `%${query}%`
      const results: SearchResults = {
        goals: [],
        tasks: [],
        reflections: [],
        inbox: [],
        total: 0,
      }

      // Search Goals
      if (filter === 'all' || filter === 'goals') {
        const { data: goals } = await supabase
          .from('goals')
          .select(
            `
            id, name, why,
            area:areas(id, name, emoji, color)
          `
          )
          .eq('user_id', user.id)
          .or(`name.ilike.${searchPattern},why.ilike.${searchPattern}`)
          .limit(10)

        results.goals = (goals ?? []).map((g) => ({
          ...g,
          area: Array.isArray(g.area) ? g.area[0] : g.area,
        }))
      }

      // Search Tasks
      if (filter === 'all' || filter === 'tasks') {
        const { data: tasks } = await supabase
          .from('tasks')
          .select(
            `
            id, name, streak_count,
            goal:goals(name, area:areas(emoji))
          `
          )
          .eq('user_id', user.id)
          .or(`name.ilike.${searchPattern},why.ilike.${searchPattern}`)
          .limit(10)

        results.tasks = (tasks ?? []).map((t) => ({
          ...t,
          goal: Array.isArray(t.goal) ? t.goal[0] : t.goal,
        }))
      }

      // Search Reflections
      if (filter === 'all' || filter === 'reflections') {
        const { data: reflections } = await supabase
          .from('daily_reflections')
          .select('id, date, summary')
          .eq('user_id', user.id)
          .ilike('summary', searchPattern)
          .order('date', { ascending: false })
          .limit(10)

        results.reflections = reflections ?? []
      }

      // Search Inbox
      if (filter === 'all' || filter === 'inbox') {
        const { data: inbox } = await supabase
          .from('inbox_items')
          .select('id, content')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .ilike('content', searchPattern)
          .limit(10)

        results.inbox = inbox ?? []
      }

      results.total =
        results.goals.length +
        results.tasks.length +
        results.reflections.length +
        results.inbox.length

      return results
    },
    enabled: !!user?.id && query.length >= 2,
    staleTime: 30000, // 30 seconds
  })
}
```

### 10.2.9 Debounce Hook

```typescript
// src/hooks/use-debounce.ts
import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}
```

---

## 10.3 Profile Screen

개인 설정을 관리하고, Direction을 수정하고, 통계를 확인합니다.

### 10.3.1 Page Structure

```typescript
// src/app/(secondary)/profile/page.tsx
import { Suspense } from 'react'
import { PageContainer } from '@/components/layout/page-container'
import { ProfileHeader } from '@/features/profile/components/profile-header'
import { ProfileStats } from '@/features/profile/components/profile-stats'
import { DirectionCard } from '@/features/profile/components/direction-card'
import { SettingsMenu } from '@/features/profile/components/settings-menu'
import { DangerZone } from '@/features/profile/components/danger-zone'
import { ProfileSkeleton } from '@/features/profile/components/profile-skeleton'

export default function ProfilePage() {
  return (
    <PageContainer>
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileHeader />

        <div className="mt-6">
          <DirectionCard />
        </div>

        <div className="mt-6">
          <ProfileStats />
        </div>

        <div className="mt-6">
          <SettingsMenu />
        </div>

        <div className="mt-6">
          <DangerZone />
        </div>
      </Suspense>
    </PageContainer>
  )
}
```

### 10.3.2 Profile Header

```typescript
// src/features/profile/components/profile-header.tsx
'use client'

import { useState } from 'react'
import { Edit2, Camera } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useUser } from '@/hooks/use-user'
import { ProfileEditModal } from './profile-edit-modal'

export function ProfileHeader() {
  const { user, profile } = useUser()
  const [isEditOpen, setIsEditOpen] = useState(false)

  const displayName = profile?.name || user?.email?.split('@')[0] || 'User'
  const avatarInitial = displayName[0]?.toUpperCase() || '?'

  return (
    <>
      <Card variant="hero" className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4"
          onClick={() => setIsEditOpen(true)}
          aria-label="Edit profile"
        >
          <Edit2 className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center text-3xl font-bold text-primary-500">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                avatarInitial
              )}
            </div>
            <button
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-surface-primary border border-border flex items-center justify-center"
              aria-label="Change avatar"
            >
              <Camera className="w-4 h-4 text-foreground-secondary" />
            </button>
          </div>

          {/* Info */}
          <div>
            <h1 className="text-xl font-bold">{displayName}</h1>
            <p className="text-foreground-secondary">{user?.email}</p>
            {profile?.timezone && (
              <p className="text-sm text-foreground-tertiary mt-1">
                🌍 {profile.timezone}
              </p>
            )}
          </div>
        </div>
      </Card>

      <ProfileEditModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} />
    </>
  )
}
```

### 10.3.3 Direction Card

```typescript
// src/features/profile/components/direction-card.tsx
'use client'

import { useState } from 'react'
import { Compass, Edit2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useDirection } from '@/queries/use-direction'
import { DirectionEditModal } from './direction-edit-modal'

export function DirectionCard() {
  const { data: direction } = useDirection()
  const [isEditOpen, setIsEditOpen] = useState(false)

  return (
    <>
      <Card>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-ai-bg flex items-center justify-center flex-shrink-0">
              <Compass className="w-5 h-5 text-ai" />
            </div>
            <div>
              <h3 className="font-semibold">🧭 나의 방향</h3>
              {direction?.text ? (
                <p className="text-sm text-foreground-secondary mt-1 leading-relaxed">
                  &quot;{direction.text}&quot;
                </p>
              ) : (
                <p className="text-sm text-foreground-tertiary mt-1">
                  아직 방향을 설정하지 않았어요
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsEditOpen(true)}
            aria-label="Edit direction"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      <DirectionEditModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        currentDirection={direction?.text}
      />
    </>
  )
}
```

### 10.3.4 Direction Edit Modal

```typescript
// src/features/profile/components/direction-edit-modal.tsx
'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useUpdateDirection } from '@/queries/use-direction'

interface DirectionEditModalProps {
  isOpen: boolean
  onClose: () => void
  currentDirection?: string
}

export function DirectionEditModal({
  isOpen,
  onClose,
  currentDirection,
}: DirectionEditModalProps) {
  const [text, setText] = useState(currentDirection ?? '')
  const updateDirection = useUpdateDirection()

  useEffect(() => {
    setText(currentDirection ?? '')
  }, [currentDirection, isOpen])

  if (!isOpen) return null

  const handleSave = async () => {
    await updateDirection.mutateAsync(text)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface-primary rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">🧭 나의 방향 수정</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-foreground-secondary mb-4">
            나는 어떤 삶을 살고 싶은가요?
            이 방향이 모든 목표의 &quot;왜&quot;가 됩니다.
          </p>

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="예: 건강하고 당당한 삶을 통해 가족과 오래 행복하게 살고 싶다"
            rows={4}
            className="w-full"
          />

          <p className="text-xs text-foreground-tertiary mt-2">
            💡 팁: &quot;나는 [가치/상태]를 통해 [최종 목적]하고 싶다&quot;
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-border">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            취소
          </Button>
          <Button
            onClick={handleSave}
            isLoading={updateDirection.isPending}
            className="flex-1"
          >
            저장
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### 10.3.5 Profile Stats

```typescript
// src/features/profile/components/profile-stats.tsx
'use client'

import { Card } from '@/components/ui/card'
import { useProfileStats } from '@/features/profile/hooks/use-profile-stats'

export function ProfileStats() {
  const { data: stats, isLoading } = useProfileStats()

  if (isLoading || !stats) return null

  const statItems = [
    {
      label: '총 체크인',
      value: stats.totalCheckIns,
      emoji: '✅',
    },
    {
      label: '활성 목표',
      value: stats.activeGoals,
      emoji: '🎯',
    },
    {
      label: '최고 스트릭',
      value: `${stats.bestStreak}일`,
      emoji: '🔥',
    },
    {
      label: '가입일',
      value: stats.memberSince,
      emoji: '📅',
    },
  ]

  return (
    <div>
      <h3 className="font-semibold mb-3">📊 나의 통계</h3>
      <div className="grid grid-cols-2 gap-3">
        {statItems.map((item) => (
          <Card key={item.label} className="text-center py-4">
            <div className="text-2xl mb-1">{item.emoji}</div>
            <div className="text-xl font-bold font-mono">{item.value}</div>
            <div className="text-xs text-foreground-secondary mt-1">
              {item.label}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

### 10.3.6 Settings Menu

```typescript
// src/features/profile/components/settings-menu.tsx
'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { useTheme } from '@/components/providers/theme-provider'
import {
  Moon,
  Sun,
  Monitor,
  Bell,
  Globe,
  Shield,
  HelpCircle,
  MessageSquare,
  ChevronRight,
} from 'lucide-react'

export function SettingsMenu() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const themeIcon = theme === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun
  const themeLabel = theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light'

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(next)
  }

  const menuItems = [
    {
      icon: themeIcon,
      label: '테마',
      value: themeLabel,
      onClick: toggleTheme,
    },
    {
      icon: Bell,
      label: '알림 설정',
      href: '/profile/notifications',
    },
    {
      icon: Globe,
      label: '언어 & 지역',
      href: '/profile/language',
    },
    {
      icon: Shield,
      label: '개인정보 & 보안',
      href: '/profile/privacy',
    },
    {
      icon: HelpCircle,
      label: '도움말',
      href: '/profile/help',
    },
    {
      icon: MessageSquare,
      label: '피드백 보내기',
      href: '/profile/feedback',
    },
  ]

  return (
    <div>
      <h3 className="font-semibold mb-3">⚙️ 설정</h3>
      <Card padding="none">
        <div className="divide-y divide-border">
          {menuItems.map((item) => {
            const Icon = item.icon
            const content = (
              <div className="flex items-center justify-between p-4 hover:bg-surface-secondary transition-colors">
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-foreground-secondary" />
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-2 text-foreground-tertiary">
                  {item.value && <span className="text-sm">{item.value}</span>}
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            )

            if (item.href) {
              return (
                <Link key={item.label} href={item.href}>
                  {content}
                </Link>
              )
            }

            return (
              <button
                key={item.label}
                onClick={item.onClick}
                className="w-full text-left"
              >
                {content}
              </button>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
```

### 10.3.7 Danger Zone

```typescript
// src/features/profile/components/danger-zone.tsx
'use client'

import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { LogOut, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export function DangerZone() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error('로그아웃에 실패했어요')
      return
    }
    router.push('/login')
  }

  const handleDeleteAccount = () => {
    const confirmed = confirm(
      '정말 계정을 삭제할까요?\n모든 데이터가 영구적으로 삭제됩니다.'
    )
    if (confirmed) {
      // TODO: Implement account deletion
      toast.error('계정 삭제 기능은 준비 중이에요')
    }
  }

  return (
    <div>
      <h3 className="font-semibold mb-3 text-miss">⚠️ 계정</h3>
      <Card className="border-miss/20">
        <div className="space-y-3">
          <Button
            variant="secondary"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            로그아웃
          </Button>
          <Button
            variant="danger"
            className="w-full justify-start"
            onClick={handleDeleteAccount}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            계정 삭제
          </Button>
        </div>
      </Card>
    </div>
  )
}
```

### 10.3.8 Profile Stats Hook

```typescript
// src/features/profile/hooks/use-profile-stats.ts
'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { format } from 'date-fns'

interface ProfileStats {
  totalCheckIns: number
  activeGoals: number
  bestStreak: number
  memberSince: string
}

export function useProfileStats() {
  const { user } = useUser()
  const supabase = createClient()

  return useQuery({
    queryKey: ['profile-stats', user?.id],
    queryFn: async (): Promise<ProfileStats> => {
      if (!user?.id) throw new Error('User not found')

      // Total check-ins
      const { count: checkInCount } = await supabase
        .from('check_ins')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'done')

      // Active goals
      const { count: goalCount } = await supabase
        .from('goals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'active')

      // Best streak (max from tasks)
      const { data: tasks } = await supabase
        .from('tasks')
        .select('streak_count')
        .eq('user_id', user.id)
        .order('streak_count', { ascending: false })
        .limit(1)

      const bestStreak = tasks?.[0]?.streak_count ?? 0

      // Member since
      const memberSince = user.created_at ? format(new Date(user.created_at), 'yyyy.MM') : '-'

      return {
        totalCheckIns: checkInCount ?? 0,
        activeGoals: goalCount ?? 0,
        bestStreak,
        memberSince,
      }
    },
    enabled: !!user?.id,
  })
}
```

---

## 10.4 AI Hub Screen

AI 기능들의 허브 화면입니다. 실제 AI 기능은 Phase 11에서 구현되며,
Phase 10에서는 UI 골격과 플레이스홀더를 구현합니다.

### 10.4.1 Page Structure

```typescript
// src/app/(secondary)/ai-hub/page.tsx
import { Suspense } from 'react'
import { PageContainer } from '@/components/layout/page-container'
import { AIHubHeader } from '@/features/ai-hub/components/ai-hub-header'
import { AIFeatureCards } from '@/features/ai-hub/components/ai-feature-cards'
import { AIConversationHistory } from '@/features/ai-hub/components/ai-conversation-history'
import { AIHubSkeleton } from '@/features/ai-hub/components/ai-hub-skeleton'

export default function AIHubPage() {
  return (
    <PageContainer className="pb-4">
      <AIHubHeader />

      <div className="mt-6">
        <h3 className="text-sm font-medium text-foreground-secondary mb-3">
          빠른 메뉴
        </h3>
        <AIFeatureCards />
      </div>

      <Suspense fallback={<AIHubSkeleton />}>
        <div className="mt-8">
          <AIConversationHistory />
        </div>
      </Suspense>
    </PageContainer>
  )
}
```

### 10.4.2 AI Hub Header

```typescript
// src/features/ai-hub/components/ai-hub-header.tsx
'use client'

import { Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useUser } from '@/hooks/use-user'

export function AIHubHeader() {
  const { profile } = useUser()
  const displayName = profile?.name || 'User'

  return (
    <Card variant="hero" className="bg-gradient-to-br from-ai/10 to-primary-100">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-ai-bg flex items-center justify-center">
          <Sparkles className="w-7 h-7 text-ai" />
        </div>
        <div>
          <h1 className="text-xl font-bold">🤖 AI 코치</h1>
          <p className="text-foreground-secondary mt-1">
            안녕하세요, {displayName}님!
            <br />
            무엇을 도와드릴까요?
          </p>
        </div>
      </div>
    </Card>
  )
}
```

### 10.4.3 AI Feature Cards

```typescript
// src/features/ai-hub/components/ai-feature-cards.tsx
'use client'

import { useRouter } from 'next/navigation'
import { MessageCircle, Lightbulb, ListTodo, Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'

const FEATURES = [
  {
    id: 'chat',
    icon: MessageCircle,
    title: '💬 자유 대화',
    description: '목표, 삶, 방향에 대해 이야기',
    available: false,
  },
  {
    id: 'insights',
    icon: Lightbulb,
    title: '💡 이번 주 인사이트',
    description: '패턴 분석과 제안',
    available: false,
  },
  {
    id: 'todo',
    icon: ListTodo,
    title: '📝 TODO 제안 받기',
    description: '다음에 뭘 하면 좋을지',
    available: false,
  },
  {
    id: 'timeline',
    icon: Clock,
    title: '🕐 타임라인 최적화',
    description: '시간 배치 재조정 제안',
    available: false,
  },
]

export function AIFeatureCards() {
  const router = useRouter()

  const handleClick = (feature: typeof FEATURES[0]) => {
    if (!feature.available) {
      toast.info('이 기능은 곧 출시될 예정이에요! 🚀')
      return
    }
    router.push(`/ai-hub/${feature.id}`)
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {FEATURES.map((feature) => {
        const Icon = feature.icon
        return (
          <button
            key={feature.id}
            onClick={() => handleClick(feature)}
            className="text-left"
          >
            <Card
              className={`h-full transition-all ${
                feature.available
                  ? 'hover:border-ai hover:shadow-md'
                  : 'opacity-70'
              }`}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-ai-bg flex items-center justify-center mb-3">
                  <Icon className="w-6 h-6 text-ai" />
                </div>
                <h4 className="font-medium text-sm">{feature.title}</h4>
                <p className="text-xs text-foreground-tertiary mt-1">
                  {feature.description}
                </p>
                {!feature.available && (
                  <span className="mt-2 text-xs px-2 py-0.5 rounded-full bg-surface-secondary text-foreground-tertiary">
                    Coming Soon
                  </span>
                )}
              </div>
            </Card>
          </button>
        )
      })}
    </div>
  )
}
```

### 10.4.4 Conversation History

```typescript
// src/features/ai-hub/components/ai-conversation-history.tsx
'use client'

import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { MessageSquare, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useAIConversations } from '@/features/ai-hub/hooks/use-ai-conversations'
import { AIHubEmptyState } from './ai-hub-empty-state'

export function AIConversationHistory() {
  const { data: conversations = [], isLoading } = useAIConversations()

  if (isLoading) return null

  if (conversations.length === 0) {
    return <AIHubEmptyState />
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-foreground-secondary mb-3">
        최근 대화
      </h3>
      <div className="space-y-2">
        {conversations.map((conversation) => (
          <Card
            key={conversation.id}
            variant="list"
            padding="sm"
            className="hover:border-ai cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-ai" />
                <div>
                  <p className="font-medium line-clamp-1">
                    {conversation.title}
                  </p>
                  <p className="text-xs text-foreground-tertiary">
                    {formatDistanceToNow(new Date(conversation.created_at), {
                      addSuffix: true,
                      locale: ko,
                    })}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-foreground-tertiary" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

### 10.4.5 AI Hub Empty State

```typescript
// src/features/ai-hub/components/ai-hub-empty-state.tsx
export function AIHubEmptyState() {
  return (
    <div className="text-center py-12">
      <div className="text-5xl mb-4">🤖</div>
      <h3 className="text-lg font-semibold mb-2">아직 대화 기록이 없어요</h3>
      <p className="text-foreground-secondary max-w-sm mx-auto">
        위의 메뉴에서 AI 코치와 대화를 시작해보세요.
        목표 설정, 시간 관리, 동기 부여 등 다양한 도움을 받을 수 있어요.
      </p>
    </div>
  )
}
```

### 10.4.6 AI Conversations Hook (Placeholder)

```typescript
// src/features/ai-hub/hooks/use-ai-conversations.ts
'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'

interface AIConversation {
  id: string
  title: string
  type: 'chat' | 'insights' | 'todo' | 'timeline'
  created_at: string
}

export function useAIConversations() {
  const { user } = useUser()
  const supabase = createClient()

  return useQuery({
    queryKey: ['ai-conversations', user?.id],
    queryFn: async (): Promise<AIConversation[]> => {
      if (!user?.id) return []

      // TODO: Implement in Phase 11
      // For now, return empty array
      // const { data, error } = await supabase
      //   .from('ai_conversations')
      //   .select('*')
      //   .eq('user_id', user.id)
      //   .order('created_at', { ascending: false })
      //   .limit(10)

      return []
    },
    enabled: !!user?.id,
  })
}
```

---

## 10.5 Shared Components

### 10.5.1 Empty State Component

```typescript
// src/components/common/empty-state.tsx
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  emoji: string
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ emoji, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-16">
      <div className="text-6xl mb-4">{emoji}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-foreground-secondary mb-6 max-w-sm mx-auto">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
```

### 10.5.2 Skeleton Components

```typescript
// src/features/inbox/components/inbox-skeleton.tsx
import { Card } from '@/components/ui/card'

export function InboxSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <div className="h-4 bg-surface-secondary rounded w-3/4 mb-2" />
          <div className="h-3 bg-surface-secondary rounded w-1/4" />
        </Card>
      ))}
    </div>
  )
}

// src/features/profile/components/profile-skeleton.tsx
import { Card } from '@/components/ui/card'

export function ProfileSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <Card variant="hero">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-surface-secondary" />
          <div className="flex-1">
            <div className="h-6 bg-surface-secondary rounded w-32 mb-2" />
            <div className="h-4 bg-surface-secondary rounded w-48" />
          </div>
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="h-24" />
        ))}
      </div>
    </div>
  )
}

// src/features/ai-hub/components/ai-hub-skeleton.tsx
import { Card } from '@/components/ui/card'

export function AIHubSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 bg-surface-secondary rounded w-24 mb-3" />
      {[1, 2, 3].map((i) => (
        <Card key={i} variant="list" padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded bg-surface-secondary" />
            <div className="flex-1">
              <div className="h-4 bg-surface-secondary rounded w-48 mb-1" />
              <div className="h-3 bg-surface-secondary rounded w-24" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
```

---

## 🤖 AI Testing Verification

Phase 완료 후 Claude가 Playwright MCP로 직접 검증합니다:

```
1. pnpm dev 실행
2. 각 Secondary 화면 테스트

### Inbox 테스트
browser_navigate("http://localhost:3000/inbox")
- [ ] 빈 상태 확인 (📭 이모지, CTA 버튼)
- [ ] Quick Add 입력 → Enter → 아이템 추가
- [ ] 아이템 카드 표시 (내용, 날짜, 액션 버튼)
- [ ] 삭제 버튼 → 확인 다이얼로그 → 삭제
- [ ] 보관 버튼 → 보관함으로 이동
- [ ] 연결 버튼 → 모달 열림 → Area/Goal 선택

### Search 테스트
browser_navigate("http://localhost:3000/search")
- [ ] SearchInput 자동 포커스
- [ ] 2글자 이상 입력 시 검색 실행 (디바운스)
- [ ] 필터 칩 클릭 → 필터 적용
- [ ] 검색 결과 섹션별 표시 (목표/실천/기록/인박스)
- [ ] 결과 클릭 → 해당 페이지 이동
- [ ] 최근 검색어 표시/삭제/전체 삭제
- [ ] 빈 결과 상태 확인

### Profile 테스트
browser_navigate("http://localhost:3000/profile")
- [ ] ProfileHeader 정보 표시 (이름, 이메일, 아바타)
- [ ] DirectionCard 표시 (Direction 텍스트)
- [ ] Direction 수정 모달 열기/닫기/저장
- [ ] ProfileStats 카드 (총 체크인, 활성 목표, 최고 스트릭, 가입일)
- [ ] 테마 토글 동작 (Light → Dark → System)
- [ ] 설정 메뉴 링크 동작
- [ ] 로그아웃 버튼 → 로그인 페이지 이동

### AI Hub 테스트
browser_navigate("http://localhost:3000/ai-hub")
- [ ] AIHubHeader 인사말 표시
- [ ] Feature Cards 4개 표시
- [ ] Feature Card 클릭 → "Coming Soon" 토스트
- [ ] Conversation History 빈 상태 확인
```

---

## ✅ Completion Checklist

### Inbox Screen

- [ ] **Database**
  - [ ] `inbox_items` 테이블 마이그레이션
  - [ ] RLS 정책 설정
  - [ ] Types 추가 (`InboxItem`, `InboxStatus`)

- [ ] **Store & Hooks**
  - [ ] `inbox.store.ts` 구현
  - [ ] `useInboxItems` hook
  - [ ] `useCreateInboxItem` mutation
  - [ ] `useDeleteInboxItem` mutation
  - [ ] `useArchiveInboxItem` mutation
  - [ ] `useLinkToRoadmap` mutation

- [ ] **Components**
  - [ ] `InboxHeader` 컴포넌트
  - [ ] `InboxQuickAdd` 컴포넌트
  - [ ] `InboxItemList` 컴포넌트
  - [ ] `InboxItemCard` 컴포넌트
  - [ ] `InboxLinkModal` 컴포넌트
  - [ ] `InboxEmptyState` 컴포넌트
  - [ ] `InboxArchiveSection` 컴포넌트
  - [ ] `InboxSkeleton` 컴포넌트

- [ ] **Server Actions**
  - [ ] `createInboxItem`
  - [ ] `updateInboxItem`
  - [ ] `deleteInboxItem`
  - [ ] `linkInboxItemToTask`

### Search Screen

- [ ] **Store & Hooks**
  - [ ] `search.store.ts` 보완 (persist, filter)
  - [ ] `useSearch` hook
  - [ ] `useDebounce` hook

- [ ] **Components**
  - [ ] `SearchInput` 개선 (debounce)
  - [ ] `SearchFilters` 컴포넌트
  - [ ] `RecentSearches` 컴포넌트
  - [ ] `SearchResults` 개선 (모든 유형)
  - [ ] `SearchEmptyState` 컴포넌트

### Profile Screen

- [ ] **Store & Hooks**
  - [ ] `useProfileStats` hook
  - [ ] `useDirection` query hook
  - [ ] `useUpdateDirection` mutation hook

- [ ] **Components**
  - [ ] `ProfileHeader` 개선
  - [ ] `DirectionCard` 컴포넌트
  - [ ] `DirectionEditModal` 컴포넌트
  - [ ] `ProfileStats` 구현
  - [ ] `SettingsMenu` 개선
  - [ ] `DangerZone` 개선
  - [ ] `ProfileEditModal` 컴포넌트
  - [ ] `ProfileSkeleton` 컴포넌트

### AI Hub Screen

- [ ] **Store & Hooks**
  - [ ] `useAIConversations` hook (placeholder)

- [ ] **Components**
  - [ ] `AIHubHeader` 컴포넌트
  - [ ] `AIFeatureCards` 컴포넌트
  - [ ] `AIConversationHistory` 컴포넌트
  - [ ] `AIHubEmptyState` 컴포넌트
  - [ ] `AIHubSkeleton` 컴포넌트

### Shared

- [ ] `EmptyState` 공통 컴포넌트
- [ ] `useDebounce` hook

### Testing

- [ ] Inbox unit tests
- [ ] Search unit tests
- [ ] Profile unit tests
- [ ] AI Hub unit tests
- [ ] E2E tests for all screens

---

## 🔗 Navigation

← [Phase 9: Review Screen](./phase-9-review.md)
→ [Phase 11: AI Advisor](./phase-11-ai-advisor.md)

---

_Version: 2.0 | Last Updated: 2026-02-04_
