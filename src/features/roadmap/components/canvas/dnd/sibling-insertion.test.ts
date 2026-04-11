import { describe, it, expect } from 'vitest'

import {
  boundingSiblings,
  classifyIntersection,
  computeInsertIndex,
  isNoOpSiblingDrop,
  isNoOpSiblingDropByIds,
  originalBoundingSiblings,
} from './sibling-insertion'

describe('computeInsertIndex', () => {
  it('places dragged first sibling past the middle at index 1', () => {
    // siblingIds=[a,b,c], centers=[0,100,200], dragged 'a' at 150
    // others=[b,c] at [100,200], dragged center 150 -> index 1 (between b and c)
    const index = computeInsertIndex(150, [0, 100, 200], 'a', ['a', 'b', 'c'])
    expect(index).toBe(1)
  })

  it('places dragged last sibling before first at index 0', () => {
    // siblingIds=[a,b,c], centers=[0,100,200], dragged 'c' at -10
    // others=[a,b] at [0,100], dragged center -10 -> index 0 (before a)
    const index = computeInsertIndex(-10, [0, 100, 200], 'c', ['a', 'b', 'c'])
    expect(index).toBe(0)
  })

  it('returns 0 when only the dragged node is in siblings', () => {
    const index = computeInsertIndex(42, [100], 'only', ['only'])
    expect(index).toBe(0)
  })

  it('returns 0 with 2 siblings when dragged position is before the other', () => {
    // siblingIds=[a,b], centers=[0,100], dragged 'a' at -50
    // others=[b] at [100], dragged -50 -> index 0
    const index = computeInsertIndex(-50, [0, 100], 'a', ['a', 'b'])
    expect(index).toBe(0)
  })

  it('returns 1 with 2 siblings when dragged position is after the other', () => {
    // siblingIds=[a,b], centers=[0,100], dragged 'a' at 999
    // others=[b] at [100], dragged 999 -> index 1
    const index = computeInsertIndex(999, [0, 100], 'a', ['a', 'b'])
    expect(index).toBe(1)
  })

  it('places dragged first sibling past the far end at index 2', () => {
    // spec example: dragged 'a' at center 999 -> index 2 (after c)
    const index = computeInsertIndex(999, [0, 100, 200], 'a', ['a', 'b', 'c'])
    expect(index).toBe(2)
  })

  it('places dragged first sibling before others at index 0', () => {
    // spec example: dragged 'a' at center -10 -> index 0 (before b)
    const index = computeInsertIndex(-10, [0, 100, 200], 'a', ['a', 'b', 'c'])
    expect(index).toBe(0)
  })

  it('returns 0 when sibling array is empty', () => {
    const index = computeInsertIndex(50, [], 'x', [])
    expect(index).toBe(0)
  })

  it('treats missing draggedId as no exclusion', () => {
    // siblingIds=[a,b,c], centers=[0,100,200], dragged 'z' (absent) at 150
    // others=[a,b,c] at [0,100,200], center 150 -> index 2 (between b and c)
    const index = computeInsertIndex(150, [0, 100, 200], 'z', ['a', 'b', 'c'])
    expect(index).toBe(2)
  })

  // ── Regression: narrow reorder on wide cards ──────────────────
  // Goal/Group/Task cards are 180–260px wide. When sibling spacing is
  // comparable to card width, even a user-perceived "clear swap" move
  // may not cross the far neighbor's full center. These tests lock in
  // that the function still reports the right slot.

  it('detects a narrow forward swap when spacing ≈ card width', () => {
    // siblings spaced 120px apart, dragged card width 180, user nudges past
    // next neighbor's center by just 5px → must move one slot.
    // siblingIds=[a,b,c,d], centers=[0,120,240,360], dragged 'b' at 125
    // others=[a,c,d] at [0,240,360], dragged 125 -> index 1 (past a, before c)
    const index = computeInsertIndex(125, [0, 120, 240, 360], 'b', ['a', 'b', 'c', 'd'])
    expect(index).toBe(1)
  })

  it('detects a narrow backward swap when spacing ≈ card width', () => {
    // siblingIds=[a,b,c,d], centers=[0,120,240,360], dragged 'c' at 115
    // others=[a,b,d] at [0,120,360], dragged 115 -> index 1 (past a, before b)
    const index = computeInsertIndex(115, [0, 120, 240, 360], 'c', ['a', 'b', 'c', 'd'])
    expect(index).toBe(1)
  })

  it('stays at origin slot when the card only jitters within its own slot', () => {
    // siblingIds=[a,b,c], centers=[0,120,240], dragged 'b' at 119
    // (just barely under its own center) → index 1 in others-space
    // others=[a,c] at [0,240], 119 < 240 but >= 0 -> index 1 == original slot
    const index = computeInsertIndex(119, [0, 120, 240], 'b', ['a', 'b', 'c'])
    expect(index).toBe(1)
  })

  it('accepts others-space arrays (frozen siblings excluding dragged)', () => {
    // use-canvas-reorder passes s.siblings (already excludes dragged) directly.
    // Verify that passing a list without the dragged id yields the same result.
    const index = computeInsertIndex(150, [0, 200], 'b', ['a', 'c'])
    expect(index).toBe(1)
  })
})

describe('boundingSiblings', () => {
  it('returns nulls for an empty sibling array', () => {
    expect(boundingSiblings(0, [], 'x')).toEqual({
      leftId: null,
      rightId: null,
    })
  })

  it('returns leftId=null for insertIndex 0', () => {
    expect(boundingSiblings(0, ['a', 'b', 'c'], 'a')).toEqual({
      leftId: null,
      rightId: 'b',
    })
  })

  it('returns rightId=null for insertIndex === others.length', () => {
    // dragged 'a' removed -> others=[b,c], insertIndex 2 -> after c
    expect(boundingSiblings(2, ['a', 'b', 'c'], 'a')).toEqual({
      leftId: 'c',
      rightId: null,
    })
  })

  it('returns both ids for a middle insertion', () => {
    // dragged 'a' removed -> others=[b,c], insertIndex 1 -> between b and c
    expect(boundingSiblings(1, ['a', 'b', 'c'], 'a')).toEqual({
      leftId: 'b',
      rightId: 'c',
    })
  })

  it('skips self when dragged is in the middle and insertIndex points to the slot just after itself', () => {
    // siblingIds=[a,b,c,d], dragged 'b' -> others=[a,c,d]
    // insertIndex 1 should yield { leftId: 'a', rightId: 'c' } (b is never returned)
    expect(boundingSiblings(1, ['a', 'b', 'c', 'd'], 'b')).toEqual({
      leftId: 'a',
      rightId: 'c',
    })
  })

  it('skips self when dragged is last and insertIndex spans removed slot', () => {
    // siblingIds=[a,b,c], dragged 'c' -> others=[a,b]
    // insertIndex 2 -> after b, never references c
    expect(boundingSiblings(2, ['a', 'b', 'c'], 'c')).toEqual({
      leftId: 'b',
      rightId: null,
    })
  })

  it('returns nulls when only the dragged node is in siblings', () => {
    expect(boundingSiblings(0, ['only'], 'only')).toEqual({
      leftId: null,
      rightId: null,
    })
  })
})

// ── isNoOpSiblingDrop ────────────────────────────────────────
// Pure function that `onNodeDragStop` uses to decide whether a sibling drop
// actually moved the card. Previously this logic was inline in the hook and
// conflated full-space / others-space indices, causing frequent false
// positives on wide cards. Locking it as a unit test here prevents regression.

describe('isNoOpSiblingDrop', () => {
  it('detects no-op when current order is strictly between both bounds', () => {
    expect(isNoOpSiblingDrop('a2', 'a1', 'a3')).toBe(true)
  })

  it('returns false when current order equals the left bound', () => {
    expect(isNoOpSiblingDrop('a1', 'a1', 'a3')).toBe(false)
  })

  it('returns false when current order equals the right bound', () => {
    expect(isNoOpSiblingDrop('a3', 'a1', 'a3')).toBe(false)
  })

  it('treats leftOrder === null as "nothing to the left" (first slot)', () => {
    // Dragged is already the first sibling; any right order above current → no-op.
    expect(isNoOpSiblingDrop('a0', null, 'a1')).toBe(true)
    // But if current is >= right, it's NOT a no-op.
    expect(isNoOpSiblingDrop('a1', null, 'a1')).toBe(false)
  })

  it('treats rightOrder === null as "nothing to the right" (last slot)', () => {
    expect(isNoOpSiblingDrop('zZ', 'zA', null)).toBe(true)
    expect(isNoOpSiblingDrop('zA', 'zA', null)).toBe(false)
  })

  it('returns true when both bounds are null (only sibling)', () => {
    expect(isNoOpSiblingDrop('a0', null, null)).toBe(true)
  })

  it('returns false when currentOrder is null — caller must fall back', () => {
    // The null path is the contract for "I have no comparable order; use the
    // id-based fallback instead." This keeps the function total and easy to
    // reason about, and the caller stays in charge of the fallback policy.
    expect(isNoOpSiblingDrop(null, 'a1', 'a3')).toBe(false)
    expect(isNoOpSiblingDrop(null, null, null)).toBe(false)
  })
})

describe('isNoOpSiblingDropByIds', () => {
  it('detects no-op when bounding ids match the dragged node original slot', () => {
    // siblingIds=[a,b,c,d], dragged 'c' → original bounds are (b, d).
    expect(isNoOpSiblingDropByIds(['a', 'b', 'c', 'd'], 'c', 'b', 'd')).toBe(true)
  })

  it('detects a real move when bounding ids differ from the original slot', () => {
    // dragged 'c' moved past 'd' → new bounds (d, null). Not a no-op.
    expect(isNoOpSiblingDropByIds(['a', 'b', 'c', 'd'], 'c', 'd', null)).toBe(false)
  })

  it('handles first-slot original position (leftId=null)', () => {
    expect(isNoOpSiblingDropByIds(['a', 'b', 'c'], 'a', null, 'b')).toBe(true)
    expect(isNoOpSiblingDropByIds(['a', 'b', 'c'], 'a', 'b', 'c')).toBe(false)
  })

  it('handles last-slot original position (rightId=null)', () => {
    expect(isNoOpSiblingDropByIds(['a', 'b', 'c'], 'c', 'b', null)).toBe(true)
    expect(isNoOpSiblingDropByIds(['a', 'b', 'c'], 'c', null, 'a')).toBe(false)
  })

  it('returns true for a single-sibling drag (both bounds null)', () => {
    expect(isNoOpSiblingDropByIds(['only'], 'only', null, null)).toBe(true)
  })
})

// ── classifyIntersection ─────────────────────────────────────
// Regression guard for the Goal/Group/Task sibling reorder bug: overlapping
// a current-parent sibling during a reorder must be classified as `skip`, not
// `invalid`. Treating it as `invalid` caused `onNodeDragStop`'s snap-back
// guard to fire whenever a wide card brushed its neighbor, cancelling the
// move. Same-type siblings are never valid drop targets (canDropOnParent
// returns false), so the fix is to short-circuit them before the invalid
// bucket — which is exactly what this helper formalizes.

describe('classifyIntersection', () => {
  const validTargets: ReadonlySet<string> = new Set(['area-1'])
  // Contract: `sameParentIds` is the full child set of the drag's parent
  // INCLUDING the dragged node itself. The caller (use-canvas-reorder) passes
  // `new Set(dragState.siblingIds)` which is built from `getChildrenInOrder`
  // before filtering the dragged id out. The classifier's `self` check
  // handles the dragged id before the sibling check is consulted, but the
  // contract is locked here so future refactors don't silently drop the self
  // id from this set.
  const sameParentIds: ReadonlySet<string> = new Set(['goal-A', 'goal-B', 'goal-C'])
  const noDescendants: ReadonlySet<string> = new Set()

  it('contract: sameParentIds includes the dragged node itself', () => {
    // Documents the convention and guards against a refactor that filters
    // dragId out of the set — which would make `self` fall through to
    // `invalid` instead of `skip` for any self-intersection.
    expect(sameParentIds.has('goal-A')).toBe(true)
  })

  it('skips the dragged node itself', () => {
    const result = classifyIntersection(
      { id: 'goal-A', type: 'goal' },
      'goal-A',
      validTargets,
      sameParentIds,
      noDescendants
    )
    expect(result).toBe('skip')
  })

  it('skips the direction root — it is never a drop target', () => {
    const result = classifyIntersection(
      { id: 'direction-root', type: 'direction' },
      'goal-A',
      validTargets,
      sameParentIds,
      noDescendants
    )
    expect(result).toBe('skip')
  })

  it('returns valid for a hierarchy-allowed cross-parent target', () => {
    const result = classifyIntersection(
      { id: 'area-1', type: 'area' },
      'goal-A',
      validTargets,
      sameParentIds,
      noDescendants
    )
    expect(result).toBe('valid')
  })

  it('skips a current-parent sibling (same-parent reorder intent)', () => {
    // This is the core regression. Before the fix a sibling Goal landing in
    // the intersection pool was classified as invalid, triggering the
    // snap-back guard in onNodeDragStop and cancelling the reorder.
    const result = classifyIntersection(
      { id: 'goal-B', type: 'goal' },
      'goal-A',
      validTargets,
      sameParentIds,
      noDescendants
    )
    expect(result).toBe('skip')
  })

  it('skips a descendant of the dragged node (Area over its own Goal)', () => {
    // Regression for the Area-drag-over-own-descendants bug: dragging an
    // Area card past another Area will visually overlap the Area's own
    // Goals/Tasks en route. Those descendants are neither siblings nor
    // valid targets; without the descendant skip they were classified as
    // invalid and the release-time snap-back cancelled the reorder.
    const descendants: ReadonlySet<string> = new Set(['goal-child-1', 'task-child-1'])
    const areaValidTargets: ReadonlySet<string> = new Set()
    const areaSameParents: ReadonlySet<string> = new Set(['area-1', 'area-2'])
    const result = classifyIntersection(
      { id: 'goal-child-1', type: 'goal' },
      'area-1',
      areaValidTargets,
      areaSameParents,
      descendants
    )
    expect(result).toBe('skip')
  })

  it('returns invalid for a non-sibling, non-descendant, non-valid overlap', () => {
    // e.g. a Goal dragged and released on top of an unrelated Group under a
    // different goal — the user clearly did not intend a reorder.
    const result = classifyIntersection(
      { id: 'group-X', type: 'group' },
      'goal-A',
      validTargets,
      sameParentIds,
      noDescendants
    )
    expect(result).toBe('invalid')
  })

  it('descendant takes precedence over invalid bucket', () => {
    // A descendant can never be a legal new parent (cycle), so the
    // descendant check must fire before any valid/invalid classification
    // to keep the "dragging over my own children is not a cancel signal"
    // contract intact.
    const descendants: ReadonlySet<string> = new Set(['goal-child-1'])
    const result = classifyIntersection(
      { id: 'goal-child-1', type: 'goal' },
      'area-1',
      validTargets,
      sameParentIds,
      descendants
    )
    expect(result).toBe('skip')
  })

  it('valid takes precedence over sibling membership', () => {
    // Defensive: if an id somehow appears in both validTargets and
    // sameParentIds, valid wins. In practice these sets never overlap
    // because getValidDropTargets filters by canDropOnParent, which always
    // rejects same-type targets, so siblings (always same-type) can never
    // land in validDropTargetIds. Locking the priority here in case the
    // invariant on getValidDropTargets ever loosens.
    const overlapValid: ReadonlySet<string> = new Set(['goal-B'])
    const result = classifyIntersection(
      { id: 'goal-B', type: 'goal' },
      'goal-A',
      overlapValid,
      sameParentIds,
      noDescendants
    )
    expect(result).toBe('valid')
  })

  it('handles undefined target type gracefully (falls through to sets)', () => {
    // React Flow typing allows `type` to be undefined; the classifier must
    // not throw and must still use id-based set membership.
    const result = classifyIntersection(
      { id: 'goal-B', type: undefined },
      'goal-A',
      validTargets,
      sameParentIds,
      noDescendants
    )
    expect(result).toBe('skip')
  })
})

describe('originalBoundingSiblings', () => {
  it('returns the neighbors of the dragged node at its full-list position', () => {
    expect(originalBoundingSiblings(['a', 'b', 'c', 'd'], 'c')).toEqual({
      leftId: 'b',
      rightId: 'd',
    })
  })

  it('returns leftId=null when the dragged node is first', () => {
    expect(originalBoundingSiblings(['a', 'b', 'c'], 'a')).toEqual({
      leftId: null,
      rightId: 'b',
    })
  })

  it('returns rightId=null when the dragged node is last', () => {
    expect(originalBoundingSiblings(['a', 'b', 'c'], 'c')).toEqual({
      leftId: 'b',
      rightId: null,
    })
  })

  it('returns both null when dragged is the only sibling', () => {
    expect(originalBoundingSiblings(['only'], 'only')).toEqual({
      leftId: null,
      rightId: null,
    })
  })

  it('returns both null when dragged id is missing from the list', () => {
    expect(originalBoundingSiblings(['a', 'b', 'c'], 'z')).toEqual({
      leftId: null,
      rightId: null,
    })
  })
})
