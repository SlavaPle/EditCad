import { describe, expect, it } from 'vitest'
import { DEFAULT_MODEL_APPEARANCE } from '../../viewer-display/modelAppearance'
import { resolveProgramPartAppearance } from './programPartAppearance'

describe('resolveProgramPartAppearance', () => {
  it('returns default when part has no stored appearance', () => {
    expect(resolveProgramPartAppearance('missing', {})).toEqual(DEFAULT_MODEL_APPEARANCE)
  })

  it('returns stored appearance for part id', () => {
    const appearance = {
      surface: 'texture' as const,
      color: '#aabbcc',
      texture: { kind: 'default' as const },
      opacity: 1,
    }
    expect(resolveProgramPartAppearance('part-1', { 'part-1': appearance })).toBe(appearance)
  })

  it('ignores undefined map entry and falls back to default', () => {
    expect(resolveProgramPartAppearance('part-1', { 'part-1': undefined })).toEqual(
      DEFAULT_MODEL_APPEARANCE,
    )
  })
})
