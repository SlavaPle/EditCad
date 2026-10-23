import { describe, expect, it } from 'vitest'
import type { AssemblyMate } from '../assembly-mates/model'
import type { PreAssemblyProgramPart } from '../pre-assembly/preAssemblyProgram'
import {
  buildDocumentTree,
  collectExpandableNodeIds,
  findDocumentTreeNode,
} from './buildDocumentTree'

const partA: PreAssemblyProgramPart = {
  id: 'pa',
  ref: 'a.ecdprt',
  name: 'Bracket',
  transform: { positionMm: [0, 0, 0], rotationDeg: [0, 0, 0] },
}

const partB: PreAssemblyProgramPart = {
  id: 'pb',
  ref: 'b.ecdprt',
  name: 'Plate',
  transform: { positionMm: [10, 0, 0], rotationDeg: [0, 0, 0] },
}

const mate: AssemblyMate = {
  id: 'm1',
  kind: 'parallel',
  entityA: { partId: 'pa', faceIndex: 0, faceIndices: [0, 1] },
  entityB: { partId: 'pb', faceIndex: 2, faceIndices: [2] },
  alignment: 'faceToFace',
  offsetMm: 0,
}

describe('buildDocumentTree', () => {
  it('returns null when no model and no parts', () => {
    expect(
      buildDocumentTree({
        partRootLabel: '',
        partSizeMm: null,
        hasPartModel: false,
        assemblyName: 'Assembly',
        programParts: [],
        partDisplayNameById: {},
        partSizeMmById: {},
        modelElementsByPartId: {},
        mates: [],
        partLocks: {},
      }),
    ).toBeNull()
  })

  it('builds part mode with model, appearance, and XYZ sizes', () => {
    const root = buildDocumentTree({
      partRootLabel: 'part.ecdprt',
      partSizeMm: { x: 100, y: 50, z: 10 },
      hasPartModel: true,
      assemblyName: 'Assembly',
      programParts: [],
      partDisplayNameById: {},
      partSizeMmById: {},
      modelElementsByPartId: {},
      mates: [],
      partLocks: {},
    })
    expect(root?.kind).toBe('root')
    expect(root?.label).toBe('part.ecdprt')
    const kinds = (root?.children ?? []).map((c) => c.kind)
    expect(kinds).toEqual(['model', 'appearance', 'size', 'size', 'size'])
    const sizeX = findDocumentTreeNode(root, 'part:main:size:x')
    expect(sizeX?.sizeMm).toBe(100)
    expect(sizeX?.label).toContain('X:')
  })

  it('builds assembly with parts, elements, lock flag, and mates', () => {
    const root = buildDocumentTree({
      partRootLabel: '',
      partSizeMm: null,
      hasPartModel: false,
      assemblyName: 'DemoAsm',
      programParts: [partA, partB],
      partDisplayNameById: { pa: 'Bracket', pb: 'Plate' },
      partSizeMmById: {
        pa: { x: 20, y: 10, z: 5 },
        pb: { x: 40, y: 30, z: 2 },
      },
      modelElementsByPartId: {
        pa: [{ id: 'face-group-1', faceIndices: [0, 1, 2] }],
      },
      mates: [mate],
      partLocks: { pa: true },
    })

    expect(root?.id).toBe('root:assembly')
    expect(root?.label).toBe('DemoAsm')
    const partNode = findDocumentTreeNode(root, 'part:pa')
    expect(partNode?.locked).toBe(true)
    expect(findDocumentTreeNode(root, 'part:pa:element:face-group-1')?.kind).toBe('element')
    expect(findDocumentTreeNode(root, 'mate:m1')?.kind).toBe('mate')
    expect(collectExpandableNodeIds(root).length).toBeGreaterThan(0)
  })
})
