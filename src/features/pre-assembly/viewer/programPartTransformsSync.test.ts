import { describe, expect, it } from 'vitest'
import { defaultProgramPartTransform } from '../programParts/programPartTransform'
import type { PreAssemblyProgramPart } from '../preAssemblyProgram'
import { cloneProgramPartTransform, syncProgramPartTransformsMap } from './programPartTransformsSync'

function part(
  id: string,
  positionMm: [number, number, number],
  rotationDeg: [number, number, number] = [0, 0, 0],
): PreAssemblyProgramPart {
  return {
    id,
    ref: `${id}.ecdprt`,
    name: id,
    transform: { positionMm, rotationDeg },
  }
}

describe('programPartTransformsSync', () => {
  it('cloneProgramPartTransform copies arrays', () => {
    const src = { positionMm: [1, 2, 3] as const, rotationDeg: [4, 5, 6] as const }
    const cloned = cloneProgramPartTransform(src)
    expect(cloned).toEqual(src)
    expect(cloned.positionMm).not.toBe(src.positionMm)
  })

  it('syncProgramPartTransformsMap inits new parts only', () => {
    const map = new Map<string, ReturnType<typeof defaultProgramPartTransform>>()
    syncProgramPartTransformsMap([part('a', [10, 0, 0])], map)
    expect(map.get('a')?.positionMm).toEqual([10, 0, 0])
    expect(map.size).toBe(1)
  })

  it('syncProgramPartTransformsMap does not overwrite ref after prop changes', () => {
    const map = new Map<string, ReturnType<typeof defaultProgramPartTransform>>()
    map.set('a', { positionMm: [100, 0, 0], rotationDeg: [0, 15, 0] })
    syncProgramPartTransformsMap([part('a', [0, 0, 0])], map)
    expect(map.get('a')?.positionMm).toEqual([100, 0, 0])
    expect(map.get('a')?.rotationDeg).toEqual([0, 15, 0])
  })

  it('syncProgramPartTransformsMap removes deleted parts', () => {
    const map = new Map<string, ReturnType<typeof defaultProgramPartTransform>>()
    map.set('a', defaultProgramPartTransform())
    map.set('b', defaultProgramPartTransform())
    syncProgramPartTransformsMap([part('a', [0, 0, 0])], map)
    expect(map.has('b')).toBe(false)
    expect(map.size).toBe(1)
  })
})
