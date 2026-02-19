'use client'

import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

interface FloatingCardProps {
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}

function FloatingCard({ className, style, children }: FloatingCardProps) {
  return (
    <div
      className={['glass-2 animate-card-float w-48 rounded-2xl p-4 shadow-sm', className]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      {children}
    </div>
  )
}

export function LandingHero() {
  const reducedMotion = useReducedMotion()

  const fadeUp = (delay: number) =>
    reducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay },
        }

  return (
    <section
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center"
      style={{
        background:
          'linear-gradient(180deg, var(--color-bg-primary) 0%, var(--color-primary-50) 100%)',
      }}
    >
      {/* Left floating card */}
      <motion.div
        className="absolute top-1/2 left-[5%] hidden -translate-y-1/2 lg:block"
        {...(reducedMotion
          ? {}
          : {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              transition: { duration: 0.6, delay: 0.8 },
            })}
      >
        <FloatingCard>
          <p className="text-sm font-medium text-[var(--color-text-primary)]">매일 30분 러닝</p>
          <div className="mt-2 flex items-center gap-1">
            <span className="text-[var(--color-streak)]">🔥</span>
            <span className="text-sm font-semibold text-[var(--color-streak)]">12</span>
          </div>
        </FloatingCard>
      </motion.div>

      {/* Right floating card */}
      <motion.div
        className="absolute top-1/2 right-[5%] hidden -translate-y-1/2 lg:block"
        {...(reducedMotion
          ? {}
          : {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              transition: { duration: 0.6, delay: 0.8 },
            })}
      >
        <FloatingCard style={{ animationDelay: '-3s' }}>
          <p className="text-sm font-medium text-[var(--color-text-primary)]">영어 쉐도잉 10분</p>
          <div className="mt-2 flex items-center gap-1">
            <span className="text-[var(--color-done)]">✓</span>
            <span className="text-sm text-[var(--color-done)]">완료</span>
          </div>
        </FloatingCard>
      </motion.div>

      {/* Hero content */}
      <div className="relative z-10 flex flex-col items-center">
        <motion.h1
          className="font-serif text-3xl leading-tight font-normal text-[var(--color-text-primary)] md:text-4xl lg:text-5xl"
          {...fadeUp(0.2)}
        >
          내 인생의 로드맵을 그리고,
          <br />
          매일 한 걸음씩
        </motion.h1>

        <motion.p
          className="mx-auto mt-6 max-w-md text-base text-[var(--color-text-secondary)] md:text-lg"
          {...fadeUp(0.4)}
        >
          방향 → 목표 → 실천. 왜 하는지 기억하면서, 내 시간 안에서 조금씩 나아가세요.
        </motion.p>

        <motion.div {...fadeUp(0.6)}>
          <Link href="/signup">
            <Button size="lg" className="mt-10 px-12">
              시작하기
            </Button>
          </Link>
        </motion.div>

        <motion.p className="mt-6 text-sm text-[var(--color-text-tertiary)]" {...fadeUp(0.6)}>
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-[var(--color-primary-500)] hover:underline">
            로그인
          </Link>
        </motion.p>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <ChevronDown
          className="animate-bounce text-[var(--color-text-tertiary)]"
          size={24}
          aria-hidden="true"
        />
      </div>
    </section>
  )
}
