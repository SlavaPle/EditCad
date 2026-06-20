import { describe, expect, it } from 'vitest'
import type { PreAssemblyProgramPart } from '../preAssemblyProgram'
import { defaultProgramPartTransform } from './programPartTransform'
import { buildProgramPartDisplayNameById } from './programPartDisplayName'

function part(id: string, name: string, ref: string): PreAssemblyProgramPart {
  return { id, name, ref, transform: defaultProgramPartTransform() }
}

describe('buildProgramPartDisplayNameById', () => {
  it('uses name when unique', () => {
    const map = buildProgramPartDisplayNameById([
      part('a', 'Panel A', 'panel-a.ecdprt'),
      part('b', 'Panel B', 'panel-b.ecdprt'),
    ])
    expect(map.a).toBe('Panel A')
    expect(map.b).toBe('Panel B')
  })

  it('appends ref when names collide', () => {
    const map = buildProgramPartDisplayNameById([
      part('a', 'Part1', 'left.ecdprt'),
      part('b', 'Part1', 'right.ecdprt'),
    ])
    expect(map.a).toBe('Part1 · left.ecdprt')
    expect(map.b).toBe('Part1 · right.ecdprt')
  })

  it('falls back to ref when name is empty', () => {
    const map = buildProgramPartDisplayNameById([part('a', '  ', 'only.ecdprt')])
    expect(map.a).toBe('only.ecdprt')
  })
})
