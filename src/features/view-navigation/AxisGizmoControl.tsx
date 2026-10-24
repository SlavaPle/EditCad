import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { CanvasTexture } from 'three'
import {
  AXIS_GIZMO_AXIS_OPACITY,
  AXIS_GIZMO_AXIS_SCALE,
  AXIS_GIZMO_COLORS,
  AXIS_GIZMO_SCALE,
} from './axisGizmoConfig'
import {
  AXIS_GIZMO_BEAM_CENTER,
  AXIS_GIZMO_BEAMS,
  AXIS_GIZMO_LABEL_POSITIONS,
  axisGizmoColorIndex,
} from './axisGizmoGeometry'

type AxisBeamProps = {
  color: string
  rotation: readonly [number, number, number]
  scale?: [number, number, number]
}

function AxisBeam({ color, rotation, scale = AXIS_GIZMO_AXIS_SCALE }: AxisBeamProps) {
  return (
    <group rotation={rotation as [number, number, number]}>
      <mesh position={AXIS_GIZMO_BEAM_CENTER as [number, number, number]}>
        <boxGeometry args={scale} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={AXIS_GIZMO_AXIS_OPACITY}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

type AxisLabelProps = {
  color: string
  label: string
  font?: string
  position: readonly [number, number, number]
}

/** Litera osi bez kółka — tylko kolorowy tekst. */
function AxisLabel({
  color,
  label,
  font = '600 28px system-ui, Segoe UI, sans-serif',
  position,
}: AxisLabelProps) {
  const gl = useThree((state) => state.gl)
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const context = canvas.getContext('2d')
    if (!context) return new CanvasTexture(canvas)
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.font = font
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillStyle = color
    context.fillText(label, 32, 34)
    const map = new CanvasTexture(canvas)
    map.anisotropy = gl.capabilities.getMaxAnisotropy() || 1
    return map
  }, [color, label, font, gl])

  return (
    <sprite position={position as [number, number, number]} scale={0.85}>
      <spriteMaterial
        map={texture}
        transparent
        opacity={0.85}
        alphaTest={0.05}
        toneMapped={false}
        depthWrite={false}
      />
    </sprite>
  )
}

export type AxisGizmoControlProps = {
  labels?: [string, string, string]
  colors?: readonly [string, string, string]
  font?: string
}

/** Kolorowe osie XYZ z etykietami — tylko wizualizacja orientacji. */
export function AxisGizmoControl({
  labels = ['X', 'Y', 'Z'],
  colors = AXIS_GIZMO_COLORS,
  font,
}: AxisGizmoControlProps) {
  return (
    <group scale={AXIS_GIZMO_SCALE}>
      {AXIS_GIZMO_BEAMS.map((beam) => (
        <AxisBeam
          key={beam.axis}
          color={colors[axisGizmoColorIndex(beam.axis)]}
          rotation={beam.rotation}
        />
      ))}
      {AXIS_GIZMO_LABEL_POSITIONS.map((spec, index) => (
        <AxisLabel
          key={spec.axis}
          color={colors[axisGizmoColorIndex(spec.axis)]}
          label={labels[index] ?? spec.axis.toUpperCase()}
          font={font}
          position={spec.position}
        />
      ))}
    </group>
  )
}
