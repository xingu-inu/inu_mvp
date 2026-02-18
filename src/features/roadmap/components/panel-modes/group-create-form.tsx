'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateGroup } from '@/queries/use-groups'
import { useRoadmapStore, selectGoalId } from '@/stores/roadmap.store'
import { createGroupSchema } from '@/lib/validations'
import type { CreateGroupInput } from '@/types/entities'

type FormValues = CreateGroupInput

interface GroupCreateFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function GroupCreateForm({ onSuccess, onCancel }: GroupCreateFormProps) {
  const selectedGoalId = useRoadmapStore(selectGoalId)
  const setPanelMode = useRoadmapStore((s) => s.setPanelMode)
  const createGroup = useCreateGroup()

  const form = useForm<FormValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      goal_id: '',
      name: '',
      description: '',
    },
  })

  // selectedGoalId가 변경될 때 form 업데이트
  useEffect(() => {
    if (selectedGoalId) {
      form.setValue('goal_id', selectedGoalId)
    }
  }, [selectedGoalId, form])

  const handleSubmit = (values: FormValues) => {
    createGroup.mutate(
      {
        ...values,
        description: values.description || undefined,
      },
      {
        onSuccess: () => {
          form.reset()
          setPanelMode('view')
          onSuccess?.()
        },
      }
    )
  }

  const handleCancel = () => {
    form.reset()
    setPanelMode('view')
    onCancel?.()
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] p-4">
        <Button variant="ghost" size="icon" onClick={handleCancel}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-bold">새 그룹 추가</h2>
      </div>

      {/* Form Content */}
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="group-name">그룹 이름</Label>
            <Input id="group-name" placeholder="예: 기초 체력 만들기" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-sm text-[var(--color-miss)]">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="group-description">설명 (선택)</Label>
            <Input
              id="group-description"
              placeholder="예: 이 그룹에서 달성할 것들"
              {...form.register('description')}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-[var(--color-border)] p-4">
          <Button type="button" variant="secondary" className="flex-1" onClick={handleCancel}>
            취소
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            isLoading={createGroup.isPending}
          >
            추가하기
          </Button>
        </div>
      </form>
    </div>
  )
}
