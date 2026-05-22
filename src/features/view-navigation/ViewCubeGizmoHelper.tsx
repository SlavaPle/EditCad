import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Hud, OrthographicCamera } from '@react-three/drei'
import { Matrix4, type Group, type OrthographicCamera as OrthographicCameraImpl } from 'three'
import { resolveOrbitCamera } from '../viewer-camera/orbitViewRotation'
import { computeViewCubeHudPosition } from './viewCubeHudPosition'

const matrix = /* @__PURE__ */ new Matrix4()

export type ViewCubeGizmoHelperProps = {
  alignment?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  margin?: [number, number]
  children: React.ReactNode
}

/** HUD kostki widoku — obrót widoku przez OrbitViewRotationProvider. */
export function ViewCubeGizmoHelper({
  alignment = 'top-right',
  margin = [76, 76],
  children,
}: ViewCubeGizmoHelperProps) {
  const size = useThree((state) => state.size)

  const gizmoRef = useRef<Group>(null)
  const virtualCam = useRef<OrthographicCameraImpl>(null)

  const get = useThree((state) => state.get)

  useFrame(() => {
    if (!gizmoRef.current) return
    const { controls, camera } = get()
    const orbitCamera = resolveOrbitCamera(controls, camera)
    matrix.copy(orbitCamera.matrix).invert()
    gizmoRef.current.quaternion.setFromRotationMatrix(matrix)
  }, 1)

  const [x, y] = computeViewCubeHudPosition(alignment, margin, size)

  return (
    <Hud renderPriority={1}>
      <OrthographicCamera makeDefault ref={virtualCam} position={[0, 0, 200]} />
      <group ref={gizmoRef} position={[x, y, 0]}>
        {children}
      </group>
    </Hud>
  )
}
