'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import type { AiInsight } from '@/types/entities'
import { Input, Textarea } from '@/components/ui'

interface PokedexAiInsightCardProps {
  insight: AiInsight
  index: number
  onEdit: (id: string, title: string, description: string) => void
  onDelete: (id: string) => void
  isPending?: boolean
}

export function PokedexAiInsightCard({
  insight,
  index,
  onEdit,
  onDelete,
  isPending = false,
}: PokedexAiInsightCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(insight.title)
  const [description, setDescription] = useState(insight.description)

  const canSubmit = title.trim().length > 0 && description.trim().length > 0 && !isPending

  const handleSave = () => {
    if (!canSubmit) return
    onEdit(insight.id, title.trim(), description.trim())
    setIsEditing(false)
  }

  const handleCancel = () => {
    setTitle(insight.title)
    setDescription(insight.description)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey && canSubmit) handleSave()
    if (e.key === 'Escape') handleCancel()
  }

  if (isEditing) {
    return (
      <div className="space-y-2 rounded-xl border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] p-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={100}
          placeholder="제목"
          autoFocus
        />
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={2000}
          className="min-h-[60px]"
          placeholder="설명"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            className="rounded-lg px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
          >
            <X className="inline h-3.5 w-3.5" /> 취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSubmit}
            className="rounded-lg bg-[var(--color-primary-500)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-primary-600)] disabled:opacity-50"
          >
            <Check className="inline h-3.5 w-3.5" /> 수정
          </button>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.18 }}
      className="group rounded-lg px-3 py-2 hover:bg-[var(--color-bg-secondary)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[var(--color-text-primary)]">{insight.title}</p>
          <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{insight.description}</p>
        </div>
        <div className="flex shrink-0 gap-0.5 transition-opacity lg:[@media(hover:hover)]:opacity-0 lg:[@media(hover:hover)]:group-hover:opacity-100">
          <button
            onClick={() => setIsEditing(true)}
            className="rounded-lg p-2 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-secondary)] lg:p-1"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={() => onDelete(insight.id)}
            className="rounded-lg p-2 text-[var(--color-text-tertiary)] hover:bg-[var(--color-danger-hover-bg)] hover:text-[var(--color-miss)] lg:p-1"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
