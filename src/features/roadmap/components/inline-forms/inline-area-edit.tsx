'use client'

import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { InlineFormShell } from '@/features/roadmap/components/shared/inline-form-shell'
import { InlineFormActions } from '@/features/roadmap/components/shared/inline-form-actions'
import { Input } from '@/components/ui/input'
import { SampleChips } from '@/features/roadmap/components/shared/sample-chips'
import { EmojiPicker } from '@/components/common/emoji-picker'
import { AiSuggestionPanel } from '@/components/common/ai-suggestion-panel'
import { AREA_COLOR_PRESETS, SAMPLE_AREA_WHYS } from '@/lib/constants/onboarding'
import { useUpdateArea } from '@/queries/use-areas'
import { useDirection } from '@/queries/use-direction'
import { useAiWhySuggestions } from '@/hooks/use-ai-why-suggestions'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Area, AreaType } from '@/types/entities'

const areaEditSchema = z.object({
  name: z.string().min(1, '영역 이름을 입력해주세요').max(50),
  emoji: z.string().min(1, '이모지를 선택해주세요').max(4),
  color: z.string().min(1),
  why: z.string().max(500).optional(),
})

interface InlineAreaEditProps {
  area: Area
  onDone: () => void
}

export function InlineAreaEdit({ area, onDone }: InlineAreaEditProps) {
  const updateArea = useUpdateArea()
  const { data: direction } = useDirection()
  const aiWhy = useAiWhySuggestions({ target: 'area-why' })

  const areaType = (area.type ?? 'custom') as AreaType
  const sampleWhys = SAMPLE_AREA_WHYS[areaType] ?? []

  const handleWhyGenerate = () => {
    aiWhy.generate({
      direction: direction?.statement,
      areaName: area.name,
      areaType: area.type,
    })
  }

  const form = useForm<z.infer<typeof areaEditSchema>>({
    resolver: zodResolver(areaEditSchema),
    defaultValues: {
      name: area.name,
      emoji: area.emoji,
      color: area.color,
      why: area.why || '',
    },
  })

  const selectedEmoji = useWatch({ control: form.control, name: 'emoji' })
  const selectedColor = useWatch({ control: form.control, name: 'color' })
  const currentWhy = useWatch({ control: form.control, name: 'why' }) ?? ''

  const handleSubmit = (values: z.infer<typeof areaEditSchema>) => {
    updateArea.mutate(
      {
        id: area.id,
        input: {
          name: values.name,
          emoji: values.emoji,
          color: values.color,
          why: values.why || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success('영역이 수정되었어요')
          onDone()
        },
      }
    )
  }

  return (
    <InlineFormShell
      onSubmit={form.handleSubmit(handleSubmit)}
      mode="edit"
      title="영역 수정"
      className="mb-3"
    >
      <div className="flex items-end gap-3">
        <div className="space-y-1">
          <span className="text-xs text-[var(--color-text-tertiary)]">이모지</span>
          <EmojiPicker
            value={selectedEmoji}
            onSelect={(emoji) => form.setValue('emoji', emoji, { shouldDirty: true })}
          />
        </div>
        <div className="flex-1 space-y-1.5">
          <Input placeholder="영역 이름" className="text-sm" {...form.register('name')} />
          {form.formState.errors.name && (
            <p className="text-xs text-[var(--color-miss)]">{form.formState.errors.name.message}</p>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <span className="text-xs text-[var(--color-text-tertiary)]">색상</span>
        <div className="flex flex-wrap gap-2">
          {AREA_COLOR_PRESETS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => form.setValue('color', color, { shouldDirty: true })}
              className={cn(
                'h-7 w-7 rounded-full border-2 transition-all',
                selectedColor === color
                  ? 'scale-110 border-[var(--color-text-primary)]'
                  : 'border-transparent'
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Input
          placeholder="이 영역이 왜 중요한가요? (선택)"
          className="text-sm"
          {...form.register('why')}
        />
        <SampleChips
          items={sampleWhys}
          selectedValue={currentWhy}
          onToggle={(val) =>
            form.setValue('why', currentWhy === val ? '' : val, { shouldDirty: true })
          }
        />
        <AiSuggestionPanel
          triggerLabel="AI 도움받기"
          isLoading={aiWhy.isLoading}
          error={aiWhy.error}
          suggestions={aiWhy.suggestions}
          selectedValue={currentWhy}
          onSelect={(s) => form.setValue('why', s.text, { shouldDirty: true })}
          onGenerate={handleWhyGenerate}
        />
      </div>
      <InlineFormActions onCancel={onDone} isPending={updateArea.isPending} submitLabel="저장" />
    </InlineFormShell>
  )
}
