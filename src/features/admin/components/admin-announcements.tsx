'use client'

import { useState, useCallback } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react'
import {
  useAdminAnnouncements,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
} from '../hooks'
import { AnnouncementForm, type AnnouncementFormData } from './announcement-form'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const TYPE_LABELS: Record<string, string> = {
  info: '안내',
  update: '업데이트',
  event: '이벤트',
}

const TYPE_COLORS: Record<string, string> = {
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  update: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  event: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

export function AdminAnnouncements() {
  const { data: announcements, isLoading } = useAdminAnnouncements()
  const createAnnouncement = useCreateAnnouncement()
  const updateAnnouncement = useUpdateAnnouncement()
  const deleteAnnouncement = useDeleteAnnouncement()

  const [showForm, setShowForm] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const handleCreate = useCallback(
    (data: AnnouncementFormData) => {
      createAnnouncement.mutate(data, {
        onSuccess: () => setShowForm(false),
      })
    },
    [createAnnouncement]
  )

  const handleToggleActive = useCallback(
    (id: string, isActive: boolean) => {
      updateAnnouncement.mutate({ id, input: { is_active: !isActive } })
    },
    [updateAnnouncement]
  )

  const handleDelete = useCallback(
    (id: string) => {
      deleteAnnouncement.mutate(id, {
        onSuccess: () => setDeleteConfirmId(null),
      })
    },
    [deleteAnnouncement]
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">공지사항 관리</h1>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="mr-1.5 h-4 w-4" />새 공지 작성
          </Button>
        )}
      </div>

      {/* Create Form */}
      {showForm && (
        <Card padding="lg">
          <h3 className="mb-4 text-base font-semibold text-[var(--color-text-primary)]">
            새 공지 작성
          </h3>
          <AnnouncementForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            isLoading={createAnnouncement.isPending}
          />
        </Card>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : !announcements?.length ? (
        <Card padding="lg" className="flex items-center justify-center py-16">
          <p className="text-sm text-[var(--color-text-tertiary)]">아직 공지사항이 없습니다.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((ann) => (
            <Card key={ann.id} padding="md">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {/* Type Badge */}
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                        TYPE_COLORS[ann.type] ?? TYPE_COLORS.info
                      )}
                    >
                      {TYPE_LABELS[ann.type] ?? ann.type}
                    </span>

                    {/* Active Badge */}
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                        ann.is_active
                          ? 'bg-[var(--color-done)]/10 text-[var(--color-done)]'
                          : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]'
                      )}
                    >
                      {ann.is_active ? '활성' : '비활성'}
                    </span>
                  </div>

                  <h3 className="mt-1.5 text-sm font-semibold text-[var(--color-text-primary)]">
                    {ann.title}
                  </h3>
                  <p className="mt-0.5 line-clamp-2 text-xs text-[var(--color-text-secondary)]">
                    {ann.content}
                  </p>
                  <p className="mt-1.5 text-xs text-[var(--color-text-tertiary)]">
                    {format(new Date(ann.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}
                    {ann.expires_at && (
                      <span className="ml-2">
                        만료: {format(new Date(ann.expires_at), 'yyyy.MM.dd', { locale: ko })}
                      </span>
                    )}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(ann.id, ann.is_active)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-bg-hover)]"
                    title={ann.is_active ? '비활성화' : '활성화'}
                  >
                    {ann.is_active ? (
                      <EyeOff className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                    ) : (
                      <Eye className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                    )}
                  </button>

                  {deleteConfirmId === ann.id ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(ann.id)}
                        isLoading={deleteAnnouncement.isPending}
                      >
                        삭제
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setDeleteConfirmId(null)}
                      >
                        취소
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(ann.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-bg-hover)]"
                      title="삭제"
                    >
                      <Trash2 className="h-4 w-4 text-[var(--color-miss)]" />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
