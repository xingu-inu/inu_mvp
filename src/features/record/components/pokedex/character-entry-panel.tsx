'use client'

import { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  useProfileTraits,
  useUpdateProfileTrait,
  useDeleteProfileTrait,
} from '@/queries/use-profile-traits'
import type { TraitCategory } from '@/types/entities'
import { PokedexHeader } from './pokedex-header'
import { PokedexTraitList } from './pokedex-trait-list'
import { PokedexAiInsights } from './pokedex-ai-insights'
import { PokedexAddTrait } from './pokedex-add-trait'
import { Plus } from 'lucide-react'

export function CharacterEntryPanel() {
  const { data: traits = [], isLoading } = useProfileTraits()
  const updateTrait = useUpdateProfileTrait()
  const deleteTrait = useDeleteProfileTrait()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [addingOpen, setAddingOpen] = useState(false)

  const handleEditStart = useCallback((trait: { id: string }) => setEditingId(trait.id), [])

  const handleDelete = useCallback((id: string) => deleteTrait.mutate(id), [deleteTrait])

  const handleUpdate = useCallback(
    (id: string, label: string, value: string, category: TraitCategory) => {
      updateTrait.mutate(
        { id, input: { label, value, category } },
        { onSuccess: () => setEditingId(null) }
      )
    },
    [updateTrait]
  )

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

  return (
    <div className="space-y-2">
      <div
        className="overflow-hidden rounded-2xl border border-[var(--color-border)]"
        style={{
          background:
            'linear-gradient(180deg, var(--color-bg-secondary) 0%, var(--color-bg-primary) 100%)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {/* Header: avatar + nickname + dex number + badge */}
        <PokedexHeader
          traitCount={traits.length}
          nickname={null}
          avatarPreset={null}
          onAvatarChange={() => {}}
        />

        {/* Flat trait list */}
        <PokedexTraitList
          traits={traits}
          onEditTrait={handleUpdate}
          onDeleteTrait={handleDelete}
          editingId={editingId}
          onEditStart={handleEditStart}
          onEditCancel={() => setEditingId(null)}
          isPending={updateTrait.isPending}
        />

        {/* Add button / inline form — between traits and AI insights */}
        <AnimatePresence mode="wait">
          {addingOpen ? (
            <motion.div
              key="add-form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <PokedexAddTrait onClose={() => setAddingOpen(false)} />
            </motion.div>
          ) : (
            <motion.button
              key="add-button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setAddingOpen(true)}
              className="flex min-h-[44px] w-full items-center justify-center gap-1.5 text-xs font-medium text-[var(--color-primary-500)] transition-colors hover:bg-[var(--color-primary-50)]"
            >
              <Plus className="h-3.5 w-3.5" />
              항목 추가
            </motion.button>
          )}
        </AnimatePresence>

        {/* AI Insights */}
        <PokedexAiInsights />
      </div>
    </div>
  )
}
