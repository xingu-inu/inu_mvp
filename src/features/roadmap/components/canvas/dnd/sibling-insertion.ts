/**
 * Pure functions for computing sibling insertion positions during drag-reorder
 * on the Why Map canvas. No React, no xyflow imports.
 *
 * The caller (use-canvas-reorder) supplies sibling ids in sort_order plus the
 * spread-axis center coordinate for each sibling (x for a top-to-bottom layout,
 * y for a left-to-right layout). These helpers translate a dragged node's
 * current center into an insertion slot among its siblings, and then into the
 * `{leftId, rightId}` bounding pair used to derive a fractional sort_order.
 */

/**
 * Classify an intersecting node during a drag for the purpose of picking
 * drop-feedback targets.
 *
 * - `skip` — not a candidate for either the valid-target or invalid-feedback
 *   pool. Covers:
 *     * the dragged node itself
 *     * the direction root (never a drop target)
 *     * any node in `sameParentIds` — these are the drag's siblings (**and
 *       the drag itself**, since the caller passes the full child set of the
 *       parent including the dragged id). Overlapping a sibling during a
 *       same-parent reorder is the user's natural reorder motion, not an
 *       attempt to reparent. Treating siblings as `invalid` caused the
 *       Goal/Group/Task sibling reorders to snap back whenever the dragged
 *       card overlapped a neighbor.
 *     * any node in `descendantIds` — dragging a parent card (e.g. an Area)
 *       past its own children will always overlap them en route. A
 *       descendant can never be a legal new parent (cycle) and is not a
 *       user-intent cancel signal, so it must not contribute to the invalid
 *       pool.
 * - `valid` — a hierarchy-allowed new parent (cross-parent move candidate).
 * - `invalid` — physically overlapping, not a sibling or descendant, and not
 *   a hierarchy-allowed new parent. Drives the red-ring negative feedback
 *   and the release-time snap-back.
 *
 * Priority (by first matching check):
 *   self → direction → descendant → valid → sibling → invalid
 *
 * `valid` wins over `sibling` as a belt-and-suspenders contract: in practice
 * `getValidDropTargets` filters via `canDropOnParent`, which always rejects
 * same-type targets, so siblings can never land in `validDropTargetIds`. If
 * that invariant is ever loosened the classifier still does the sensible
 * thing. `descendant` is checked BEFORE `valid` because a descendant is
 * never a valid parent (and the `valid` check would be wasted work).
 */
export function classifyIntersection(
  target: { id: string; type: string | undefined },
  dragId: string,
  validDropTargetIds: ReadonlySet<string>,
  sameParentIds: ReadonlySet<string>,
  descendantIds: ReadonlySet<string>,
  currentParentId: string | null = null
): 'skip' | 'valid' | 'invalid' {
  if (target.id === dragId) return 'skip'
  if (target.type === 'direction') return 'skip'
  // The current parent is excluded from validDropTargetIds (same-parent = sibling
  // reorder) but is also not a sibling, so without this guard it falls through to
  // 'invalid'. A dragged goal that drifts slightly toward its own area during a
  // vertical reorder would then trigger the snap-back guard in onNodeDragStop.
  if (target.id === currentParentId) return 'skip'
  if (descendantIds.has(target.id)) return 'skip'
  if (validDropTargetIds.has(target.id)) return 'valid'
  if (sameParentIds.has(target.id)) return 'skip'
  return 'invalid'
}

/**
 * Compute the target insertion index for a dragged node among siblings on a
 * given axis.
 *
 * The returned index is into the "others" array (siblings with the dragged id
 * removed), and is in the range `[0, others.length]`.
 *
 * If `draggedId` is not found in `siblingIds`, no exclusion happens and the
 * index is computed against the full sibling list.
 */
export function computeInsertIndex(
  draggedCenter: number,
  siblingCenters: number[],
  draggedId: string,
  siblingIds: string[]
): number {
  if (siblingIds.length === 0) {
    return 0
  }

  const others: { id: string; center: number }[] = []
  for (let i = 0; i < siblingIds.length; i++) {
    const id = siblingIds[i]
    if (id === draggedId) {
      continue
    }
    // Guard against mismatched array lengths: treat missing centers as 0.
    const center = i < siblingCenters.length ? siblingCenters[i] : 0
    others.push({ id, center })
  }

  if (others.length === 0) {
    return 0
  }

  // Count how many siblings have their center at or before the drag position.
  // Using a count (not `index = i + 1`) ensures correct results even when
  // sibling centers are non-ascending — e.g. when ELK's considerModelOrder
  // produces positions that don't perfectly match sort_order.
  let index = 0
  for (const other of others) {
    if (draggedCenter >= other.center) {
      index++
    }
  }
  return index
}

/**
 * Given the current sibling array (sorted by sort_order) and a target insert
 * index into the "others" array, return the `{leftId, rightId}` pair that
 * bound the insertion slot. Either may be null for "before first" / "after
 * last" insertions. Neither returned id will ever be the dragged id.
 */
export function boundingSiblings(
  insertIndex: number,
  siblingIds: string[],
  draggedId: string
): { leftId: string | null; rightId: string | null } {
  const others = siblingIds.filter((id) => id !== draggedId)

  if (others.length === 0) {
    return { leftId: null, rightId: null }
  }

  const clamped = Math.max(0, Math.min(insertIndex, others.length))
  const leftId = clamped === 0 ? null : others[clamped - 1]
  const rightId = clamped === others.length ? null : others[clamped]

  return { leftId, rightId }
}

/**
 * Return the left/right sibling ids that bounded the dragged node at drag
 * start, by looking up its original position in the full sibling list.
 * Returns null for either side when the dragged was first / last.
 */
export function originalBoundingSiblings(
  siblingIds: string[],
  draggedId: string
): { leftId: string | null; rightId: string | null } {
  const origIdx = siblingIds.indexOf(draggedId)
  if (origIdx < 0) return { leftId: null, rightId: null }
  const leftId = origIdx > 0 ? siblingIds[origIdx - 1] : null
  const rightId = origIdx < siblingIds.length - 1 ? siblingIds[origIdx + 1] : null
  return { leftId, rightId }
}

/**
 * Decide whether a sibling reorder drop is a no-op (same slot) based on
 * sort_order comparison. This is the canonical no-op check used by
 * `onNodeDragStop` — kept as a pure function so it can be unit-tested
 * independently of the React Flow drag lifecycle.
 *
 * Semantics:
 * - If `currentOrder` is null (the dragged node has no sort_order yet — e.g.
 *   legacy data or a fractional-index fallback in flight), the caller should
 *   fall back to bounding-id comparison. Returns false here so the caller
 *   proceeds through the id-based fallback path.
 * - Otherwise: the drop is a no-op when `currentOrder` is strictly between
 *   `leftOrder` and `rightOrder`. Null bounds are treated as ±∞.
 */
export function isNoOpSiblingDrop(
  currentOrder: string | null,
  leftOrder: string | null,
  rightOrder: string | null
): boolean {
  if (currentOrder === null) return false
  const okLeft = leftOrder === null || currentOrder > leftOrder
  const okRight = rightOrder === null || currentOrder < rightOrder
  return okLeft && okRight
}

/**
 * Fallback no-op check used when `currentOrder` is null. Compares the new
 * bounding sibling ids against the dragged node's original bounding siblings.
 * Matches → same slot → no-op.
 */
export function isNoOpSiblingDropByIds(
  siblingIds: string[],
  draggedId: string,
  newLeftId: string | null,
  newRightId: string | null
): boolean {
  const { leftId: origLeft, rightId: origRight } = originalBoundingSiblings(siblingIds, draggedId)
  return newLeftId === origLeft && newRightId === origRight
}
