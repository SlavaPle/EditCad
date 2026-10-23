import { describe, expect, it } from 'vitest'
import { createEmptySelection } from '../../lib/selection'
import {
  createClearedViewportSelectionState,
  nextViewportSelectionClearEpoch,
  shouldClearDocumentTreeNodeSelection,
  shouldClearSelectionOnPointerMiss,
  VIEWPORT_SELECTION_CLEAR_FIELDS,
} from './clearViewportSelection'

describe('clearViewportSelection', () => {
  it('clears every selection field (global empty-click rule)', () => {
    const cleared = createClearedViewportSelectionState()
    expect(cleared.selection).toEqual(createEmptySelection())
    expect(cleared.probableFaces).toEqual([])
    expect(cleared.activeProgramPartId).toBeNull()
    expect(cleared.treeMateHighlights).toBeNull()
    expect(cleared.preAssemblySelection).toBeNull()
    expect(cleared.focusedLimitConstraintId).toBeNull()
    expect(cleared.limitsInstallActive).toBe(false)
    expect(cleared.appearanceEditActive).toBe(false)
  })

  it('covers all documented clear fields', () => {
    const cleared = createClearedViewportSelectionState()
    for (const key of VIEWPORT_SELECTION_CLEAR_FIELDS) {
      expect(cleared).toHaveProperty(key)
    }
    expect(VIEWPORT_SELECTION_CLEAR_FIELDS).toHaveLength(8)
  })

  it('returns a fresh empty selection object each call (no shared mutation)', () => {
    const a = createClearedViewportSelectionState()
    const b = createClearedViewportSelectionState()
    expect(a.selection).not.toBe(b.selection)
    a.selection.faces.push(99)
    expect(b.selection.faces).toEqual([])
  })

  it('is idempotent: cleared state equals another cleared state', () => {
    expect(createClearedViewportSelectionState()).toEqual(createClearedViewportSelectionState())
  })

  it('clears only on left click without Shift', () => {
    expect(shouldClearSelectionOnPointerMiss({ button: 0, shiftKey: false })).toBe(true)
    expect(shouldClearSelectionOnPointerMiss({ button: 0, shiftKey: true })).toBe(false)
    expect(shouldClearSelectionOnPointerMiss({ button: 1, shiftKey: false })).toBe(false)
    expect(shouldClearSelectionOnPointerMiss({ button: 2, shiftKey: false })).toBe(false)
  })

  it('bumps clear epoch for document tree sync', () => {
    expect(nextViewportSelectionClearEpoch(0)).toBe(1)
    expect(nextViewportSelectionClearEpoch(4)).toBe(5)
  })

  it('document tree clears node selection after first empty-click epoch', () => {
    expect(shouldClearDocumentTreeNodeSelection(0)).toBe(false)
    expect(shouldClearDocumentTreeNodeSelection(1)).toBe(true)
    expect(shouldClearDocumentTreeNodeSelection(12)).toBe(true)
  })
})
