import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  PRE_ASSEMBLY_FORMAT,
  PRE_ASSEMBLY_VERSION,
  parsePhantomAssemblyFile,
  serializePhantomAssemblyFile,
  validateBindingsComplete,
  validatePhantomAssemblyFile,
  type PhantomAssembly,
  type PhantomAssemblyFile,
} from './index'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function createEmptyPhantomFile(): PhantomAssemblyFile {
  return {
    format: PRE_ASSEMBLY_FORMAT,
    version: PRE_ASSEMBLY_VERSION,
    id: 'phantom-root',
    name: 'Phantom',
    phantom: {
      id: 'phantom-1',
      transform: { positionMm: [0, 0, 0], rotationDeg: [0, 0, 0] },
      parameters: [],
      envelope: {
        kind: 'box',
        phantomKind: 'plate',
        widthMm: 600,
        heightMm: 400,
        depthMm: 18,
      },
      attachments: [],
      elements: [],
      connections: [],
    },
  }
}

function createFramePhantom(): PhantomAssembly {
  return {
    id: 'frame-sub-assembly',
    name: 'Frame sub-assembly',
    transform: { positionMm: [0, 0, 0], rotationDeg: [0, 0, 0] },
    parameters: [
      { id: 'thickness', kind: 'fromElement', elementId: 'panel', property: 'thickness' },
    ],
    envelope: {
      kind: 'box',
      phantomKind: 'plate',
      widthMm: 600,
      heightMm: 400,
      depthMm: { paramId: 'thickness' },
      thicknessAxis: 'z',
    },
    attachments: [
      { id: 'floor', role: 'floor', source: { kind: 'boxFace', face: 'posY' } },
      {
        id: 'inner',
        role: 'middle',
        source: { kind: 'offsetPlane', face: 'posY', offsetMm: { paramId: 'thickness' } },
      },
      { id: 'wall', role: 'wall', source: { kind: 'boxFace', face: 'posX' } },
    ],
    elements: [
      {
        id: 'panel',
        name: 'Panel',
        binding: 'rigid',
        anchorId: 'floor',
        replaceable: true,
        ref: 'parts/panel-18mm.ecdprt',
        variants: [
          { id: 'panel-18mm', ref: 'parts/panel-18mm.ecdprt', label: '18 mm' },
          { id: 'panel-22mm', ref: 'parts/panel-22mm.ecdprt', label: '22 mm' },
        ],
        activeVariantId: 'panel-18mm',
      },
      {
        id: 'rail',
        binding: 'rigid',
        anchorId: 'wall',
        ref: 'parts/rail.ecdprt',
      },
      {
        id: 'bracket',
        binding: 'rigid',
        anchorId: 'wall',
        ref: 'parts/bracket.ecdprt',
      },
    ],
    connections: [
      {
        id: 'rail-bracket',
        bindingKind: 'floating',
        endpointA: { kind: 'element', elementId: 'rail' },
        endpointB: { kind: 'element', elementId: 'bracket' },
        rule: { kind: 'floating', minOffsetMm: 10, maxOffsetMm: 50, axis: 'x' },
        degreesOfFreedom: [{ axis: 'x' }],
      },
      {
        id: 'rail-wall',
        bindingKind: 'rigid',
        endpointA: { kind: 'element', elementId: 'rail', attachmentHint: 'wall' },
        endpointB: { kind: 'anchor', anchorId: 'wall' },
        rule: { kind: 'coincident' },
      },
    ],
  }
}

describe('pre-assembly codec', () => {
  it('accepts minimal empty phantom', () => {
    const result = validatePhantomAssemblyFile(createEmptyPhantomFile())
    expect(result.ok).toBe(true)
  })

  it('roundtrips minimal file through JSON', () => {
    const source = createEmptyPhantomFile()
    const parsed = parsePhantomAssemblyFile(serializePhantomAssemblyFile(source))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.file).toEqual(source)
  })

  it('accepts frame phantom with parameters, slots, attachments, connections', () => {
    const source: PhantomAssemblyFile = {
      ...createEmptyPhantomFile(),
      id: 'frame-root',
      name: 'Frame',
      phantom: createFramePhantom(),
    }
    const parsed = parsePhantomAssemblyFile(serializePhantomAssemblyFile(source))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.file).toEqual(source)
  })

  it('rejects unsupported version', () => {
    const result = validatePhantomAssemblyFile({
      ...createEmptyPhantomFile(),
      version: 99,
    })
    expect(result.ok).toBe(false)
  })

  it('rejects invalid envelope kind', () => {
    const file = createEmptyPhantomFile()
    file.phantom.envelope = {
      kind: 'box',
      phantomKind: 'plate',
      widthMm: 1,
      heightMm: 1,
      depthMm: 1,
    }
    const broken = {
      ...file,
      phantom: {
        ...file.phantom,
        envelope: { ...file.phantom.envelope, kind: 'wedge' },
      },
    }
    const result = validatePhantomAssemblyFile(broken)
    expect(result.ok).toBe(false)
  })

  it('rejects duplicate parameter ids', () => {
    const file = createEmptyPhantomFile()
    file.phantom.parameters = [
      { id: 'dup', kind: 'literal', valueMm: 1 },
      { id: 'dup', kind: 'literal', valueMm: 2 },
    ]
    const result = validatePhantomAssemblyFile(file)
    expect(result.ok).toBe(false)
  })

  it('rejects slot with unknown anchor via bindings validation', () => {
    const file = createEmptyPhantomFile()
    file.phantom.elements = [
      {
        id: 'part-a',
        binding: 'rigid',
        anchorId: 'missing-anchor',
        ref: 'parts/a.ecdprt',
      },
    ]
    const result = validatePhantomAssemblyFile(file)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('unknown anchor')
  })

  it('rejects floating connection without floating rule', () => {
    const phantom = createFramePhantom()
    phantom.connections[0].rule = { kind: 'coincident' }
    const result = validateBindingsComplete(phantom)
    expect(result.ok).toBe(false)
  })

  it('rejects replaceable slot without variants', () => {
    const phantom = createFramePhantom()
    phantom.elements[0].variants = []
    const result = validateBindingsComplete(phantom)
    expect(result.ok).toBe(false)
  })

  it('rejects DimensionSpec with unknown paramId', () => {
    const phantom = createFramePhantom()
    phantom.envelope.depthMm = { paramId: 'missing-param' }
    const result = validateBindingsComplete(phantom)
    expect(result.ok).toBe(false)
  })

  it('accepts committed project template from config/templates', () => {
    const content = readFileSync(
      join(projectRoot, 'config/templates/pre-assembly.empty.json'),
      'utf8',
    )
    const parsed = parsePhantomAssemblyFile(content)
    expect(parsed.ok).toBe(true)
  })
})
