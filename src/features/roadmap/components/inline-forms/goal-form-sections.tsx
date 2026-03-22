import { AnimatePresence } from 'framer-motion'
import { Target, Heart, Calendar } from 'lucide-react'
import { AnimatedCollapse } from '@/features/roadmap/components/shared/animated-collapse'
import { SampleChips } from '@/features/roadmap/components/shared/sample-chips'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { DatePicker } from '@/components/ui/date-picker'
import { AiSuggestionPanel } from '@/components/common/ai-suggestion-panel'
import type { FieldValues, UseFormReturn } from 'react-hook-form'
import type { AiSuggestionItem } from '@/lib/ai/types'

// ---------------------------------------------------------------------------
// Shared AI panel props
// ---------------------------------------------------------------------------

interface AiPanelProps {
  isLoading: boolean
  error: Error | null
  suggestions: AiSuggestionItem[]
}

// ---------------------------------------------------------------------------
// GoalNameSection
// ---------------------------------------------------------------------------

interface GoalNameSectionProps<T extends FieldValues> {
  form: UseFormReturn<T>
  currentName: string
  sampleGoals: string[]
  goalAi: AiPanelProps
  goalAiSuggestions: AiSuggestionItem[]
  onGoalGenerate: () => void
  idPrefix?: string
}

export function GoalNameSection<T extends FieldValues>({
  form,
  currentName,
  sampleGoals,
  goalAi,
  goalAiSuggestions,
  onGoalGenerate,
  idPrefix = 'goal-name',
}: GoalNameSectionProps<T>) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={idPrefix} className="flex items-center gap-1.5 text-xs">
          <Target className="h-3.5 w-3.5 text-[var(--color-primary-500)]" />
          목표 이름
        </Label>
        <Input
          id={idPrefix}
          placeholder="예: 10km 달리기 완주"
          autoFocus={!idPrefix.startsWith('edit-')}
          {...form.register('name' as never)}
        />
        {form.formState.errors.name && (
          <p className="text-xs text-[var(--color-miss)]">
            {form.formState.errors.name.message as string}
          </p>
        )}
        <SampleChips
          items={sampleGoals}
          selectedValue={currentName ?? ''}
          onToggle={(val) =>
            form.setValue('name' as never, (currentName === val ? '' : val) as never, {
              shouldValidate: true,
            })
          }
        />
      </div>

      <AiSuggestionPanel
        triggerLabel="AI로 목표 추천받기"
        isLoading={goalAi.isLoading}
        error={goalAi.error}
        suggestions={goalAiSuggestions}
        selectedValue={currentName}
        showDescriptions
        onSelect={(s) => form.setValue('name' as never, s.text as never, { shouldValidate: true })}
        onGenerate={onGoalGenerate}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// GoalWhySection
// ---------------------------------------------------------------------------

interface GoalWhySectionProps<T extends FieldValues> {
  form: UseFormReturn<T>
  currentWhy: string
  sampleWhys: string[]
  whyAi: AiPanelProps
  onWhyGenerate: () => void
  idPrefix?: string
}

export function GoalWhySection<T extends FieldValues>({
  form,
  currentWhy,
  sampleWhys,
  whyAi,
  onWhyGenerate,
  idPrefix = 'goal-why',
}: GoalWhySectionProps<T>) {
  return (
    <div className="space-y-2 rounded-lg bg-[var(--color-primary-50)]/40 p-2.5">
      <Label
        htmlFor={idPrefix}
        className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-primary-600)]"
      >
        <Heart className="h-3.5 w-3.5" />이 목표, 왜 중요한가요? (선택)
      </Label>
      <Input
        id={idPrefix}
        placeholder="이유나 달성 후 기대하는 변화를 적어보세요"
        value={currentWhy}
        onChange={(e) => form.setValue('why' as never, e.target.value as never)}
      />
      <SampleChips
        items={sampleWhys}
        selectedValue={currentWhy}
        onToggle={(val) => form.setValue('why' as never, (currentWhy === val ? '' : val) as never)}
      />
      <AiSuggestionPanel
        triggerLabel="AI 도움받기"
        isLoading={whyAi.isLoading}
        error={whyAi.error}
        suggestions={whyAi.suggestions}
        selectedValue={currentWhy}
        onSelect={(s) => form.setValue('why' as never, s.text as never)}
        onGenerate={onWhyGenerate}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// GoalPeriodSection
// ---------------------------------------------------------------------------

interface GoalPeriodSectionProps<T extends FieldValues> {
  form: UseFormReturn<T>
  hasPeriod: boolean
  startDate: string | undefined
  targetDate: string | undefined
  idPrefix?: string
}

export function GoalPeriodSection<T extends FieldValues>({
  form,
  hasPeriod,
  startDate,
  targetDate,
  idPrefix = 'goal-period',
}: GoalPeriodSectionProps<T>) {
  return (
    <div className="rounded-lg bg-[var(--color-bg-secondary)] px-3 py-2.5">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor={idPrefix} className="mb-0 flex items-center gap-1.5 text-xs">
            <Calendar className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
            기간 설정
          </Label>
          <p className="ml-5 text-[10px] text-[var(--color-text-tertiary)]">
            기간이 있으면 흐름을 잡는 데 도움돼요
          </p>
        </div>
        <Switch
          id={idPrefix}
          checked={hasPeriod}
          onCheckedChange={(checked) => {
            if (!checked) {
              form.setValue('start_date' as never, undefined as never)
              form.setValue('target_date' as never, undefined as never)
            } else {
              form.setValue('target_date' as never, new Date().toISOString().split('T')[0] as never)
            }
          }}
        />
      </div>
      <AnimatePresence>
        {hasPeriod && (
          <AnimatedCollapse>
            <div className="mt-2 ml-5 flex gap-2">
              <DatePicker
                value={startDate}
                onChange={(date) =>
                  form.setValue('start_date' as never, (date ?? undefined) as never)
                }
                compact
                placeholder="시작일"
              />
              <DatePicker
                value={targetDate}
                onChange={(date) =>
                  form.setValue('target_date' as never, (date ?? undefined) as never)
                }
                compact
                placeholder="목표일"
              />
            </div>
          </AnimatedCollapse>
        )}
      </AnimatePresence>
    </div>
  )
}

// Backward-compat alias
export const GoalDeadlineSection = GoalPeriodSection
