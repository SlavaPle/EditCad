import { BufferGeometry, Float32BufferAttribute } from 'three'
import { describe, expect, it } from 'vitest'
import {
  buildMatePlaneFaceOverlayGeometry,
  matePlaneHighlightsForPart,
} from './matePlaneFaceOverlay'

function quad(): BufferGeometry {
  const geo = new BufferGeometry()
  geo.setAttribute(
    'position',
    new Float32BufferAttribute(
      [0, 0, 0, 10, 0, 0, 10, 10, 0, 0, 0, 0, 10, 10, 0, 0, 10, 0],
      3,
    ),
  )
  geo.computeBoundingSphere()
  return geo
}

describe('matePlaneFaceOverlay', () => {
  it('builds overlay geometry for face patch', () => {
    const overlay = buildMatePlaneFaceOverlayGeometry(quad(), [0, 1])
    expect(overlay).not.toBeNull()
    expect(overlay!.getAttribute('position')!.count).toBeGreaterThan(0)
    overlay?.dispose()
  })

  it('returns null for empty face list', () => {
    expect(buildMatePlaneFaceOverlayGeometry(quad(), [])).toBeNull()
  })

  it('maps highlights to part id', () => {
    const mapped = matePlaneHighlightsForPart('b', {
      planeA: { partId: 'a', faceIndices: [0, 1] },
      planeB: { partId: 'b', faceIndices: [2, 3] },
    })
    expect(mapped.planeA).toBeNull()
    expect(mapped.planeB).toEqual([2, 3])
  })
})
