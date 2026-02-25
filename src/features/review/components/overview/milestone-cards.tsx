'use client'

import { motion } from 'framer-motion'
import type { AreaReviewData } from '../../hooks/use-review-roadmap-data'
import type { ActivityEvent } from '../../hooks/use-activity-log'
import type { ComparisonData } from '../../hooks/use-comparison-data'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface MilestoneSectionProps {
  roadmapData: AreaReviewData[]
  activityEvents: ActivityEvent[]
  comparison: ComparisonData | null
  period: 'week' | 'month'
  startDate: string
  endDate: string
}

interface MilestoneCard {
  id: string
  icon: string
  title: string
  subtitle: string
  accent?: 'green' | 'orange' | 'neutral'
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Card Item
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function MilestoneCardItem({ card, index }: { card: MilestoneCard; index: number }) {
  const accentClass =
    card.accent === 'green'
      ? 'border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
      : card.accent === 'orange'
        ? 'border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'
        : 'border border-[var(--color-border)] bg-[var(--color-bg-card)]'

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.06, ease: 'easeOut' }}
      className={`flex shrink-0 flex-col gap-1 rounded-xl p-3 ${accentClass}`}
      style={{ minWidth: 140, maxWidth: 200 }}
    >
      <span className="text-xl leading-none" aria-hidden="true">
        {card.icon}
      </span>
      <p className="mt-0.5 line-clamp-2 text-xs leading-snug font-semibold text-[var(--color-text-primary)]">
        {card.title}
      </p>
      <p className="text-xs leading-snug text-[var(--color-text-secondary)]">{card.subtitle}</p>
    </motion.div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function MilestoneSection({
  roadmapData,
  activityEvents,
  comparison,
  startDate,
  endDate,
}: MilestoneSectionProps) {
  const cards: MilestoneCard[] = []

  // ── 1. Group Completion Cards ──────────────────
  const groupCompletedEvents = activityEvents.filter(
    (e) => e.type === 'group-completed' && e.date >= startDate && e.date <= endDate
  )
  for (const event of groupCompletedEvents) {
    cards.push({
      id: `group-${event.id}`,
      icon: event.areaEmoji ?? '🏁',
      title: event.entityName,
      subtitle: `${event.goalName ? `${event.goalName} · ` : ''}완료!`,
      accent: 'green',
    })
  }

  // ── 2. Streak Achievement Cards (top 3 by bestStreak) ──
  const allTasks = roadmapData.flatMap((area) => area.goals.flatMap((g) => g.tasks))
  const topStreakTasks = allTasks
    .filter((t) => t.bestStreak > 0)
    .sort((a, b) => b.bestStreak - a.bestStreak)
    .slice(0, 3)

  for (const task of topStreakTasks) {
    cards.push({
      id: `streak-${task.taskId}`,
      icon: '🔥',
      title: task.taskName,
      subtitle: `최고 기록 ${task.bestStreak}일!`,
      accent: 'orange',
    })
  }

  // ── 3. Growth Highlight Card ───────────────────
  if (comparison) {
    let growthTitle: string
    let growthSubtitle: string
    let accent: MilestoneCard['accent']

    if (!comparison.hasPrevData) {
      growthTitle = '꾸준히 해내고 있어요!'
      growthSubtitle = `활동일 ${comparison.currentActiveDays}일`
      accent = 'neutral'
    } else if (comparison.completionDelta > 0) {
      growthTitle = `실천율이 ${comparison.completionDelta}%p 올랐어요!`
      growthSubtitle =
        comparison.activeDaysDelta > 0
          ? `활동일도 ${comparison.activeDaysDelta}일 늘었어요`
          : '지난 기간보다 성장했어요'
      accent = 'green'
    } else if (comparison.completionDelta < 0) {
      growthTitle = '자기 페이스를 지키고 있어요'
      growthSubtitle = `실천율 ${comparison.currentCompletionRate}%`
      accent = 'neutral'
    } else {
      growthTitle = '꾸준히 해내고 있어요!'
      growthSubtitle =
        comparison.activeDaysDelta > 0
          ? `활동일 ${comparison.activeDaysDelta}일 늘었어요`
          : `실천율 ${comparison.currentCompletionRate}%`
      accent = 'neutral'
    }

    cards.push({
      id: 'growth-highlight',
      icon: comparison.completionDelta > 0 ? '📈' : '🌱',
      title: growthTitle,
      subtitle: growthSubtitle,
      accent,
    })
  }

  // Return null if there's nothing to show
  if (cards.length === 0) return null

  return (
    <section className="space-y-2">
      <p className="text-xs font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
        성장 기록
      </p>
      {/* Mobile: horizontal scroll | Desktop: flex-wrap */}
      <div className="flex gap-3 overflow-x-auto pb-1 md:flex-wrap md:overflow-x-visible md:pb-0">
        {cards.map((card, i) => (
          <MilestoneCardItem key={card.id} card={card} index={i} />
        ))}
      </div>
    </section>
  )
}
