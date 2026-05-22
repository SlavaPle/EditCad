import { useMemo } from 'react'
import type { AttachmentAnchor, ElementPropertyValues, PhantomAssembly } from '../model'
import { resolvePhantomParameters } from '../bindings'
import {
  attachmentAnchorPoseMm,
  phantomRootRotationRad,
  resolveEnvelopeSizeMm,
} from '../phantomGeometry'
import { mmToScene } from '../phantomUnits'
import { AttachmentPlaneOverlay } from './AttachmentPlaneOverlay'
import { PhantomEnvelopeMesh } from './PhantomEnvelopeMesh'

interface PhantomAssemblyLayerProps {
  phantom: PhantomAssembly
  elementProperties?: Readonly<Record<string, ElementPropertyValues>>
  selectedAnchorId?: string | null
}

/** Koperta fantomu i nakładki płaszczyzn przywiązań. */
export function PhantomAssemblyLayer({
  phantom,
  elementProperties = {},
  selectedAnchorId = null,
}: PhantomAssemblyLayerProps) {
  const paramValues = useMemo(() => {
    const result = resolvePhantomParameters(phantom, elementProperties)
    return result.ok ? result.values : {}
  }, [phantom, elementProperties])

  const envelopeSizeMm = useMemo(
    () => resolveEnvelopeSizeMm(phantom.envelope, paramValues),
    [phantom.envelope, paramValues],
  )

  const anchorPoses = useMemo(() => {
    if (!envelopeSizeMm) return new Map<string, ReturnType<typeof attachmentAnchorPoseMm>>()
    const map = new Map<string, ReturnType<typeof attachmentAnchorPoseMm>>()
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
      <PhantomEnvelopeMesh sizeMm={envelopeSizeMm} />
      {phantom.attachments.map((anchor) => (
        <AttachmentOverlayItem
          key={anchor.id}
          anchor={anchor}
          envelopeSizeMm={envelopeSizeMm}
          pose={anchorPoses.get(anchor.id)}
          selected={selectedAnchorId === anchor.id}
        />
      ))}
    </group>
  )
}

function AttachmentOverlayItem({
  anchor,
  envelopeSizeMm,
  pose,
  selected,
}: {
  anchor: AttachmentAnchor
  envelopeSizeMm: NonNullable<ReturnType<typeof resolveEnvelopeSizeMm>>
  pose: ReturnType<typeof attachmentAnchorPoseMm> | undefined
  selected: boolean
}) {
  if (!pose) return null
  const face = anchor.source.kind === 'boxFace' ? anchor.source.face : anchor.source.face
  return (
    <AttachmentPlaneOverlay
      role={anchor.role}
      face={face}
      pose={pose}
      envelopeSizeMm={envelopeSizeMm}
      selected={selected}
    />
  )
}
