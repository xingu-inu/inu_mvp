'use client'

import { useState, useCallback, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Lightbulb } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import { GuideStepContent } from './guide-step-content'
import { GUIDE_STEPS } from '../data/guide-sections'

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
}

interface GuideModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GuideModal({ open, onOpenChange }: GuideModalProps) {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(0)

  const step = GUIDE_STEPS[current]
  const isFirst = current === 0
  const isLast = current === GUIDE_STEPS.length - 1

  const goNext = useCallback(() => {
    setDirection(1)
    setCurrent((prev) => Math.min(prev + 1, GUIDE_STEPS.length - 1))
  }, [])

  const goPrev = useCallback(() => {
    setDirection(-1)
    setCurrent((prev) => Math.max(prev - 1, 0))
  }, [])

  const goTo = useCallback(
    (index: number) => {
      setDirection(index > current ? 1 : -1)
      setCurrent(index)
    },
    [current]
  )

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setCurrent(0)
        setDirection(0)
      }
      onOpenChange(nextOpen)
    },
    [onOpenChange]
  )

  // Keyboard navigation
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && !isLast) goNext()
      if (e.key === 'ArrowLeft' && !isFirst) goPrev()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, isFirst, isLast, goNext, goPrev])

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={handleOpenChange}
      title="사용 가이드"
      description="inu를 더 잘 활용하는 방법"
    >
      <div className="space-y-5 p-1">
        {/* Dot indicator */}
        <div className="flex items-center justify-center gap-1.5">
          {GUIDE_STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`${i + 1}단계로 이동`}
              className={`rounded-full transition-all ${
                i === current
                  ? 'h-2 w-6 bg-[var(--color-primary-500)]'
                  : i < current
                    ? 'h-2 w-2 bg-[var(--color-done)]'
                    : 'h-2 w-2 bg-[var(--color-border)] hover:bg-[var(--color-text-tertiary)]'
              }`}
            />
          ))}
        </div>

        {/* Step content — fixed height prevents modal resize during transitions */}
        <div className="h-[380px] overflow-x-hidden overflow-y-auto">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={step.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex flex-col gap-4"
            >
              {/* Title + Description */}
              <div className="space-y-1.5 px-1">
                <div className="flex items-center gap-2">
                  <step.icon className="h-5 w-5 shrink-0 text-[var(--color-primary-500)]" />
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    {step.title}
                  </h3>
                </div>
                <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {step.description}
                </p>
              </div>

              {/* Interactive demo area */}
              <GuideStepContent stepId={step.id} />

              {/* Tips */}
              {step.tips && step.tips.length > 0 && (
                <div className="rounded-lg bg-[var(--color-primary-50)] px-3 py-2">
                  {step.tips.map((tip) => (
                    <div key={tip} className="flex items-start gap-1.5">
                      <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-[var(--color-primary-500)]" />
                      <span className="text-xs text-[var(--color-text-secondary)]">{tip}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          {!isFirst ? (
            <Button variant="ghost" size="md" onClick={goPrev} aria-label="이전 단계">
              <ChevronLeft className="mr-1 h-4 w-4" />
              이전
            </Button>
          ) : (
            <div />
          )}

          <span className="text-xs text-[var(--color-text-tertiary)]">
            {current + 1} / {GUIDE_STEPS.length}
          </span>

          {!isLast ? (
            <Button size="md" onClick={goNext} aria-label="다음 단계">
              다음
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="md"
              onClick={() => handleOpenChange(false)}
              aria-label="가이드 닫고 시작하기"
            >
              시작하기
            </Button>
          )}
        </div>
      </div>
    </ResponsiveModal>
  )
}
