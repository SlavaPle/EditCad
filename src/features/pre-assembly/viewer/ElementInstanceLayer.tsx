import { useMemo } from 'react'
import { Edges } from '@react-three/drei'
import { Box3, BufferGeometry, Vector3 } from 'three'
import type { ElementPropertyValues, PhantomAssembly, PhantomElementSlot } from '../model'
import { isBoxPhantomEnvelope } from '../model'
import { resolvePhantomParameters } from '../bindings'
import {
  addVec3,
  attachmentAnchorPoseMm,
  phantomRootRotationRad,
  resolveEnvelopeSizeMm,
  type Vec3Mm,
} from '../phantomGeometry'
import { mmToScene } from '../phantomUnits'

const ELEMENT_COLOR = '#e2e8f0'
const SELECTED_ELEMENT_COLOR = '#fbbf24'
const PLACEHOLDER_COLOR = '#64748b'
const PLACEHOLDER_SIZE_MM = 40

interface ElementInstanceLayerProps {
  phantom: PhantomAssembly
  elementGeometries?: Readonly<Record<string, BufferGeometry | null>>
  elementProperties?: Readonly<Record<string, ElementPropertyValues>>
  selectedElementId?: string | null
}

/** Instancje geometrii elementów na płaszczyznach przywiązań. */
export function ElementInstanceLayer({
  phantom,
  elementGeometries = {},
  elementProperties = {},
  selectedElementId = null,
}: ElementInstanceLayerProps) {
  const paramValues = useMemo(() => {
    const result = resolvePhantomParameters(phantom, elementProperties)
    return result.ok ? result.values : {}
  }, [phantom, elementProperties])

  const envelopeSizeMm = useMemo(() => {
    if (!isBoxPhantomEnvelope(phantom.envelope)) return null
    return resolveEnvelopeSizeMm(phantom.envelope, paramValues)
  }, [phantom.envelope, paramValues])

  const anchorById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof attachmentAnchorPoseMm>>()
    if (!envelopeSizeMm) return map
    for (const anchor of phantom.attachments) {
      map.set(anchor.id, attachmentAnchorPoseMm(anchor, envelopeSizeMm, paramValues))
    }
    return map
  }, [phantom.attachments, envelopeSizeMm, paramValues])

  const rootPosition = useMemo(
    () =>
      [
        mmToScene(phantom.transform.positionMm[0]),
        mmToScene(phantom.transform.positionMm[1]),
        mmToScene(phantom.transform.positionMm[2]),
      ] as [number, number, number],
    [phantom.transform.positionMm],
  )

  const rootRotation = useMemo(
    () => phantomRootRotationRad(phantom.transform),
    [phantom.transform],
  )

  if (!envelopeSizeMm) return null

  return (
    <group position={rootPosition} rotation={rootRotation}>
      {phantom.elements.map((slot) => (
        <ElementInstance
          key={slot.id}
          slot={slot}
          geometry={elementGeometries[slot.id] ?? null}
          anchorPose={anchorById.get(slot.anchorId)}
          selected={selectedElementId === slot.id}
        />
      ))}
    </group>
  )
}

function ElementInstance({
  slot,
  geometry,
  anchorPose,
  selected,
}: {
  slot: PhantomElementSlot
  geometry: BufferGeometry | null
  anchorPose: ReturnType<typeof attachmentAnchorPoseMm> | undefined
  selected: boolean
}) {
  const positionMm = useMemo(() => {
    if (!anchorPose) return null
    const offset: Vec3Mm = slot.placementOffsetMm ?? [0, 0, 0]
    return addVec3(anchorPose.centerMm, offset)
  }, [anchorPose, slot.placementOffsetMm])

  const geometryCenterOffset = useMemo(() => {
    if (!geometry) return [0, 0, 0] as [number, number, number]
    geometry.computeBoundingBox()
    const box = geometry.boundingBox ?? new Box3()
    const center = box.getCenter(new Vector3())
    return [-center.x, -center.y, -center.z] as [number, number, number]
  }, [geometry])

  if (!positionMm) return null

  const position: [number, number, number] = [
    mmToScene(positionMm[0]),
    mmToScene(positionMm[1]),
    mmToScene(positionMm[2]),
  ]

  if (geometry) {
    return (
      <group position={position}>
        <mesh geometry={geometry} position={geometryCenterOffset}>
          <meshStandardMaterial color={selected ? SELECTED_ELEMENT_COLOR : ELEMENT_COLOR} />
        </mesh>
      </group>
    )
  }

  const placeholderSize = mmToScene(PLACEHOLDER_SIZE_MM)
  return (
    <mesh position={position}>
      <boxGeometry args={[placeholderSize, placeholderSize, placeholderSize]} />
      <meshStandardMaterial color={selected ? SELECTED_ELEMENT_COLOR : PLACEHOLDER_COLOR} wireframe />
      <Edges color={selected ? SELECTED_ELEMENT_COLOR : PLACEHOLDER_COLOR} />
    </mesh>
  )
}
