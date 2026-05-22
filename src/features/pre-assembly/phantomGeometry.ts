import type {
  AttachmentAnchor,
  BoxFaceId,
  PhantomAxis,
  PhantomEnvelope,
  PhantomTransform,
} from './model'
import { resolveDimensionSpec } from './bindings'
import { degToRad } from './phantomUnits'

export type EnvelopeSizeMm = {
  x: number
  y: number
  z: number
}

export type Vec3Mm = [number, number, number]

export type BoxFacePoseMm = {
  centerMm: Vec3Mm
  /** Jednostkowy wektor normalny skierowany na zewnątrz pudełka. */
  outwardNormal: Vec3Mm
}

const OUTWARD_NORMALS: Record<BoxFaceId, Vec3Mm> = {
  posX: [1, 0, 0],
  negX: [-1, 0, 0],
  posY: [0, 1, 0],
  negY: [0, -1, 0],
  posZ: [0, 0, 1],
  negZ: [0, 0, -1],
}

function defaultThicknessAxis(envelope: PhantomEnvelope): PhantomAxis {
  if (envelope.thicknessAxis) return envelope.thicknessAxis
  return 'z'
}

/** Mapuje width/height/depth na osie X/Y/Z zgodnie z phantomKind i thicknessAxis. */
export function mapEnvelopeDimensionsToAxes(
  envelope: PhantomEnvelope,
  widthMm: number,
  heightMm: number,
  depthMm: number,
): EnvelopeSizeMm {
  if (envelope.phantomKind === 'cube') {
    return { x: widthMm, y: heightMm, z: depthMm }
  }
  const thicknessAxis = defaultThicknessAxis(envelope)
  switch (thicknessAxis) {
    case 'x':
      return { x: depthMm, y: widthMm, z: heightMm }
    case 'y':
      return { x: widthMm, y: depthMm, z: heightMm }
    case 'z':
      return { x: widthMm, y: heightMm, z: depthMm }
  }
}

export function resolveEnvelopeSizeMm(
  envelope: PhantomEnvelope,
  paramValues: Readonly<Record<string, number>>,
): EnvelopeSizeMm | null {
  const widthMm = resolveDimensionSpec(envelope.widthMm, paramValues)
  const heightMm = resolveDimensionSpec(envelope.heightMm, paramValues)
  const depthMm = resolveDimensionSpec(envelope.depthMm, paramValues)
  if (widthMm === null || heightMm === null || depthMm === null) return null
  if (widthMm <= 0 || heightMm <= 0 || depthMm <= 0) return null
  return mapEnvelopeDimensionsToAxes(envelope, widthMm, heightMm, depthMm)
}

export function boxFacePoseMm(face: BoxFaceId, size: EnvelopeSizeMm): BoxFacePoseMm {
  const halfX = size.x / 2
  const halfY = size.y / 2
  const halfZ = size.z / 2
  const outwardNormal = OUTWARD_NORMALS[face]
  let centerMm: Vec3Mm
  switch (face) {
    case 'posX':
      centerMm = [halfX, 0, 0]
      break
    case 'negX':
      centerMm = [-halfX, 0, 0]
      break
    case 'posY':
      centerMm = [0, halfY, 0]
      break
    case 'negY':
      centerMm = [0, -halfY, 0]
      break
    case 'posZ':
      centerMm = [0, 0, halfZ]
      break
    case 'negZ':
      centerMm = [0, 0, -halfZ]
      break
  }
  return { centerMm, outwardNormal }
}

function addOffsetAlongNormal(
  centerMm: Vec3Mm,
  outwardNormal: Vec3Mm,
  offsetMm: number,
): Vec3Mm {
  return [
    centerMm[0] - outwardNormal[0] * offsetMm,
    centerMm[1] - outwardNormal[1] * offsetMm,
    centerMm[2] - outwardNormal[2] * offsetMm,
  ]
}

export function attachmentAnchorPoseMm(
  anchor: AttachmentAnchor,
  size: EnvelopeSizeMm,
  paramValues: Readonly<Record<string, number>>,
): BoxFacePoseMm | null {
  const face = anchor.source.kind === 'boxFace' ? anchor.source.face : anchor.source.face
  const base = boxFacePoseMm(face, size)
  if (anchor.source.kind === 'boxFace') return base
  const offsetMm = resolveDimensionSpec(anchor.source.offsetMm, paramValues)
  if (offsetMm === null) return null
  return {
    centerMm: addOffsetAlongNormal(base.centerMm, base.outwardNormal, offsetMm),
    outwardNormal: base.outwardNormal,
  }
}

export function phantomRootRotationRad(transform: PhantomTransform): [number, number, number] {
  return [
    degToRad(transform.rotationDeg[0]),
    degToRad(transform.rotationDeg[1]),
    degToRad(transform.rotationDeg[2]),
  ]
}

export function addVec3(a: Vec3Mm, b: Vec3Mm): Vec3Mm {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

/** Obrót PlaneGeometry (domyślnie normal +Z) tak, by wskazywała outwardNormal. */
export function planeRotationFromOutwardNormal(outwardNormal: Vec3Mm): [number, number, number] {
  const [nx, ny, nz] = outwardNormal
  if (nx === 1 && ny === 0 && nz === 0) return [0, Math.PI / 2, 0]
  if (nx === -1 && ny === 0 && nz === 0) return [0, -Math.PI / 2, 0]
  if (nx === 0 && ny === 1 && nz === 0) return [-Math.PI / 2, 0, 0]
  if (nx === 0 && ny === -1 && nz === 0) return [Math.PI / 2, 0, 0]
  if (nx === 0 && ny === 0 && nz === 1) return [0, 0, 0]
  if (nx === 0 && ny === 0 && nz === -1) return [0, Math.PI, 0]
  return [0, 0, 0]
}

export function planeOverlaySizeMm(size: EnvelopeSizeMm, face: BoxFaceId): [number, number] {
  switch (face) {
    case 'posX':
    case 'negX':
      return [size.z, size.y]
    case 'posY':
    case 'negY':
      return [size.x, size.z]
    case 'posZ':
    case 'negZ':
      return [size.x, size.y]
  }
}
