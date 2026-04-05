'use client'

import { MessageCircle, Sparkles } from 'lucide-react'
import { useAiInsights, useUpdateAiInsight, useDeleteAiInsight } from '@/queries/use-ai-insights'
import { useAiChatStore } from '@/stores/ai-chat.store'
import { PokedexAiInsightCard } from './pokedex-ai-insight-card'

export function PokedexAiInsights() {
  const { data: insights = [] } = useAiInsights()
  const { mutate: updateInsight, isPending: isUpdating } = useUpdateAiInsight()
  const { mutate: deleteInsight, isPending: isDeleting } = useDeleteAiInsight()
  const openChat = useAiChatStore((s) => s.openChat)

  const isPending = isUpdating || isDeleting

  const handleEdit = (id: string, title: string, description: string) => {
    updateInsight({ id, input: { title, description } })
  }

  const handleDelete = (id: string) => {
    deleteInsight(id)
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 px-3 py-2">
        <Sparkles className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
        <span className="text-xs font-semibold text-[var(--color-text-tertiary)]">AI 인사이트</span>
      </div>

      {insights.length > 0 ? (
        <div>
          {insights.map((insight, i) => (
            <PokedexAiInsightCard
              key={insight.id}
              insight={insight}
              index={i}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isPending={isPending}
            />
          ))}
        </div>
      ) : (
        <div className="px-3 py-4 text-center">
          <p className="text-xs text-[var(--color-text-disabled)]">
            AI와 나에 대해 이야기하면 인사이트가 쌓여요
          </p>
          <button
            onClick={openChat}
            className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-[var(--color-primary-500)] transition-colors hover:bg-[var(--color-primary-50)]"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            대화 시작하기
          </button>
        </div>
      )}
    </div>
  )
}
