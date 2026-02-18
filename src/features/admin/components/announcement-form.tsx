'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'

export interface AnnouncementFormData {
  title: string
  content: string
  type: 'info' | 'update' | 'event'
  expires_at: string | null
}

interface AnnouncementFormProps {
  initialData?: Partial<AnnouncementFormData>
  onSubmit: (data: AnnouncementFormData) => void
  onCancel: () => void
  isLoading?: boolean
}

export function AnnouncementForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}: AnnouncementFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [content, setContent] = useState(initialData?.content ?? '')
  const [type, setType] = useState<'info' | 'update' | 'event'>(initialData?.type ?? 'info')
  const [expiresAt, setExpiresAt] = useState(initialData?.expires_at ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    onSubmit({
      title: title.trim(),
      content: content.trim(),
      type,
      expires_at: expiresAt || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="announcement-title">제목</Label>
        <Input
          id="announcement-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="공지 제목을 입력하세요"
          required
        />
      </div>

      <div>
        <Label htmlFor="announcement-content">내용</Label>
        <Textarea
          id="announcement-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="공지 내용을 입력하세요"
          required
        />
      </div>

      <div>
        <Label>유형</Label>
        <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="info">안내</SelectItem>
            <SelectItem value="update">업데이트</SelectItem>
            <SelectItem value="event">이벤트</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="announcement-expires">만료일 (선택)</Label>
        <Input
          id="announcement-expires"
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          취소
        </Button>
        <Button
          type="submit"
          size="sm"
          isLoading={isLoading}
          disabled={!title.trim() || !content.trim()}
        >
          {initialData ? '수정' : '등록'}
        </Button>
      </div>
    </form>
  )
}
