'use client'

import {
  useAdminRetentionCohorts,
  useAdminFeatureAdoption,
  useAdminStreakDistribution,
} from '../hooks'
import { RetentionHeatmap } from './retention-heatmap'
import { FeatureAdoption } from './feature-adoption'
import { StreakDistribution } from './streak-distribution'

export function AdminAnalytics() {
  const { data: retentionData, isLoading: retentionLoading } = useAdminRetentionCohorts()
  const { data: featureData, isLoading: featureLoading } = useAdminFeatureAdoption()
  const { data: streakData, isLoading: streakLoading } = useAdminStreakDistribution()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">분석</h1>
      </div>

      {/* Retention Heatmap */}
      <RetentionHeatmap data={retentionData} isLoading={retentionLoading} />

      {/* Feature Adoption + Streak Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FeatureAdoption data={featureData} isLoading={featureLoading} />
        <StreakDistribution data={streakData} isLoading={streakLoading} />
      </div>
    </div>
  )
}
