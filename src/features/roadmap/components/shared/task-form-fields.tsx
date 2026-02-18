'use client'

import { useState } from 'react'
import type { FieldValues, Path, PathValue, UseFormReturn } from 'react-hook-form'
import { format, addMonths } from 'date-fns'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TimePicker } from '@/components/ui/time-picker'
import { DatePicker } from '@/components/ui/date-picker'
import { DayOfWeekPicker } from '@/components/ui/day-of-week-picker'
import { FormSegmentedControl } from '@/components/ui/form-segmented-control'
import { ScheduleSummary } from './schedule-summary'
import {
  REPEAT_PATTERN_OPTIONS,
  DURATION_OPTIONS,
  TIME_SLOT_OPTIONS,
  getSlotDefaultTime,
  isTimeInSlot,
  getSlotTimeRange,
} from '@/lib/constants/time-slots'
import { cn } from '@/lib/utils'
import { chipClass } from '@/lib/utils/chip-class'
import {
  repeatConfigToDays,
  daysToRepeatConfig,
  detectPreset,
  getRepeatSummary,
  PRESET_DAYS,
} from '@/lib/utils/repeat-utils'
import type { RepeatType, TimeSlot } from '@/types/entities'

interface TaskFormFieldsProps<T extends FieldValues = FieldValues> {
  /** react-hook-form instance (must contain repeat_type, repeat_days, duration_minutes, time_slot) */
  form: UseFormReturn<T>
  /** Compact layout for inline forms (smaller text, tighter spacing) */
  compact?: boolean
}

const SCHEDULE_MODE_OPTIONS = [
  { value: 'once', label: '1회' },
  { value: 'repeat', label: '반복' },
]

/**
 * Shared fields for task forms: schedule mode (once/repeat), repeat pattern,
 * date pickers, period, duration, time slot, and schedule summary.
 * Uses progressive disclosure — collapsed sections expand on demand.
 *
 * Used by InlineTaskCreate, InlineTaskEdit, and TaskEditForm.
 */
export function TaskFormFields<T extends FieldValues>({
  form,
  compact = false,
}: TaskFormFieldsProps<T>) {
  const selectedRepeat = form.watch('repeat_type' as Path<T>) as RepeatType | undefined
  const selectedRepeatDays = form.watch('repeat_days' as Path<T>) as number[] | undefined
  const selectedDuration = form.watch('duration_minutes' as Path<T>) as number | undefined
  const selectedTimeSlot = form.watch('time_slot' as Path<T>) as TimeSlot | undefined
  const selectedSpecificTime = form.watch('specific_time' as Path<T>) as string | undefined
  const scheduledDate = form.watch('scheduled_date' as Path<T>) as string | undefined
  const startDate = form.watch('start_date' as Path<T>) as string | undefined
  const endDate = form.watch('end_date' as Path<T>) as string | undefined

  const hasSpecificTime = !!selectedSpecificTime

  const isRepeating = selectedRepeat != null && selectedRepeat !== 'once'
  const scheduleMode = isRepeating ? 'repeat' : 'once'

  // Period section state
  const [showPeriod, setShowPeriod] = useState(!!startDate || !!endDate)
  const [hasEndDate, setHasEndDate] = useState(!!endDate)

  // Derive the day array from current form state
  const activeDays = isRepeating
    ? repeatConfigToDays(selectedRepeat!, selectedRepeatDays ?? null)
    : []

  const activePreset = isRepeating ? detectPreset(activeDays) : null
  const summary = isRepeating ? getRepeatSummary(activeDays) : null

  const setField = (key: string, value: unknown) => {
    form.setValue(key as unknown as Path<T>, value as PathValue<T, Path<T>>, { shouldDirty: true })
  }

  // --- Mode handlers ---

  const handleModeChange = (mode: string) => {
    if (mode === 'once') {
      setField('repeat_type', 'once')
      setField('repeat_days', null)
      if (!form.getValues('scheduled_date' as Path<T>)) {
        setField('scheduled_date', format(new Date(), 'yyyy-MM-dd'))
      }
      // Clear period fields
      setField('start_date', undefined)
      setField('end_date', undefined)
      setShowPeriod(false)
    } else {
      setField('repeat_type', 'daily')
      setField('repeat_days', null)
      setField('scheduled_date', undefined)
    }
  }

  const handlePresetClick = (preset: string) => {
    const days = PRESET_DAYS[preset]
    if (!days) return
    const config = daysToRepeatConfig(days)
    setField('repeat_type', config.repeat_type)
    setField('repeat_days', config.repeat_days)
  }

  const handleDaysChange = (days: number[]) => {
    if (days.length === 0) {
      setField('repeat_type', 'custom')
      setField('repeat_days', [])
      return
    }
    const config = daysToRepeatConfig(days)
    setField('repeat_type', config.repeat_type)
    setField('repeat_days', config.repeat_days)
  }

  const handleTimeSlotChange = (value: string) => {
    setField('time_slot', value)
    if (value === 'anytime') {
      setField('specific_time', undefined)
    } else if (selectedSpecificTime && !isTimeInSlot(selectedSpecificTime, value as TimeSlot)) {
      setField('specific_time', undefined)
    }
  }

  const handleTogglePeriod = () => {
    if (showPeriod) {
      // Collapse — clear period fields
      setField('start_date', undefined)
      setField('end_date', undefined)
      setHasEndDate(false)
      setShowPeriod(false)
    } else {
      // Expand — set default start date
      if (!startDate) {
        setField('start_date', format(new Date(), 'yyyy-MM-dd'))
      }
      setShowPeriod(true)
    }
  }

  const handleEndDateModeChange = (wantDate: boolean) => {
    if (wantDate) {
      setHasEndDate(true)
      setField('end_date', format(addMonths(new Date(), 1), 'yyyy-MM-dd'))
    } else {
      setHasEndDate(false)
      setField('end_date', undefined)
    }
  }

  // --- Style helpers ---

  const triggerClass = compact ? 'h-8 text-xs [background:var(--color-bg-tertiary)]' : 'h-10'
  const triggerStyle = compact
    ? ({ borderColor: 'var(--color-border-hover)' } as React.CSSProperties)
    : undefined

  const sectionLabelClass = compact
    ? 'text-[10px] font-medium text-[var(--color-text-secondary)]'
    : 'text-xs font-medium text-[var(--color-text-secondary)]'

  // --- Shared sub-sections ---

  const repeatPresetChips = (
    <div className={cn('flex', compact ? 'gap-1' : 'gap-1.5')}>
      {REPEAT_PATTERN_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => handlePresetClick(opt.value)}
          className={chipClass(activePreset === opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )

  const dayOfWeekSection = (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'flex-shrink-0 font-medium text-[var(--color-text-tertiary)]',
          compact ? 'text-[10px]' : 'text-xs'
        )}
      >
        매주
      </span>
      <DayOfWeekPicker selectedDays={activeDays} onChange={handleDaysChange} compact={compact} />
    </div>
  )

  const repeatSummaryText = summary && (
    <p className="text-[11px] text-[var(--color-text-tertiary)]">매주 {summary}</p>
  )

  const periodSection = isRepeating && (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleTogglePeriod}
        className="text-xs text-[var(--color-primary-500)] transition-colors hover:text-[var(--color-primary-600)]"
      >
        {showPeriod ? '기간 접기' : '+ 기간 설정'}
      </button>
      {showPeriod && (
        <div className="space-y-2 rounded-lg bg-[var(--color-bg-secondary)] p-3">
          {/* Start date */}
          <div className="space-y-1">
            <Label className={sectionLabelClass}>시작</Label>
            <DatePicker
              value={startDate}
              onChange={(d) => setField('start_date', d)}
              compact={compact}
              placeholder="시작 날짜"
            />
          </div>

          {/* End date toggle + picker */}
          <div className="space-y-1.5">
            <Label className={sectionLabelClass}>종료</Label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleEndDateModeChange(false)}
                className={chipClass(!hasEndDate)}
              >
                없음 (계속)
              </button>
              <button
                type="button"
                onClick={() => handleEndDateModeChange(true)}
                className={chipClass(hasEndDate)}
              >
                날짜 선택
              </button>
            </div>
            {hasEndDate && (
              <DatePicker
                value={endDate}
                onChange={(d) => setField('end_date', d)}
                compact={compact}
                placeholder="종료 날짜"
              />
            )}
          </div>
        </div>
      )}
    </div>
  )

  const specificTimeSection = selectedTimeSlot && selectedTimeSlot !== 'anytime' && (
    <div>
      {!hasSpecificTime ? (
        <button
          type="button"
          onClick={() => setField('specific_time', getSlotDefaultTime(selectedTimeSlot))}
          className="text-xs text-[var(--color-primary-500)] transition-colors hover:text-[var(--color-primary-600)]"
        >
          + 정확한 시간 설정
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <TimePicker
            value={selectedSpecificTime}
            onChange={(time) => setField('specific_time', time)}
            min={getSlotTimeRange(selectedTimeSlot).min}
            max={getSlotTimeRange(selectedTimeSlot).max}
            compact={compact}
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => setField('specific_time', undefined)}
            className="text-xs text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)]"
          >
            해제
          </button>
        </div>
      )}
    </div>
  )

  const durationSelect = (
    <Select
      value={selectedDuration != null ? String(selectedDuration) : ''}
      onValueChange={(value: string) => setField('duration_minutes', Number(value))}
    >
      <SelectTrigger className={triggerClass} style={triggerStyle}>
        <SelectValue placeholder="소요 시간" />
      </SelectTrigger>
      <SelectContent>
        {DURATION_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={String(opt.value)}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const timeSlotSelect = (
    <Select value={selectedTimeSlot ?? ''} onValueChange={handleTimeSlotChange}>
      <SelectTrigger className={triggerClass} style={triggerStyle}>
        <SelectValue placeholder="시간대" />
      </SelectTrigger>
      <SelectContent>
        {TIME_SLOT_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const scheduleSummary = (
    <ScheduleSummary
      repeatType={selectedRepeat ?? 'once'}
      repeatDays={selectedRepeatDays}
      scheduledDate={scheduledDate}
      timeSlot={selectedTimeSlot}
      specificTime={selectedSpecificTime}
      durationMinutes={selectedDuration}
      startDate={startDate}
      endDate={endDate}
    />
  )

  // ================================================================
  // COMPACT LAYOUT
  // ================================================================
  if (compact) {
    return (
      <div className="space-y-2">
        {/* Schedule mode toggle */}
        <FormSegmentedControl
          value={scheduleMode}
          onChange={handleModeChange}
          options={SCHEDULE_MODE_OPTIONS}
          compact
        />

        {/* Once: date picker */}
        {!isRepeating && (
          <div className="space-y-1">
            <Label className="text-[10px] text-[var(--color-text-tertiary)]">📅 날짜</Label>
            <DatePicker
              value={scheduledDate}
              onChange={(d) => setField('scheduled_date', d)}
              compact
              placeholder="날짜 선택"
            />
          </div>
        )}

        {/* Repeat: preset chips + day picker */}
        {isRepeating && (
          <>
            {repeatPresetChips}
            {dayOfWeekSection}
            {repeatSummaryText}
            {periodSection}
          </>
        )}

        {/* Duration + Time slot — 2 column grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-[var(--color-text-tertiary)]">시간대</Label>
            {timeSlotSelect}
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-[var(--color-text-tertiary)]">소요 시간</Label>
            {durationSelect}
          </div>
        </div>

        {specificTimeSection}

        {/* Schedule summary */}
        <div className="pt-1">{scheduleSummary}</div>
      </div>
    )
  }

  // ================================================================
  // FULL LAYOUT
  // ================================================================
  return (
    <>
      {/* ━━ 📅 언제 ━━━━━━━━━━━━━━━ */}
      <div className="space-y-3">
        <Label className={sectionLabelClass}>📅 언제</Label>

        <FormSegmentedControl
          value={scheduleMode}
          onChange={handleModeChange}
          options={SCHEDULE_MODE_OPTIONS}
        />

        {/* Once mode: date picker */}
        {!isRepeating && (
          <div className="space-y-1.5">
            <Label className="text-xs text-[var(--color-text-tertiary)]">날짜</Label>
            <DatePicker
              value={scheduledDate}
              onChange={(d) => setField('scheduled_date', d)}
              placeholder="날짜 선택"
            />
          </div>
        )}

        {/* Repeat mode: pattern + days + period */}
        {isRepeating && (
          <div className="space-y-2.5">
            <Label className="text-xs text-[var(--color-text-tertiary)]">🔁 반복 패턴</Label>
            {repeatPresetChips}
            {dayOfWeekSection}
            {repeatSummaryText}

            {/* Period (collapsible) */}
            <div className="space-y-1.5">
              <Label className="text-xs text-[var(--color-text-tertiary)]">📆 기간</Label>
              {periodSection}
            </div>
          </div>
        )}
      </div>

      {/* ━━ ⏰ 시간 ━━━━━━━━━━━━━━━ */}
      <div className="space-y-2">
        <Label className={sectionLabelClass}>⏰ 시간</Label>

        {/* Time slot as horizontal chips */}
        <div className="flex flex-wrap gap-1.5">
          {TIME_SLOT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleTimeSlotChange(opt.value)}
              className={chipClass(selectedTimeSlot === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {specificTimeSection}
      </div>

      {/* ━━ ⏱️ 소요 시간 ━━━━━━━━━━ */}
      <div className="space-y-2">
        <Label className={sectionLabelClass}>⏱️ 소요 시간</Label>
        {durationSelect}
      </div>

      {/* ━━ 스케줄 요약 ━━━━━━━━━━━ */}
      <div className="space-y-1">
        <Label className={sectionLabelClass}>스케줄 요약</Label>
        {scheduleSummary}
      </div>
    </>
  )
}
