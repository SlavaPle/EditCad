import { forwardRef, useEffect, useMemo, type ComponentProps } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { TrackballControls as TrackballControlsImpl } from 'three-stdlib'
import type { TrackballControls } from 'three-stdlib'
import { Spherical } from 'three'
import { configureCadTrackballViewControls } from './configureCadTrackballViewControls'
import { updateOrbitViewFromMouse } from './orbitViewRotation'
import { TRACKBALL_VIEW_MOUSE_BUTTONS } from './trackballViewMouseButtons'

type TrackballControlsProps = ComponentProps<'primitive'> & {
  makeDefault?: boolean
  camera?: TrackballControls['object']
  domElement?: HTMLElement
  enableDamping?: boolean
  dampingFactor?: number
  enableZoom?: boolean
  keyEvents?: boolean | HTMLElement
  onChange?: () => void
  onStart?: () => void
  onEnd?: () => void
  regress?: boolean
  /** Ignorowane — Trackball ma odwrócone mouseButtons względem OrbitControls. */
  mouseButtons?: unknown
}

/** Przywraca domyślny makeSafe (na wypadek HMR po starym polar unlock). */
function restoreSphericalMakeSafe(): void {
  Spherical.prototype.makeSafe = function makeSafe() {
    const EPS = 0.000001
    this.phi = Math.max(EPS, Math.min(Math.PI - EPS, this.phi))
    return this
  }
}

/**
 * TrackballControls (ŚKM) — pełny obrót widoku bez limitu 180° OrbitControls.
 */
export const MouseOrbitViewControls = forwardRef<TrackballControls, TrackballControlsProps>(
  function MouseOrbitViewControls(
    {
      makeDefault,
      camera,
      regress,
      domElement,
      enableDamping: _unusedDamping,
      dampingFactor = 0.05,
      enableZoom = true,
      keyEvents = false,
      onChange,
      onStart,
      onEnd,
      mouseButtons: _ignoredOrbitStyleButtons,
      ...restProps
    },
    ref,
  ) {
    const invalidate = useThree((state) => state.invalidate)
    const defaultCamera = useThree((state) => state.camera)
    const gl = useThree((state) => state.gl)
    const events = useThree((state) => state.events)
    const set = useThree((state) => state.set)
    const get = useThree((state) => state.get)
    const performance = useThree((state) => state.performance)
    const explCamera = camera ?? defaultCamera
    const explDomElement = domElement ?? events.connected ?? gl.domElement

    const controls = useMemo(() => {
      restoreSphericalMakeSafe()
      return configureCadTrackballViewControls(new TrackballControlsImpl(explCamera), {
        enableZoom,
        dampingFactor,
      })
    }, [dampingFactor, enableZoom, explCamera])

    useFrame((_, delta) => {
      updateOrbitViewFromMouse(controls, delta)
    }, -1)

    useEffect(() => {
      if (keyEvents) {
        controls.connect(keyEvents === true ? explDomElement : keyEvents)
      }
      controls.connect(explDomElement)
      return () => {
        controls.dispose()
      }
    }, [keyEvents, explDomElement, controls])

    useEffect(() => {
      const callback = () => {
        invalidate()
        if (regress) performance.regress()
        onChange?.()
      }
      const onStartCb = () => onStart?.()
      const onEndCb = () => onEnd?.()
      controls.addEventListener('change', callback)
      controls.addEventListener('start', onStartCb)
      controls.addEventListener('end', onEndCb)
      return () => {
        controls.removeEventListener('start', onStartCb)
        controls.removeEventListener('end', onEndCb)
        controls.removeEventListener('change', callback)
      }
    }, [onChange, onStart, onEnd, controls, invalidate, performance, regress])

    useEffect(() => {
      if (!makeDefault) return
      const old = get().controls
      set({ controls })
      return () => set({ controls: old })
    }, [makeDefault, controls, get, set])

    return (
      <primitive
        ref={ref}
        object={controls}
        staticMoving
        dynamicDampingFactor={dampingFactor}
        noZoom={!enableZoom}
        mouseButtons={TRACKBALL_VIEW_MOUSE_BUTTONS}
        {...restProps}
      />
    )
  },
)
