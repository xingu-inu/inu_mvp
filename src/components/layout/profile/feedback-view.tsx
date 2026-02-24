'use client'

import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { submitFeedback } from '@/actions/feedback.actions'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'

const FEEDBACK_CATEGORIES = [
  { value: 'general' as const, label: '일반' },
  { value: 'bug' as const, label: '버그 제보' },
  { value: 'feature' as const, label: '기능 요청' },
  { value: 'improvement' as const, label: '개선 사항' },
]

function KakaoTalkBanner() {
  return (
    <a
      href="https://open.kakao.com/o/pVa3PXFi"
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl bg-[#FEE500]/10 p-4 transition-colors hover:bg-[#FEE500]/20"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">💬</span>
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            더 많은 이야기를 나누고 싶다면?
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            카카오톡 오픈채팅방에서 함께해요!
          </p>
        </div>
        <ExternalLink className="h-4 w-4 flex-shrink-0 text-[var(--color-text-tertiary)]" />
      </div>
    </a>
  )
}

export function FeedbackView() {
  const [category, setCategory] = useState<'general' | 'bug' | 'feature' | 'improvement'>('general')
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      const result = await submitFeedback({ category, content: content.trim() })
      if (result.success) {
        trackEvent(ANALYTICS_EVENTS.FEEDBACK_SUBMITTED, { category })
        setSubmitted(true)
        toast.success('소중한 의견 감사합니다!')
      } else {
        toast.error(result.error.message)
      }
    } catch {
      toast.error('제출에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="space-y-6 py-4 text-center">
        <div className="text-4xl">🙏</div>
        <div className="space-y-1">
          <p className="text-lg font-bold text-[var(--color-text-primary)]">감사합니다!</p>
          <p className="text-sm text-[var(--color-text-secondary)]">
            보내주신 의견은 서비스 개선에 소중하게 활용됩니다.
          </p>
        </div>
        <KakaoTalkBanner />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Category Selection */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">카테고리</p>
        <div className="flex flex-wrap gap-1.5">
          {FEEDBACK_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                category === cat.value
                  ? 'bg-[var(--color-primary-500)] text-white'
                  : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">내용</p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="자유롭게 의견을 남겨주세요..."
          rows={4}
          className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-transparent px-3 py-2.5 text-sm transition-colors outline-none placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary-300)]"
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!content.trim() || isSubmitting}
        className="w-full rounded-xl bg-[var(--color-primary-500)] py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-600)] disabled:opacity-50"
      >
        {isSubmitting ? '보내는 중...' : '의견 보내기'}
      </button>

      {/* KakaoTalk Banner */}
      <KakaoTalkBanner />
    </div>
  )
}
