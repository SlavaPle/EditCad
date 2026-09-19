import { describe, expect, it } from 'vitest'
import { BoxGeometry } from 'three'
import type { PreparedElementConstraints } from '../../../lib/preparedElementFormat'
import { resolveViewportPreparedBinding } from './resolveViewportPreparedBinding'

const mainPrepared: PreparedElementConstraints = {
  mode: 'fixed',
  faceConstraints: [{ id: 'main-c', type: 'const', facePair: null, valueMm: 10 }],
  modelElements: [{ id: 'main-el', faceIndices: [0, 1] }],
}

const partPrepared: PreparedElementConstraints = {
  mode: 'fixed',
  faceConstraints: [{ id: 'part-c', type: 'minmax', facePair: null, minMm: 0, maxMm: 20 }],
  modelElements: [{ id: 'part-el', faceIndices: [2, 3] }],
}

describe('resolveViewportPreparedBinding', () => {
  it('uses main model prepared data outside pre-assembly', () => {
    const main = new BoxGeometry(1, 1, 1)
    const part = new BoxGeometry(2, 2, 2)
    const binding = resolveViewportPreparedBinding({
      preAssemblyActive: false,
      activeProgramPartId: 'p1',
      programPartGeometries: { p1: part },
      programPartConstraints: { p1: partPrepared },
      mainModel: main,
      mainPrepared,
    })
    expect(binding.model).toBe(main)
    expect(binding.activeProgramPartId).toBeNull()
    expect(binding.modelElements).toEqual(mainPrepared.modelElements)
    expect(binding.faceConstraints.map((c) => c.id)).toEqual(['main-c'])
    main.dispose()
    part.dispose()
  })

  it('pairs program part geometry with that part constraints in pre-assembly', () => {
    const main = new BoxGeometry(1, 1, 1)
    const part = new BoxGeometry(2, 2, 2)
    const binding = resolveViewportPreparedBinding({
      preAssemblyActive: true,
      activeProgramPartId: 'p1',
      programPartGeometries: { p1: part },
      programPartConstraints: { p1: partPrepared },
      mainModel: main,
      mainPrepared,
    })
    expect(binding.model).toBe(part)
    expect(binding.activeProgramPartId).toBe('p1')
    expect(binding.modelElements).toEqual(partPrepared.modelElements)
    expect(binding.faceConstraints.map((c) => c.id)).toEqual(['part-c'])
    main.dispose()
    part.dispose()
  })

  it('uses empty prepared data when part has no stored constraints', () => {
    const part = new BoxGeometry(2, 2, 2)
    const binding = resolveViewportPreparedBinding({
      preAssemblyActive: true,
      activeProgramPartId: 'p1',
      programPartGeometries: { p1: part },
      programPartConstraints: {},
      mainModel: null,
      mainPrepared,
    })
    expect(binding.model).toBe(part)
    expect(binding.modelElements).toEqual([])
    expect(binding.faceConstraints).toEqual([])
    part.dispose()
  })

  it('falls back to main prepared when active part geometry is missing', () => {
    const main = new BoxGeometry(1, 1, 1)
    const binding = resolveViewportPreparedBinding({
      preAssemblyActive: true,
      activeProgramPartId: 'missing',
      programPartGeometries: {},
      programPartConstraints: {},
      mainModel: main,
      mainPrepared,
    })
    expect(binding.model).toBe(main)
    expect(binding.activeProgramPartId).toBeNull()
    expect(binding.modelElements).toEqual(mainPrepared.modelElements)
    main.dispose()
  })
})
