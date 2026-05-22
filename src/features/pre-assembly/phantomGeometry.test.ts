import { describe, expect, it } from 'vitest'
import {
  attachmentAnchorPoseMm,
  boxFacePoseMm,
  mapEnvelopeDimensionsToAxes,
  resolveEnvelopeSizeMm,
} from './phantomGeometry'
import type { PhantomEnvelope } from './model'

const panelEnvelope: PhantomEnvelope = {
  kind: 'box',
  phantomKind: 'panel',
  widthMm: 600,
  heightMm: 400,
  depthMm: { paramId: 'thickness' },
  thicknessAxis: 'z',
}

describe('phantomGeometry', () => {
  it('maps panel dimensions with thickness on Z', () => {
    expect(mapEnvelopeDimensionsToAxes(panelEnvelope, 600, 400, 18)).toEqual({
      x: 600,
      y: 400,
      z: 18,
    })
  })

  it('maps panel dimensions with default thickness on Z', () => {
    const envelope: PhantomEnvelope = {
      kind: 'box',
      phantomKind: 'panel',
      widthMm: 600,
      heightMm: 400,
      depthMm: 18,
    }
    expect(mapEnvelopeDimensionsToAxes(envelope, 600, 400, 18)).toEqual({
      x: 600,
      y: 400,
      z: 18,
    })
  })

  it('maps panel dimensions with thickness on Y', () => {
    const envelope: PhantomEnvelope = {
      kind: 'box',
      phantomKind: 'panel',
      widthMm: 600,
      heightMm: 400,
      depthMm: 18,
      thicknessAxis: 'y',
    }
    expect(mapEnvelopeDimensionsToAxes(envelope, 600, 400, 18)).toEqual({
      x: 600,
      y: 18,
      z: 400,
    })
  })

  it('resolves envelope size from parameter values', () => {
    const size = resolveEnvelopeSizeMm(panelEnvelope, { thickness: 22 })
    expect(size).toEqual({ x: 600, y: 400, z: 22 })
  })

  it('returns null when dimension spec is unresolved', () => {
    expect(resolveEnvelopeSizeMm(panelEnvelope, {})).toBeNull()
  })

  it('computes box face center on posY', () => {
    const pose = boxFacePoseMm('posY', { x: 600, y: 400, z: 18 })
    expect(pose.centerMm).toEqual([0, 200, 0])
    expect(pose.outwardNormal).toEqual([0, 1, 0])
  })

  it('computes offset plane inward from face', () => {
    const anchor = {
      id: 'inner',
      role: 'middle' as const,
      source: {
        kind: 'offsetPlane' as const,
        face: 'posY' as const,
        offsetMm: 2,
      },
    }
    const pose = attachmentAnchorPoseMm(anchor, { x: 600, y: 400, z: 18 }, {})
    expect(pose?.centerMm).toEqual([0, 198, 0])
  })
})
