import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3, type BufferGeometry } from 'three'
import { getModelOrbitFocusPoint } from './modelOrbitFocus'
import { OrbitViewRotationContext } from './orbitViewRotationContext'
import {
  applyOrbitViewTweenFrame,
  beginOrbitViewTweenToDirection,
  finishOrbitViewTween,
  stepOrbitViewTween,
  type OrbitViewTweenSession,
} from './orbitViewTween'
import {
  resolveOrbitCamera,
  updateOrbitViewFromMouse,
  type OrbitControlsLike,
} from './orbitViewRotation'

const scratchFocus = /* @__PURE__ */ new Vector3()

type OrbitViewRotationProviderProps = {
  model?: BufferGeometry | null
  children: ReactNode
}

/** Wspólny obrót widoku: mysz (OrbitControls) + animacja gizmo-kostki. */
export function OrbitViewRotationProvider({ model, children }: OrbitViewRotationProviderProps) {
  const invalidate = useThree((state) => state.invalidate)
  const get = useThree((state) => state.get)
  const sessionRef = useRef<OrbitViewTweenSession | null>(null)
  const animatingRef = useRef(false)

  const finishActiveTween = useCallback(() => {
    const session = sessionRef.current
    if (!session) return
    const { controls, camera } = get()
    const orbitCamera = resolveOrbitCamera(controls, camera)
    finishOrbitViewTween(
      session,
      orbitCamera,
      controls as unknown as OrbitControlsLike | undefined,
    )
    sessionRef.current = null
    animatingRef.current = false
    invalidate()
  }, [get, invalidate])

  useEffect(() => () => finishActiveTween(), [finishActiveTween])

  const rotateViewToDirection = useCallback(
    (direction: Vector3) => {
      if (sessionRef.current) {
        finishActiveTween()
      }

      const { controls, camera } = get()
      const orbitCamera = resolveOrbitCamera(controls, camera)

      let focusOverride: Vector3 | undefined
      if (model) {
        const position = model.getAttribute('position')
        if (position && position.count > 0) {
          focusOverride = getModelOrbitFocusPoint(model, scratchFocus)
        }
      }

      const session = beginOrbitViewTweenToDirection(
        direction,
        orbitCamera,
        controls as unknown as OrbitControlsLike | undefined,
        focusOverride,
      )
      sessionRef.current = session
      animatingRef.current = true
      applyOrbitViewTweenFrame(session, orbitCamera)
      invalidate()
    },
    [finishActiveTween, get, invalidate, model],
  )

  useFrame((_, delta) => {
    if (!animatingRef.current || !sessionRef.current) return

    const { controls, camera } = get()
    const orbitCamera = resolveOrbitCamera(controls, camera)
    const session = sessionRef.current

    if (stepOrbitViewTween(session, delta) === 'finished') {
      animatingRef.current = false
      finishOrbitViewTween(
        session,
        orbitCamera,
        controls as unknown as OrbitControlsLike | undefined,
        delta,
      )
      sessionRef.current = null
    } else {
      applyOrbitViewTweenFrame(session, orbitCamera)
      updateOrbitViewFromMouse(controls, delta)
    }
    invalidate()
  })

  const value = useMemo(() => ({ rotateViewToDirection }), [rotateViewToDirection])

  return (
    <OrbitViewRotationContext.Provider value={value}>{children}</OrbitViewRotationContext.Provider>
  )
}
