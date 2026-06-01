import { describe, expect, it } from 'vitest'
import {
  PREPARED_ELEMENT_FORMAT,
  PREPARED_ELEMENT_VERSION,
} from '../../../lib/preparedElementFormat'
import { loadProgramPartGeometryFromFile } from './programPartGeometry'

const MINI_STL_ASCII = `solid box
facet normal 0 0 1
  outer loop
    vertex 0 0 0
    vertex 10 0 0
    vertex 0 10 0
  endloop
endfacet
endsolid box`

function makeEcdprtFile(appearance?: {
  surface: 'texture'
  color: string
  texture: { kind: 'default' }
  opacity: number
}): File {
  const body = JSON.stringify({
    format: PREPARED_ELEMENT_FORMAT,
    version: PREPARED_ELEMENT_VERSION,
    name: 'Textured panel',
    geometry: { format: 'stl-ascii', data: MINI_STL_ASCII },
    constraints: { mode: 'fixed', faceConstraints: [], modelElements: [] },
    ...(appearance ? { appearance } : {}),
  })
  return new File([body], 'panel.ecdprt', { type: 'application/json' })
}

describe('loadProgramPartGeometryFromFile (integration)', () => {
  it('loads geometry and texture appearance from real ecdprt bytes', async () => {
    const appearance = {
      surface: 'texture' as const,
      color: '#c0d4e8',
      texture: { kind: 'default' as const },
      opacity: 1,
    }
    const result = await loadProgramPartGeometryFromFile(makeEcdprtFile(appearance))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.appearance).toEqual(appearance)
    expect(result.geometry.attributes.position).toBeDefined()
    result.geometry.dispose()
  })
})
