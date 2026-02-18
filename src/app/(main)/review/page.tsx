'use client'

import { Suspense, useEffect } from 'react'
import { PageContainer } from '@/components/layout'
import { PeriodSelector, ReviewSkeleton, ReviewErrorBoundary } from '@/features/review'
import { ReviewPageLayout } from '@/features/review/components/review-page-layout'
import { VersionFilter } from '@/features/review/components/version-filter'
import { useReviewStore } from '@/stores/review.store'

export default function ReviewPage() {
  const reset = useReviewStore((s) => s.reset)

  useEffect(() => {
    return () => reset()
  }, [reset])

  return (
    <PageContainer className="pb-24 lg:h-full lg:pb-0" fullWidth>
      <div className="flex h-full flex-col">
        <div className="shrink-0 space-y-2 px-4 pt-6 md:px-6 lg:px-8">
          <PeriodSelector />
          <VersionFilter />
        </div>
        <div className="min-h-0 flex-1">
          <ReviewErrorBoundary>
            <Suspense fallback={<ReviewSkeleton />}>
              <ReviewPageLayout />
            </Suspense>
          </ReviewErrorBoundary>
        </div>
      </div>
    </PageContainer>
  )
}
