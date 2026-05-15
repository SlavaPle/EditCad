import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MODEL_APPEARANCE,
  clampOpacity,
  isValidHexColor,
  parseModelAppearance,
} from './modelAppearance'

describe('modelAppearance', () => {
  it('parses missing appearance as undefined', () => {
    expect(parseModelAppearance(undefined)).toBeUndefined()
  })

  it('parses valid appearance', () => {
    const parsed = parseModelAppearance({
      surface: 'texture',
      color: '#aabbcc',
      opacity: 0.5,
      texture: { kind: 'default' },
    })
    expect(parsed).toEqual({
      surface: 'texture',
      color: '#aabbcc',
      opacity: 0.5,
      texture: { kind: 'default' },
    })
  })

  it('rejects invalid color', () => {
    expect(
      parseModelAppearance({
        ...DEFAULT_MODEL_APPEARANCE,
        color: 'red',
      }),
    ).toBeNull()
  })

  it('rejects invalid texture data url', () => {
    expect(
      parseModelAppearance({
        ...DEFAULT_MODEL_APPEARANCE,
        texture: { kind: 'image', dataUrl: 'http://example.com/x.png' },
      }),
    ).toBeNull()
  })

  it('clamps opacity', () => {
    expect(clampOpacity(2)).toBe(1)
    expect(clampOpacity(-1)).toBe(0)
    expect(isValidHexColor('#e2eaf4')).toBe(true)
  })
})
