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
        {/* Header: avatar + nickname + dex number + gauge */}
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

        {/* AI Insights */}
        <PokedexAiInsights />
      </div>

      {/* Add button / form */}
      <AnimatePresence mode="wait">
        {addingOpen ? (
          <motion.div
            key="add-form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <PokedexAddTrait onClose={() => setAddingOpen(false)} />
          </motion.div>
        ) : (
          <motion.button
            key="add-button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setAddingOpen(true)}
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
