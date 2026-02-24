'use client'

import { useState } from 'react'
import { Check, SkipForward, Repeat, Target, Compass } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Chip } from '@/components/ui/chip'
import { StreakBadge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/ui/progress'
import { MoodSelector } from '@/features/home/components/mood-selector'
import { cn } from '@/lib/utils'
import type { MoodLevel } from '@/types/entities'

function DemoFrame({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl bg-[var(--color-bg-secondary)] p-4">{children}</div>
}

/* ── Welcome ── */
function WelcomeDemo() {
  return (
    <DemoFrame>
      <div className="flex flex-col items-center gap-4 py-2">
        <div className="flex gap-3">
          <Chip variant="area" emoji="💪" color="var(--color-area-health)">
            건강
          </Chip>
          <Chip variant="area" emoji="📈" color="var(--color-area-career)">
            커리어
          </Chip>
          <Chip variant="area" emoji="🎨" color="var(--color-area-hobbies)">
            취미
          </Chip>
        </div>
        <div className="w-full space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
            <span>홈에서 체크인</span>
            <span>로드맵에서 계획</span>
            <span>리뷰에서 돌아보기</span>
          </div>
          <ProgressBar value={60} showLabel />
        </div>
      </div>
    </DemoFrame>
  )
}

/* ── Check-in (matches CompactTaskRow UI) ── */
function CheckinDemo() {
  const [task1Status, setTask1Status] = useState<'pending' | 'done' | 'skip'>('pending')

  return (
    <DemoFrame>
      <div className="space-y-0.5">
        {/* Interactive task — user can tap Done or Skip */}
        <div
          className={cn(
            'flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors',
            task1Status === 'done' && 'bg-[var(--color-done-bg)]',
            task1Status === 'skip' && 'bg-[var(--color-skip-bg)]'
          )}
        >
          {task1Status === 'pending' && (
            <button
              onClick={() => setTask1Status('done')}
              className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 border-[var(--color-border)] transition-colors hover:border-[var(--color-done)] hover:bg-[var(--color-done-bg)]"
            >
              <Check className="h-3 w-3 text-transparent" />
            </button>
          )}
          {task1Status === 'done' && (
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-[var(--color-done)] text-white">
              <Check className="h-3 w-3" />
            </span>
          )}
          {task1Status === 'skip' && (
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-[var(--color-skip)] text-white">
              <SkipForward className="h-3 w-3" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <span
              className={cn(
                'flex items-center gap-1 truncate text-sm font-medium text-[var(--color-text-primary)]',
                task1Status === 'done' && 'line-through opacity-60',
                task1Status === 'skip' && 'opacity-60'
              )}
            >
              <Repeat className="h-3.5 w-3.5 flex-shrink-0 text-[var(--color-text-tertiary)]" />
              <span className="truncate">매일 30분 걷기</span>
            </span>
            <span
              className={cn(
                'block truncate pl-[18px] text-[11px] leading-tight text-[var(--color-text-tertiary)]',
                (task1Status === 'done' || task1Status === 'skip') && 'opacity-60'
              )}
            >
              기초 체력 만들기 · <span className="text-[var(--color-streak)]">🔥12</span>
            </span>
          </div>
          {task1Status === 'pending' && (
            <button
              onClick={() => setTask1Status('skip')}
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-[var(--color-text-tertiary)] transition-all hover:bg-[var(--color-skip)] hover:text-white"
            >
              <SkipForward className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Already done task */}
        <div className="flex items-center gap-2.5 rounded-lg bg-[var(--color-done-bg)] px-3 py-2">
          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-[var(--color-done)] text-white">
            <Check className="h-3 w-3" />
          </span>
          <div className="min-w-0 flex-1">
            <span className="flex items-center gap-1 truncate text-sm font-medium text-[var(--color-text-primary)] line-through opacity-60">
              <Repeat className="h-3.5 w-3.5 flex-shrink-0 text-[var(--color-text-tertiary)]" />
              <span className="truncate">영어 쉐도잉 10분</span>
            </span>
            <span className="block truncate pl-[18px] text-[11px] leading-tight text-[var(--color-text-tertiary)] line-through opacity-60">
              영어 실력 향상 · <span className="text-[var(--color-streak)]">🔥5</span>
            </span>
          </div>
        </div>

        {/* Pending task (static) */}
        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 border-[var(--color-border)]">
            <Check className="h-3 w-3 text-transparent" />
          </span>
          <div className="min-w-0 flex-1">
            <span className="flex items-center gap-1 truncate text-sm font-medium text-[var(--color-text-primary)]">
              <Repeat className="h-3.5 w-3.5 flex-shrink-0 text-[var(--color-text-tertiary)]" />
              <span className="truncate">스트레칭 15분</span>
            </span>
            <span className="block truncate pl-[18px] text-[11px] leading-tight text-[var(--color-text-tertiary)]">
              기초 체력 만들기 · <span className="text-[var(--color-streak)]">🔥3</span>
            </span>
          </div>
          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-[var(--color-text-tertiary)]">
            <SkipForward className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </DemoFrame>
  )
}

/* ── Streak ── */
function StreakDemo() {
  return (
    <DemoFrame>
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          <StreakBadge count={12} />
          <span className="text-sm text-[var(--color-text-secondary)]">12일 연속 실천중!</span>
        </div>

        <div className="flex gap-2">
          {['월', '화', '수', '목', '금', '토', '일'].map((day, i) => {
            const done = i < 5 || i === 6
            return (
              <div key={day} className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium',
                    done
                      ? 'bg-[var(--color-done)] text-white'
                      : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]'
                  )}
                >
                  {done ? '✓' : '·'}
                </div>
                <span className="text-[10px] text-[var(--color-text-tertiary)]">{day}</span>
              </div>
            )
          })}
        </div>

        <div className="flex items-center gap-3">
          <StreakBadge count={3} />
          <StreakBadge count={7} />
          <StreakBadge count={14} />
          <StreakBadge count={30} />
        </div>
      </div>
    </DemoFrame>
  )
}

/* ── Mood ── */
function MoodDemo() {
  const [mood, setMood] = useState<MoodLevel | null>('good')

  return (
    <DemoFrame>
      <div className="space-y-3">
        <p className="text-center text-xs text-[var(--color-text-secondary)]">
          오늘 하루 기분은 어땠나요?
        </p>
        <MoodSelector value={mood} onChange={setMood} size="md" />
      </div>
    </DemoFrame>
  )
}

/* ── Roadmap (matches Visual Tree UI) ── */
function RoadmapDemo() {
  return (
    <DemoFrame>
      <div className="space-y-1.5">
        {/* Direction */}
        <div className="rounded-xl border-2 border-[var(--color-primary-500)] bg-[var(--color-primary-500)] px-4 py-2.5 shadow-sm">
          <div className="flex items-center justify-center gap-1.5">
            <Compass className="h-4 w-4 text-[var(--color-text-on-primary)]" />
            <span className="text-sm font-bold text-[var(--color-text-on-primary)]">
              건강하고 당당한 삶
            </span>
          </div>
        </div>

        {/* Area */}
        <div className="ml-4 space-y-1.5 border-l-2 border-[var(--color-border-hover)] pl-3">
          <div className="relative overflow-hidden rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-bg-primary)] px-4 py-2 shadow-sm">
            <div
              className="absolute inset-y-0 left-0 w-1"
              style={{ backgroundColor: 'var(--color-area-health)' }}
            />
            <div className="flex items-center gap-2">
              <span className="text-base">💪</span>
              <span className="text-sm font-semibold text-[var(--color-text-primary)]">건강</span>
              <span className="rounded-full bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-tertiary)]">
                2
              </span>
            </div>
          </div>

          {/* Goal */}
          <div className="ml-4 space-y-1.5 border-l-2 border-[var(--color-border-hover)] pl-3">
            <div className="relative overflow-hidden rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-bg-primary)] px-4 py-2 shadow-sm">
              <div
                className="absolute inset-y-0 left-0 w-1"
                style={{ backgroundColor: 'var(--color-area-health)' }}
              />
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-[var(--color-text-secondary)]" />
                <span className="text-[15px] font-medium text-[var(--color-text-primary)]">
                  10km 달리기
                </span>
                <span className="ml-auto rounded-full bg-[var(--color-done-bg)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-done)]">
                  Active
                </span>
              </div>
            </div>

            {/* Tasks */}
            <div className="ml-4 space-y-1 border-l-2 border-[var(--color-border-hover)] pl-3">
              <div className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-1.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Repeat className="h-3.5 w-3.5 flex-shrink-0 text-[var(--color-text-tertiary)]" />
                  <span className="text-[13px] text-[var(--color-text-secondary)]">
                    매일 30분 러닝
                  </span>
                  <span className="ml-auto rounded-full bg-[var(--color-streak-bg)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-streak)]">
                    🔥12
                  </span>
                </div>
              </div>
              <div className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-1.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Repeat className="h-3.5 w-3.5 flex-shrink-0 text-[var(--color-text-tertiary)]" />
                  <span className="text-[13px] text-[var(--color-text-secondary)]">
                    주 2회 스트레칭
                  </span>
                  <span className="ml-auto rounded-full bg-[var(--color-streak-bg)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-streak)]">
                    🔥5
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DemoFrame>
  )
}

/* ── Review ── */
function ReviewDemo() {
  return (
    <DemoFrame>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: '📈', label: '완료율', value: '78%' },
            { icon: '🔥', label: '스트릭', value: '12일' },
            { icon: '🙂', label: '기분', value: '좋음' },
          ].map((s) => (
            <Card key={s.label} padding="sm" variant="list">
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-sm">{s.icon}</span>
                <span className="text-xs font-semibold">{s.value}</span>
                <span className="text-[10px] text-[var(--color-text-tertiary)]">{s.label}</span>
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-1">
          <p className="text-[10px] text-[var(--color-text-tertiary)]">이번 달 실천 히트맵</p>
          <div className="flex flex-wrap gap-1">
            {[
              3, 4, 2, 4, 3, 1, 0, 4, 3, 4, 2, 4, 3, 1, 2, 4, 3, 4, 4, 0, 2, 3, 2, 4, 3, 1, 0, 3,
            ].map((v, i) => (
              <div
                key={i}
                className="h-4 w-4 rounded-sm"
                style={{
                  backgroundColor: 'var(--color-done)',
                  opacity: [0.1, 0.25, 0.5, 0.75, 1][v],
                }}
              />
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Chip variant="area" emoji="💪" color="var(--color-area-health)">
              건강
            </Chip>
            <span className="text-xs text-[var(--color-text-secondary)]">85%</span>
          </div>
          <ProgressBar value={85} />
        </div>
      </div>
    </DemoFrame>
  )
}

/* ── Philosophy ── */
function PhilosophyDemo() {
  return (
    <DemoFrame>
      <div className="space-y-2">
        {[
          { emoji: '🌱', text: '매일 조금씩, 내 페이스대로' },
          { emoji: '🤝', text: '못 해도 비난하지 않아요' },
          { emoji: '🔄', text: '방향이 바뀌어도 괜찮아요' },
          { emoji: '☕', text: '쉬는 것도 과정의 일부예요' },
        ].map((p) => (
          <Card key={p.text} padding="sm" variant="list">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">{p.emoji}</span>
              <span className="text-sm font-medium">{p.text}</span>
            </div>
          </Card>
        ))}
      </div>
    </DemoFrame>
  )
}

/* ── Main Switch ── */
const STEP_DEMOS: Record<string, React.FC> = {
  welcome: WelcomeDemo,
  checkin: CheckinDemo,
  streak: StreakDemo,
  mood: MoodDemo,
  roadmap: RoadmapDemo,
  review: ReviewDemo,
  philosophy: PhilosophyDemo,
}

interface GuideStepContentProps {
  stepId: string
}

export function GuideStepContent({ stepId }: GuideStepContentProps) {
  const Demo = STEP_DEMOS[stepId]
  if (!Demo) return null
  return <Demo />
}
