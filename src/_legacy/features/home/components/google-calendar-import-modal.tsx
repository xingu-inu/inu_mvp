'use client'

import { useState, useEffect, useCallback } from 'react'
import { CalendarDays, Check, ChevronDown, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { ResponsiveModal, ModalBody, ModalFooter } from '@/components/ui/responsive-modal'
import { Button } from '@/components/ui/button'
import { getImportPreview, importGoogleEventsAsTasks } from '@/actions/google-calendar.actions'
import type { ExportScope, ImportPreviewEvent } from '@/actions/google-calendar.actions'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { queryKeys } from '@/lib/query/keys'

interface GoogleCalendarImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentDate: Date
}

type ModalPhase = 'preview' | 'importing' | 'result'

const SCOPE_OPTIONS: Array<{ value: ExportScope; label: string }> = [
  { value: 'today', label: '오늘' },
  { value: 'week', label: '이번 주' },
  { value: 'all', label: '전체' },
]

function EventCheckRow({
  event,
  checked,
  onToggle,
}: {
  event: ImportPreviewEvent
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-[var(--color-bg-secondary)]"
    >
      <div
        className={cn(
          'flex h-4.5 w-4.5 flex-shrink-0 items-center justify-center rounded border transition-colors',
          checked
            ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-500)]'
            : 'border-[var(--color-border)]'
        )}
      >
        {checked && <Check className="h-3 w-3 text-white" />}
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <CalendarDays
            className={cn(
              'h-3.5 w-3.5 flex-shrink-0',
              event.isInuEvent
                ? 'text-[var(--color-primary-500)]'
                : 'text-[var(--color-google-event)]'
            )}
          />
          <span
            className={cn(
              'truncate text-sm',
              checked ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)]'
            )}
          >
            {event.isInuEvent
              ? (event.linkedTaskName ?? event.summary.replace(/^\[inu]\s*/, ''))
              : event.summary}
          </span>
          {event.isInuEvent && (
            <span className="flex-shrink-0 rounded bg-[var(--color-primary-50)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-primary-500)] dark:bg-[var(--color-primary-500)]/10">
              inu
            </span>
          )}
        </div>
        <span className="ml-2 flex-shrink-0 rounded-full bg-[var(--color-bg-secondary)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-tertiary)]">
          {event.isAllDay ? '종일' : event.startTime}
        </span>
      </div>
    </button>
  )
}

export function GoogleCalendarImportModal({
  open,
  onOpenChange,
  currentDate,
}: GoogleCalendarImportModalProps) {
  const [scope, setScope] = useState<ExportScope>('week')
  const [phase, setPhase] = useState<ModalPhase>('preview')
  const [previewEvents, setPreviewEvents] = useState<ImportPreviewEvent[]>([])
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [inuExpanded, setInuExpanded] = useState(false)
  const queryClient = useQueryClient()

  const dateStr = format(currentDate, 'yyyy-MM-dd')

  const externalEvents = previewEvents.filter((e) => !e.isInuEvent)
  const inuEvents = previewEvents.filter((e) => e.isInuEvent)
  const activeCount = checkedIds.size

  const initCheckedIds = useCallback((events: ImportPreviewEvent[]) => {
    const ids = new Set<string>()
    for (const e of events) {
      if (!e.isInuEvent) ids.add(e.id)
    }
    setCheckedIds(ids)
  }, [])

  useEffect(() => {
    if (!open) return
    setPhase('preview')
    setImportedCount(0)
    setInuExpanded(false)
    fetchPreview(scope)
  }, [open, scope, dateStr]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPreview = async (selectedScope: ExportScope) => {
    setIsLoadingPreview(true)
    try {
      const res = await getImportPreview(selectedScope, dateStr)
      if (res.success) {
        setPreviewEvents(res.data.events)
        initCheckedIds(res.data.events)
      } else {
        setPreviewEvents([])
        setCheckedIds(new Set())
      }
    } catch {
      setPreviewEvents([])
      setCheckedIds(new Set())
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const handleToggle = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleImport = async () => {
    setPhase('importing')
    try {
      const selectedEvents = previewEvents
        .filter((e) => checkedIds.has(e.id) && !e.isInuEvent)
        .map(({ id, summary, startTime, dateStr, isAllDay, durationMinutes }) => ({
          id,
          summary,
          startTime,
          dateStr,
          isAllDay,
          durationMinutes,
        }))

      const res = await importGoogleEventsAsTasks({ events: selectedEvents })

      if (res.success) {
        setImportedCount(res.data.imported)
      } else {
        setImportedCount(0)
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
      await queryClient.invalidateQueries({ queryKey: queryKeys.googleCalendar.all })
    } catch {
      setImportedCount(0)
    } finally {
      setPhase('result')
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(() => {
      setScope('week')
      setPhase('preview')
      setPreviewEvents([])
      setImportedCount(0)
      setCheckedIds(new Set())
      setInuExpanded(false)
    }, 300)
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={handleClose}
      title={phase === 'result' ? '가져오기 완료' : 'Google Calendar 가져오기'}
      className="max-w-xl"
    >
      {phase === 'result' ? (
        <>
          <ModalBody>
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-6 py-4">
                {importedCount > 0 ? (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[var(--color-primary-500)]">
                      {importedCount}
                    </p>
                    <p className="text-xs text-[var(--color-text-tertiary)]">가져온 일정</p>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--color-text-tertiary)]">가져올 일정이 없어요</p>
                )}
              </div>
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

              {isLoadingPreview ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--color-text-tertiary)]" />
                </div>
              ) : previewEvents.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-[var(--color-text-tertiary)]">가져올 일정이 없어요</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* External events */}
                  {externalEvents.length > 0 && (
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between px-1 pb-1">
                        <p className="text-xs font-medium text-[var(--color-text-tertiary)]">
                          외부 일정
                        </p>
                        <p className="text-xs text-[var(--color-text-tertiary)]">
                          {externalEvents.filter((e) => checkedIds.has(e.id)).length}/
                          {externalEvents.length}
                        </p>
                      </div>
                      <div className="max-h-40 space-y-0.5 overflow-y-auto">
                        {externalEvents.map((event) => (
                          <EventCheckRow
                            key={event.id}
                            event={event}
                            checked={checkedIds.has(event.id)}
                            onToggle={() => handleToggle(event.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* inu events (collapsible) */}
                  {inuEvents.length > 0 && (
                    <div className="space-y-0.5">
                      <button
                        onClick={() => setInuExpanded((v) => !v)}
                        className="flex w-full items-center justify-between rounded-lg px-1 py-1 transition-colors hover:bg-[var(--color-bg-secondary)]"
                      >
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium text-[var(--color-text-tertiary)]">
                            inu에 이미 있는 일정
                          </p>
                          <span className="rounded-full bg-[var(--color-bg-secondary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-tertiary)]">
                            {inuEvents.filter((e) => checkedIds.has(e.id)).length}/
                            {inuEvents.length}
                          </span>
                        </div>
                        <ChevronDown
                          className={cn(
                            'h-3.5 w-3.5 text-[var(--color-text-tertiary)] transition-transform',
                            inuExpanded && 'rotate-180'
                          )}
                        />
                      </button>
                      {inuExpanded && (
                        <div className="max-h-32 space-y-0.5 overflow-y-auto">
                          {inuEvents.map((event) => (
                            <EventCheckRow
                              key={event.id}
                              event={event}
                              checked={checkedIds.has(event.id)}
                              onToggle={() => handleToggle(event.id)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" className="flex-1" onClick={handleClose}>
              취소
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleImport}
              disabled={phase === 'importing' || isLoadingPreview || activeCount === 0}
              isLoading={phase === 'importing'}
            >
              가져오기{activeCount > 0 && ` (${activeCount})`}
            </Button>
          </ModalFooter>
        </>
      )}
    </ResponsiveModal>
  )
}
