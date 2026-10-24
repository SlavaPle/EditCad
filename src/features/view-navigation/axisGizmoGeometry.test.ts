import { describe, expect, it } from 'vitest'
import {
  AXIS_GIZMO_BEAM_CENTER,
  AXIS_GIZMO_BEAMS,
  AXIS_GIZMO_LABEL_POSITIONS,
  axisGizmoColorIndex,
} from './axisGizmoGeometry'
import { AXIS_GIZMO_COLORS, AXIS_GIZMO_LABEL_KEYS } from './axisGizmoConfig'

describe('AXIS_GIZMO_BEAMS', () => {
  it('defines one beam per XYZ axis', () => {
    expect(AXIS_GIZMO_BEAMS.map((b) => b.axis)).toEqual(['x', 'y', 'z'])
  })

  it('keeps X beam unrotated (along local +X)', () => {
    expect(AXIS_GIZMO_BEAMS[0]!.rotation).toEqual([0, 0, 0])
  })

  it('rotates Y beam by +90° around Z', () => {
    expect(AXIS_GIZMO_BEAMS[1]!.rotation[2]).toBeCloseTo(Math.PI / 2)
  })

  it('rotates Z beam by -90° around Y', () => {
    expect(AXIS_GIZMO_BEAMS[2]!.rotation[1]).toBeCloseTo(-Math.PI / 2)
  })
})

describe('AXIS_GIZMO_LABEL_POSITIONS', () => {
  it('places labels on positive unit axis ends', () => {
    expect(AXIS_GIZMO_LABEL_POSITIONS).toEqual([
      { axis: 'x', position: [1, 0, 0] },
      { axis: 'y', position: [0, 1, 0] },
      { axis: 'z', position: [0, 0, 1] },
    ])
  })

  it('aligns with beams and i18n color/label slots', () => {
    expect(AXIS_GIZMO_LABEL_POSITIONS).toHaveLength(AXIS_GIZMO_BEAMS.length)
    expect(AXIS_GIZMO_LABEL_POSITIONS).toHaveLength(AXIS_GIZMO_COLORS.length)
    expect(AXIS_GIZMO_LABEL_POSITIONS).toHaveLength(AXIS_GIZMO_LABEL_KEYS.length)
  })
})

describe('AXIS_GIZMO_BEAM_CENTER', () => {
  it('centers the beam along half of default length 0.8', () => {
    expect(AXIS_GIZMO_BEAM_CENTER[0]).toBeCloseTo(0.4)
    expect(AXIS_GIZMO_BEAM_CENTER[1]).toBe(0)
    expect(AXIS_GIZMO_BEAM_CENTER[2]).toBe(0)
  })
})

describe('axisGizmoColorIndex', () => {
  it('maps x→0 y→1 z→2', () => {
    expect(axisGizmoColorIndex('x')).toBe(0)
    expect(axisGizmoColorIndex('y')).toBe(1)
    expect(axisGizmoColorIndex('z')).toBe(2)
  })
})
