import { describe, expect, it } from 'vitest'
import type { PreAssemblyProgramPart } from '../preAssemblyProgram'
import { defaultProgramPartTransform } from './programPartTransform'
import { renameProgramPart } from './renameProgramPart'

function part(id: string, name: string, ref: string): PreAssemblyProgramPart {
  return { id, name, ref, transform: defaultProgramPartTransform() }
}

describe('renameProgramPart', () => {
  it('aktualizuje name tylko wskazanego wpisu programu', () => {
    const parts = [part('a', 'Old', 'a.ecdprt'), part('b', 'Keep', 'b.ecdprt')]
    const next = renameProgramPart(parts, 'a', '  Bracket  ')
    expect(next[0].name).toBe('Bracket')
    expect(next[0].ref).toBe('a.ecdprt')
    expect(next[1]).toEqual(parts[1])
  })

  it('przy pustej nazwie wraca do ref (bez zmiany pliku detalu)', () => {
    const parts = [part('a', 'Custom', 'panel.ecdprt')]
    expect(renameProgramPart(parts, 'a', '   ')[0].name).toBe('panel.ecdprt')
  })

  it('nie mutuje tablicy gdy nazwa bez zmian', () => {
    const parts = [part('a', 'Same', 'a.ecdprt')]
    const next = renameProgramPart(parts, 'a', 'Same')
    expect(next[0]).toBe(parts[0])
  })
})
