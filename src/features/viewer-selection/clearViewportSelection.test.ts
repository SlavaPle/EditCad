import { describe, expect, it } from 'vitest'
import { createEmptySelection } from '../../lib/selection'
import {
  createClearedViewportSelectionState,
  shouldClearSelectionOnPointerMiss,
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

  it('clears only on left click without Shift', () => {
    expect(shouldClearSelectionOnPointerMiss({ button: 0, shiftKey: false })).toBe(true)
    expect(shouldClearSelectionOnPointerMiss({ button: 0, shiftKey: true })).toBe(false)
    expect(shouldClearSelectionOnPointerMiss({ button: 1, shiftKey: false })).toBe(false)
    expect(shouldClearSelectionOnPointerMiss({ button: 2, shiftKey: false })).toBe(false)
  })
})
