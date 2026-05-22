import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import {
  copyOrbitFocusPointWorld,
  orbitFocusPointWorld,
  setOrbitFocusPointWorld,
} from './orbitFocusPointWorld'

describe('orbitFocusPointWorld', () => {
  it('setOrbitFocusPointWorld copies into shared vector', () => {
    setOrbitFocusPointWorld(new Vector3(5, 2, 3))
    expect(orbitFocusPointWorld.toArray()).toEqual([5, 2, 3])
  })

  it('copyOrbitFocusPointWorld returns independent target filled from store', () => {
    setOrbitFocusPointWorld(new Vector3(1, 2, 3))
    const out = new Vector3()
    copyOrbitFocusPointWorld(out)
    expect(out.toArray()).toEqual([1, 2, 3])
    out.set(0, 0, 0)
    expect(orbitFocusPointWorld.toArray()).toEqual([1, 2, 3])
  })
})
