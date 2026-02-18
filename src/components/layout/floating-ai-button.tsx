'use client'

import { BotMessageSquare, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import { useAiChatStore } from '@/stores/ai-chat.store'
import { AiChatPanel } from './ai-chat-panel'

export function FloatingAIButton() {
  const { isOpen, toggleChat } = useAiChatStore()

  const handleClick = () => {
    if (!isOpen) {
      trackEvent(ANALYTICS_EVENTS.AI_CHAT_STARTED)
    }
    toggleChat()
  }

  return (
    <>
      {/* Chat Panel */}
      <AnimatePresence>{isOpen && <AiChatPanel />}</AnimatePresence>

      {/* Floating Button */}
      <motion.button
        onClick={handleClick}
        className={cn(
          'fixed z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-colors',
          'right-6 bottom-6 lg:right-8 lg:bottom-8',
          'mb-16 lg:mb-0',
          isOpen
            ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]'
            : 'bg-gradient-to-br from-[var(--color-ai)] to-[var(--color-primary-600)] text-white'
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={isOpen ? 'AI 채팅 닫기' : 'AI 코치와 대화'}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="h-6 w-6" />
            </motion.div>
          ) : (
            <motion.div
              key="bot"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <BotMessageSquare className="h-6 w-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  )
}
