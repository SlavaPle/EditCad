import { describe, expect, it } from 'vitest'
import {
  resolveDimensionSpec,
  resolvePhantomParameters,
  validateBindingsComplete,
  type PhantomAssembly,
} from './index'

function createFramePhantom(): PhantomAssembly {
  return {
    id: 'frame-sub-assembly',
    transform: { positionMm: [0, 0, 0], rotationDeg: [0, 0, 0] },
    parameters: [
      { id: 'thickness', kind: 'fromElement', elementId: 'panel', property: 'thickness' },
      { id: 'gap', kind: 'literal', valueMm: 2 },
    ],
    envelope: {
      kind: 'box',
      phantomKind: 'plate',
      widthMm: 600,
      heightMm: 400,
      depthMm: { paramId: 'thickness' },
    },
    attachments: [
      { id: 'floor', role: 'floor', source: { kind: 'boxFace', face: 'posY' } },
      {
        id: 'inner',
        role: 'middle',
        source: { kind: 'offsetPlane', face: 'posY', offsetMm: { paramId: 'gap' } },
      },
    ],
    elements: [
      {
        id: 'panel',
        binding: 'rigid',
        anchorId: 'floor',
        replaceable: true,
        ref: 'parts/panel-18mm.ecdprt',
        variants: [
          { id: 'panel-18mm', ref: 'parts/panel-18mm.ecdprt' },
          { id: 'panel-22mm', ref: 'parts/panel-22mm.ecdprt' },
        ],
        activeVariantId: 'panel-18mm',
      },
    ],
    connections: [],
  }
}

describe('pre-assembly bindings', () => {
  it('validateBindingsComplete accepts complete frame phantom', () => {
    expect(validateBindingsComplete(createFramePhantom()).ok).toBe(true)
  })

  it('validateBindingsComplete rejects fromElement pointing to missing slot', () => {
    const phantom = createFramePhantom()
    phantom.parameters.push({
      id: 'width',
      kind: 'fromElement',
      elementId: 'ghost',
      property: 'width',
    })
    const result = validateBindingsComplete(phantom)
    expect(result.ok).toBe(false)
  })

  it('validateBindingsComplete rejects expr parameters in MVP', () => {
    const phantom = createFramePhantom()
    phantom.parameters.push({ id: 'computed', kind: 'expr', expression: 'thickness * 2' })
    const result = validateBindingsComplete(phantom)
    expect(result.ok).toBe(false)
  })

  it('resolvePhantomParameters resolves literal and fromElement', () => {
    const phantom = createFramePhantom()
    const result = resolvePhantomParameters(phantom, {
      panel: { thickness: 18 },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.values).toEqual({ thickness: 18, gap: 2 })
  })

  it('resolvePhantomParameters fails when element property is missing', () => {
    const phantom = createFramePhantom()
    const result = resolvePhantomParameters(phantom, {})
    expect(result.ok).toBe(false)
  })

  it('resolveDimensionSpec resolves numeric and param references', () => {
    expect(resolveDimensionSpec(12, {})).toBe(12)
    expect(resolveDimensionSpec({ paramId: 'thickness' }, { thickness: 22 })).toBe(22)
    expect(resolveDimensionSpec({ paramId: 'missing' }, {})).toBeNull()
  })

  it('resolved parameters drive envelope depth via DimensionSpec', () => {
    const phantom = createFramePhantom()
    const resolved = resolvePhantomParameters(phantom, { panel: { thickness: 22 } })
    expect(resolved.ok).toBe(true)
    if (!resolved.ok) return
    expect(resolveDimensionSpec(phantom.envelope.depthMm, resolved.values)).toBe(22)
    const inner = phantom.attachments.find((a) => a.id === 'inner')
    expect(inner?.source.kind).toBe('offsetPlane')
    if (inner?.source.kind === 'offsetPlane') {
      expect(resolveDimensionSpec(inner.source.offsetMm, resolved.values)).toBe(2)
    }
  })
})
