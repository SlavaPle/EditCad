import { describe, expect, it } from 'vitest'
import { BufferAttribute, BufferGeometry } from 'three'
import { buildStlFileName, exportGeometryToAsciiStl } from './saveModel'

function createTriangleGeometry(): BufferGeometry {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array([0, 0, 0, 10, 0, 0, 0, 10, 0]), 3))
  geometry.setIndex([0, 1, 2])
  return geometry
}

describe('saveModel', () => {
  describe('buildStlFileName', () => {
    it('adds .stl extension when missing', () => {
      expect(buildStlFileName('part-v2')).toBe('part-v2.stl')
    })

    it('keeps .stl extension when provided', () => {
      expect(buildStlFileName('part.stl')).toBe('part.stl')
    })

    it('sanitizes unsafe characters', () => {
      expect(buildStlFileName('part v2/final')).toBe('part-v2-final.stl')
    })
  })

  describe('exportGeometryToAsciiStl', () => {
    it('exports valid ascii stl text', () => {
      const stl = exportGeometryToAsciiStl(createTriangleGeometry())
      expect(stl.toLowerCase()).toContain('solid')
      expect(stl.toLowerCase()).toContain('facet normal')
      expect(stl.toLowerCase()).toContain('vertex')
    })
  })
})
