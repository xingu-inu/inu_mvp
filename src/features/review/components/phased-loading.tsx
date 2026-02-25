'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'

const DEFAULT_MESSAGES = [
  { text: '데이터를 분석하고 있어요...', delay: 0 },
  { text: '패턴을 발견하고 있어요...', delay: 2000 },
  { text: '맞춤 제안을 준비하고 있어요...', delay: 4000 },
]

interface PhasedLoadingProps {
  isLoading: boolean
  messages?: { text: string; delay: number }[]
}

export function PhasedLoading({ isLoading, messages = DEFAULT_MESSAGES }: PhasedLoadingProps) {
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    if (!isLoading) return

    const timers = messages.map((msg, i) => setTimeout(() => setMessageIndex(i), msg.delay))

    return () => timers.forEach((t) => clearTimeout(t))
  }, [isLoading, messages])

  if (!isLoading) return null

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Sparkles className="h-5 w-5 animate-pulse text-[var(--color-primary-400)]" />
      <AnimatePresence mode="wait">
        <motion.p
          key={messageIndex}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.3 }}
          className="text-sm text-[var(--color-text-tertiary)]"
        >
          {messages[messageIndex].text}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}
