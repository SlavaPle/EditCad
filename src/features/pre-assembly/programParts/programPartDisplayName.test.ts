import { describe, expect, it } from 'vitest'
import type { PreAssemblyProgramPart } from '../preAssemblyProgram'
import { defaultProgramPartTransform } from './programPartTransform'
import { buildProgramPartDisplayNameById } from './programPartDisplayName'

function part(id: string, name: string, ref: string): PreAssemblyProgramPart {
  return { id, name, ref, transform: defaultProgramPartTransform() }
}

describe('buildProgramPartDisplayNameById', () => {
  it('uses program name as label', () => {
    const map = buildProgramPartDisplayNameById([
      part('a', 'Bracket', 'Part1panel.ecdprt'),
      part('b', 'Plate', 'Part1.ecdprt'),
      part('c', 'New', 'New.ecdprt'),
    ])
    expect(map.a).toBe('Bracket')
    expect(map.b).toBe('Plate')
    expect(map.c).toBe('New')
  })

  it('numbers duplicate names', () => {
    const map = buildProgramPartDisplayNameById([
      part('a', 'New', 'a.ecdprt'),
      part('b', 'New', 'b.ecdprt'),
      part('c', 'New', 'c.ecdprt'),
    ])
    expect(map.a).toBe('New')
    expect(map.b).toBe('New (2)')
    expect(map.c).toBe('New (3)')
  })

  it('falls back to ref then part id when name is empty', () => {
    expect(buildProgramPartDisplayNameById([part('part-x', '  ', 'panel.ecdprt')])['part-x']).toBe(
      'panel.ecdprt',
    )
    expect(buildProgramPartDisplayNameById([part('part-x', '  ', '  ')])['part-x']).toBe('part-x')
  })
})
