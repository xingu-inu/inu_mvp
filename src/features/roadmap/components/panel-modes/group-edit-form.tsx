'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Edit2, Trash2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PanelFormShell } from '@/features/roadmap/components/shared/panel-form-shell'
import { PanelLoadingSpinner } from '@/features/roadmap/components/shared/panel-loading-spinner'
import {
  useGroupsByGoal,
  useUpdateGroup,
  useDeleteGroup,
  useToggleGroupComplete,
} from '@/queries/use-groups'
import { useRoadmapStore, selectSelection, selectGoalId } from '@/stores/roadmap.store'
import { toast } from 'sonner'

const updateGroupFormSchema = z.object({
  name: z.string().min(1, '그룹 이름을 입력해주세요').max(100),
  description: z.string().max(500).optional(),
})

type UpdateGroupFormSchema = z.infer<typeof updateGroupFormSchema>

interface GroupEditFormProps {
  groupId?: string
}

export function GroupEditForm({ groupId: propGroupId }: GroupEditFormProps) {
  const selection = useRoadmapStore(selectSelection)
  const storeGoalId = useRoadmapStore(selectGoalId)
  const setPanelMode = useRoadmapStore((s) => s.setPanelMode)
  const select = useRoadmapStore((s) => s.select)
  const groupId = propGroupId || (selection.type === 'group' ? selection.id : null)
  const goalId = storeGoalId || ''

  const [isEditing, setIsEditing] = useState(false)

  const { data: groups = [], isLoading } = useGroupsByGoal(goalId)
  const group = groups.find((g) => g.id === groupId)
  const updateGroup = useUpdateGroup()
  const deleteGroup = useDeleteGroup()
  const toggleComplete = useToggleGroupComplete()

  const form = useForm<UpdateGroupFormSchema>({
    resolver: zodResolver(updateGroupFormSchema),
    defaultValues: {
      name: group?.name || '',
      description: group?.description || '',
    },
  })

  // Reset form when group data changes
  useEffect(() => {
    if (group) {
      form.reset({
        name: group.name,
        description: group.description || '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.id, group?.name, group?.description])

  const handleBack = () => {
    if (goalId) {
      select({ type: 'goal', id: goalId })
    } else {
      setPanelMode('view')
    }
  }

  const handleToggleComplete = () => {
    if (!group) return
    toggleComplete.mutate(
      { id: group.id, goalId, isCompleted: !group.is_completed },
      {
        onSuccess: (data) => {
          toast.success(data.is_completed ? '그룹을 완료했습니다' : '그룹을 다시 활성화했습니다')
        },
      }
    )
  }

  const handleDelete = () => {
    if (!group) return

    if (confirm('이 그룹을 삭제하시겠습니까? 연결된 할 일들은 목표에 직접 연결됩니다.')) {
      deleteGroup.mutate(
        { id: group.id, goalId },
        {
          onSuccess: () => {
            toast.success('그룹이 삭제되었어요')
            handleBack()
          },
        }
      )
    }
  }

  const handleSubmit = (values: UpdateGroupFormSchema) => {
    if (!group) return

    updateGroup.mutate(
      {
        id: group.id,
        goalId,
        input: {
          name: values.name,
          description: values.description || undefined,
        },
      },
      {
        onSuccess: () => {
          setIsEditing(false)
          toast.success('그룹이 수정되었어요')
        },
      }
    )
  }

  if (isLoading || !group) {
    return <PanelLoadingSpinner />
  }

  if (isEditing) {
    return (
      <PanelFormShell
        title="그룹 수정"
        onSubmit={form.handleSubmit(handleSubmit)}
        onCancel={() => setIsEditing(false)}
        isPending={updateGroup.isPending}
      >
        <div className="space-y-2">
          <Label htmlFor="group-name">그룹 이름</Label>
          <Input id="group-name" {...form.register('name')} />
          {form.formState.errors.name && (
            <p className="text-sm text-[var(--color-miss)]">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="group-desc">설명 (선택)</Label>
          <Input
            id="group-desc"
            placeholder="이 그룹에서 달성할 것..."
            {...form.register('description')}
          />
        </div>
      </PanelFormShell>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-bold">{group.name}</h2>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 text-[var(--color-miss)]" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Description */}
        {group.description && (
          <div>
            <h3 className="mb-1 text-sm font-medium text-[var(--color-text-secondary)]">설명</h3>
            <p>{group.description}</p>
          </div>
        )}

        {/* Completion Status */}
        <div>
          <h3 className="mb-2 text-sm font-medium text-[var(--color-text-secondary)]">상태</h3>
          <Button
            variant={group.is_completed ? 'secondary' : 'primary'}
            size="sm"
            onClick={handleToggleComplete}
            disabled={toggleComplete.isPending}
          >
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            {group.is_completed ? '완료됨 — 되돌리기' : '완료로 표시'}
          </Button>
        </div>
      </div>

      {/* Close Button */}
      <div className="border-t border-[var(--color-border)] p-4">
        <Button variant="secondary" className="w-full" onClick={handleBack}>
          뒤로
        </Button>
      </div>
    </div>
  )
}
