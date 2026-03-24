'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Minus, Plus, Maximize2, ArrowDownUp, ArrowRightLeft, Search } from 'lucide-react'
import { useGoals, useCreateGoal } from '@/queries/use-goals'
import { useAreas } from '@/queries/use-areas'
import { useDirection } from '@/queries/use-direction'
import { useRoadmapStore, selectStatusFilter } from '@/stores/roadmap.store'
import { useGoalVibeStore } from '@/stores/goal-vibe.store'
import { useStickyNotesStore } from '@/stores/sticky-notes.store'
import { MIN_ZOOM, MAX_ZOOM, ZOOM_STEP, DEFAULT_ZOOM } from '@/lib/constants/visual-tree'
import { VisualTree, buildVisualTreeData } from './visual-tree'
import { StickyNote } from './sticky-note'

import { VisualTreeSkeleton } from '../visual-tree-skeleton'
import { TreeSearchBar } from './tree-search-bar'
import { TreeMinimap } from './tree-minimap'
import { useTreeSearch } from '../../hooks/use-tree-search'
import { CommandPalette, buildRoadmapCommands } from './command-palette'

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

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100))
}

export function VisualTreeWrapper() {
  const clearSelection = useRoadmapStore((s) => s.clearSelection)
  const treeLayout = useRoadmapStore((s) => s.treeLayout)
  const setTreeLayout = useRoadmapStore((s) => s.setTreeLayout)
  const statusFilter = useRoadmapStore(selectStatusFilter)
  const setStatusFilter = useRoadmapStore((s) => s.setStatusFilter)
  const setIsBrainDumpOpen = useRoadmapStore((s) => s.setIsBrainDumpOpen)
  const openDiagnosis = useRoadmapStore((s) => s.openDiagnosis)
  const selection = useRoadmapStore((s) => s.selection)
  const setInlineMode = useRoadmapStore((s) => s.setInlineMode)
  const goalVibes = useGoalVibeStore((s) => s.goalVibes)
  const notes = useStickyNotesStore((s) => s.notes)
  const addNote = useStickyNotesStore((s) => s.addNote)
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const [isPanning, setIsPanning] = useState(false)
  const [isMinimapVisible, setIsMinimapVisible] = useState(true)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [convertText, setConvertText] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const panStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 })
  const lastClickTime = useRef(0)
  const lastClickTarget = useRef<EventTarget | null>(null)

  const { data: direction } = useDirection()
  const { data: goals = [], isLoading: goalsLoading } = useGoals()
  const { data: areas = [], isLoading: areasLoading } = useAreas()

  const isLoading = goalsLoading || areasLoading
  const activeAreas = useMemo(() => areas.filter((area) => area.is_active), [areas])

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Build tree ONCE — shared by search and VisualTree
  const { tree: treeData, crossLinks } = useMemo(
    () => buildVisualTreeData(direction ?? null, activeAreas, goals, statusFilter, goalVibes),
    [direction, activeAreas, goals, statusFilter, goalVibes]
  )

  const searchResult = useTreeSearch(treeData, searchQuery)

  // Scroll to node when navigating search results
  const handleSearchNavigate = useCallback((nodeId: string) => {
    const el = document.querySelector(`[data-node-id="${CSS.escape(nodeId)}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
  }, [])

  const handleSearchClose = useCallback(() => {
    setIsSearchOpen(false)
    setSearchQuery('')
  }, [])

  // Add sticky note at viewport center — called from event handlers only, not during render
  const addNoteAtCenter = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const contentEl = el.firstElementChild as HTMLElement | null
    const offsetX = contentEl ? Math.max(0, (el.clientWidth - contentEl.offsetWidth * zoom) / 2) : 0
    const offsetY = contentEl
      ? Math.max(0, (el.clientHeight - contentEl.offsetHeight * zoom) / 2)
      : 0
    const x = (el.scrollLeft + el.clientWidth / 2 - offsetX) / zoom - 80
    const y = (el.scrollTop + el.clientHeight / 2 - offsetY) / zoom - 60
    addNote(x, y)
  }, [zoom, addNote])

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

      if (e.key === 'm' || e.key === 'M') {
        setIsMinimapVisible((v) => !v)
      }

      if (e.key === 'n' || e.key === 'N') {
        addNoteAtCenter()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isSearchOpen, isCommandPaletteOpen, handleSearchClose, clearSelection, addNoteAtCenter])

  const zoomIn = useCallback(() => setZoom((z) => clampZoom(z + ZOOM_STEP)), [])
  const zoomOut = useCallback(() => setZoom((z) => clampZoom(z - ZOOM_STEP)), [])
  const resetZoom = useCallback(() => setZoom(DEFAULT_ZOOM), [])
  const toggleLayout = useCallback(
    () => setTreeLayout(treeLayout === 'vertical' ? 'horizontal' : 'vertical'),
    [treeLayout, setTreeLayout]
  )

  // Command palette commands — all callbacks are invoked from user interactions only, not during render
  // eslint-disable-next-line react-hooks/refs
  const commands = buildRoadmapCommands({
    onOpenBrainDump: () => setIsBrainDumpOpen(true),
    onOpenDiagnosis: () => openDiagnosis(),
    onOpenSearch: () => setIsSearchOpen(true),
    onZoomToFit: resetZoom,
    onToggleMinimap: () => setIsMinimapVisible((v) => !v),
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
    onAddStickyNote: addNoteAtCenter,
    hasGoalSelected: () =>
      selection.type === 'goal' || selection.type === 'group' || selection.type === 'task',
  })

  // Native wheel listener (non-passive) for Ctrl+scroll zoom
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
      setZoom((z) => clampZoom(z + delta))
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Drag-to-pan
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('button, a, [role="button"], input, textarea, [data-draggable]')) return

    const el = scrollRef.current
    if (!el) return

    setIsPanning(true)
    panStart.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop,
    }
    el.setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isPanning) return
      const el = scrollRef.current
      if (!el) return

      const dx = e.clientX - panStart.current.x
      const dy = e.clientY - panStart.current.y
      el.scrollLeft = panStart.current.scrollLeft - dx
      el.scrollTop = panStart.current.scrollTop - dy
    },
    [isPanning]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      setIsPanning(false)
      const el = scrollRef.current
      if (!el) return

      // Click vs pan: less than 5px movement = click on background → clear focus
      const dx = e.clientX - panStart.current.x
      const dy = e.clientY - panStart.current.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance < 5) {
        const target = e.target as HTMLElement
        if (!target.closest('button, a, [role="button"], [data-node-card]')) {
          clearSelection()
        }

        // Double-click on canvas background → create sticky note
        const now = Date.now()
        const isSameTarget = lastClickTarget.current === e.target
        const isDoubleClick = isSameTarget && now - lastClickTime.current < 350

        if (isDoubleClick) {
          const clickTarget = e.target as HTMLElement
          if (
            !clickTarget.closest(
              '[data-node-card], button, a, [role="button"], input, textarea, [data-sticky-note]'
            )
          ) {
            const contentEl = el.firstElementChild as HTMLElement | null
            const offsetX = contentEl
              ? Math.max(0, (el.clientWidth - contentEl.offsetWidth * zoom) / 2)
              : 0
            const offsetY = contentEl
              ? Math.max(0, (el.clientHeight - contentEl.offsetHeight * zoom) / 2)
              : 0
            const rect = el.getBoundingClientRect()
            const relX = e.clientX - rect.left + el.scrollLeft
            const relY = e.clientY - rect.top + el.scrollTop
            const x = (relX - offsetX) / zoom - 80
            const y = (relY - offsetY) / zoom - 60
            addNote(x, y)
          }
          lastClickTime.current = 0
          lastClickTarget.current = null
        } else {
          lastClickTime.current = now
          lastClickTarget.current = e.target
        }
      }
    },
    [clearSelection, zoom, addNote]
  )

  if (isLoading) {
    return <VisualTreeSkeleton />
  }

  const zoomPercent = Math.round(zoom * 100)

  return (
    <div className="relative min-h-0 flex-1">
      {/* Search bar — floating above tree, outside zoom */}
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

      {/* Command palette — floating overlay, outside zoom */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        commands={commands}
      />

      {/* Scrollable tree area with drag-to-pan */}
      <div
        className={`bg-dot-grid absolute inset-0 flex overflow-auto bg-[var(--color-bg-canvas)] ${isPanning ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
        ref={scrollRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div style={{ zoom }} className="relative m-auto">
          <VisualTree
            treeData={treeData}
            crossLinks={crossLinks}
            goals={goals}
            areas={activeAreas}
            layoutDirection={treeLayout}
            searchQuery={searchQuery}
            searchMatchedIds={searchResult.matchedIds}
          />
          {/* Sticky notes — above tree nodes, inside zoom/pan area */}
          {notes.map((note) => (
            <div key={note.id} data-sticky-note="true">
              <StickyNote
                note={note}
                zoom={zoom}
                onConvertToGoal={(_id, text) => setConvertText(text)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Minimap — bottom-right, desktop only */}
      <TreeMinimap
        scrollRef={scrollRef}
        zoom={zoom}
        isVisible={isMinimapVisible}
        onToggle={() => setIsMinimapVisible((v) => !v)}
      />

      {/* Zoom controls — positioned over scroll area, always visible */}
      <div className="absolute bottom-6 left-6 z-20">
        <div className="flex items-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)]/90 px-2 py-1.5 shadow-sm backdrop-blur-md">
          <button
            onClick={zoomOut}
            disabled={zoom <= MIN_ZOOM}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)] disabled:opacity-30"
            aria-label="축소"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={resetZoom}
            className="flex min-h-[44px] min-w-[3rem] items-center justify-center rounded-lg text-center text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
            aria-label="줌 초기화"
          >
            {zoomPercent}%
          </button>
          <button
            onClick={zoomIn}
            disabled={zoom >= MAX_ZOOM}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)] disabled:opacity-30"
            aria-label="확대"
          >
            <Plus className="h-4 w-4" />
          </button>
          <div className="mx-0.5 h-4 w-px bg-[var(--color-border)]" />
          <button
            onClick={resetZoom}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
            aria-label="맞춤"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <div className="mx-0.5 h-4 w-px bg-[var(--color-border)]" />
          <button
            onClick={toggleLayout}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
            aria-label={
              treeLayout === 'vertical' ? '가로 레이아웃으로 전환' : '세로 레이아웃으로 전환'
            }
            title={treeLayout === 'vertical' ? '가로 레이아웃' : '세로 레이아웃'}
          >
            {treeLayout === 'vertical' ? (
              <ArrowRightLeft className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownUp className="h-3.5 w-3.5" />
            )}
          </button>
          <div className="mx-0.5 h-4 w-px bg-[var(--color-border)]" />
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
            aria-label="노드 검색"
            title="검색 (Ctrl+F)"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
        </div>
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
