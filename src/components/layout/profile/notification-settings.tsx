'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

function ToggleRow({
  label,
  description,
  defaultChecked = false,
}: {
  label: string
  description: string
  defaultChecked?: boolean
}) {
  const [checked, setChecked] = useState(defaultChecked)

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-[var(--color-text-tertiary)]">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => setChecked(!checked)}
        className={cn(
          'relative h-6 w-11 flex-shrink-0 rounded-full transition-colors',
          checked ? 'bg-[var(--color-primary-500)]' : 'bg-[var(--color-bg-tertiary)]'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
            checked && 'translate-x-5'
          )}
        />
      </button>
    </div>
  )
}

export function NotificationSettingsView() {
  return (
    <div className="space-y-4">
      <ToggleRow label="달성 리마인더" description="매일 설정한 시간에 알림" defaultChecked />
      <ToggleRow label="주간 리뷰 알림" description="매주 일요일 저녁 리마인드" defaultChecked />
      <ToggleRow label="AI 인사이트" description="이누의 새 인사이트 알림" defaultChecked={false} />
    </div>
  )
}
