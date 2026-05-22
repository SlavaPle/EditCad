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

export type BoxPhantomEnvelope = {
  kind: 'box'
  phantomKind: 'panel' | 'cube'
  widthMm: DimensionSpec
  heightMm: DimensionSpec
  depthMm: DimensionSpec
  thicknessAxis?: PhantomAxis
}

/** Klin — faza 2; w MVP tylko parse/typ, bez renderu. */
export type WedgePhantomEnvelope = {
  kind: 'wedge'
  widthMm: DimensionSpec
  heightMm: DimensionSpec
  depthMm: DimensionSpec
  taperDeg?: DimensionSpec
}

/** Konwert STL przez ref — faza 2; w MVP tylko parse/typ, bez renderu. */
export type MeshRefPhantomEnvelope = {
  kind: 'meshRef'
  ref: string
}

export type PhantomEnvelope =
  | BoxPhantomEnvelope
  | WedgePhantomEnvelope
  | MeshRefPhantomEnvelope

export function isBoxPhantomEnvelope(envelope: PhantomEnvelope): envelope is BoxPhantomEnvelope {
  return envelope.kind === 'box'
}

export function isWedgePhantomEnvelope(
  envelope: PhantomEnvelope,
): envelope is WedgePhantomEnvelope {
  return envelope.kind === 'wedge'
}

export function isMeshRefPhantomEnvelope(
  envelope: PhantomEnvelope,
): envelope is MeshRefPhantomEnvelope {
  return envelope.kind === 'meshRef'
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

/** Identyfikator formatu sceny z wieloma fantomami (JSON). Faza 2. */
export const SCENE_FORMAT = 'editcad.scene' as const

export const SCENE_VERSION = 1 as const

export type ScenePhantomRef = {
  /** Stabilny id — na niego wskazują połączenia między fantomami. */
  id: string
  /** Ścieżka do pliku .ecdpre. */
  ref: string
  transform: PhantomTransform
}

export type PhantomSceneEndpoint = {
  kind: 'phantomAnchor'
  phantomId: string
  anchorId: string
}

export type PhantomConnection = {
  id: string
  bindingKind: 'rigid' | 'floating'
  endpointA: PhantomSceneEndpoint
  endpointB: PhantomSceneEndpoint
  rule: ConnectionRule
  degreesOfFreedom?: FloatingDof[]
}

export type SceneDocument = {
  id: string
  name?: string
  phantoms: ScenePhantomRef[]
  connections: PhantomConnection[]
}

export type SceneDocumentFile = {
  format: typeof SCENE_FORMAT
  version: typeof SCENE_VERSION
  id: string
  name: string
  scene: SceneDocument
}

export type ParseSceneDocumentResult =
  | { ok: true; file: SceneDocumentFile }
  | { ok: false; error: string }

export type ResolvedElementPlacement = {
  elementId: string
  /** Przesunięcie względem pozycji slot→anchor (mm). */
  offsetMm: [number, number, number]
}

export type ResolvePhantomConnectionsResult =
  | { ok: true; placements: ResolvedElementPlacement[] }
  | { ok: false; error: string; reason: 'unsupported' | 'incomplete' }

export type ResolveSceneConnectionsResult =
  | { ok: true; phantomTransforms: Record<string, PhantomTransform> }
  | { ok: false; error: string; reason: 'unsupported' | 'incomplete' }
