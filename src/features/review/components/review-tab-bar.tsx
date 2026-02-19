'use client'

export type ReviewTab = 'areas' | 'records' | 'patterns'

const TABS: { id: ReviewTab; label: string }[] = [
  { id: 'areas', label: '영역별' },
  { id: 'records', label: '기록' },
  { id: 'patterns', label: '패턴' },
]

interface ReviewTabBarProps {
  activeTab: ReviewTab
  onChange: (tab: ReviewTab) => void
}

export function ReviewTabBar({ activeTab, onChange }: ReviewTabBarProps) {
  return (
    <div className="flex gap-1 rounded-xl bg-[var(--color-bg-secondary)] p-1">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === tab.id
              ? 'bg-[var(--color-primary-500)] font-semibold text-white'
              : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
