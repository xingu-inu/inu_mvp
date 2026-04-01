'use client'

import { useState, useCallback } from 'react'
import { Check, Loader2, CheckCircle2, AlertCircle, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useProfileTraits,
  useCreateProfileTrait,
  useUpdateProfileTrait,
} from '@/queries/use-profile-traits'

const MAX_TRAITS = 30

import type { TraitCategory } from '@/types/entities'

interface TraitSuggestion {
  label: string
  value: string
  reason: string
  category?: TraitCategory
  existing_trait_id?: string
}

interface SuggestProfileTraitsOutput {
  type: 'suggest_profile_traits'
  traits: TraitSuggestion[]
}

interface CheckedTrait extends TraitSuggestion {
  _checked: boolean
  _applied: boolean
}

type CardState = 'idle' | 'applying' | 'applied' | 'error'

function parseSuggestionOutput(raw: unknown): SuggestProfileTraitsOutput | null {
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (typeof raw !== 'object' || raw === null) return null
  const obj = raw as Record<string, unknown>
  if (obj.type !== 'suggest_profile_traits' || !Array.isArray(obj.traits)) return null
  return obj as unknown as SuggestProfileTraitsOutput
}

interface TraitSuggestionCardProps {
  output: unknown
}

export function TraitSuggestionCard({ output }: TraitSuggestionCardProps) {
  const parsed = parseSuggestionOutput(output)
  if (!parsed) return null
  return <TraitSuggestionCardInner data={parsed} />
}

function TraitSuggestionCardInner({ data }: { data: SuggestProfileTraitsOutput }) {
  const [traits, setTraits] = useState<CheckedTrait[]>(() =>
    data.traits.map((t) => ({ ...t, _checked: true, _applied: false }))
  )
  const [cardState, setCardState] = useState<CardState>('idle')
  const [result, setResult] = useState({ completed: 0, failed: 0 })

  const { data: existingTraits } = useProfileTraits()
  const createTrait = useCreateProfileTrait()
  const updateTrait = useUpdateProfileTrait()

  const checkedCount = traits.filter((t) => t._checked && !t._applied).length
  const currentCount = existingTraits?.length ?? 0
  const newCount = traits.filter(
    (t) =>
      t._checked &&
      !t._applied &&
      !(t.existing_trait_id && existingTraits?.some((e) => e.id === t.existing_trait_id))
  ).length
  const wouldExceed = currentCount + newCount > MAX_TRAITS

  const toggleTrait = useCallback(
    (index: number) => {
      if (cardState !== 'idle') return
      setTraits((prev) => prev.map((t, i) => (i === index ? { ...t, _checked: !t._checked } : t)))
    },
    [cardState]
  )

  const handleApply = useCallback(async () => {
    const pending = traits.filter((t) => t._checked && !t._applied)
    if (pending.length === 0) return

    setCardState('applying')

    const results = await Promise.allSettled(
      pending.map(async (trait) => {
        const existingValid =
          trait.existing_trait_id && existingTraits?.some((e) => e.id === trait.existing_trait_id)

        if (existingValid) {
          await updateTrait.mutateAsync({
            id: trait.existing_trait_id!,
            input: { label: trait.label, value: trait.value, category: trait.category },
          })
        } else {
          await createTrait.mutateAsync({
            label: trait.label,
            value: trait.value,
            category: trait.category,
          })
        }
        return trait.label
      })
    )

    const succeededLabels = new Set(
      results
        .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
        .map((r) => r.value)
    )

    setTraits((prev) =>
      prev.map((t) => (succeededLabels.has(t.label) ? { ...t, _applied: true } : t))
    )

    const completed = succeededLabels.size + result.completed
    const failed = results.filter((r) => r.status === 'rejected').length
    setResult({ completed, failed })
    setCardState(failed > 0 ? 'error' : 'applied')
  }, [traits, existingTraits, createTrait, updateTrait, result.completed])

  // Applied state
  if (cardState === 'applied') {
    return (
      <div className="my-1 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 dark:border-green-900 dark:bg-green-950">
        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400" />
        <span className="text-sm text-green-700 dark:text-green-300">
          {result.completed}개 항목이 프로필에 반영되었어요
        </span>
      </div>
    )
  }

  // Error state
  if (cardState === 'error') {
    return (
      <div className="my-1 flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900 dark:bg-red-950">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
          <span className="text-sm text-red-700 dark:text-red-300">
            {result.completed}개 완료, {result.failed}개 실패
          </span>
        </div>
        <button
          onClick={() => setCardState('idle')}
          className="flex-shrink-0 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900"
        >
          다시 시도
        </button>
      </div>
    )
  }

  return (
    <div className="my-1 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-2">
        <User className="h-3.5 w-3.5 text-[var(--color-text-secondary)]" />
        <span className="text-xs font-medium text-[var(--color-text-secondary)]">프로필 제안</span>
      </div>

      {/* Trait list */}
      <div className="max-h-[300px] overflow-y-auto">
        {traits.map((trait, index) => {
          const isUpdate =
            trait.existing_trait_id && existingTraits?.some((e) => e.id === trait.existing_trait_id)

          return (
            <button
              key={index}
              onClick={() => toggleTrait(index)}
              disabled={cardState !== 'idle'}
              className="flex w-full items-start gap-2.5 border-b border-[var(--color-border)] px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-[var(--color-bg-secondary)]"
            >
              <Checkbox checked={trait._checked} disabled={cardState !== 'idle'} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'text-xs font-medium',
                      trait._checked
                        ? 'text-[var(--color-text-primary)]'
                        : 'text-[var(--color-text-quaternary)]'
                    )}
                  >
                    {trait.label}:
                  </span>
                  <span
                    className={cn(
                      'flex-1 truncate text-xs',
                      trait._checked
                        ? 'text-[var(--color-text-primary)]'
                        : 'text-[var(--color-text-quaternary)]'
                    )}
                  >
                    {trait.value}
                  </span>
                  {isUpdate && (
                    <span className="flex-shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                      업데이트
                    </span>
                  )}
                  {!isUpdate && (
                    <span className="flex-shrink-0 rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-medium text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                      새로운
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-[var(--color-text-tertiary)]">
                  {trait.reason}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[var(--color-border)] px-3 py-2">
        {cardState === 'applying' ? (
          <div className="flex flex-1 items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--color-primary-500)]" />
            <span className="text-[10px] text-[var(--color-text-tertiary)]">
              프로필에 추가하는 중...
            </span>
          </div>
        ) : (
          <>
            <div className="flex flex-col">
              <span className="text-[10px] text-[var(--color-text-tertiary)]">
                {checkedCount}개 선택됨
              </span>
              {wouldExceed && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400">
                  프로필 항목이 {MAX_TRAITS}개를 초과해요
                </span>
              )}
            </div>
            <button
              onClick={handleApply}
              disabled={checkedCount === 0 || wouldExceed}
              className="flex items-center gap-1 rounded-lg bg-[var(--color-primary-500)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--color-primary-600)] disabled:opacity-40"
            >
              <Check className="h-3 w-3" />
              추가하기
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function Checkbox({ checked, disabled }: { checked: boolean; disabled?: boolean }) {
  return (
    <span
      role="checkbox"
      aria-checked={checked}
      aria-disabled={disabled}
      className={cn(
        'mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors',
        checked
          ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-500)] text-white'
          : 'border-[var(--color-border)] bg-[var(--color-bg-primary)]',
        disabled && 'opacity-50'
      )}
    >
      {checked && <Check className="h-3 w-3" />}
    </span>
  )
}
