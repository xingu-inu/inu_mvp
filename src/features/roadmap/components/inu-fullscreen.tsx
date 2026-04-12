'use client'

import dynamic from 'next/dynamic'
import { AnimatePresence, motion } from 'framer-motion'
import { useAiChatStore } from '@/stores/ai-chat.store'

const AiChatPanel = dynamic(
  () => import('@/components/layout/ai-chat/ai-chat-panel').then((m) => m.AiChatPanel),
  { ssr: false }
)

export function InuFullscreen() {
  const isOpen = useAiChatStore((s) => s.isInuFullscreen)
  const close = useAiChatStore((s) => s.closeInuFullscreen)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed inset-0 z-50 lg:hidden"
        >
          <AiChatPanel fullscreen onClose={close} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
