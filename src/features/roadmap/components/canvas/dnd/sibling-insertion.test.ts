import { describe, it, expect } from 'vitest'

import {
  boundingSiblings,
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
