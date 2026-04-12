'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  useEdgesState,
  useNodesInitialized,
  useReactFlow,
  Position,
  type OnEdgesChange,
  type OnNodesChange,
} from '@xyflow/react'
import ELK from 'elkjs/lib/elk.bundled.js'
import { toast } from 'sonner'
import { treeToElkGraph, flattenElkResult, DEFAULT_DIMENSIONS } from './tree-to-elk'
import type { WhyMapNode, WhyMapEdge } from './types'

// Singleton ELK instance — reuse across layouts to avoid re-parsing algorithms.
const elk = new ELK()

// ── Hook interface ────────────────────────────────────────────

interface UseElkLayoutResult {
  nodes: WhyMapNode[]
  edges: WhyMapEdge[]
  setNodes: React.Dispatch<React.SetStateAction<WhyMapNode[]>>
  setEdges: React.Dispatch<React.SetStateAction<WhyMapEdge[]>>
  onNodesChange: OnNodesChange<WhyMapNode>
  onEdgesChange: OnEdgesChange<WhyMapEdge>
  relayout: () => void
  /** True while an ELK layout call is in-flight. Drag handlers use this as a lock. */
  isLayouting: boolean
  /** True once the first layout pass has completed. Until then, canvas renders with opacity 0. */
  hasLaidOut: boolean
}

/**
 * Layout hook for the Why Map canvas, powered by ELK.js.
 *
 * Core design
 * -----------
 * `initialNodes` (the prop) is the SINGLE source of truth for node identity
 * and data (type, `data.treeNode`, including `meta.sortOrder`). We never
 * snapshot node data into internal state — the hook only caches ELK-produced
 * positions and React Flow-measured dimensions, in two Maps:
 *
 *   - `positions`    : Map<id, { x, y }>      (ELK output + live-drag overrides)
 *   - `measurements` : Map<id, { w, h }>      (React Flow dimension changes)
 *
 * `displayedNodes` is re-derived on every render by merging `initialNodes`
 * with those Maps. This eliminates the "two-copy staleness race" that
 * plagued the previous `useNodesState`-based implementation: there, the
 * layout effect read from a state variable that lagged one render behind
 * the latest `initialNodes`, causing ELK to sort siblings by the old
 * `sort_order` after a reorder.
 *
 * A new layout pass runs whenever `layoutSignature` (sorted hash of
 * `id:sortOrder` + hierarchy edges + direction) changes — i.e. when the
 * tree structure OR sibling order changed. Explicit `relayout()` calls
 * bump `manualBump` to force a fresh pass even when the signature is
 * unchanged (used by drag-drop code after optimistic cache patches).
 */
export function useElkLayout(
  initialNodes: WhyMapNode[],
  initialEdges: WhyMapEdge[],
  direction: 'TB' | 'LR',
  draggingNodeId?: string | null
): UseElkLayoutResult {
  // Edges keep React Flow's controlled state so selection/animation still work.
  // Nodes do NOT use useNodesState — see top-of-file rationale.
  const [edges, setEdges, onEdgesChange] = useEdgesState<WhyMapEdge>(initialEdges)

  // Internal state: only ELK output + RF measurements.
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(() => new Map())
  const [measurements, setMeasurements] = useState<Map<string, { width: number; height: number }>>(
    () => new Map()
  )
  const [isLayouting, setIsLayouting] = useState(false)
  const [hasLaidOut, setHasLaidOut] = useState(false)
  const [manualBump, setManualBump] = useState(0)
  // Tracks node ids that have completed their first ELK-computed placement.
  // Nodes getting their FIRST position (initial load OR newly-added Area/Goal/
  // Group/Task via optimistic update) are tagged with `.just-placed` for one
  // render tick so their transform transition is suppressed — otherwise they
  // would visibly slide from the parent-provided origin (usually 0,0) into
  // the ELK-computed spot, which reads as "the canvas renders and then
  // animates again". After the commit, ids are moved into this set and the
  // `.just-placed` class is dropped so any SUBSEQUENT re-layout (siblings
  // making room, reorder, filter, expand/collapse) still animates transform
  // smoothly as before.
  const [laidOutIds, setLaidOutIds] = useState<Set<string>>(() => new Set())

  const { fitView } = useReactFlow()
  const nodesInitialized = useNodesInitialized()

  const isFirstLayoutRef = useRef(true)
  const layoutTokenRef = useRef(0)

  // ── Sync incoming edges (pass-through) ─────────────────────
  // Parent rebuilds edges on every treeData change; push them into controlled
  // state. Selection/hover state inside React Flow is preserved because we
  // only replace when the reference actually changes.
  const prevEdgesRef = useRef(initialEdges)
  useEffect(() => {
    if (prevEdgesRef.current !== initialEdges) {
      prevEdgesRef.current = initialEdges
      setEdges(initialEdges)
    }
  }, [initialEdges, setEdges])

  // ── Derived displayedNodes: data from prop, position/measured from maps ──
  const displayedNodes = useMemo<WhyMapNode[]>(() => {
    return initialNodes.map((n) => {
      const pos = positions.get(n.id)
      const measured = measurements.get(n.id) ?? n.measured
      // When a node has no ELK-computed position yet (fresh expand/collapse
      // before the async layout lands), hide it instead of flashing at the
      // parent-provided origin (0, 0). Otherwise the canvas briefly shows
      // new children piled at the top-left, which reads as "siblings jumping
      // around" to the user.
      const hasLaidOutPos = pos !== undefined
      const style: CSSProperties = hasLaidOutPos
        ? (n.style ?? {})
        : { ...(n.style ?? {}), opacity: 0, pointerEvents: 'none' }
      // Tag nodes receiving their FIRST ELK position with `.just-placed` so
      // the CSS rule in why-map-canvas suppresses the transform transition
      // on that paint. Existing nodes (already in `laidOutIds`) keep normal
      // transitions so they still slide smoothly to make room for the newcomer.
      const isFreshPlacement = hasLaidOutPos && !laidOutIds.has(n.id)
      const className = isFreshPlacement
        ? [n.className, 'just-placed'].filter(Boolean).join(' ')
        : n.className
      return {
        ...n,
        position: pos ?? n.position,
        measured,
        sourcePosition: direction === 'LR' ? Position.Right : Position.Bottom,
        targetPosition: direction === 'LR' ? Position.Left : Position.Top,
        style,
        className,
      } as WhyMapNode
    })
  }, [initialNodes, positions, measurements, direction, laidOutIds])

  // After each render where `positions` gained new ids, commit them to
  // `laidOutIds` so the `.just-placed` className drops on the next render —
  // the browser has already painted the node at its ELK position with the
  // transform transition suppressed, so removing the class is visually a
  // no-op. Also prune ids that left `initialNodes` so if a node is deleted
  // and re-added later it gets the fresh-placement treatment again.
  useEffect(() => {
    const currentIds = new Set(initialNodes.map((n) => n.id))
    setLaidOutIds((prev) => {
      let changed = false
      const next = new Set<string>()
      for (const id of prev) {
        if (currentIds.has(id)) {
          next.add(id)
        } else {
          changed = true
        }
      }
      for (const id of positions.keys()) {
        if (currentIds.has(id) && !next.has(id)) {
          next.add(id)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [initialNodes, positions])

  // Keep a ref so the `setNodes` shim can read the latest derived list.
  const displayedNodesRef = useRef(displayedNodes)
  useEffect(() => {
    displayedNodesRef.current = displayedNodes
  }, [displayedNodes])

  // ── onNodesChange: route React Flow changes into positions / measurements ──
  // - `position` changes: live drag offsets (React Flow native drag). Stored
  //   in the positions map; overwritten on drop by the next ELK pass.
  // - `dimensions` changes: React Flow's internal ResizeObserver.
  // Other change types (`select`, `remove`, `add`, `replace`) are ignored —
  // data lifecycle is owned by the parent via `initialNodes`, and selection
  // is mirrored through `data.isSelected` in `why-map-canvas`.
  const onNodesChange: OnNodesChange<WhyMapNode> = useCallback((changes) => {
    setPositions((prev) => {
      let next: Map<string, { x: number; y: number }> | null = null
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          if (!next) next = new Map(prev)
          next.set(change.id, change.position)
        }
      }
      return next ?? prev
    })

    setMeasurements((prev) => {
      let next: Map<string, { width: number; height: number }> | null = null
      for (const change of changes) {
        if (change.type === 'dimensions' && change.dimensions) {
          if (!next) next = new Map(prev)
          next.set(change.id, change.dimensions)
        }
      }
      return next ?? prev
    })
  }, [])

  // ── setNodes shim ──────────────────────────────────────────
  // Only `useCanvasReorder`'s Esc-cancel path calls this; it writes position
  // updates to snap the dragged card back to its pre-drag spot. We translate
  // that into positions-map updates. Data mutations via setNodes are NOT
  // supported — they must flow through the parent's `initialNodes`.
  const setNodes: React.Dispatch<React.SetStateAction<WhyMapNode[]>> = useCallback((updater) => {
    const current = displayedNodesRef.current
    const nextList =
      typeof updater === 'function'
        ? (updater as (prev: WhyMapNode[]) => WhyMapNode[])(current)
        : updater
    setPositions((prev) => {
      let changed = false
      const next = new Map(prev)
      for (const n of nextList) {
        const old = prev.get(n.id)
        if (!old || old.x !== n.position.x || old.y !== n.position.y) {
          next.set(n.id, n.position)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [])

  // ── Layout signature: changes when structure / sibling order / direction changes ──
  // Format: `id=sortOrder|id=sortOrder|...::src>tgt|src>tgt|...::LR`
  // Sorted so that permutations of the same set produce the same hash.
  const layoutSignature = useMemo(() => {
    const nodeParts: string[] = []
    for (const n of initialNodes) {
      const sortOrder = n.data?.treeNode?.meta?.sortOrder ?? ''
      nodeParts.push(`${n.id}=${sortOrder}`)
    }
    nodeParts.sort()

    const edgeParts: string[] = []
    for (const e of initialEdges) {
      if (e.data?.edgeType !== 'hierarchy') continue
      edgeParts.push(`${e.source}>${e.target}`)
    }
    edgeParts.sort()

    return `${nodeParts.join('|')}::${edgeParts.join('|')}::${direction}`
  }, [initialNodes, initialEdges, direction])

  // ── Layout effect ──────────────────────────────────────────
  // Re-runs on:
  //  - layoutSignature change (structural or sibling-order change)
  //  - manualBump (explicit relayout() call)
  //  - nodesInitialized transition (first measurement pass finished)
  //  - draggingNodeId transition (unlock after drop)
  //
  // Reads `initialNodes` + `measurements` DIRECTLY at effect time, so no
  // stale snapshot possible.
  useEffect(() => {
    if (!nodesInitialized) return
    if (draggingNodeId) return // lock during drag
    if (initialNodes.length === 0) return

    const token = ++layoutTokenRef.current
    setIsLayouting(true)

    // Feed ELK the latest data plus any measurements we have on file.
    // Ghost nodes come with hardcoded `measured` from inject-ghost-nodes.ts.
    const nodesForElk: WhyMapNode[] = initialNodes.map((n) => {
      const measured = measurements.get(n.id) ?? n.measured
      return { ...n, measured } as WhyMapNode
    })

    const { graph } = treeToElkGraph(nodesForElk, initialEdges, direction)

    elk
      .layout(graph)
      .then((result) => {
        // Stale result — a newer layout was requested after this started.
        if (token !== layoutTokenRef.current) return

        const laid = flattenElkResult(result)
        setPositions((prev) => {
          const next = new Map(prev)
          for (const [id, p] of laid) {
            next.set(id, { x: p.x, y: p.y })
          }
          return next
        })

        setIsLayouting(false)
        setHasLaidOut(true)

        if (isFirstLayoutRef.current) {
          isFirstLayoutRef.current = false
          requestAnimationFrame(() => {
            // Instant fit on first paint — the animated zoom used to overlap
            // with node fade-in and read as a "second animation" right after
            // the canvas was supposedly done rendering. Subsequent fitView
            // calls (Cmd+0, command palette) still use their animated durations.
            fitView({ padding: 0.15, duration: 0 })
          })
        }
      })
      .catch((err) => {
        if (token !== layoutTokenRef.current) return
        if (process.env.NODE_ENV === 'development') {
          console.error('[useElkLayout] elk.layout failed:', err)
        }
        setIsLayouting(false)
        setHasLaidOut(true)
        if (isFirstLayoutRef.current) {
          isFirstLayoutRef.current = false
          toast.error('캔버스 배치 중 문제가 생겼어요. 새로고침 해볼게요.')
        }
      })
    // `initialNodes` / `initialEdges` / `measurements` are read inside the
    // effect but are NOT in the dep list on purpose — the `layoutSignature`
    // memo already captures meaningful changes to them, and including them
    // raw would trigger layout on every re-render (measurement updates
    // would thrash ELK). `manualBump` is the escape hatch for forced reruns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutSignature, manualBump, nodesInitialized, draggingNodeId])

  // ── Manual relayout ─────────────────────────────────────────
  // Called by `useCanvasReorder` after optimistic cache patches. Most of the
  // time the layoutSignature change triggered by fresh `initialNodes` is
  // enough on its own, but this bump guarantees a re-run even in edge cases
  // where the signature happens to match (e.g. cross-parent move where both
  // parents' sort_order pool happens to produce the same hash).
  const relayout = useCallback(() => {
    setManualBump((v) => v + 1)
  }, [])

  return {
    nodes: displayedNodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    relayout,
    isLayouting,
    hasLaidOut,
  }
}

// Re-export DEFAULT_DIMENSIONS for callers that need raw fallback dims (e.g. ghost nodes).
export { DEFAULT_DIMENSIONS }
