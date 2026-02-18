'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface ErrorCardProps {
  error: Error
  onRetry?: () => void
}

export function ErrorCard({ error, onRetry }: ErrorCardProps) {
  return (
    <Card padding="lg" className="text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-miss-bg)]">
          <AlertTriangle className="h-6 w-6 text-[var(--color-miss)]" />
        </div>
        <div>
          <h3 className="mb-1 font-semibold">문제가 발생했어요</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {error.message || '잠시 후 다시 시도해주세요.'}
          </p>
        </div>
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            다시 시도
          </Button>
        )}
      </div>
    </Card>
  )
}
