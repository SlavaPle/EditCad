import { describe, it, expect } from 'vitest'
import { loadModel, isSupportedExtension, MODEL_FILE_ACCEPT } from './loadModel'

describe('loadModel', () => {
  describe('isSupportedExtension', () => {
    it('returns true for .stl (any case)', () => {
      expect(isSupportedExtension('a.stl')).toBe(true)
      expect(isSupportedExtension('a.STL')).toBe(true)
    })
    it('returns true for .stp and .step', () => {
      expect(isSupportedExtension('x.stp')).toBe(true)
      expect(isSupportedExtension('x.step')).toBe(true)
    })
    it('returns true for .igs and .iges', () => {
      expect(isSupportedExtension('y.igs')).toBe(true)
      expect(isSupportedExtension('y.iges')).toBe(true)
    })
    it('returns false for unsupported extensions', () => {
      expect(isSupportedExtension('z.obj')).toBe(false)
      expect(isSupportedExtension('z.xyz')).toBe(false)
      expect(isSupportedExtension('noext')).toBe(false)
    })
  })

  describe('loadModel', () => {
    it('returns error for STEP file (not implemented)', async () => {
      const file = new File([''], 'model.stp', { type: 'application/octet-stream' })
      const result = await loadModel(file)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toContain('STEP')
      }
    })
    it('returns error for IGES file (not implemented)', async () => {
      const file = new File([''], 'model.iges', { type: 'application/octet-stream' })
      const result = await loadModel(file)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toContain('IGES')
      }
    })
    it('returns error for unsupported extension', async () => {
      const file = new File([''], 'model.obj', { type: 'application/octet-stream' })
      const result = await loadModel(file)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toMatch(/Unsupported format|\.stl/)
      }
    })
    // Real STL load requires browser (URL.createObjectURL, FileLoader) — covered by e2e/manual
    it.skip('returns geometry for valid ASCII STL (browser only)', async () => {
      const asciiSTL = `solid test
        facet normal 0 0 0
          outer loop
            vertex 0 0 0
            vertex 1 0 0
            vertex 0 1 0
          endloop
        endfacet
      endsolid test`
      const file = new File([asciiSTL], 'model.stl', { type: 'application/octet-stream' })
      const result = await loadModel(file)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.format).toBe('stl')
        expect(result.geometry).toBeDefined()
        expect(result.geometry.attributes.position).toBeDefined()
      }
    })
  })

  describe('MODEL_FILE_ACCEPT', () => {
    it('includes stl, stp, step, igs, iges', () => {
      expect(MODEL_FILE_ACCEPT).toContain('.stl')
      expect(MODEL_FILE_ACCEPT).toContain('.stp')
      expect(MODEL_FILE_ACCEPT).toContain('.step')
      expect(MODEL_FILE_ACCEPT).toContain('.igs')
      expect(MODEL_FILE_ACCEPT).toContain('.iges')
    })
  })
})
