import { describe, expect, it } from 'vitest'
import {
  AXIS_GIZMO_AXIS_OPACITY,
  AXIS_GIZMO_AXIS_SCALE,
  AXIS_GIZMO_COLORS,
  AXIS_GIZMO_LABEL_KEYS,
  AXIS_GIZMO_MARGIN,
  AXIS_GIZMO_RENDER_PRIORITY,
  AXIS_GIZMO_SCALE,
  buildAxisGizmoLabels,
} from './axisGizmoConfig'
import { computeViewCubeHudPosition } from './viewCubeHudPosition'

describe('AXIS_GIZMO_COLORS', () => {
  it('defines three distinct muted colors', () => {
    expect(AXIS_GIZMO_COLORS).toHaveLength(3)
    expect(new Set(AXIS_GIZMO_COLORS).size).toBe(3)
  })
})

describe('AXIS_GIZMO_LABEL_KEYS', () => {
  it('has one i18n key per axis letter', () => {
    expect(AXIS_GIZMO_LABEL_KEYS).toEqual([
      'viewer.axisGizmo.axisX',
      'viewer.axisGizmo.axisY',
      'viewer.axisGizmo.axisZ',
    ])
  })
})

describe('buildAxisGizmoLabels', () => {
  it('returns three labels in X Y Z order', () => {
    const labels = buildAxisGizmoLabels((key) => key)
    expect(labels).toEqual([...AXIS_GIZMO_LABEL_KEYS])
  })

  it('maps each key through the translator', () => {
    const labels = buildAxisGizmoLabels((key) => {
      if (key === 'viewer.axisGizmo.axisX') return 'X'
      if (key === 'viewer.axisGizmo.axisY') return 'Y'
      if (key === 'viewer.axisGizmo.axisZ') return 'Z'
      return key
    })
    expect(labels).toEqual(['X', 'Y', 'Z'])
  })

  it('produces non-empty strings when translator returns text', () => {
    const labels = buildAxisGizmoLabels((key) => key.split('.').pop() ?? '')
    expect(labels.every((label) => label.length > 0)).toBe(true)
  })
})

describe('axis gizmo HUD layout', () => {
  it('places HUD in bottom-left with configured margin', () => {
    const viewport = { width: 1200, height: 800 }
    const [x, y] = computeViewCubeHudPosition('bottom-left', AXIS_GIZMO_MARGIN, viewport)
    expect(x).toBe(-1200 / 2 + AXIS_GIZMO_MARGIN[0])
    expect(y).toBe(-800 / 2 + AXIS_GIZMO_MARGIN[1])
  })

  it('uses positive scale and muted beam styling', () => {
    expect(AXIS_GIZMO_SCALE).toBeGreaterThan(0)
    expect(AXIS_GIZMO_AXIS_SCALE[0]).toBeGreaterThan(AXIS_GIZMO_AXIS_SCALE[1])
    expect(AXIS_GIZMO_AXIS_OPACITY).toBeGreaterThan(0)
    expect(AXIS_GIZMO_AXIS_OPACITY).toBeLessThan(1)
  })

  it('renders above ViewCube layer without clearing color', () => {
    expect(AXIS_GIZMO_RENDER_PRIORITY).toBeGreaterThan(1)
  })
})
