import { describe, expect, it } from 'vitest'
import {
  MESH_STANDARD_BODY_EMISSIVE_INTENSITY_OPAQUE,
  getBodyTransparencyRenderState,
} from './bodyTransparencySettings'

describe('getBodyTransparencyRenderState', () => {
  it('opaque at full opacity: front-side workflow, depth write, emissive on', () => {
    const s = getBodyTransparencyRenderState(1)
    expect(s.opacity).toBe(1)
    expect(s.transparent).toBe(false)
    expect(s.depthWrite).toBe(true)
    expect(s.doubleSided).toBe(false)
    expect(s.meshStandardEmissiveIntensity).toBe(MESH_STANDARD_BODY_EMISSIVE_INTENSITY_OPAQUE)
  })

  it('opaque when opacity > 1 (clamped)', () => {
    const s = getBodyTransparencyRenderState(1.5)
    expect(s.opacity).toBe(1)
    expect(s.transparent).toBe(false)
    expect(s.doubleSided).toBe(false)
  })

  it('transparent at partial opacity: no depth write, double sided, no emissive glow', () => {
    const s = getBodyTransparencyRenderState(0.5)
    expect(s.opacity).toBe(0.5)
    expect(s.transparent).toBe(true)
    expect(s.depthWrite).toBe(false)
    expect(s.doubleSided).toBe(true)
    expect(s.meshStandardEmissiveIntensity).toBe(0)
  })

  it('transparent when opacity just below 1', () => {
    const s = getBodyTransparencyRenderState(0.999)
    expect(s.transparent).toBe(true)
    expect(s.doubleSided).toBe(true)
    expect(s.depthWrite).toBe(false)
  })

  it('fully transparent hull still uses transparent flags', () => {
    const s = getBodyTransparencyRenderState(0)
    expect(s.opacity).toBe(0)
    expect(s.transparent).toBe(true)
    expect(s.doubleSided).toBe(true)
    expect(s.depthWrite).toBe(false)
    expect(s.meshStandardEmissiveIntensity).toBe(0)
  })

  it('invalid input clamps to opaque defaults', () => {
    const s = getBodyTransparencyRenderState(Number.NaN)
    expect(s.opacity).toBe(1)
    expect(s.transparent).toBe(false)
    expect(s.doubleSided).toBe(false)
  })
})
