'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useGoals, useCreateGoal } from '@/queries/use-goals'
import { useAreas } from '@/queries/use-areas'
import { useDirection } from '@/queries/use-direction'
import { useRoadmapStore, selectStatusFilter } from '@/stores/roadmap.store'
import { useGoalVibeStore } from '@/stores/goal-vibe.store'
import { useStickyNotesStore } from '@/stores/sticky-notes.store'
import { buildVisualTreeData } from './visual-tree'

import { VisualTreeSkeleton } from '../visual-tree-skeleton'
import { TreeSearchBar } from './tree-search-bar'
import { useTreeSearch } from '../../hooks/use-tree-search'
import { CommandPalette, buildRoadmapCommands } from './command-palette'
import { CanvasView } from '../canvas-view/canvas-view'

// ── Convert-to-Goal floater ──────────────────────────────────────────────────

interface ConvertFloaterProps {
  initialText: string
  areas: { id: string; name: string; emoji: string | null }[]
  onClose: () => void
}

function ConvertToGoalFloater({ initialText, areas, onClose }: ConvertFloaterProps) {
  const [name, setName] = useState(initialText)
  const [areaId, setAreaId] = useState(areas[0]?.id ?? '')
  const createGoal = useCreateGoal()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [])

  const handleSubmit = useCallback(() => {
    const trimmed = name.trim()
    if (!trimmed || !areaId) return
    createGoal.mutate(
      { area_id: areaId, name: trimmed, status: 'active' },
      { onSuccess: () => onClose() }
    )
  }, [name, areaId, createGoal, onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-80 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-5 shadow-xl">
        <p className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">목표로 전환</p>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit()
            if (e.key === 'Escape') onClose()
          }}
          placeholder="목표 이름"
          className="mb-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary-300)]"
          maxLength={100}
        />
        {areas.length > 0 && (
          <select
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
            className="mb-4 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm outline-none"
          >
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.emoji ? `${a.emoji} ` : ''}
                {a.name}
              </option>
            ))}
          </select>
        )}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !areaId || createGoal.isPending}
            className="rounded-lg bg-[var(--color-primary-500)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-primary-600)] disabled:opacity-40"
          >
            목표 추가
          </button>
        </div>
      </div>
    </div>
  )
}

export function VisualTreeWrapper() {
  const clearSelection = useRoadmapStore((s) => s.clearSelection)
  const statusFilter = useRoadmapStore(selectStatusFilter)
  const setStatusFilter = useRoadmapStore((s) => s.setStatusFilter)
  const setIsBrainDumpOpen = useRoadmapStore((s) => s.setIsBrainDumpOpen)
  const openDiagnosis = useRoadmapStore((s) => s.openDiagnosis)
  const selection = useRoadmapStore((s) => s.selection)
  const setInlineMode = useRoadmapStore((s) => s.setInlineMode)
  const treeLayout = useRoadmapStore((s) => s.treeLayout)
  const setTreeLayout = useRoadmapStore((s) => s.setTreeLayout)
  const goalVibes = useGoalVibeStore((s) => s.goalVibes)
  const addNote = useStickyNotesStore((s) => s.addNote)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [convertText, setConvertText] = useState<string | null>(null)

  const { data: direction } = useDirection()
  const { data: goals = [], isLoading: goalsLoading } = useGoals()
  const { data: areas = [], isLoading: areasLoading } = useAreas()

  const isLoading = goalsLoading || areasLoading
  const activeAreas = useMemo(() => areas.filter((area) => area.is_active), [areas])

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Build tree ONCE — shared by search and CanvasView
  const { tree: treeData, crossLinks } = useMemo(
    () => buildVisualTreeData(direction ?? null, activeAreas, goals, statusFilter, goalVibes),
    [direction, activeAreas, goals, statusFilter, goalVibes]
  )

  const searchResult = useTreeSearch(treeData, searchQuery)

  // Map group/task IDs to their parent goal IDs (needed by CanvasView for selection)
  const parentGoalMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const goal of goals) {
      for (const group of goal.groups || []) {
        map.set(group.id, goal.id)
        for (const task of (goal.tasks || []).filter((t) => t.group_id === group.id)) {
          map.set(task.id, goal.id)
        }
      }
      for (const task of (goal.tasks || []).filter((t) => !t.group_id)) {
        map.set(task.id, goal.id)
      }
    }
    return map
  }, [goals])

  const handleSearchNavigate = useCallback((_nodeId: string) => {
    // In canvas mode, we could use fitView to focus on the node
    // For now, the search bar handles highlighting
  }, [])

  const handleSearchClose = useCallback(() => {
    setIsSearchOpen(false)
    setSearchQuery('')
  }, [])

  const toggleLayout = useCallback(
    () => setTreeLayout(treeLayout === 'vertical' ? 'horizontal' : 'vertical'),
    [treeLayout, setTreeLayout]
  )

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isEditable = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'

      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setIsSearchOpen(true)
        return
      }

      if (e.key === 'Escape') {
        if (isCommandPaletteOpen) {
          setIsCommandPaletteOpen(false)
        } else if (isSearchOpen) {
          handleSearchClose()
        } else {
          clearSelection()
        }
        return
      }

      if (isEditable || isCommandPaletteOpen) return

      if (e.key === '/') {
        e.preventDefault()
        setIsCommandPaletteOpen(true)
        return
      }

      if (e.key === 'n' || e.key === 'N') {
        addNote(0, 0)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isSearchOpen, isCommandPaletteOpen, handleSearchClose, clearSelection, addNote])

  // Command palette commands
  const commands = buildRoadmapCommands({
    onOpenBrainDump: () => setIsBrainDumpOpen(true),
    onOpenDiagnosis: () => openDiagnosis(),
    onOpenSearch: () => setIsSearchOpen(true),
    onZoomToFit: () => {}, // handled by ReactFlow internally
    onToggleMinimap: () => {}, // ReactFlow minimap is always visible
    onToggleLayout: toggleLayout,
    onFilterStatus: () => {
      const statuses = [
        'all',
        'active',
        'backlog',
        'completed',
        'maintenance',
        'paused',
        'archived',
      ] as const
      const currentIndex = statuses.indexOf(statusFilter as (typeof statuses)[number])
      const next = statuses[(currentIndex + 1) % statuses.length]
      setStatusFilter(next)
    },
    onAddGoal: () => setInlineMode?.('create-goal'),
    onAddTask: () => setInlineMode('create-task'),
    onAddStickyNote: () => addNote(0, 0),
    hasGoalSelected: () =>
      selection.type === 'goal' || selection.type === 'group' || selection.type === 'task',
  })

  if (isLoading) {
    return <VisualTreeSkeleton />
  }

  return (
    <div className="relative min-h-0 flex-1">
      {/* Search bar — floating above canvas */}
      <TreeSearchBar
        isOpen={isSearchOpen}
        onClose={handleSearchClose}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        currentIndex={searchResult.currentIndex}
        total={searchResult.total}
        onNext={searchResult.goNext}
        onPrev={searchResult.goPrev}
        onNavigate={handleSearchNavigate}
        orderedMatches={searchResult.orderedMatches}
      />

      {/* Command palette — floating overlay */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        commands={commands}
      />

      {/* ReactFlow Canvas — replaces old VisualTree + zoom/pan/minimap */}
      <div className="absolute inset-0">
        <CanvasView
          treeData={treeData}
          crossLinks={crossLinks}
          parentGoalMap={parentGoalMap}
          onConvertToGoal={(text) => setConvertText(text)}
        />
      </div>

      {/* Convert-to-Goal modal */}
      {convertText !== null && (
        <ConvertToGoalFloater
          initialText={convertText}
          areas={activeAreas}
          onClose={() => setConvertText(null)}
        />
      )}
    </div>
  )
}
