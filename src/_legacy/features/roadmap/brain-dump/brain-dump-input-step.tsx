'use client'

import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { ModalBody } from '@/components/ui/responsive-modal'

const PLACEHOLDER = `운동 꾸준히 하고 싶다
영어 공부 다시 시작하기
매일 책 30분 읽기
저축 좀 해야 하는데
명상 해보고 싶다`

const MAX_LENGTH = 2000

interface BrainDumpInputStepProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
}

export function BrainDumpInputStep({
  value,
  onChange,
  onSubmit,
  onCancel,
}: BrainDumpInputStepProps) {
  const isValid = value.trim().length > 0
  const remaining = MAX_LENGTH - value.length

  return (
    <>
      <ModalBody>
        <div className="space-y-2">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value.slice(0, MAX_LENGTH))}
            placeholder={PLACEHOLDER}
            rows={8}
            className="min-h-[200px] leading-relaxed"
            aria-label="생각 쏟아내기 입력"
            autoFocus
          />
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] text-[var(--color-text-quaternary)]">
              편하게 적어도 괜찮아요
            </p>
            <span
              className={`text-[11px] tabular-nums ${
                remaining < 200 ? 'text-[var(--color-miss)]' : 'text-[var(--color-text-quaternary)]'
              }`}
              aria-live="polite"
            >
              {value.length.toLocaleString()}/{MAX_LENGTH.toLocaleString()}
            </span>
          </div>
        </div>
      </ModalBody>

      <div className="mt-6 flex gap-3">
        <Button variant="secondary" onClick={onCancel} className="flex-1">
          취소
        </Button>
        <Button onClick={onSubmit} disabled={!isValid} className="flex-1 gap-1.5">
          <Sparkles className="h-4 w-4" />
          AI로 정리하기
        </Button>
      </div>
    </>
  )
}
