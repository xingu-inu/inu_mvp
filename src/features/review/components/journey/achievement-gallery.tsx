'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import type { ActivityEvent } from '../../hooks/use-activity-log'
import type { ActiveStreak } from '../../utils/timeline-utils'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface AchievementGalleryProps {
  activityEvents: ActivityEvent[]
  streaks: ActiveStreak[]
}

interface AchievementItem {
  key: string
  icon: string
  date: string
  text: string
  areaEmoji?: string
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildAchievements(
  activityEvents: ActivityEvent[],
  streaks: ActiveStreak[]
): AchievementItem[] {
  const items: AchievementItem[] = []

  // Goal completions
  for (const ev of activityEvents) {
    if (ev.type === 'goal-completed') {
      items.push({
        key: ev.id,
        icon: '🎉',
        date: ev.date,
        text: `목표 완료: ${ev.entityName}`,
        areaEmoji: ev.areaEmoji,
      })
    }
  }

  // Group completions
  for (const ev of activityEvents) {
    if (ev.type === 'group-completed') {
      items.push({
        key: ev.id,
        icon: '✅',
        date: ev.date,
        text: `그룹 완료: ${ev.entityName}`,
        areaEmoji: ev.areaEmoji,
      })
    }
  }

  // Streak records (>= 5)
  const today = new Date().toISOString().slice(0, 10)
  for (const streak of streaks) {
    if (streak.streakCount >= 5) {
      items.push({
        key: `streak-${streak.taskId}`,
        icon: '🔥',
        date: today,
        text: `${streak.taskName} — ${streak.streakCount}일 연속`,
        areaEmoji: streak.areaEmoji,
      })
    }
  }

  // Sort newest first
  return items.sort((a, b) => b.date.localeCompare(a.date))
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function AchievementGallery({ activityEvents, streaks }: AchievementGalleryProps) {
  const achievements = useMemo(
    () => buildAchievements(activityEvents, streaks),
    [activityEvents, streaks]
  )

  if (achievements.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <span className="mb-1.5 block text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
        성취 갤러리
      </span>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
        {achievements.map((item, idx) => {
          const dateLabel = (() => {
            try {
              return format(parseISO(item.date), 'M월 d일')
            } catch {
              return item.date
            }
          })()

          return (
            <div
              key={item.key}
              className={
                idx < achievements.length - 1 ? 'border-b border-[var(--color-border)]' : ''
              }
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="shrink-0 text-lg">{item.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--color-text-primary)]">{item.text}</p>
                  <span className="text-[10px] text-[var(--color-text-tertiary)]">{dateLabel}</span>
                </div>
                {item.areaEmoji && <span className="shrink-0 text-base">{item.areaEmoji}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
