'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { ResponsiveModal, ModalBody, ModalFooter } from '@/components/ui/responsive-modal'
import { Button } from '@/components/ui/button'
import { getExportPreview, exportTasksToGoogleCalendar } from '@/actions/google-calendar.actions'
import type { ExportScope, ExportPreviewTask } from '@/actions/google-calendar.actions'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface GoogleCalendarExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentDate: Date
}

type ModalPhase = 'preview' | 'exporting' | 'result'

interface ExportResultData {
  created: number
  updated: number
  failed: number
  failedTasks: Array<{ name: string; error: string }>
}

const SCOPE_OPTIONS: Array<{ value: ExportScope; label: string }> = [
  { value: 'today', label: '오늘' },
  { value: 'week', label: '이번 주' },
  { value: 'all', label: '전체' },
]

export function GoogleCalendarExportModal({
  open,
  onOpenChange,
  currentDate,
}: GoogleCalendarExportModalProps) {
  const [scope, setScope] = useState<ExportScope>('today')
  const [phase, setPhase] = useState<ModalPhase>('preview')
  const [previewTasks, setPreviewTasks] = useState<ExportPreviewTask[]>([])
  const [newCount, setNewCount] = useState(0)
  const [updateCount, setUpdateCount] = useState(0)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [result, setResult] = useState<ExportResultData | null>(null)

  const dateStr = format(currentDate, 'yyyy-MM-dd')

  // Fetch preview when scope changes or modal opens
  useEffect(() => {
    if (!open) return
    setPhase('preview')
    setResult(null)
    fetchPreview(scope)
  }, [open, scope, dateStr]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPreview = async (selectedScope: ExportScope) => {
    setIsLoadingPreview(true)
    try {
      const res = await getExportPreview(selectedScope, dateStr)
      if (res.success) {
        setPreviewTasks(res.data.tasks)
        setNewCount(res.data.newCount)
        setUpdateCount(res.data.updateCount)
      } else {
        setPreviewTasks([])
        setNewCount(0)
        setUpdateCount(0)
      }
    } catch {
      setPreviewTasks([])
      setNewCount(0)
      setUpdateCount(0)
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const handleExport = async () => {
    setPhase('exporting')
    try {
      const res = await exportTasksToGoogleCalendar(scope, dateStr)
      if (res.success) {
        setResult(res.data)
      } else {
        setResult({ created: 0, updated: 0, failed: previewTasks.length, failedTasks: [] })
      }
    } catch {
      setResult({ created: 0, updated: 0, failed: previewTasks.length, failedTasks: [] })
    } finally {
      setPhase('result')
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(() => {
      setScope('today')
      setPhase('preview')
      setResult(null)
      setPreviewTasks([])
    }, 300)
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={handleClose}
      title={phase === 'result' ? '내보내기 완료' : 'Google Calendar 내보내기'}
    >
      {phase === 'result' && result ? (
        <>
          <ModalBody>
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-6 py-4">
                {result.created > 0 && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[var(--color-done)]">{result.created}</p>
                    <p className="text-xs text-[var(--color-text-tertiary)]">새로 추가</p>
                  </div>
                )}
                {result.updated > 0 && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[var(--color-primary-500)]">
                      {result.updated}
                    </p>
                    <p className="text-xs text-[var(--color-text-tertiary)]">업데이트</p>
                  </div>
                )}
                {result.failed > 0 && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[var(--color-miss)]">{result.failed}</p>
                    <p className="text-xs text-[var(--color-text-tertiary)]">실패</p>
                  </div>
                )}
                {result.created === 0 && result.updated === 0 && result.failed === 0 && (
                  <p className="text-sm text-[var(--color-text-tertiary)]">내보낼 Task가 없어요</p>
                )}
              </div>

              {result.failedTasks.length > 0 && (
                <div className="space-y-1.5 rounded-lg bg-[var(--color-miss-bg)] p-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-miss)]">
                    <AlertCircle className="h-3.5 w-3.5" />
                    실패한 항목
                  </p>
                  {result.failedTasks.map((ft, i) => (
                    <p key={i} className="text-xs text-[var(--color-text-secondary)]">
                      {ft.name} — {ft.error}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="primary" className="flex-1" onClick={handleClose}>
              확인
            </Button>
          </ModalFooter>
        </>
      ) : (
        <>
          <ModalBody>
            <div className="space-y-4">
              {/* Scope selector */}
              <div className="flex gap-1 rounded-lg bg-[var(--color-bg-secondary)] p-1">
                {SCOPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setScope(opt.value)}
                    className={cn(
                      'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      scope === opt.value
                        ? 'bg-white text-[var(--color-text-primary)] shadow-sm dark:bg-[var(--color-bg-primary)]'
                        : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Preview list */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-[var(--color-text-tertiary)]">미리보기</p>
                  {!isLoadingPreview && previewTasks.length > 0 && (
                    <p className="text-xs text-[var(--color-text-tertiary)]">
                      총 {previewTasks.length}개
                      {newCount > 0 && (
                        <span className="text-[var(--color-done)]"> (새로 {newCount})</span>
                      )}
                      {updateCount > 0 && <span> (업데이트 {updateCount})</span>}
                    </p>
                  )}
                </div>

                {isLoadingPreview ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-[var(--color-text-tertiary)]" />
                  </div>
                ) : previewTasks.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-[var(--color-text-tertiary)]">
                      내보낼 Task가 없어요
                    </p>
                  </div>
                ) : (
                  <div className="max-h-60 space-y-0.5 overflow-y-auto">
                    {previewTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between rounded-lg px-3 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          {task.areaEmoji && (
                            <span className="flex-shrink-0 text-sm">{task.areaEmoji}</span>
                          )}
                          <span className="truncate text-sm text-[var(--color-text-primary)]">
                            {task.name}
                          </span>
                        </div>
                        <span
                          className={cn(
                            'flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                            task.isNew
                              ? 'bg-[var(--color-done-bg)] text-[var(--color-done)]'
                              : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)]'
                          )}
                        >
                          {task.isNew ? '새로 추가' : '업데이트'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" className="flex-1" onClick={handleClose}>
              취소
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleExport}
              disabled={phase === 'exporting' || isLoadingPreview || previewTasks.length === 0}
              isLoading={phase === 'exporting'}
            >
              내보내기
            </Button>
          </ModalFooter>
        </>
      )}
    </ResponsiveModal>
  )
}
