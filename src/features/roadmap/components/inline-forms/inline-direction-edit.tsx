'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SampleChips } from '@/features/roadmap/components/shared/sample-chips'
import { Input } from '@/components/ui/input'
import { useUpdateDirection } from '@/queries/use-direction'
import { SAMPLE_DIRECTION_STATEMENTS, SAMPLE_DIRECTION_WHYS } from '@/lib/constants/onboarding'
import { toast } from 'sonner'

const directionSchema = z.object({
  statement: z.string().min(1, '방향을 입력해주세요').max(200),
  why: z.string().max(500).optional(),
})

interface InlineDirectionEditProps {
  directionId: string
  currentStatement: string
  currentWhy?: string | null
  onDone: () => void
}

export function InlineDirectionEdit({
  directionId,
  currentStatement,
  currentWhy,
  onDone,
}: InlineDirectionEditProps) {
  const updateDirection = useUpdateDirection()

  const form = useForm<z.infer<typeof directionSchema>>({
    resolver: zodResolver(directionSchema),
    defaultValues: {
      statement: currentStatement,
      why: currentWhy || '',
    },
  })

  const handleSubmit = (values: z.infer<typeof directionSchema>) => {
    updateDirection.mutate(
      {
        id: directionId,
        input: {
          statement: values.statement,
          why: values.why || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success('방향이 수정되었어요')
          onDone()
        },
      }
    )
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="space-y-3 border-t border-[var(--color-border)] px-3 py-3"
    >
      <div className="space-y-1.5">
        <Input placeholder="나의 방향..." className="text-sm" {...form.register('statement')} />
        {form.formState.errors.statement && (
          <p className="text-xs text-[var(--color-miss)]">
            {form.formState.errors.statement.message}
          </p>
        )}
        <SampleChips
          items={SAMPLE_DIRECTION_STATEMENTS}
          selectedValue={form.watch('statement')}
          onToggle={(val) =>
            form.setValue('statement', form.getValues('statement') === val ? '' : val)
          }
        />
      </div>
      <Input placeholder="왜 이 방향인가요? (선택)" className="text-sm" {...form.register('why')} />
      <SampleChips
        items={SAMPLE_DIRECTION_WHYS}
        selectedValue={form.watch('why') ?? ''}
        onToggle={(val) => form.setValue('why', form.getValues('why') === val ? '' : val)}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="flex-1 gap-1"
          onClick={onDone}
        >
          <X className="h-3.5 w-3.5" />
          취소
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          className="flex-1 gap-1"
          isLoading={updateDirection.isPending}
        >
          <Check className="h-3.5 w-3.5" />
          저장
        </Button>
      </div>
    </form>
  )
}
