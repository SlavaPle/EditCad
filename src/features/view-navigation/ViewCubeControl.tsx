import { useMemo, useState } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { CanvasTexture, Vector3 } from 'three'
import {
  scaleViewCubeHandle,
  VIEW_CUBE_CORNER_DIMENSIONS,
  VIEW_CUBE_CORNER_HANDLES,
  VIEW_CUBE_EDGE_HANDLES,
  viewCubeEdgeBoxDimensions,
} from './viewCubeControlGeometry'
import { useViewCubeGizmoContext } from './viewCubeGizmoContext'

const corners = VIEW_CUBE_CORNER_HANDLES.map(scaleViewCubeHandle)
const edges = VIEW_CUBE_EDGE_HANDLES.map(scaleViewCubeHandle)
const edgeDimensions = edges.map(viewCubeEdgeBoxDimensions)

export type ViewCubeControlProps = {
  font?: string
  opacity?: number
  color?: string
  hoverColor?: string
  textColor?: string
  strokeColor?: string
  faces?: string[]
  onClick?: (e: ThreeEvent<MouseEvent>) => null
}

type FaceMaterialProps = ViewCubeControlProps & {
  hover: boolean
  index: number
}

function FaceMaterial({
  hover,
  index,
  font = '20px system-ui, Segoe UI, sans-serif',
  faces = [],
  color = '#f0f0f0',
  hoverColor = '#999',
  textColor = 'black',
  strokeColor = 'black',
  opacity = 1,
}: FaceMaterialProps) {
  const gl = useThree((state) => state.gl)
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const context = canvas.getContext('2d')
    if (!context) return new CanvasTexture(canvas)
    context.fillStyle = color
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.strokeStyle = strokeColor
    context.strokeRect(0, 0, canvas.width, canvas.height)
    context.font = font
    context.textAlign = 'center'
    context.fillStyle = textColor
    context.fillText((faces[index] ?? '').toUpperCase(), 64, 76)
    const map = new CanvasTexture(canvas)
    map.anisotropy = gl.capabilities.getMaxAnisotropy() || 1
    return map
  }, [index, faces, font, color, textColor, strokeColor, gl])

  return (
    <meshBasicMaterial
      map={texture}
      attach={`material-${index}`}
      color={hover ? hoverColor : 'white'}
      transparent
      opacity={opacity}
    />
  )
}

function FaceCube(props: ViewCubeControlProps) {
  const { tweenCamera } = useViewCubeGizmoContext()
  const [hover, setHover] = useState<number | null>(null)

  return (
    <mesh
      onPointerOut={(e) => {
        e.stopPropagation()
        setHover(null)
      }}
      onPointerMove={(e) => {
        e.stopPropagation()
        setHover(Math.floor((e.faceIndex ?? 0) / 2))
      }}
      onClick={
        props.onClick ??
        ((e) => {
          e.stopPropagation()
          if (e.face?.normal) tweenCamera(e.face.normal)
        })
      }
    >
      {Array.from({ length: 6 }, (_, index) => (
        <FaceMaterial key={index} index={index} hover={hover === index} {...props} />
      ))}
      <boxGeometry />
    </mesh>
  )
}

type EdgeCubeProps = ViewCubeControlProps & {
  dimensions: [number, number, number]
  position: Vector3
}

function EdgeCube({ onClick, dimensions, position, hoverColor = '#999' }: EdgeCubeProps) {
  const { tweenCamera } = useViewCubeGizmoContext()
  const [hover, setHover] = useState(false)

  return (
    <mesh
      scale={1.01}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHover(true)
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        setHover(false)
      }}
      onClick={
        onClick ??
        ((e) => {
          e.stopPropagation()
          tweenCamera(position)
        })
      }
    >
      <meshBasicMaterial color={hover ? hoverColor : 'white'} transparent opacity={0.6} visible={hover} />
      <boxGeometry args={dimensions} />
    </mesh>
  )
}

export function ViewCubeControl(props: ViewCubeControlProps) {
  return (
    <group scale={[60, 60, 60]}>
      <FaceCube {...props} />
      {edges.map((edge, index) => (
        <EdgeCube
          key={`edge-${index}`}
          position={edge}
          dimensions={edgeDimensions[index]!}
          {...props}
        />
      ))}
      {corners.map((corner, index) => (
        <EdgeCube
          key={`corner-${index}`}
          position={corner}
          dimensions={VIEW_CUBE_CORNER_DIMENSIONS}
          {...props}
        />
      ))}
    </group>
  )
}
