import { describe, expect, it } from 'vitest'
import {
  normalizeAssemblyRelativeRef,
  programPartRefBaseName,
  splitAssemblyRelativeRef,
} from './assemblyRelativePath'

describe('assemblyRelativePath', () => {
  it('normalizes slashes and leading ./', () => {
    expect(normalizeAssemblyRelativeRef('.\\parts\\Panel.ecdprt')).toBe('parts/Panel.ecdprt')
    expect(normalizeAssemblyRelativeRef('./Panel.ecdprt')).toBe('Panel.ecdprt')
  })

  it('splits path segments', () => {
    expect(splitAssemblyRelativeRef('parts/sub/Panel.ecdprt')).toEqual([
      'parts',
      'sub',
      'Panel.ecdprt',
    ])
  })

  it('returns basename', () => {
    expect(programPartRefBaseName('parts/Panel.ecdprt')).toBe('Panel.ecdprt')
  })
})
