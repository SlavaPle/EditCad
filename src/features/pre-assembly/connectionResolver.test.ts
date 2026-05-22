import { describe, expect, it } from 'vitest'
import { resolvePhantomConnections, resolveSceneConnections } from './connectionResolver'
import type { PhantomAssembly, SceneDocument } from './model'

function createPhantomWithFloatingConnection(): PhantomAssembly {
  return {
    id: 'frame',
    transform: { positionMm: [0, 0, 0], rotationDeg: [0, 0, 0] },
    parameters: [],
    envelope: {
      kind: 'box',
      phantomKind: 'panel',
      widthMm: 600,
      heightMm: 400,
      depthMm: 18,
    },
    attachments: [{ id: 'wall', role: 'wall', source: { kind: 'boxFace', face: 'posX' } }],
    elements: [
      { id: 'rail', binding: 'rigid', anchorId: 'wall', ref: 'rail.ecdprt' },
      { id: 'bracket', binding: 'rigid', anchorId: 'wall', ref: 'bracket.ecdprt' },
    ],
    connections: [
      {
        id: 'rail-bracket',
        bindingKind: 'floating',
        endpointA: { kind: 'element', elementId: 'rail' },
        endpointB: { kind: 'element', elementId: 'bracket' },
        rule: { kind: 'floating', minOffsetMm: 10, maxOffsetMm: 50, axis: 'x' },
      },
      {
        id: 'rail-wall',
        bindingKind: 'rigid',
        endpointA: { kind: 'element', elementId: 'rail' },
        endpointB: { kind: 'anchor', anchorId: 'wall' },
        rule: { kind: 'coincident' },
      },
    ],
  }
}

describe('connectionResolver (phase 2 stubs)', () => {
  it('resolvePhantomConnections rejects floating connections', () => {
    const phantom = createPhantomWithFloatingConnection()
    const result = resolvePhantomConnections(phantom)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('unsupported')
    expect(result.error).toContain('Floating connection resolver')
  })

  it('resolvePhantomConnections accepts rigid-only graph', () => {
    const phantom = createPhantomWithFloatingConnection()
    phantom.connections = phantom.connections.filter((c) => c.bindingKind === 'rigid')
    const result = resolvePhantomConnections(phantom)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.placements).toEqual([])
  })

  it('resolveSceneConnections returns identity transforms when no scene links', () => {
    const scene: SceneDocument = {
      id: 'scene-1',
      phantoms: [
        {
          id: 'frame',
          ref: 'assemblies/frame.ecdpre',
          transform: { positionMm: [10, 0, 0], rotationDeg: [0, 90, 0] },
        },
      ],
      connections: [],
    }
    const result = resolveSceneConnections(scene)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.phantomTransforms.frame).toEqual(scene.phantoms[0]!.transform)
  })

  it('resolveSceneConnections rejects phantom-to-phantom links', () => {
    const scene: SceneDocument = {
      id: 'scene-1',
      phantoms: [
        {
          id: 'a',
          ref: 'a.ecdpre',
          transform: { positionMm: [0, 0, 0], rotationDeg: [0, 0, 0] },
        },
        {
          id: 'b',
          ref: 'b.ecdpre',
          transform: { positionMm: [100, 0, 0], rotationDeg: [0, 0, 0] },
        },
      ],
      connections: [
        {
          id: 'a-b',
          bindingKind: 'rigid',
          endpointA: { kind: 'phantomAnchor', phantomId: 'a', anchorId: 'outer' },
          endpointB: { kind: 'phantomAnchor', phantomId: 'b', anchorId: 'outer' },
          rule: { kind: 'coincident' },
        },
      ],
    }
    const result = resolveSceneConnections(scene)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('unsupported')
  })
})
