import { describe, expect, it } from 'vitest'
import { appendProgramParts, programPartsFromAssemblyProgram, removeProgramPart } from './preAssemblyProgram'

describe('preAssemblyProgram', () => {
  it('appends multiple program parts', () => {
    const next = appendProgramParts([], [
      { ref: 'a.ecdprt', name: 'A' },
      { ref: 'b.ecdprt', name: 'B' },
    ])
    expect(next).toHaveLength(2)
    expect(next[0]?.ref).toBe('a.ecdprt')
    expect(next[1]?.ref).toBe('b.ecdprt')
    expect(next[0]?.id).not.toBe(next[1]?.id)
  })

  it('returns copy when incoming list is empty', () => {
    const existing = appendProgramParts([], [{ ref: 'a.ecdprt', name: 'A' }])
    const next = appendProgramParts(existing, [])
    expect(next).toEqual(existing)
    expect(next).not.toBe(existing)
  })

  it('removes program part by id', () => {
    const parts = appendProgramParts([], [{ ref: 'a.ecdprt', name: 'A' }])
    const id = parts[0]!.id
    expect(removeProgramPart(parts, id)).toHaveLength(0)
  })

  it('clones program parts from assembly file', () => {
    const program = [{ id: 'p1', ref: 'a.ecdprt', name: 'A' }]
    const cloned = programPartsFromAssemblyProgram(program)
    expect(cloned).toEqual(program)
    expect(cloned).not.toBe(program)
    expect(cloned[0]).not.toBe(program[0])
  })
})
