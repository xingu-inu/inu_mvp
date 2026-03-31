'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { Input, Textarea } from '@/components/ui'
import {
  useProfileTraits,
  useCreateProfileTrait,
  useUpdateProfileTrait,
  useDeleteProfileTrait,
} from '@/queries/use-profile-traits'
import type { ProfileTrait } from '@/types/entities'

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  return `${y}.${m}.${d}`
}

function TraitItem({
  trait,
  onEdit,
  onDelete,
}: {
  trait: ProfileTrait
  onEdit: (trait: ProfileTrait) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="group flex items-start justify-between gap-2 rounded-xl border border-[var(--color-border)] px-3 py-2.5 transition-colors hover:bg-[var(--color-bg-secondary)]">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-[var(--color-text-tertiary)]">{trait.label}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-[var(--color-text-primary)]">
          {trait.value}
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
          {formatDate(trait.created_at)}
        </p>
      </div>
      <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => onEdit(trait)}
          className="rounded-lg p-1.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-secondary)]"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDelete(trait.id)}
          className="rounded-lg p-1.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-danger-hover-bg)] hover:text-[var(--color-miss)]"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

function TraitForm({
  initial,
  onSubmit,
  onCancel,
  isPending,
}: {
  initial?: { label: string; value: string }
  onSubmit: (label: string, value: string) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [value, setValue] = useState(initial?.value ?? '')

  const canSubmit = label.trim().length > 0 && value.trim().length > 0 && !isPending

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit(label.trim(), value.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) handleSubmit()
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div className="space-y-2 rounded-xl border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] p-3">
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={50}
        placeholder="항목 이름 (예: MBTI, 강점, 요즘 관심사)"
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
          onClick={onCancel}
          disabled={isPending}
          className="rounded-lg px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
        >
          <X className="inline h-3.5 w-3.5" /> 취소
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="rounded-lg bg-[var(--color-primary-500)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-primary-600)] disabled:opacity-50"
        >
          <Check className="inline h-3.5 w-3.5" /> {initial ? '수정' : '추가'}
        </button>
      </div>
    </div>
  )
}

export function CompanionSettingsView() {
  const { data: traits = [], isLoading } = useProfileTraits()
  const createTrait = useCreateProfileTrait()
  const updateTrait = useUpdateProfileTrait()
  const deleteTrait = useDeleteProfileTrait()

  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleCreate = (label: string, value: string) => {
    createTrait.mutate({ label, value }, { onSuccess: () => setIsAdding(false) })
  }

  const handleUpdate = (id: string, label: string, value: string) => {
    updateTrait.mutate({ id, input: { label, value } }, { onSuccess: () => setEditingId(null) })
  }

  const handleDelete = (id: string) => {
    deleteTrait.mutate(id)
  }

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
    <div className="space-y-3">
      {/* 설명 */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
        <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
          나에 대한 정보를 자유롭게 기록해보세요. 이누가 대화할 때 참고해요.
        </p>
      </div>

      {/* 항목 리스트 */}
      {traits.length === 0 && !isAdding && (
        <div className="py-8 text-center">
          <p className="text-sm text-[var(--color-text-tertiary)]">아직 기록한 항목이 없어요</p>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            MBTI, 강점, 관심사 등 자유롭게 추가해보세요
          </p>
        </div>
      )}

      {traits.map((trait) =>
        editingId === trait.id ? (
          <TraitForm
            key={trait.id}
            initial={{ label: trait.label, value: trait.value }}
            onSubmit={(label, value) => handleUpdate(trait.id, label, value)}
            onCancel={() => setEditingId(null)}
            isPending={updateTrait.isPending}
          />
        ) : (
          <TraitItem
            key={trait.id}
            trait={trait}
            onEdit={(t) => setEditingId(t.id)}
            onDelete={handleDelete}
          />
        )
      )}

      {/* 추가 폼 / 추가 버튼 */}
      {isAdding ? (
        <TraitForm
          onSubmit={handleCreate}
          onCancel={() => setIsAdding(false)}
          isPending={createTrait.isPending}
        />
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--color-border)] py-3 text-sm text-[var(--color-text-tertiary)] transition-colors hover:border-[var(--color-primary-300)] hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary-500)]"
        >
          <Plus className="h-4 w-4" />
          항목 추가
        </button>
      )}
    </div>
  )
}
