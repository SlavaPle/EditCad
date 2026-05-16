import { useCallback, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Hud, OrthographicCamera } from '@react-three/drei'
import { Matrix4, Vector3, type Group, type OrthographicCamera as OrthographicCameraImpl } from 'three'
import { ViewCubeGizmoContext } from './viewCubeGizmoContext'
import { computeViewCubeHudPosition } from './viewCubeHudPosition'
import {
  applyViewCubeTweenFrame,
  beginViewCubeTween,
  finishViewCubeTween,
  resolveOrbitCamera,
  stepViewCubeTween,
  type OrbitControlsLike,
  type ViewCubeTweenSession,
} from './viewCubeOrbitTween'

const matrix = /* @__PURE__ */ new Matrix4()

export type ViewCubeGizmoHelperProps = {
  alignment?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  margin?: [number, number]
  children: React.ReactNode
}

export function ViewCubeGizmoHelper({
  alignment = 'top-right',
  margin = [76, 76],
  children,
}: ViewCubeGizmoHelperProps) {
  const size = useThree((state) => state.size)
  const controls = useThree((state) => state.controls)
  const storeCamera = useThree((state) => state.camera)
  const orbitCamera = resolveOrbitCamera(controls, storeCamera)
  const invalidate = useThree((state) => state.invalidate)

  const gizmoRef = useRef<Group>(null)
  const virtualCam = useRef<OrthographicCameraImpl>(null)
  const sessionRef = useRef<ViewCubeTweenSession | null>(null)

  const finishTween = useCallback(() => {
    const session = sessionRef.current
    if (!session) return
    finishViewCubeTween(session, orbitCamera, controls as unknown as OrbitControlsLike | undefined)
    sessionRef.current = null
    invalidate()
  }, [controls, invalidate, orbitCamera])

  const tweenCamera = useCallback(
    (direction: Vector3) => {
      const session = beginViewCubeTween(
        direction,
        orbitCamera,
        controls as unknown as OrbitControlsLike | undefined,
      )
      sessionRef.current = session
      applyViewCubeTweenFrame(session, orbitCamera)
      invalidate()
    },
    [controls, invalidate, orbitCamera],
  )

  useFrame((_, delta) => {
    const session = sessionRef.current
    if (session) {
      if (stepViewCubeTween(session, delta) === 'finished') {
        finishTween()
      } else {
        applyViewCubeTweenFrame(session, orbitCamera)
        invalidate()
      }
    }

    if (!gizmoRef.current) return
    matrix.copy(orbitCamera.matrix).invert()
    gizmoRef.current.quaternion.setFromRotationMatrix(matrix)
  }, 1)

  const contextValue = useMemo(() => ({ tweenCamera }), [tweenCamera])
  const [x, y] = computeViewCubeHudPosition(alignment, margin, size)

  return (
    <Hud renderPriority={1}>
      <ViewCubeGizmoContext.Provider value={contextValue}>
        <OrthographicCamera makeDefault ref={virtualCam} position={[0, 0, 200]} />
        <group ref={gizmoRef} position={[x, y, 0]}>
          {children}
        </group>
      </ViewCubeGizmoContext.Provider>
    </Hud>
  )
}
