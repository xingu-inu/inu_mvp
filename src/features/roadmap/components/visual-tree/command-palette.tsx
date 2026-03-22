'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target,
  CheckCircle,
  StickyNote,
  Brain,
  Stethoscope,
  Search,
  Maximize,
  Map,
  LayoutGrid,
  Filter,
  type LucideIcon,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

export type CommandCategory = 'create' | 'navigate' | 'ai' | 'view'

export interface Command {
  id: string
  label: string
  icon: LucideIcon
  shortcut?: string
  action: () => void
  category: CommandCategory
  contextCheck?: () => boolean
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  commands: Command[]
}

// ── Fuzzy search ─────────────────────────────────────────────────────────────

function fuzzyScore(query: string, label: string): number {
  if (!query) return 1
  const q = query.toLowerCase()
  const l = label.toLowerCase()

  // Exact prefix gets highest score
  if (l.startsWith(q)) return 1000 - l.length

  let qi = 0
  let score = 0
  let consecutive = 0
  let lastMatch = -1

  for (let li = 0; li < l.length && qi < q.length; li++) {
    if (l[li] === q[qi]) {
      // Bonus for consecutive matches
      consecutive = lastMatch === li - 1 ? consecutive + 1 : 0
      score += 10 + consecutive * 5
      // Bonus for match near start
      score += Math.max(0, 10 - li)
      lastMatch = li
      qi++
    }
  }

  // All query chars must match
  if (qi < q.length) return -1

  return score
}

function filterCommands(commands: Command[], query: string): Command[] {
  const visible = commands.filter((cmd) => !cmd.contextCheck || cmd.contextCheck())

  if (!query.trim()) return visible

  return visible
    .map((cmd) => ({ cmd, score: fuzzyScore(query, cmd.label) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ cmd }) => cmd)
}

// ── Category labels ───────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<CommandCategory, string> = {
  create: '만들기',
  ai: 'AI',
  navigate: '탐색',
  view: '보기',
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CommandPalette({ isOpen, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const filtered = filterCommands(commands, query)

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        setQuery('')
        setSelectedIndex(0)
        inputRef.current?.focus()
      }, 0)
    }
  }, [isOpen])

  // Keep selected index in bounds when filtered list changes
  useEffect(() => {
    const t = setTimeout(
      () => setSelectedIndex((i) => Math.min(i, Math.max(0, filtered.length - 1))),
      0
    )
    return () => clearTimeout(t)
  }, [filtered.length])

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const item = list.children[selectedIndex] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const executeCommand = useCallback(
    (cmd: Command) => {
      onClose()
      // Defer action so the palette closes before triggering side-effects
      setTimeout(() => cmd.action(), 0)
    },
    [onClose]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const cmd = filtered[selectedIndex]
        if (cmd) executeCommand(cmd)
        return
      }
    },
    [filtered, selectedIndex, executeCommand, onClose]
  )

  // Group filtered results by category (preserving fuzzy order within group)
  const grouped = filtered.reduce<{ category: CommandCategory; items: Command[] }[]>((acc, cmd) => {
    const existing = acc.find((g) => g.category === cmd.category)
    if (existing) {
      existing.items.push(cmd)
    } else {
      acc.push({ category: cmd.category, items: [cmd] })
    }
    return acc
  }, [])

  // Flat list for index tracking
  const flatItems = grouped.flatMap((g) => g.items)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="absolute inset-0 z-30" onClick={onClose} aria-hidden="true" />

          {/* Palette panel */}
          <motion.div
            className="absolute left-1/2 z-40 w-[440px] max-w-[calc(100%-32px)] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)]/95 shadow-xl backdrop-blur-md"
            style={{ top: '20%', translateX: '-50%' }}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            aria-label="Command Palette"
          >
            {/* Search input */}
            <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] px-3.5 py-3">
              <Search className="h-4 w-4 flex-shrink-0 text-[var(--color-text-tertiary)]" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setSelectedIndex(0)
                }}
                onKeyDown={handleKeyDown}
                placeholder="Type a command..."
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none"
                aria-label="명령어 검색"
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className="flex-shrink-0 rounded border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-tertiary)]">
                ESC
              </kbd>
            </div>

            {/* Command list */}
            <ul
              ref={listRef}
              className="max-h-[300px] overflow-y-auto py-1.5"
              role="listbox"
              aria-label="명령어 목록"
            >
              {grouped.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-[var(--color-text-tertiary)]">
                  일치하는 명령어가 없습니다
                </li>
              )}

              {grouped.map(({ category, items }) => (
                <div key={category}>
                  {/* Category header */}
                  <div className="px-3.5 pt-2 pb-0.5 text-[10px] font-semibold tracking-wider text-[var(--color-text-tertiary)] uppercase">
                    {CATEGORY_LABEL[category]}
                  </div>

                  {items.map((cmd) => {
                    const flatIndex = flatItems.indexOf(cmd)
                    const isSelected = flatIndex === selectedIndex
                    const Icon = cmd.icon

                    return (
                      <li
                        key={cmd.id}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => executeCommand(cmd)}
                        onMouseEnter={() => setSelectedIndex(flatIndex)}
                        className={`mx-1.5 flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 transition-colors ${
                          isSelected
                            ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'
                            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
                        }`}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0 opacity-70" />
                        <span className="min-w-0 flex-1 truncate text-sm">{cmd.label}</span>
                        {cmd.shortcut && (
                          <kbd className="flex-shrink-0 rounded border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-tertiary)]">
                            {cmd.shortcut}
                          </kbd>
                        )}
                      </li>
                    )
                  })}
                </div>
              ))}
            </ul>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Command factory helpers ───────────────────────────────────────────────────

export function buildRoadmapCommands(handlers: {
  onOpenBrainDump: () => void
  onOpenDiagnosis: () => void
  onOpenSearch: () => void
  onZoomToFit: () => void
  onToggleMinimap: () => void
  onToggleLayout: () => void
  onFilterStatus: () => void
  onAddGoal: () => void
  onAddTask: () => void
  onAddStickyNote: () => void
  hasGoalSelected: () => boolean
}): Command[] {
  return [
    {
      id: 'add-goal',
      label: 'Add Goal',
      icon: Target,
      shortcut: 'G',
      category: 'create',
      action: handlers.onAddGoal,
    },
    {
      id: 'add-task',
      label: 'Add Task',
      icon: CheckCircle,
      shortcut: 'T',
      category: 'create',
      action: handlers.onAddTask,
      contextCheck: handlers.hasGoalSelected,
    },
    {
      id: 'add-sticky-note',
      label: 'Add Sticky Note',
      icon: StickyNote,
      shortcut: 'N',
      category: 'create',
      action: handlers.onAddStickyNote,
    },
    {
      id: 'brain-dump',
      label: 'Brain Dump',
      icon: Brain,
      shortcut: 'B',
      category: 'ai',
      action: handlers.onOpenBrainDump,
    },
    {
      id: 'ai-diagnose',
      label: 'AI Diagnose',
      icon: Stethoscope,
      shortcut: 'D',
      category: 'ai',
      action: handlers.onOpenDiagnosis,
    },
    {
      id: 'search-tree',
      label: 'Search Tree',
      icon: Search,
      shortcut: 'Ctrl+F',
      category: 'navigate',
      action: handlers.onOpenSearch,
    },
    {
      id: 'zoom-to-fit',
      label: 'Zoom to Fit',
      icon: Maximize,
      category: 'navigate',
      action: handlers.onZoomToFit,
    },
    {
      id: 'toggle-minimap',
      label: 'Toggle Minimap',
      icon: Map,
      shortcut: 'M',
      category: 'navigate',
      action: handlers.onToggleMinimap,
    },
    {
      id: 'toggle-layout',
      label: 'Toggle Layout',
      icon: LayoutGrid,
      shortcut: 'L',
      category: 'view',
      action: handlers.onToggleLayout,
    },
    {
      id: 'filter-status',
      label: 'Filter by Status',
      icon: Filter,
      category: 'view',
      action: handlers.onFilterStatus,
    },
  ]
}
