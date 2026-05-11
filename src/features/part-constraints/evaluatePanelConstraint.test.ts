import { BufferGeometry, Float32BufferAttribute } from 'three'
import { describe, expect, it } from 'vitest'
import type { PanelFaceConstraint } from '../face-constraints/model'
import type { StretchConstraintEvalContext } from './stretchEvalTypes'
import { evaluatePanelConstraint, PANEL_EDGE_TOL_MM } from './evaluatePanelConstraint'

function makeSimplePanelGeometry(): { geometry: BufferGeometry; thicknessFaces: number[] } {
  const g = new BufferGeometry()
  // Dwie równoległe „płaszczyzny” o odległości 7 mm:
  // face 0,1 w z=0; face 2,3 w z=7.
  const vertices = new Float32Array([
    // patch A (z = 0)
    -10, -10, 0,
    10, -10, 0,
    10, 10, 0,
    -10, -10, 0,
    10, 10, 0,
    -10, 10, 0,
    // patch B (z = 7)
    -10, -10, 7,
    10, -10, 7,
    10, 10, 7,
    -10, -10, 7,
    10, 10, 7,
    -10, 10, 7,
  ])
  g.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  // 4 faces: 0,1 (z=0) i 2,3 (z=7)
  return { geometry: g, thicknessFaces: [0, 1, 2, 3] }
}

function makePanelConstraint(thicknessMm: number): PanelFaceConstraint {
  return {
    id: 'p1',
    type: 'panel',
    facePair: null,
    thicknessMm,
    panelX: { maxMm: 300 },
    panelY: { maxMm: 300 },
    ySameAsX: false,
    panelMeasureMode: 'bboxExtents',
  }
}

describe('evaluatePanelConstraint', () => {
  it('ignores PANEL when panelThicknessMergedFaces is not set', () => {
    const { geometry, thicknessFaces } = makeSimplePanelGeometry()
    const ctx: StretchConstraintEvalContext = {
      geometryBefore: geometry,
      geometryAfter: geometry,
      mergedFacesForEdit: thicknessFaces,
      elements: [],
    }
    const c = makePanelConstraint(1) // ewidentnie niezgodne z geometrią, ale brak panelThicknessMergedFaces
    const err = evaluatePanelConstraint(ctx, c)
    expect(err).toBeNull()
  })

  it('enforces PANEL thickness when panelThicknessMergedFaces is provided', () => {
    const { geometry, thicknessFaces } = makeSimplePanelGeometry()
    const ctxOk: StretchConstraintEvalContext = {
      geometryBefore: geometry,
      geometryAfter: geometry,
      mergedFacesForEdit: thicknessFaces,
      elements: [],
      panelThicknessMergedFaces: thicknessFaces,
    }
    // Grubość zgodna z geometrią (7 mm) → brak błędu.
    const cOk = makePanelConstraint(7)
    const errOk = evaluatePanelConstraint(ctxOk, cOk)
    expect(errOk).toBeNull()

    // Zbyt duża różnica od 7 mm → błąd constraintPanelBroken.
    const cBad = makePanelConstraint(7 + PANEL_EDGE_TOL_MM + 5)
    const errBad = evaluatePanelConstraint(ctxOk, cBad)
    expect(errBad).toBe('constraintPanelBroken')
  })
})

