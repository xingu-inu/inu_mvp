'use client'

import Link from 'next/link'

import { Button } from '@/components/ui'

import { ScrollFadeIn } from './scroll-fade-in'

export function LandingSections() {
  return (
    <>
      {/* Section 01: Life Roadmap */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-6 md:px-8">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">
            {/* Text left */}
            <ScrollFadeIn className="flex-1">
              <span className="text-sm font-semibold tracking-widest text-[var(--color-primary-500)]">
                01
              </span>
              <h2 className="mt-3 font-serif text-2xl font-normal text-[var(--color-text-primary)] md:text-3xl lg:text-4xl">
                큰 그림 속에서 오늘을 실천
              </h2>
              <p className="mt-4 max-w-lg leading-relaxed text-[var(--color-text-secondary)]">
                인생의 방향에서 시작해, 영역 → 목표 → 실천까지. 모든 할 일이 큰 그림 안에 연결되어
                있어요.
              </p>
            </ScrollFadeIn>

            {/* Visual right */}
            <ScrollFadeIn className="flex-1" delay={0.2}>
              <div className="glass-2 rounded-2xl p-6">
                {/* Direction */}
                <div className="mb-3 rounded-xl border-l-4 border-[var(--color-primary-500)] bg-[var(--color-primary-500)]/10 px-4 py-3">
                  <span className="text-xs font-semibold tracking-wide text-[var(--color-primary-500)]">
                    🧭 나의 방향
                  </span>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    건강하고 당당한 삶을 통해 가족과 오래 행복하게
                  </p>
                </div>

                {/* Area */}
                <div className="mb-3 ml-4">
                  <div className="glass-1 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: 'var(--color-area-health)' }}
                      />
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">
                        💪 건강
                      </span>
                    </div>

                    {/* Goal */}
                    <div className="mt-3 ml-3">
                      <div className="glass-1 rounded-lg px-3 py-2">
                        <span className="text-sm text-[var(--color-text-primary)]">
                          🎯 10km 달리기
                        </span>

                        {/* Task */}
                        <div className="mt-2 ml-2 flex items-center gap-2">
                          <span className="text-xs text-[var(--color-done)]">✅</span>
                          <span className="text-xs text-[var(--color-text-secondary)]">
                            매일 30분 러닝
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollFadeIn>
          </div>
        </div>
      </section>

      {/* Section 02: Why Chain */}
      <section className="bg-[var(--color-bg-secondary)] py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-6 md:px-8">
          <div className="flex flex-col gap-12 lg:flex-row-reverse lg:items-center lg:gap-16">
            {/* Text right (reversed) */}
            <ScrollFadeIn className="flex-1">
              <span className="text-sm font-semibold tracking-widest text-[var(--color-primary-500)]">
                02
              </span>
              <h2 className="mt-3 font-serif text-2xl font-normal text-[var(--color-text-primary)] md:text-3xl lg:text-4xl">
                왜 하는지 항상 기억
              </h2>
              <p className="mt-4 max-w-lg leading-relaxed text-[var(--color-text-secondary)]">
                모든 레벨에 &apos;왜?&apos;를 부여하세요. 아래에서 위로 올라가면 인생의 근본적인
                이유가 드러나요.
              </p>
            </ScrollFadeIn>

            {/* Visual left (reversed) */}
            <ScrollFadeIn className="flex-1" delay={0.2}>
              <div className="glass-2 rounded-2xl p-6">
                <div className="flex flex-col gap-0">
                  {/* Top bubble */}
                  <div className="glass-1 rounded-xl border border-[var(--color-primary-500)]/30 px-4 py-3">
                    <p className="text-sm font-medium text-[var(--color-primary-500)]">
                      건강하고 당당한 삶
                    </p>
                  </div>

                  {/* Connector */}
                  <div className="ml-4 h-5 border-l-2 border-[var(--color-primary-500)]" />

                  {/* Middle bubble 1 */}
                  <div className="glass-1 rounded-xl px-4 py-3">
                    <p className="text-sm text-[var(--color-text-primary)]">
                      오래 건강하게 살고 싶다
                    </p>
                  </div>

                  {/* Connector */}
                  <div className="ml-4 h-5 border-l-2 border-[var(--color-primary-500)]/50" />

                  {/* Middle bubble 2 */}
                  <div className="glass-1 rounded-xl px-4 py-3">
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      기초체력이 모든 활동의 기반
                    </p>
                  </div>

                  {/* Connector */}
                  <div className="ml-4 h-5 border-l-2 border-[var(--color-primary-500)]/30" />

                  {/* Bottom bubble */}
                  <div className="glass-1 rounded-xl px-4 py-3">
                    <p className="text-xs text-[var(--color-text-secondary)]">매일 30분 러닝</p>
                  </div>
                </div>
              </div>
            </ScrollFadeIn>
          </div>
        </div>
      </section>

      {/* Section 03: 원탭 체크인 */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-6 md:px-8">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">
            {/* Text left */}
            <ScrollFadeIn className="flex-1">
              <span className="text-sm font-semibold tracking-widest text-[var(--color-primary-500)]">
                03
              </span>
              <h2 className="mt-3 font-serif text-2xl font-normal text-[var(--color-text-primary)] md:text-3xl lg:text-4xl">
                15초면 완료, 부담 제로
              </h2>
              <p className="mt-4 max-w-lg leading-relaxed text-[var(--color-text-secondary)]">
                Done 또는 Skip, 한 번의 탭으로 체크인 완료. 스트릭이 끊겨도 누적은 남아요. 새
                라운드에서 다시 시작하세요.
              </p>
            </ScrollFadeIn>

            {/* Visual right */}
            <ScrollFadeIn className="flex-1" delay={0.2}>
              <div className="glass-2 rounded-2xl p-6">
                {/* Task card */}
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-medium text-[var(--color-text-primary)]">
                    🏃 매일 30분 러닝
                  </span>
                  <span
                    className="flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-semibold"
                    style={{
                      color: 'var(--color-streak)',
                      backgroundColor: 'color-mix(in srgb, var(--color-streak) 15%, transparent)',
                    }}
                  >
                    🔥 12
                  </span>
                </div>

                <div className="flex gap-3" aria-hidden="true">
                  <div
                    className="flex-1 rounded-full px-6 py-2 text-center text-sm font-medium text-white"
                    style={{ backgroundColor: 'var(--color-done)' }}
                  >
                    ✅ Done
                  </div>
                  <div
                    className="flex-1 rounded-full px-6 py-2 text-center text-sm font-medium"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--color-skip) 20%, transparent)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    ⏭ Skip
                  </div>
                </div>
              </div>
            </ScrollFadeIn>
          </div>
        </div>
      </section>

      {/* Section 04: 시간 속의 실천 */}
      <section className="bg-[var(--color-bg-secondary)] py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-6 md:px-8">
          <div className="flex flex-col gap-12 lg:flex-row-reverse lg:items-center lg:gap-16">
            {/* Text right (reversed) */}
            <ScrollFadeIn className="flex-1">
              <span className="text-sm font-semibold tracking-widest text-[var(--color-primary-500)]">
                04
              </span>
              <h2 className="mt-3 font-serif text-2xl font-normal text-[var(--color-text-primary)] md:text-3xl lg:text-4xl">
                내 시간 안에서 배치
              </h2>
              <p className="mt-4 max-w-lg leading-relaxed text-[var(--color-text-secondary)]">
                시간대별로 할 일을 배치하고, 캘린더와 연동해서 빈 시간을 활용하세요. 지금 뭘 할
                차례인지 바로 보여요.
              </p>
            </ScrollFadeIn>

            {/* Visual left (reversed) */}
            <ScrollFadeIn className="flex-1" delay={0.2}>
              <div className="glass-2 rounded-2xl p-6">
                <div className="flex flex-col gap-3">
                  {/* Morning */}
                  <div className="flex items-center gap-4">
                    <span className="w-16 shrink-0 text-sm text-[var(--color-text-secondary)]">
                      🌅 아침
                    </span>
                    <div
                      className="glass-1 flex-1 rounded-lg border-l-4 px-3 py-2"
                      style={{ borderColor: 'var(--color-area-health)' }}
                    >
                      <span className="text-sm text-[var(--color-text-primary)]">
                        매일 30분 러닝
                      </span>
                    </div>
                  </div>

                  {/* Afternoon */}
                  <div className="flex items-center gap-4">
                    <span className="w-16 shrink-0 text-sm text-[var(--color-text-secondary)]">
                      ☀️ 오후
                    </span>
                    <div
                      className="glass-1 flex-1 rounded-lg border-l-4 px-3 py-2"
                      style={{ borderColor: 'var(--color-area-career)' }}
                    >
                      <span className="text-sm text-[var(--color-text-primary)]">영어 쉐도잉</span>
                    </div>
                  </div>

                  {/* Evening */}
                  <div className="flex items-center gap-4">
                    <span className="w-16 shrink-0 text-sm text-[var(--color-text-secondary)]">
                      🌙 저녁
                    </span>
                    <div
                      className="glass-1 flex-1 rounded-lg border-l-4 px-3 py-2"
                      style={{ borderColor: 'var(--color-area-hobbies)' }}
                    >
                      <span className="text-sm text-[var(--color-text-primary)]">독서 30분</span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollFadeIn>
          </div>
        </div>
      </section>

      {/* Section 05: AI 어드바이저 */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-6 md:px-8">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">
            {/* Text left */}
            <ScrollFadeIn className="flex-1">
              <span className="text-sm font-semibold tracking-widest text-[var(--color-primary-500)]">
                05
              </span>
              <h2 className="mt-3 font-serif text-2xl font-normal text-[var(--color-text-primary)] md:text-3xl lg:text-4xl">
                데이터 기반의 현실적 조언
              </h2>
              <p className="mt-4 max-w-lg leading-relaxed text-[var(--color-text-secondary)]">
                AI가 실제 달성률, 스트릭, 기분 패턴을 참고해 현실적인 조언을 드려요. 목표 분해,
                페이스 조절, 동기 부여까지.
              </p>
            </ScrollFadeIn>

            {/* Visual right */}
            <ScrollFadeIn className="flex-1" delay={0.2}>
              <div className="glass-2 rounded-2xl p-6">
                <div className="flex flex-col gap-3">
                  {/* AI bubble */}
                  <div
                    className="max-w-[85%] self-start rounded-2xl p-4 text-sm leading-relaxed"
                    style={{
                      backgroundColor: 'var(--color-ai-bg)',
                      color: 'var(--color-ai)',
                    }}
                  >
                    💡 독서 스트릭 5일째! 이번 달 목표한 2권 중 1권은 거뜬하겠네요. 내일은 좀 쉬어도
                    괜찮아요 🙂
                  </div>

                  {/* User bubble */}
                  <div className="glass-1 max-w-[75%] self-end rounded-2xl p-4 text-sm text-[var(--color-text-primary)]">
                    고마워요, 내일은 가볍게 할게요
                  </div>
                </div>
              </div>
            </ScrollFadeIn>
          </div>
        </div>
      </section>

      {/* Section 06: Final CTA */}
      <section className="bg-[var(--color-bg-secondary)] py-24 md:py-32">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <ScrollFadeIn>
            <h2 className="font-serif text-2xl font-normal text-[var(--color-text-primary)] md:text-3xl lg:text-4xl">
              지금 시작하세요
            </h2>
            <p className="mt-4 text-[var(--color-text-secondary)]">
              쉬어도 괜찮아요. 다시 시작하는 것이 중요합니다.
            </p>
            <Link href="/signup">
              <Button size="lg" className="mt-8 px-12">
                무료로 시작하기
              </Button>
            </Link>
            <p className="mt-4 text-sm text-[var(--color-text-tertiary)]">
              이미 계정이 있으신가요?{' '}
              <Link href="/login" className="text-[var(--color-primary-500)] hover:underline">
                로그인
              </Link>
            </p>
          </ScrollFadeIn>
        </div>
      </section>
    </>
  )
}
