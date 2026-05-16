import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import {
  scaleViewCubeHandle,
  VIEW_CUBE_CORNER_HANDLES,
  VIEW_CUBE_EDGE_HANDLES,
  viewCubeEdgeBoxDimensions,
} from './viewCubeControlGeometry'

describe('viewCubeControlGeometry', () => {
  it('defines 8 corners and 12 edges like drei', () => {
    expect(VIEW_CUBE_CORNER_HANDLES).toHaveLength(8)
    expect(VIEW_CUBE_EDGE_HANDLES).toHaveLength(12)
  })

  it('scales handles to 0.38 unit offset', () => {
    const v = scaleViewCubeHandle([1, 0, 0])
    expect(v.toArray()).toEqual([0.38, 0, 0])
  })

  it('uses wider extent along zero axis component of edge handle', () => {
    const xyEdge = viewCubeEdgeBoxDimensions(new Vector3(0.38, 0.38, 0))
    expect(xyEdge).toEqual([0.25, 0.25, 0.5])

    const yzEdge = viewCubeEdgeBoxDimensions(new Vector3(0, 0.38, 0.38))
    expect(yzEdge).toEqual([0.5, 0.25, 0.25])
  })

  it('keeps every edge handle on the cube shell (one zero component)', () => {
    for (const handle of VIEW_CUBE_EDGE_HANDLES) {
      const zeros = handle.filter((c) => c === 0).length
      expect(zeros).toBe(1)
    }
  })
})
