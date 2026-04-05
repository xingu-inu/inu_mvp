'use client'

import { Sparkles } from 'lucide-react'
import { useAiInsights, useUpdateAiInsight, useDeleteAiInsight } from '@/queries/use-ai-insights'
import { PokedexAiInsightCard } from './pokedex-ai-insight-card'

export function PokedexAiInsights() {
  const { data: insights = [] } = useAiInsights()
  const { mutate: updateInsight, isPending: isUpdating } = useUpdateAiInsight()
  const { mutate: deleteInsight, isPending: isDeleting } = useDeleteAiInsight()

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
        <div className="px-3 py-4 text-center text-xs text-[var(--color-text-disabled)]">
          아직 분석이 부족해요. 대화를 더 나누면 인사이트가 추가돼요
        </div>
      )}
    </div>
  )
}
