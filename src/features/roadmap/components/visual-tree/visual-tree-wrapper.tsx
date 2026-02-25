'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Minus, Plus, Maximize2, ArrowDownUp, ArrowRightLeft, Search } from 'lucide-react'
import { useGoals } from '@/queries/use-goals'
import { useAreas } from '@/queries/use-areas'
import { useDirection } from '@/queries/use-direction'
import { useRoadmapStore, selectStatusFilter } from '@/stores/roadmap.store'
import { MIN_ZOOM, MAX_ZOOM, ZOOM_STEP, DEFAULT_ZOOM } from '@/lib/constants/visual-tree'
import { VisualTree, buildVisualTreeData } from './visual-tree'

import { VisualTreeSkeleton } from '../visual-tree-skeleton'
import { TreeSearchBar } from './tree-search-bar'
import { useTreeSearch } from '../../hooks/use-tree-search'

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100))
}

export function VisualTreeWrapper() {
  const clearSelection = useRoadmapStore((s) => s.clearSelection)
  const treeLayout = useRoadmapStore((s) => s.treeLayout)
  const setTreeLayout = useRoadmapStore((s) => s.setTreeLayout)
  const statusFilter = useRoadmapStore(selectStatusFilter)
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const [isPanning, setIsPanning] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const panStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 })

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
    () => buildVisualTreeData(direction ?? null, activeAreas, goals, statusFilter),
    [direction, activeAreas, goals, statusFilter]
  )

  const searchResult = useTreeSearch(treeData, searchQuery)

  // Scroll to node when navigating search results
  const handleSearchNavigate = useCallback((nodeId: string) => {
    const el = document.querySelector(`[data-node-id="${nodeId}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
  }, [])

  const handleSearchClose = useCallback(() => {
    setIsSearchOpen(false)
    setSearchQuery('')
  }, [])

  // Ctrl+F keyboard shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setIsSearchOpen(true)
      }
      if (e.key === 'Escape') {
        if (isSearchOpen) {
          handleSearchClose()
        } else {
          clearSelection()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isSearchOpen, handleSearchClose, clearSelection])

  const zoomIn = useCallback(() => setZoom((z) => clampZoom(z + ZOOM_STEP)), [])
  const zoomOut = useCallback(() => setZoom((z) => clampZoom(z - ZOOM_STEP)), [])
  const resetZoom = useCallback(() => setZoom(DEFAULT_ZOOM), [])
  const toggleLayout = useCallback(
    () => setTreeLayout(treeLayout === 'vertical' ? 'horizontal' : 'vertical'),
    [treeLayout, setTreeLayout]
  )

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
      // Click vs pan: less than 5px movement = click on background → clear focus
      const dx = e.clientX - panStart.current.x
      const dy = e.clientY - panStart.current.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance < 5) {
        const target = e.target as HTMLElement
        if (!target.closest('button, a, [role="button"], [data-node-card]')) {
          clearSelection()
        }
      }
    },
    [clearSelection]
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

      {/* Scrollable tree area with drag-to-pan */}
      <div
        className={`bg-dot-grid absolute inset-0 flex overflow-auto bg-[var(--color-bg-canvas)] ${isPanning ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
        ref={scrollRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div style={{ zoom }} className="m-auto">
          <VisualTree
            treeData={treeData}
            crossLinks={crossLinks}
            goals={goals}
            areas={activeAreas}
            layoutDirection={treeLayout}
            searchQuery={searchQuery}
            searchMatchedIds={searchResult.matchedIds}
          />
        </div>
      </div>

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
    </div>
  )
}
