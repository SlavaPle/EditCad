import { describe, expect, it } from 'vitest'
import { VIEW_CUBE_FACE_NAMES } from './viewCubeAxisDirections'
import { buildViewCubeFaceLabels, VIEW_CUBE_FACE_KEYS } from './viewCubeFaces'

describe('VIEW_CUBE_FACE_KEYS', () => {
  it('has one i18n key per named face', () => {
    expect(VIEW_CUBE_FACE_KEYS).toHaveLength(VIEW_CUBE_FACE_NAMES.length)
    for (let i = 0; i < VIEW_CUBE_FACE_NAMES.length; i++) {
      const name = VIEW_CUBE_FACE_NAMES[i]!
      expect(VIEW_CUBE_FACE_KEYS[i]).toBe(`viewer.viewCube.face${name[0]!.toUpperCase()}${name.slice(1)}`)
    }
  })
})

describe('buildViewCubeFaceLabels', () => {
  it('returns six labels in drei face order', () => {
    const labels = buildViewCubeFaceLabels((key) => key)
    expect(labels).toHaveLength(6)
    expect(labels).toEqual([...VIEW_CUBE_FACE_KEYS])
  })

  it('maps each key through the translator', () => {
    const labels = buildViewCubeFaceLabels((key) =>
      key === 'viewer.viewCube.faceTop' ? 'TOP' : 'other',
    )
    expect(labels[2]).toBe('TOP')
    expect(labels.filter((l) => l === 'other')).toHaveLength(5)
  })

  it('produces non-empty strings for all faces when translator returns text', () => {
    const labels = buildViewCubeFaceLabels((key) => key.split('.').pop() ?? '')
    expect(labels.every((label) => label.length > 0)).toBe(true)
  })
})
