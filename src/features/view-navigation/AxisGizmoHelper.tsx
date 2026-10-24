import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Hud, OrthographicCamera } from '@react-three/drei'
import { Matrix4, type Group, type OrthographicCamera as OrthographicCameraImpl } from 'three'
import { resolveOrbitCamera } from '../viewer-camera/orbitViewRotation'
import { AXIS_GIZMO_RENDER_PRIORITY } from './axisGizmoConfig'
import { syncAxisGizmoOrientation } from './syncAxisGizmoOrientation'
import { computeViewCubeHudPosition, type ViewCubeHudAlignment } from './viewCubeHudPosition'

const matrixScratch = /* @__PURE__ */ new Matrix4()

export type AxisGizmoHelperProps = {
  alignment?: ViewCubeHudAlignment
  margin?: [number, number]
  children: React.ReactNode
}

/**
 * HUD osi współrzędnych — ten sam obrót co kamera/orbit (i kostka widoku).
 * Osobny portal Hud: clearDepth bez clear color → przezroczyste tło.
 */
export function AxisGizmoHelper({
  alignment = 'bottom-left',
  margin = [64, 64],
  children,
}: AxisGizmoHelperProps) {
  const size = useThree((state) => state.size)
  const gizmoRef = useRef<Group>(null)
  const virtualCam = useRef<OrthographicCameraImpl>(null)
  const get = useThree((state) => state.get)

  useFrame(() => {
    if (!gizmoRef.current) return
    const { controls, camera } = get()
    const orbitCamera = resolveOrbitCamera(controls, camera)
    syncAxisGizmoOrientation(orbitCamera.matrix, gizmoRef.current.quaternion, matrixScratch)
  }, AXIS_GIZMO_RENDER_PRIORITY)

  const [x, y] = computeViewCubeHudPosition(alignment, margin, size)

  return (
    <Hud renderPriority={AXIS_GIZMO_RENDER_PRIORITY}>
      <OrthographicCamera makeDefault ref={virtualCam} position={[0, 0, 200]} />
      <group ref={gizmoRef} position={[x, y, 0]}>
        {children}
      </group>
    </Hud>
  )
}
