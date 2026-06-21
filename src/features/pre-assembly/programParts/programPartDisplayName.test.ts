import { describe, expect, it } from 'vitest'
import type { PreAssemblyProgramPart } from '../preAssemblyProgram'
import { defaultProgramPartTransform } from './programPartTransform'
import { buildProgramPartDisplayNameById } from './programPartDisplayName'

function part(id: string, name: string, ref: string): PreAssemblyProgramPart {
  return { id, name, ref, transform: defaultProgramPartTransform() }
}

describe('buildProgramPartDisplayNameById', () => {
  it('uses file ref as label', () => {
    const map = buildProgramPartDisplayNameById([
      part('a', 'Part1', 'Part1panel.ecdprt'),
      part('b', 'Part1', 'Part1.ecdprt'),
      part('c', 'Part1', 'New.ecdprt'),
    ])
    expect(map.a).toBe('Part1panel.ecdprt')
    expect(map.b).toBe('Part1.ecdprt')
    expect(map.c).toBe('New.ecdprt')
  })

  it('numbers duplicate refs', () => {
    const map = buildProgramPartDisplayNameById([
      part('a', 'Part1', 'New.ecdprt'),
      part('b', 'Part1', 'New.ecdprt'),
      part('c', 'Part1', 'New.ecdprt'),
    ])
    expect(map.a).toBe('New.ecdprt')
    expect(map.b).toBe('New.ecdprt (2)')
    expect(map.c).toBe('New.ecdprt (3)')
  })

  it('falls back to part id when ref is empty', () => {
    const map = buildProgramPartDisplayNameById([part('part-x', 'Part1', '  ')])
    expect(map['part-x']).toBe('part-x')
  })
})
