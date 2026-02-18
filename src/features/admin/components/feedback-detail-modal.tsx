'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ResponsiveModal, ModalBody, ModalFooter } from '@/components/ui/responsive-modal'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { useUpdateFeedbackStatus } from '../hooks'
import type { Feedback, FeedbackStatus } from '@/repositories/feedback.repository'

interface FeedbackDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  feedback: Feedback | null
}

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  pending: '대기중',
  reviewed: '검토됨',
  resolved: '해결됨',
}

const CATEGORY_LABELS: Record<string, string> = {
  bug: '버그',
  feature: '기능 요청',
  improvement: '개선',
  general: '일반',
  other: '기타',
}

export function FeedbackDetailModal({ open, onOpenChange, feedback }: FeedbackDetailModalProps) {
  const updateStatus = useUpdateFeedbackStatus()
  const [status, setStatus] = useState<FeedbackStatus>(feedback?.status ?? 'pending')
  const [adminNote, setAdminNote] = useState(feedback?.admin_note ?? '')

  // Sync local state when feedback changes
  if (feedback && status !== feedback.status && !updateStatus.isPending) {
    setStatus(feedback.status)
    setAdminNote(feedback.admin_note ?? '')
  }

  function handleSave() {
    if (!feedback) return
    updateStatus.mutate(
      { id: feedback.id, input: { status, admin_note: adminNote || undefined } },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  if (!feedback) return null

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} title="피드백 상세">
      <ModalBody>
        {/* Category & Date */}
        <div className="flex items-center gap-2 text-sm">
          <span className="rounded-full bg-[var(--color-bg-tertiary)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-secondary)]">
            {CATEGORY_LABELS[feedback.category] ?? feedback.category}
          </span>
          <span className="text-xs text-[var(--color-text-tertiary)]">
            {format(new Date(feedback.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}
          </span>
        </div>

        {/* User */}
        {feedback.user?.email && (
          <p className="text-sm text-[var(--color-text-secondary)]">
            작성자: {feedback.user.email}
          </p>
        )}

        {/* Content */}
        <div className="rounded-xl bg-[var(--color-bg-secondary)] p-4">
          <p className="text-sm whitespace-pre-wrap text-[var(--color-text-primary)]">
            {feedback.content}
          </p>
        </div>

        {/* Status */}
        <div>
          <Label>상태 변경</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as FeedbackStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">{STATUS_LABELS.pending}</SelectItem>
              <SelectItem value="reviewed">{STATUS_LABELS.reviewed}</SelectItem>
              <SelectItem value="resolved">{STATUS_LABELS.resolved}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Admin Note */}
        <div>
          <Label htmlFor="admin-note">관리자 메모</Label>
          <Textarea
            id="admin-note"
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder="내부 메모를 입력하세요..."
            className="min-h-[80px]"
          />
        </div>
      </ModalBody>

      <ModalFooter>
        <Button
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={() => onOpenChange(false)}
        >
          닫기
        </Button>
        <Button
          size="sm"
          className="flex-1"
          onClick={handleSave}
          isLoading={updateStatus.isPending}
        >
          저장
        </Button>
      </ModalFooter>
    </ResponsiveModal>
  )
}
