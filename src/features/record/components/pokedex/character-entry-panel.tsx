'use client'

import { useState, useMemo, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  useProfileTraits,
  useUpdateProfileTrait,
  useDeleteProfileTrait,
} from '@/queries/use-profile-traits'
import type { ProfileTrait, TraitCategory } from '@/types/entities'
import { PokedexHero } from './pokedex-hero'
import { PokedexStatBars } from './pokedex-stat-bars'
import { PokedexInterests } from './pokedex-interests'
import { PokedexDescription } from './pokedex-description'
import { PokedexHabits } from './pokedex-habits'
import { PokedexInfoList } from './pokedex-info-list'
import { PokedexEmptySlots } from './pokedex-empty-slots'
import { PokedexAddTrait } from './pokedex-add-trait'
import { PokedexRadarChart } from './pokedex-radar-chart'
import { Plus, Check, X } from 'lucide-react'
import { Input, Textarea } from '@/components/ui'

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
  const [category, setCategory] = useState<TraitCategory>(trait.category ?? 'general')
  const canSubmit = label.trim().length > 0 && value.trim().length > 0 && !isPending

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey && canSubmit)
      onSave(trait.id, label.trim(), value.trim(), category)
    if (e.key === 'Escape') onCancel()
  }

  const CATEGORY_OPTIONS: { value: TraitCategory; label: string }[] = [
    { value: 'identity', label: '🧬 성격' },
    { value: 'stats', label: '💪 능력' },
    { value: 'interests', label: '🎯 관심사' },
    { value: 'description', label: '💭 소개' },
    { value: 'habits', label: '🔄 습관' },
    { value: 'general', label: '📝 기타' },
  ]

  return (
    <div className="space-y-2 rounded-xl border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] p-3">
      <div className="flex flex-wrap gap-1">
        {CATEGORY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setCategory(opt.value)}
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
              category === opt.value
                ? 'bg-[var(--color-primary-500)] text-white'
                : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-canvas)]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
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

export function CharacterEntryPanel() {
  const { data: traits = [], isLoading } = useProfileTraits()
  const updateTrait = useUpdateProfileTrait()
  const deleteTrait = useDeleteProfileTrait()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [addingState, setAddingState] = useState<{
    open: boolean
    category?: TraitCategory
    label?: string
  }>({ open: false })

  const grouped = useMemo(() => {
    const groups: Record<TraitCategory, ProfileTrait[]> = {
      identity: [],
      stats: [],
      interests: [],
      description: [],
      habits: [],
      general: [],
    }
    for (const trait of traits) {
      const cat = trait.category ?? 'general'
      groups[cat].push(trait)
    }
    return groups
  }, [traits])

  const handleEdit = useCallback((trait: ProfileTrait) => {
    setEditingId(trait.id)
  }, [])

  const handleDelete = useCallback(
    (id: string) => {
      deleteTrait.mutate(id)
    },
    [deleteTrait]
  )

  const handleUpdate = useCallback(
    (id: string, label: string, value: string, category: TraitCategory) => {
      updateTrait.mutate(
        { id, input: { label, value, category } },
        { onSuccess: () => setEditingId(null) }
      )
    },
    [updateTrait]
  )

  const handleAddTrait = useCallback((category: TraitCategory, suggestedLabel?: string) => {
    setAddingState({ open: true, category, label: suggestedLabel })
  }, [])

  const handleCloseAdd = useCallback(() => {
    setAddingState({ open: false })
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-xl border border-[var(--color-border)] p-3">
            <div className="h-3 w-16 rounded bg-[var(--color-bg-tertiary)]" />
            <div className="mt-2 h-4 w-3/4 rounded bg-[var(--color-bg-tertiary)]" />
          </div>
        ))}
      </div>
    )
  }

  // Render a zone's traits with inline editing support
  const renderEditableZone = (
    category: TraitCategory,
    zoneTraits: ProfileTrait[],
    ZoneComponent: React.ComponentType<{
      traits: ProfileTrait[]
      onEditTrait: (trait: ProfileTrait) => void
      onDeleteTrait: (id: string) => void
    }>
  ) => {
    const editingTrait = zoneTraits.find((t) => t.id === editingId)
    if (editingTrait) {
      return (
        <div key={category}>
          {/* Show non-editing traits in the zone */}
          <ZoneComponent
            traits={zoneTraits.filter((t) => t.id !== editingId)}
            onEditTrait={handleEdit}
            onDeleteTrait={handleDelete}
          />
          <InlineEditForm
            trait={editingTrait}
            onSave={handleUpdate}
            onCancel={() => setEditingId(null)}
            isPending={updateTrait.isPending}
          />
        </div>
      )
    }
    return (
      <ZoneComponent
        key={category}
        traits={zoneTraits}
        onEditTrait={handleEdit}
        onDeleteTrait={handleDelete}
      />
    )
  }

  return (
    <div className="space-y-2">
      {/* Hero: always shown */}
      <PokedexHero
        traits={traits}
        identityTraits={grouped.identity}
        onEditTrait={handleEdit}
        onDeleteTrait={handleDelete}
      />

      {/* General info list */}
      {grouped.general.length > 0 &&
        renderEditableZone('general', grouped.general, PokedexInfoList)}

      {/* Stat bars */}
      {grouped.stats.length > 0 && renderEditableZone('stats', grouped.stats, PokedexStatBars)}

      {/* Interests grid */}
      {grouped.interests.length > 0 && (
        <PokedexInterests
          traits={grouped.interests}
          onEditTrait={handleEdit}
          onDeleteTrait={handleDelete}
          onAddTrait={handleAddTrait}
        />
      )}

      {/* Description quotes */}
      {grouped.description.length > 0 &&
        renderEditableZone('description', grouped.description, PokedexDescription)}

      {/* Habits chips */}
      {grouped.habits.length > 0 && renderEditableZone('habits', grouped.habits, PokedexHabits)}

      {/* Radar chart */}
      <PokedexRadarChart traits={traits} />

      {/* Empty slots */}
      <PokedexEmptySlots traits={traits} onAddTrait={handleAddTrait} />

      {/* Add button / form */}
      <AnimatePresence mode="wait">
        {addingState.open ? (
          <motion.div
            key="add-form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <PokedexAddTrait
              onClose={handleCloseAdd}
              initialCategory={addingState.category}
              initialLabel={addingState.label}
            />
          </motion.div>
        ) : (
          <motion.button
            key="add-button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setAddingState({ open: true })}
            className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-[var(--color-primary-200)] py-3 text-sm font-medium text-[var(--color-primary-500)] transition-all hover:border-[var(--color-primary-300)] hover:bg-[var(--color-primary-50)] hover:shadow-sm"
          >
            <motion.div
              animate={{ rotate: [0, 90, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.5 }}
            >
              <Plus className="h-4 w-4" />
            </motion.div>
            항목 추가
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
