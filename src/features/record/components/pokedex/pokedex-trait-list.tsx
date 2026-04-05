'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Check, X } from 'lucide-react'
import type { ProfileTrait, TraitCategory } from '@/types/entities'
import { Input, Textarea } from '@/components/ui'
import { PokedexTraitRow } from './pokedex-trait-row'

interface PokedexTraitListProps {
  traits: ProfileTrait[]
  onEditTrait: (id: string, label: string, value: string, category: TraitCategory) => void
  onDeleteTrait: (id: string) => void
  editingId: string | null
  onEditStart: (trait: ProfileTrait) => void
  onEditCancel: () => void
  isPending?: boolean
  highlightLastTrait?: boolean
}

function InlineEditForm({
  trait,
  onSave,
  onCancel,
  isPending,
}: {
  trait: ProfileTrait
  onSave: (id: string, label: string, value: string, category: TraitCategory) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [label, setLabel] = useState(trait.label)
  const [value, setValue] = useState(trait.value)
  const category = trait.category ?? 'general'
  const canSubmit = label.trim().length > 0 && value.trim().length > 0 && !isPending

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey && canSubmit)
      onSave(trait.id, label.trim(), value.trim(), category)
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div className="space-y-2 rounded-xl border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] p-3">
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={50}
        placeholder="항목 이름"
        autoFocus
      />
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={500}
        className="min-h-[60px]"
        placeholder="내용"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded-lg px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
        >
          <X className="inline h-3.5 w-3.5" /> 취소
        </button>
        <button
          type="button"
          onClick={() => canSubmit && onSave(trait.id, label.trim(), value.trim(), category)}
          disabled={!canSubmit}
          className="rounded-lg bg-[var(--color-primary-500)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-primary-600)] disabled:opacity-50"
        >
          <Check className="inline h-3.5 w-3.5" /> 수정
        </button>
      </div>
    </div>
  )
}

export function PokedexTraitList({
  traits,
  onEditTrait,
  onDeleteTrait,
  editingId,
  onEditStart,
  onEditCancel,
  isPending = false,
  highlightLastTrait,
}: PokedexTraitListProps) {
  const editingTrait = editingId ? traits.find((t) => t.id === editingId) : null

  return (
    <div className="px-3 py-2">
      {traits.length > 0 ? (
        <AnimatePresence initial={false}>
          {traits.map((trait, i) =>
            trait.id === editingId && editingTrait ? (
              <InlineEditForm
                key={trait.id}
                trait={editingTrait}
                onSave={onEditTrait}
                onCancel={onEditCancel}
                isPending={isPending}
              />
            ) : (
              <PokedexTraitRow
                key={trait.id}
                trait={trait}
                index={i}
                onEdit={onEditStart}
                onDelete={onDeleteTrait}
                isNew={highlightLastTrait && i === traits.length - 1}
              />
            )
          )}
        </AnimatePresence>
      ) : (
        <div className="flex cursor-default items-center rounded-md px-2 py-1.5 text-[var(--color-text-disabled)]">
          <span className="w-20 shrink-0 text-xs font-medium">???</span>
          <span className="text-xs">미발견</span>
        </div>
      )}
    </div>
  )
}
