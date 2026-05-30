import { describe, expect, it } from 'vitest'
import { BoxGeometry } from 'three'
import {
  geometryExtentMm,
  layoutProgramPartPositionsMm,
} from './layoutProgramPartPositionsMm'

describe('layoutProgramPartPositionsMm', () => {
  it('places parts along X with gap', () => {
    const a = new BoxGeometry(100, 10, 10)
    const b = new BoxGeometry(50, 10, 10)
    const geometries = { a, b }
    const positions = layoutProgramPartPositionsMm(['a', 'b'], geometries, 20)
    expect(positions.a).toEqual([50, 0, 0])
    expect(positions.b).toEqual([145, 0, 0])
    a.dispose()
    b.dispose()
  })

  it('uses default span for missing geometry', () => {
    const positions = layoutProgramPartPositionsMm(['missing'], {})
    expect(positions.missing).toEqual([40, 0, 0])
  })

  it('reports default extent when geometry is missing', () => {
    expect(geometryExtentMm(null).sizeMm).toEqual({ x: 80, y: 80, z: 80 })
  })
})
