/** Identyfikator formatu pliku fantomu-skręcenia (JSON). */
export const PRE_ASSEMBLY_FORMAT = 'editcad.pre-assembly' as const

export const PRE_ASSEMBLY_VERSION = 1 as const

export type PhantomAxis = 'x' | 'y' | 'z'

export type BoxFaceId = 'posX' | 'negX' | 'posY' | 'negY' | 'posZ' | 'negZ'

/** Właściwość detalu używana w parametrze `fromElement`. */
export type ElementDrivenProperty =
  | 'thickness'
  | 'width'
  | 'height'
  | 'depth'
  | 'bboxMinX'
  | 'bboxMaxX'
  | 'bboxMinY'
  | 'bboxMaxY'
  | 'bboxMinZ'
  | 'bboxMaxZ'

/** Liczba mm lub odwołanie do parametru fantomu. */
export type DimensionSpec = number | { paramId: string }

export type PhantomParameter = {
  id: string
  name?: string
} & (
  | { kind: 'literal'; valueMm: number }
  | { kind: 'fromElement'; elementId: string; property: ElementDrivenProperty }
  | { kind: 'expr'; expression: string }
)

export type PhantomTransform = {
  positionMm: [number, number, number]
  rotationDeg: [number, number, number]
}

export type PhantomEnvelope = {
  kind: 'box'
  phantomKind: 'panel' | 'cube'
  widthMm: DimensionSpec
  heightMm: DimensionSpec
  depthMm: DimensionSpec
  thicknessAxis?: PhantomAxis
}

export type AttachmentRole =
  | 'floor'
  | 'ceiling'
  | 'wall'
  | 'outerEdge'
  | 'innerEdge'
  | 'middle'
  | 'otherPhantom'
  | 'front'
  | 'back'
  | 'left'
  | 'right'
  | 'start'
  | 'end'
  | 'reference'
  | 'custom'

export type AttachmentAnchor = {
  id: string
  role: AttachmentRole
  source:
    | { kind: 'boxFace'; face: BoxFaceId }
    | { kind: 'offsetPlane'; face: BoxFaceId; offsetMm: DimensionSpec }
  linkedPhantomId?: string
}

export type ElementVariant = {
  id: string
  ref: string
  label?: string
}

export type PhantomElementSlot = {
  /** Stabilny id — na niego wskazują connections i parameters.fromElement. */
  id: string
  name?: string
  binding: 'rigid'
  anchorId: string
  placementOffsetMm?: [number, number, number]
  replaceable?: boolean
  ref: string
  variants?: ElementVariant[]
  activeVariantId?: string
}

export type ConnectionEndpoint =
  | { kind: 'element'; elementId: string; attachmentHint?: AttachmentRole }
  | { kind: 'anchor'; anchorId: string }

export type ConnectionRule =
  | { kind: 'coincident' }
  | { kind: 'offset'; offsetMm: DimensionSpec }
  | {
      kind: 'floating'
      minOffsetMm: DimensionSpec
      maxOffsetMm: DimensionSpec
      axis: PhantomAxis
    }
  | { kind: 'custom'; expression: string }

export type FloatingDof = {
  axis: PhantomAxis
}

export type ElementConnection = {
  id: string
  bindingKind: 'rigid' | 'floating'
  endpointA: ConnectionEndpoint
  endpointB: ConnectionEndpoint
  rule: ConnectionRule
  degreesOfFreedom?: FloatingDof[]
}

export type PhantomAssembly = {
  id: string
  name?: string
  transform: PhantomTransform
  parameters: PhantomParameter[]
  envelope: PhantomEnvelope
  attachments: AttachmentAnchor[]
  elements: PhantomElementSlot[]
  connections: ElementConnection[]
}

export type PhantomAssemblyFile = {
  format: typeof PRE_ASSEMBLY_FORMAT
  version: typeof PRE_ASSEMBLY_VERSION
  id: string
  name: string
  phantom: PhantomAssembly
}

export type ParsePhantomAssemblyResult =
  | { ok: true; file: PhantomAssemblyFile }
  | { ok: false; error: string }

export type ValidateBindingsResult = { ok: true } | { ok: false; error: string }

export type ElementPropertyValues = Partial<Record<ElementDrivenProperty, number>>

export type ResolvePhantomParametersResult =
  | { ok: true; values: Record<string, number> }
  | { ok: false; error: string }
