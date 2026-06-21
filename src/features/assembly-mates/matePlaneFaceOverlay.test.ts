import {
  BufferAttribute,
  BufferGeometry,
  Float32BufferAttribute,
  Uint16BufferAttribute,
} from 'three'
import { describe, expect, it } from 'vitest'
import type { MatePlaneRef } from './model'
import {
  buildMatePlaneFaceOverlayGeometry,
  buildMatePlaneHighlightsForPopup,
  hasMatePlaneHighlights,
  MATE_PLANE_OVERLAY,
  matePlaneHighlightsForPart,
} from './matePlaneFaceOverlay'

function quadNonIndexed(): BufferGeometry {
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

function quadIndexed(): BufferGeometry {
  const geo = new BufferGeometry()
  geo.setAttribute(
    'position',
    new Float32BufferAttribute(
      [0, 0, 0, 10, 0, 0, 10, 10, 0, 0, 10, 0],
      3,
    ),
  )
  geo.setIndex(new Uint16BufferAttribute([0, 1, 2, 0, 2, 3], 1))
  geo.computeBoundingSphere()
  return geo
}

const planeRef = (partId: string, faces: number[]): MatePlaneRef => ({
  partId,
  faceIndex: faces[0]!,
  faceIndices: faces,
})

describe('buildMatePlaneFaceOverlayGeometry', () => {
  it('builds overlay with one vertex per triangle corner', () => {
    const overlay = buildMatePlaneFaceOverlayGeometry(quadNonIndexed(), [0, 1])
    expect(overlay).not.toBeNull()
    expect(overlay!.getAttribute('position')!.count).toBe(6)
    overlay?.dispose()
  })

  it('supports indexed geometry', () => {
    const overlay = buildMatePlaneFaceOverlayGeometry(quadIndexed(), [0, 1])
    expect(overlay).not.toBeNull()
    expect(overlay!.getAttribute('position')!.count).toBe(6)
    overlay?.dispose()
  })

  it('returns null for empty face list', () => {
    expect(buildMatePlaneFaceOverlayGeometry(quadNonIndexed(), [])).toBeNull()
  })

  it('skips invalid face indices', () => {
    const overlay = buildMatePlaneFaceOverlayGeometry(quadNonIndexed(), [-1, 99, 0])
    expect(overlay).not.toBeNull()
    expect(overlay!.getAttribute('position')!.count).toBe(3)
    overlay?.dispose()
  })

  it('returns null when geometry has no position attribute', () => {
    const empty = new BufferGeometry()
    expect(buildMatePlaneFaceOverlayGeometry(empty, [0])).toBeNull()
  })
})

describe('matePlaneHighlightsForPart', () => {
  const highlights = {
    planeA: planeRef('a', [0, 1]),
    planeB: planeRef('b', [2, 3]),
  }

  it('returns null overlays when highlights disabled', () => {
    expect(matePlaneHighlightsForPart('a', null)).toEqual({
      planeA: null,
      planeB: null,
    })
  })

  it('maps each plane to its part only', () => {
    expect(matePlaneHighlightsForPart('a', highlights)).toEqual({
      planeA: [0, 1],
      planeB: null,
    })
    expect(matePlaneHighlightsForPart('b', highlights)).toEqual({
      planeA: null,
      planeB: [2, 3],
    })
  })

  it('can return both overlays on the same part', () => {
    const bothOnA = {
      planeA: planeRef('a', [0, 1]),
      planeB: planeRef('a', [4, 5]),
    }
    expect(matePlaneHighlightsForPart('a', bothOnA)).toEqual({
      planeA: [0, 1],
      planeB: [4, 5],
    })
  })

  it('returns empty for unrelated part id', () => {
    expect(matePlaneHighlightsForPart('c', highlights)).toEqual({
      planeA: null,
      planeB: null,
    })
  })
})

describe('buildMatePlaneHighlightsForPopup', () => {
  const planeA = planeRef('a', [0, 1])
  const planeB = planeRef('b', [2, 3])

  it('returns null when popup is closed', () => {
    expect(buildMatePlaneHighlightsForPopup(false, planeA, planeB)).toBeNull()
  })

  it('keeps planes while popup is open (including after apply, before save)', () => {
    expect(buildMatePlaneHighlightsForPopup(true, planeA, planeB)).toEqual({
      planeA,
      planeB,
    })
  })

  it('allows partial highlights during pick flow', () => {
    expect(buildMatePlaneHighlightsForPopup(true, planeA, null)).toEqual({
      planeA,
      planeB: null,
    })
  })
})

describe('hasMatePlaneHighlights', () => {
  it('is false when highlights are off or empty', () => {
    expect(hasMatePlaneHighlights(null)).toBe(false)
    expect(hasMatePlaneHighlights({ planeA: null, planeB: null })).toBe(false)
  })

  it('is true when at least one plane is set', () => {
    expect(
      hasMatePlaneHighlights({
        planeA: planeRef('a', [0]),
        planeB: null,
      }),
    ).toBe(true)
  })
})

describe('MATE_PLANE_OVERLAY', () => {
  it('defines distinct styles for plane A and B', () => {
    expect(MATE_PLANE_OVERLAY.planeA.color).not.toBe(MATE_PLANE_OVERLAY.planeB.color)
    expect(MATE_PLANE_OVERLAY.planeA.opacity).toBeGreaterThan(0)
    expect(MATE_PLANE_OVERLAY.planeB.opacity).toBeGreaterThan(0)
  })
})
