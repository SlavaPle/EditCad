import { useMemo } from 'react'
import { DoubleSide } from 'three'
import type { AttachmentRole, BoxFaceId } from '../model'
import {
  planeOverlaySizeMm,
  planeRotationFromOutwardNormal,
  type BoxFacePoseMm,
  type EnvelopeSizeMm,
} from '../phantomGeometry'
import { mmToScene } from '../phantomUnits'

const ROLE_COLORS: Partial<Record<AttachmentRole, string>> = {
  floor: '#4ade80',
  ceiling: '#a78bfa',
  wall: '#fb923c',
  innerEdge: '#f472b6',
  outerEdge: '#fbbf24',
  middle: '#2dd4bf',
  otherPhantom: '#c084fc',
  front: '#60a5fa',
  back: '#94a3b8',
  reference: '#e2e8f0',
}

const DEFAULT_PLANE_COLOR = '#94a3b8'
const SELECTED_PLANE_COLOR = '#facc15'
const PLANE_OPACITY = 0.35
const PLANE_OFFSET_MM = 0.5

interface AttachmentPlaneOverlayProps {
  role: AttachmentRole
  face: BoxFaceId
  pose: BoxFacePoseMm
  envelopeSizeMm: EnvelopeSizeMm
  selected?: boolean
}

/** Półprzezroczysta płaszczyzna przywiązania na kopercie. */
export function AttachmentPlaneOverlay({
  role,
  face,
  pose,
  envelopeSizeMm,
  selected = false,
}: AttachmentPlaneOverlayProps) {
  const [widthMm, heightMm] = planeOverlaySizeMm(envelopeSizeMm, face)
  const width = mmToScene(widthMm)
  const height = mmToScene(heightMm)
  const [cx, cy, cz] = pose.centerMm
  const [nx, ny, nz] = pose.outwardNormal

  const position = useMemo(
    () => [
      mmToScene(cx + nx * PLANE_OFFSET_MM),
      mmToScene(cy + ny * PLANE_OFFSET_MM),
      mmToScene(cz + nz * PLANE_OFFSET_MM),
    ] as [number, number, number],
    [cx, cy, cz, nx, ny, nz],
  )

  const rotation = useMemo(
    () => planeRotationFromOutwardNormal(pose.outwardNormal),
    [pose.outwardNormal],
  )

  const color = selected ? SELECTED_PLANE_COLOR : (ROLE_COLORS[role] ?? DEFAULT_PLANE_COLOR)

  if (width <= 0 || height <= 0) return null

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={PLANE_OPACITY}
        depthWrite={false}
        side={DoubleSide}
      />
    </mesh>
  )
}
