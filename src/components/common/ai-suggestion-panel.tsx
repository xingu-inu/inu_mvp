'use client'

import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface AiSuggestion {
  text: string
  description?: string
}

interface AiSuggestionPanelProps {
  triggerLabel?: string
  isLoading: boolean
  error: Error | null
  suggestions: AiSuggestion[]
  selectedValue?: string
  onSelect: (suggestion: AiSuggestion) => void
  onGenerate: () => void
  showDescriptions?: boolean
  className?: string
}

export function AiSuggestionPanel({
  triggerLabel = 'AI로 아이디어 받기',
  isLoading,
  error,
  suggestions,
  selectedValue,
  onSelect,
  onGenerate,
  showDescriptions = false,
  className,
}: AiSuggestionPanelProps) {
  const hasSuggestions = suggestions.length > 0

  return (
    <div className={cn('space-y-2', className)}>
      {/* Trigger / Regenerate */}
      <button
        type="button"
        onClick={onGenerate}
        disabled={isLoading}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
          'disabled:pointer-events-none disabled:opacity-60',
          hasSuggestions
            ? 'text-[var(--color-text-tertiary)] hover:text-[var(--color-primary-500)]'
            : 'border border-dashed border-[var(--color-primary-300)] text-[var(--color-primary-500)] hover:border-[var(--color-primary-400)] hover:bg-[var(--color-primary-50)]'
        )}
      >
        {isLoading ? (
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        {hasSuggestions ? '다시 받기' : triggerLabel}
      </button>

      {/* Error State */}
      <AnimatePresence>
        {error && !isLoading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 rounded-lg bg-[var(--color-miss)]/10 px-3 py-2 text-xs text-[var(--color-miss)]"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2 px-1">
              <motion.div
                animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.15, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Sparkles className="h-3 w-3 text-[var(--color-primary-400)]" />
              </motion.div>
              <span className="text-[11px] text-[var(--color-text-tertiary)]">
                AI가 생각하고 있어요
                <motion.span
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  ...
                </motion.span>
              </span>
            </div>
            {showDescriptions ? (
              /* Card-style skeleton for description mode */
              <div className="space-y-1.5">
                {[80, 90, 70].map((width, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div
                      className="h-10 overflow-hidden rounded-lg bg-[var(--color-bg-tertiary)]"
                      style={{ width: `${width}%` }}
                    >
                      <motion.div
                        className="h-full rounded-lg"
                        style={{
                          background:
                            'linear-gradient(90deg, transparent 0%, var(--color-bg-secondary) 50%, transparent 100%)',
                        }}
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: 'easeInOut',
                          delay: i * 0.15,
                        }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              /* Chip-style skeleton for compact mode */
              <div className="flex flex-wrap gap-1.5">
                {[96, 120, 84].map((width, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <div
                      className="h-7 overflow-hidden rounded-full bg-[var(--color-bg-tertiary)]"
                      style={{ width: `${width}px` }}
                    >
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background:
                            'linear-gradient(90deg, transparent 0%, var(--color-bg-secondary) 50%, transparent 100%)',
                        }}
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: 'easeInOut',
                          delay: i * 0.15,
                        }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Suggestion Items */}
      <AnimatePresence>
        {hasSuggestions && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={showDescriptions ? 'space-y-1.5' : 'flex flex-wrap gap-1.5'}
          >
            {suggestions.map((suggestion, index) =>
              showDescriptions ? (
                /* Card mode: with descriptions */
                <motion.button
                  key={suggestion.text}
                  type="button"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onSelect(suggestion)}
                  className={cn(
                    'flex w-full flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-all',
                    selectedValue === suggestion.text
                      ? 'border-[var(--color-primary-400)] bg-[var(--color-primary-50)] text-[var(--color-primary-600)]'
                      : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary-200)] hover:bg-[var(--color-primary-50)]/50'
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 shrink-0 text-[var(--color-primary-400)]" />
                    {suggestion.text}
                  </span>
                  {suggestion.description && (
                    <span className="ml-[18px] text-xs text-[var(--color-text-tertiary)]">
                      {suggestion.description}
                    </span>
                  )}
                </motion.button>
              ) : (
                /* Chip mode: compact pills */
                <motion.button
                  key={suggestion.text}
                  type="button"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.04 }}
                  onClick={() => onSelect(suggestion)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition-all',
                    selectedValue === suggestion.text
                      ? 'border-[var(--color-primary-400)] bg-[var(--color-primary-50)] text-[var(--color-primary-600)]'
                      : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary-200)] hover:bg-[var(--color-primary-50)]/50'
                  )}
                >
                  <Sparkles className="h-3 w-3 shrink-0 text-[var(--color-primary-400)]" />
                  {suggestion.text}
                </motion.button>
              )
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
