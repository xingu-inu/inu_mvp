'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Mascot } from '@/components/common/mascot'

interface EmptyRoadmapProps {
  onAddGoal?: () => void
}

export function EmptyRoadmap({ onAddGoal }: EmptyRoadmapProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      {/* Icon */}
      <div className="mb-6">
        <Mascot mood="curious" size="lg" />
      </div>

      {/* Text */}
      <h3 className="mb-2 text-lg font-semibold">아직 목표가 없어요</h3>
      <p className="mb-6 max-w-xs text-[var(--color-text-secondary)]">
        인생의 첫 영역을 추가하고
        <br />
        로드맵을 시작해보세요
      </p>

      {/* CTA */}
      <Button onClick={onAddGoal} className="gap-2">
        <Plus className="h-4 w-4" />
        시작하기
      </Button>
    </div>
  )
}
