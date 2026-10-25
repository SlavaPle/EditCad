import { describe, expect, it } from 'vitest'
import { MOUSE, PerspectiveCamera } from 'three'
import { TrackballControls } from 'three-stdlib'
import { configureCadTrackballViewControls } from './configureCadTrackballViewControls'

describe('configureCadTrackballViewControls', () => {
  it('enables static moving (no inertia after mouse up)', () => {
    const controls = new TrackballControls(new PerspectiveCamera())
    configureCadTrackballViewControls(controls)
    expect(controls.staticMoving).toBe(true)
  })

  it('maps middle button to Trackball rotate branch', () => {
    const controls = new TrackballControls(new PerspectiveCamera())
    configureCadTrackballViewControls(controls)
    expect(controls.mouseButtons.LEFT).toBe(MOUSE.MIDDLE)
    expect(controls.mouseButtons.RIGHT).toBe(MOUSE.RIGHT)
    expect(Object.values(controls.mouseButtons)).not.toContain(0)
  })

  it('honours enableZoom false', () => {
    const controls = new TrackballControls(new PerspectiveCamera())
    configureCadTrackballViewControls(controls, { enableZoom: false })
    expect(controls.noZoom).toBe(true)
  })
})
