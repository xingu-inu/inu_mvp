'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

interface InlineDeleteConfirmProps {
  title: string
  description?: string
  onCancel: () => void
  onConfirm: () => void
  isLoading?: boolean
  alternativeAction?: {
    label: string
    onAction: () => void
    isLoading?: boolean
  }
}

export function InlineDeleteConfirm({
  title,
  description,
  onCancel,
  onConfirm,
  isLoading,
  alternativeAction,
}: InlineDeleteConfirmProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.15 }}
      style={{ overflow: 'hidden' }}
    >
      <div className="space-y-2 rounded-lg bg-[var(--color-miss-bg)] p-3">
        <p className="text-xs font-medium">{title}</p>
        {description && (
          <p className="text-[10px] text-[var(--color-text-secondary)]">{description}</p>
        )}
        <div className="flex gap-2">
          {alternativeAction ? (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={alternativeAction.onAction}
                isLoading={alternativeAction.isLoading}
              >
                {alternativeAction.label}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="flex-1 bg-[var(--color-miss)] hover:bg-[var(--color-miss)]"
                onClick={onConfirm}
                isLoading={isLoading}
              >
                삭제하기
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1 text-xs"
                onClick={onCancel}
              >
                취소
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="flex-1 bg-[var(--color-miss)] text-xs hover:bg-[var(--color-miss)]"
                onClick={onConfirm}
                isLoading={isLoading}
              >
                삭제
              </Button>
            </>
          )}
        </div>
        {alternativeAction && (
          <Button type="button" variant="secondary" size="sm" className="w-full" onClick={onCancel}>
            취소
          </Button>
        )}
      </div>
    </motion.div>
  )
}
