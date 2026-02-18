'use client'

interface NewRoundMessageProps {
  totalCompleted: number
  bestStreak: number
  streakCount: number
}

/**
 * Shows an encouraging message when a user's streak has reset
 * but they have previous completion history.
 *
 * Philosophy: "쉬는 것도 과정의 일부예요. 다시 시작하는 게 중요합니다"
 */
export function NewRoundMessage({ totalCompleted, bestStreak, streakCount }: NewRoundMessageProps) {
  // Only show when streak is 0 but user has history
  const isNewRound = streakCount === 0 && (bestStreak > 0 || totalCompleted > 0)

  if (!isNewRound) return null

  return (
    <div className="mt-2 rounded-lg bg-[var(--color-new-round-bg)] p-3 text-sm text-[var(--color-new-round-text)]">
      <p className="flex items-center gap-1.5">
        <span>🌱</span>
        <span className="font-medium">새로운 시작이에요!</span>
      </p>
      <p className="mt-1 text-[var(--color-text-secondary)]">
        지금까지 총 {totalCompleted}회 완료했어요
        {bestStreak > 0 && ` (최고 기록: ${bestStreak}일 연속)`}
      </p>
    </div>
  )
}
