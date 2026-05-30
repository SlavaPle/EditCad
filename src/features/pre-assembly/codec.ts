import {
  ELEMENT_DRIVEN_PROPERTIES,
  validateBindingsComplete,
} from './bindings'
import {
  isBoxPhantomEnvelope,
  PRE_ASSEMBLY_FORMAT,
  PRE_ASSEMBLY_VERSION,
  SCENE_FORMAT,
  SCENE_VERSION,
  type AttachmentAnchor,
  type AttachmentRole,
  type BoxFaceId,
  type BoxPhantomEnvelope,
  type ConnectionEndpoint,
  type ConnectionRule,
  type DimensionSpec,
  type ElementConnection,
  type ElementDrivenProperty,
  type ElementVariant,
  type FloatingDof,
  type MeshRefPhantomEnvelope,
  type ParsePhantomAssemblyResult,
  type ParseSceneDocumentResult,
  type PhantomAssembly,
  type PhantomAssemblyFile,
  type PhantomAxis,
  type PhantomConnection,
  type PhantomElementSlot,
  type PhantomEnvelope,
  type PhantomParameter,
  type PhantomSceneEndpoint,
  type PhantomTransform,
  type SceneDocument,
  type SceneDocumentFile,
  type ScenePhantomRef,
  type WedgePhantomEnvelope,
} from './model'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseFiniteNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return value
}

function parseOptionalNonEmptyString(value: unknown): string | undefined | null {
  if (value === undefined) return undefined
  if (typeof value !== 'string' || value.trim().length === 0) return null
  return value.trim()
}

function parsePhantomAxis(value: unknown): PhantomAxis | null {
  if (value === 'x' || value === 'y' || value === 'z') return value
  return null
}

function parseBoxFaceId(value: unknown): BoxFaceId | null {
  if (
    value === 'posX' ||
    value === 'negX' ||
    value === 'posY' ||
    value === 'negY' ||
    value === 'posZ' ||
    value === 'negZ'
  ) {
    return value
  }
  return null
}

function parseAttachmentRole(value: unknown): AttachmentRole | null {
  const roles: AttachmentRole[] = [
    'floor',
    'ceiling',
    'wall',
    'outerEdge',
    'innerEdge',
    'middle',
    'otherPhantom',
    'front',
    'back',
    'left',
    'right',
    'start',
    'end',
    'reference',
    'custom',
  ]
  if (typeof value === 'string' && roles.includes(value as AttachmentRole)) {
    return value as AttachmentRole
  }
  return null
}

function parseElementDrivenProperty(value: unknown): ElementDrivenProperty | null {
  if (typeof value !== 'string') return null
  return ELEMENT_DRIVEN_PROPERTIES.has(value as ElementDrivenProperty)
    ? (value as ElementDrivenProperty)
    : null
}

function parseDimensionSpec(value: unknown): DimensionSpec | null {
  const asNumber = parseFiniteNumber(value)
  if (asNumber !== null) return asNumber
  if (!isObject(value) || typeof value.paramId !== 'string' || value.paramId.trim().length === 0) {
    return null
  }
  return { paramId: value.paramId.trim() }
}

function parseVec3(value: unknown): [number, number, number] | null {
  if (!Array.isArray(value) || value.length !== 3) return null
  const out: number[] = []
  for (const item of value) {
    const n = parseFiniteNumber(item)
    if (n === null) return null
    out.push(n)
  }
  return out as [number, number, number]
}

function parsePhantomTransform(value: unknown): PhantomTransform | null {
  if (!isObject(value)) return null
  const positionMm = parseVec3(value.positionMm)
  const rotationDeg = parseVec3(value.rotationDeg)
  if (positionMm === null || rotationDeg === null) return null
  return { positionMm, rotationDeg }
}

function parsePhantomParameter(value: unknown): PhantomParameter | null {
  if (!isObject(value) || typeof value.id !== 'string' || value.id.trim().length === 0) {
    return null
  }
  const name = parseOptionalNonEmptyString(value.name)
  if (name === null) return null
  const id = value.id.trim()

  if (value.kind === 'literal') {
    const valueMm = parseFiniteNumber(value.valueMm)
    if (valueMm === null) return null
    return { id, ...(name !== undefined ? { name } : {}), kind: 'literal', valueMm }
  }
  if (value.kind === 'fromElement') {
    if (typeof value.elementId !== 'string' || value.elementId.trim().length === 0) return null
    const property = parseElementDrivenProperty(value.property)
    if (property === null) return null
    return {
      id,
      ...(name !== undefined ? { name } : {}),
      kind: 'fromElement',
      elementId: value.elementId.trim(),
      property,
    }
  }
  if (value.kind === 'expr') {
    if (typeof value.expression !== 'string' || value.expression.trim().length === 0) return null
    return {
      id,
      ...(name !== undefined ? { name } : {}),
      kind: 'expr',
      expression: value.expression.trim(),
    }
  }
  return null
}

function parseParameterList(value: unknown): PhantomParameter[] | null {
  if (!Array.isArray(value)) return null
  const params: PhantomParameter[] = []
  const ids = new Set<string>()
  for (const item of value) {
    const param = parsePhantomParameter(item)
    if (!param) return null
    if (ids.has(param.id)) return null
    ids.add(param.id)
    params.push(param)
  }
  return params
}

function parseBoxPhantomEnvelope(value: Record<string, unknown>): BoxPhantomEnvelope | null {
  const rawKind = value.phantomKind
  const phantomKind =
    rawKind === 'plate' ? 'panel' : rawKind === 'panel' || rawKind === 'cube' ? rawKind : null
  if (phantomKind === null) return null
  const widthMm = parseDimensionSpec(value.widthMm)
  const heightMm = parseDimensionSpec(value.heightMm)
  const depthMm = parseDimensionSpec(value.depthMm)
  if (widthMm === null || heightMm === null || depthMm === null) return null
  const thicknessAxis =
    value.thicknessAxis === undefined ? undefined : parsePhantomAxis(value.thicknessAxis)
  if (value.thicknessAxis !== undefined && thicknessAxis === null) return null
  const envelope: BoxPhantomEnvelope = {
    kind: 'box',
    phantomKind,
    widthMm,
    heightMm,
    depthMm,
  }
  if (thicknessAxis !== undefined && thicknessAxis !== null) {
    envelope.thicknessAxis = thicknessAxis
  }
  return envelope
}

function parseWedgePhantomEnvelope(value: Record<string, unknown>): WedgePhantomEnvelope | null {
  const widthMm = parseDimensionSpec(value.widthMm)
  const heightMm = parseDimensionSpec(value.heightMm)
  const depthMm = parseDimensionSpec(value.depthMm)
  if (widthMm === null || heightMm === null || depthMm === null) return null
  const taperDeg =
    value.taperDeg === undefined ? undefined : parseDimensionSpec(value.taperDeg)
  if (value.taperDeg !== undefined && taperDeg === null) return null
  const envelope: WedgePhantomEnvelope = {
    kind: 'wedge',
    widthMm,
    heightMm,
    depthMm,
  }
  if (taperDeg !== undefined && taperDeg !== null) {
    envelope.taperDeg = taperDeg
  }
  return envelope
}

function parseMeshRefPhantomEnvelope(value: Record<string, unknown>): MeshRefPhantomEnvelope | null {
  if (typeof value.ref !== 'string' || value.ref.trim().length === 0) return null
  return { kind: 'meshRef', ref: value.ref.trim() }
}

function parsePhantomEnvelope(value: unknown): PhantomEnvelope | null {
  if (!isObject(value) || typeof value.kind !== 'string') return null
  switch (value.kind) {
    case 'box':
      return parseBoxPhantomEnvelope(value)
    case 'wedge':
      return parseWedgePhantomEnvelope(value)
    case 'meshRef':
      return parseMeshRefPhantomEnvelope(value)
    default:
      return null
  }
}

/** MVP akceptuje tylko box; wedge/meshRef parsują się, ale nie przechodzą walidacji zapisu. */
export function isMvpSupportedEnvelope(envelope: PhantomEnvelope): boolean {
  return isBoxPhantomEnvelope(envelope)
}

function parseAttachmentAnchor(value: unknown): AttachmentAnchor | null {
  if (!isObject(value) || typeof value.id !== 'string' || value.id.trim().length === 0) {
    return null
  }
  const role = parseAttachmentRole(value.role)
  if (role === null) return null
  if (!isObject(value.source) || typeof value.source.kind !== 'string') return null

  let source: AttachmentAnchor['source']
  if (value.source.kind === 'boxFace') {
    const face = parseBoxFaceId(value.source.face)
    if (face === null) return null
    source = { kind: 'boxFace', face }
  } else if (value.source.kind === 'offsetPlane') {
    const face = parseBoxFaceId(value.source.face)
    const offsetMm = parseDimensionSpec(value.source.offsetMm)
    if (face === null || offsetMm === null) return null
    source = { kind: 'offsetPlane', face, offsetMm }
  } else {
    return null
  }

  const linkedPhantomId = parseOptionalNonEmptyString(value.linkedPhantomId)
  if (linkedPhantomId === null) return null

  return {
    id: value.id.trim(),
    role,
    source,
    ...(linkedPhantomId !== undefined ? { linkedPhantomId } : {}),
  }
}

function parseAttachmentList(value: unknown): AttachmentAnchor[] | null {
  if (!Array.isArray(value)) return null
  const anchors: AttachmentAnchor[] = []
  const ids = new Set<string>()
  for (const item of value) {
    const anchor = parseAttachmentAnchor(item)
    if (!anchor) return null
    if (ids.has(anchor.id)) return null
    ids.add(anchor.id)
    anchors.push(anchor)
  }
  return anchors
}

function parseElementVariant(value: unknown): ElementVariant | null {
  if (!isObject(value) || typeof value.id !== 'string' || value.id.trim().length === 0) {
    return null
  }
  if (typeof value.ref !== 'string' || value.ref.trim().length === 0) return null
  const label = parseOptionalNonEmptyString(value.label)
  if (label === null) return null
  return {
    id: value.id.trim(),
    ref: value.ref.trim(),
    ...(label !== undefined ? { label } : {}),
  }
}

function parsePhantomElementSlot(value: unknown): PhantomElementSlot | null {
  if (!isObject(value) || typeof value.id !== 'string' || value.id.trim().length === 0) {
    return null
  }
  if (value.binding !== 'rigid') return null
  if (typeof value.anchorId !== 'string' || value.anchorId.trim().length === 0) return null
  if (typeof value.ref !== 'string' || value.ref.trim().length === 0) return null

  const name = parseOptionalNonEmptyString(value.name)
  if (name === null) return null
  const placementOffsetMm =
    value.placementOffsetMm === undefined ? undefined : parseVec3(value.placementOffsetMm)
  if (value.placementOffsetMm !== undefined && placementOffsetMm === null) return null

  let variants: ElementVariant[] | undefined
  if (value.variants !== undefined) {
    if (!Array.isArray(value.variants)) return null
    variants = []
    const variantIds = new Set<string>()
    for (const item of value.variants) {
      const variant = parseElementVariant(item)
      if (!variant) return null
      if (variantIds.has(variant.id)) return null
      variantIds.add(variant.id)
      variants.push(variant)
    }
  }

  const activeVariantId = parseOptionalNonEmptyString(value.activeVariantId)
  if (activeVariantId === null) return null

  const replaceable = value.replaceable === undefined ? undefined : value.replaceable === true

  const slot: PhantomElementSlot = {
    id: value.id.trim(),
    binding: 'rigid',
    anchorId: value.anchorId.trim(),
    ref: value.ref.trim(),
  }
  if (name !== undefined) slot.name = name
  if (placementOffsetMm !== undefined && placementOffsetMm !== null) {
    slot.placementOffsetMm = placementOffsetMm
  }
  if (replaceable !== undefined) slot.replaceable = replaceable
  if (variants !== undefined) slot.variants = variants
  if (activeVariantId !== undefined) slot.activeVariantId = activeVariantId
  return slot
}

function parseElementSlotList(value: unknown): PhantomElementSlot[] | null {
  if (!Array.isArray(value)) return null
  const slots: PhantomElementSlot[] = []
  const ids = new Set<string>()
  for (const item of value) {
    const slot = parsePhantomElementSlot(item)
    if (!slot) return null
    if (ids.has(slot.id)) return null
    ids.add(slot.id)
    slots.push(slot)
  }
  return slots
}

function parseConnectionEndpoint(value: unknown): ConnectionEndpoint | null {
  if (!isObject(value) || typeof value.kind !== 'string') return null
  if (value.kind === 'anchor') {
    if (typeof value.anchorId !== 'string' || value.anchorId.trim().length === 0) return null
    return { kind: 'anchor', anchorId: value.anchorId.trim() }
  }
  if (value.kind === 'element') {
    if (typeof value.elementId !== 'string' || value.elementId.trim().length === 0) return null
    const attachmentHint =
      value.attachmentHint === undefined
        ? undefined
        : parseAttachmentRole(value.attachmentHint)
    if (value.attachmentHint !== undefined && attachmentHint === null) return null
    const endpoint: ConnectionEndpoint = {
      kind: 'element',
      elementId: value.elementId.trim(),
    }
    if (attachmentHint !== undefined && attachmentHint !== null) {
      endpoint.attachmentHint = attachmentHint
    }
    return endpoint
  }
  return null
}

function parseConnectionRule(value: unknown): ConnectionRule | null {
  if (!isObject(value) || typeof value.kind !== 'string') return null
  switch (value.kind) {
    case 'coincident':
      return { kind: 'coincident' }
    case 'offset': {
      const offsetMm = parseDimensionSpec(value.offsetMm)
      if (offsetMm === null) return null
      return { kind: 'offset', offsetMm }
    }
    case 'floating': {
      const minOffsetMm = parseDimensionSpec(value.minOffsetMm)
      const maxOffsetMm = parseDimensionSpec(value.maxOffsetMm)
      const axis = parsePhantomAxis(value.axis)
      if (minOffsetMm === null || maxOffsetMm === null || axis === null) return null
      return { kind: 'floating', minOffsetMm, maxOffsetMm, axis }
    }
    case 'custom': {
      if (typeof value.expression !== 'string' || value.expression.trim().length === 0) return null
      return { kind: 'custom', expression: value.expression.trim() }
    }
    default:
      return null
  }
}

function parseFloatingDof(value: unknown): FloatingDof | null {
  if (!isObject(value)) return null
  const axis = parsePhantomAxis(value.axis)
  if (axis === null) return null
  return { axis }
}

function parseElementConnection(value: unknown): ElementConnection | null {
  if (!isObject(value) || typeof value.id !== 'string' || value.id.trim().length === 0) {
    return null
  }
  if (value.bindingKind !== 'rigid' && value.bindingKind !== 'floating') return null
  const endpointA = parseConnectionEndpoint(value.endpointA)
  const endpointB = parseConnectionEndpoint(value.endpointB)
  const rule = parseConnectionRule(value.rule)
  if (endpointA === null || endpointB === null || rule === null) return null

  let degreesOfFreedom: FloatingDof[] | undefined
  if (value.degreesOfFreedom !== undefined) {
    if (!Array.isArray(value.degreesOfFreedom)) return null
    degreesOfFreedom = []
    for (const item of value.degreesOfFreedom) {
      const dof = parseFloatingDof(item)
      if (!dof) return null
      degreesOfFreedom.push(dof)
    }
  }

  return {
    id: value.id.trim(),
    bindingKind: value.bindingKind,
    endpointA,
    endpointB,
    rule,
    ...(degreesOfFreedom !== undefined ? { degreesOfFreedom } : {}),
  }
}

function parseConnectionList(value: unknown): ElementConnection[] | null {
  if (!Array.isArray(value)) return null
  const connections: ElementConnection[] = []
  const ids = new Set<string>()
  for (const item of value) {
    const connection = parseElementConnection(item)
    if (!connection) return null
    if (ids.has(connection.id)) return null
    ids.add(connection.id)
    connections.push(connection)
  }
  return connections
}

export function parsePhantomAssembly(value: unknown): PhantomAssembly | null {
  if (!isObject(value) || typeof value.id !== 'string' || value.id.trim().length === 0) {
    return null
  }
  const name = parseOptionalNonEmptyString(value.name)
  if (name === null) return null
  const transform = parsePhantomTransform(value.transform)
  if (transform === null) return null
  const parameters = parseParameterList(value.parameters)
  if (parameters === null) return null
  const envelope = parsePhantomEnvelope(value.envelope)
  if (envelope === null) return null
  const attachments = parseAttachmentList(value.attachments)
  if (attachments === null) return null
  const elements = parseElementSlotList(value.elements)
  if (elements === null) return null
  const connections = parseConnectionList(value.connections)
  if (connections === null) return null

  return {
    id: value.id.trim(),
    ...(name !== undefined ? { name } : {}),
    transform,
    parameters,
    envelope,
    attachments,
    elements,
    connections,
  }
}

export function validatePhantomAssemblyFile(value: unknown): ParsePhantomAssemblyResult {
  if (!isObject(value)) {
    return { ok: false, error: 'Pre-assembly file must be an object.' }
  }
  if (value.format !== PRE_ASSEMBLY_FORMAT) {
    return { ok: false, error: 'Invalid pre-assembly format identifier.' }
  }
  if (value.version !== PRE_ASSEMBLY_VERSION) {
    return { ok: false, error: 'Unsupported pre-assembly version.' }
  }
  if (typeof value.id !== 'string' || value.id.trim().length === 0) {
    return { ok: false, error: 'Pre-assembly file id is required.' }
  }
  if (typeof value.name !== 'string' || value.name.trim().length === 0) {
    return { ok: false, error: 'Pre-assembly file name is required.' }
  }

  const phantom = parsePhantomAssembly(value.phantom)
  if (phantom === null) {
    return { ok: false, error: 'Invalid phantom assembly in pre-assembly file.' }
  }

  if (!isMvpSupportedEnvelope(phantom.envelope)) {
    return {
      ok: false,
      error: `Envelope kind "${phantom.envelope.kind}" is not supported in MVP (phase 2 stub).`,
    }
  }

  const bindings = validateBindingsComplete(phantom)
  if (!bindings.ok) {
    return { ok: false, error: bindings.error }
  }

  return {
    ok: true,
    file: {
      format: PRE_ASSEMBLY_FORMAT,
      version: PRE_ASSEMBLY_VERSION,
      id: value.id.trim(),
      name: value.name.trim(),
      phantom,
    },
  }
}

export function serializePhantomAssemblyFile(file: PhantomAssemblyFile): string {
  return JSON.stringify(file, null, 2)
}

export function parsePhantomAssemblyFile(content: string): ParsePhantomAssemblyResult {
  try {
    const json = JSON.parse(content) as unknown
    return validatePhantomAssemblyFile(json)
  } catch {
    return { ok: false, error: 'Pre-assembly file is not valid JSON.' }
  }
}

function parsePhantomSceneEndpoint(value: unknown): PhantomSceneEndpoint | null {
  if (!isObject(value) || value.kind !== 'phantomAnchor') return null
  if (typeof value.phantomId !== 'string' || value.phantomId.trim().length === 0) return null
  if (typeof value.anchorId !== 'string' || value.anchorId.trim().length === 0) return null
  return {
    kind: 'phantomAnchor',
    phantomId: value.phantomId.trim(),
    anchorId: value.anchorId.trim(),
  }
}

function parsePhantomConnection(value: unknown): PhantomConnection | null {
  if (!isObject(value) || typeof value.id !== 'string' || value.id.trim().length === 0) {
    return null
  }
  if (value.bindingKind !== 'rigid' && value.bindingKind !== 'floating') return null
  const endpointA = parsePhantomSceneEndpoint(value.endpointA)
  const endpointB = parsePhantomSceneEndpoint(value.endpointB)
  const rule = parseConnectionRule(value.rule)
  if (endpointA === null || endpointB === null || rule === null) return null

  let degreesOfFreedom: FloatingDof[] | undefined
  if (value.degreesOfFreedom !== undefined) {
    if (!Array.isArray(value.degreesOfFreedom)) return null
    degreesOfFreedom = []
    for (const item of value.degreesOfFreedom) {
      const dof = parseFloatingDof(item)
      if (!dof) return null
      degreesOfFreedom.push(dof)
    }
  }

  return {
    id: value.id.trim(),
    bindingKind: value.bindingKind,
    endpointA,
    endpointB,
    rule,
    ...(degreesOfFreedom !== undefined ? { degreesOfFreedom } : {}),
  }
}

function parseScenePhantomRef(value: unknown): ScenePhantomRef | null {
  if (!isObject(value) || typeof value.id !== 'string' || value.id.trim().length === 0) {
    return null
  }
  if (typeof value.ref !== 'string' || value.ref.trim().length === 0) return null
  const transform = parsePhantomTransform(value.transform)
  if (transform === null) return null
  return {
    id: value.id.trim(),
    ref: value.ref.trim(),
    transform,
  }
}

function parseSceneDocument(value: unknown): SceneDocument | null {
  if (!isObject(value) || typeof value.id !== 'string' || value.id.trim().length === 0) {
    return null
  }
  const name = parseOptionalNonEmptyString(value.name)
  if (name === null) return null
  if (!Array.isArray(value.phantoms)) return null
  const phantoms: ScenePhantomRef[] = []
  const phantomIds = new Set<string>()
  for (const item of value.phantoms) {
    const ref = parseScenePhantomRef(item)
    if (!ref) return null
    if (phantomIds.has(ref.id)) return null
    phantomIds.add(ref.id)
    phantoms.push(ref)
  }
  if (!Array.isArray(value.connections)) return null
  const connections: PhantomConnection[] = []
  const connectionIds = new Set<string>()
  for (const item of value.connections) {
    const connection = parsePhantomConnection(item)
    if (!connection) return null
    if (connectionIds.has(connection.id)) return null
    connectionIds.add(connection.id)
    connections.push(connection)
  }
  return {
    id: value.id.trim(),
    ...(name !== undefined ? { name } : {}),
    phantoms,
    connections,
  }
}

export type ValidateSceneDocumentResult = { ok: true } | { ok: false; error: string }

/** Walidacja strukturalna sceny — bez ładowania plików .ecdpre (faza 2 stub). */
export function validateSceneDocumentStructure(scene: SceneDocument): ValidateSceneDocumentResult {
  const phantomIds = new Set(scene.phantoms.map((p) => p.id))
  for (const connection of scene.connections) {
    for (const endpoint of [connection.endpointA, connection.endpointB]) {
      if (!phantomIds.has(endpoint.phantomId)) {
        return {
          ok: false,
          error: `Scene connection "${connection.id}" references unknown phantom "${endpoint.phantomId}".`,
        }
      }
    }
    if (connection.bindingKind === 'floating' && connection.rule.kind !== 'floating') {
      return {
        ok: false,
        error: `Floating scene connection "${connection.id}" requires a floating rule with min, max, and axis.`,
      }
    }
  }
  return { ok: true }
}

export function validateSceneDocumentFile(value: unknown): ParseSceneDocumentResult {
  if (!isObject(value)) {
    return { ok: false, error: 'Scene file must be an object.' }
  }
  if (value.format !== SCENE_FORMAT) {
    return { ok: false, error: 'Invalid scene format identifier.' }
  }
  if (value.version !== SCENE_VERSION) {
    return { ok: false, error: 'Unsupported scene version.' }
  }
  if (typeof value.id !== 'string' || value.id.trim().length === 0) {
    return { ok: false, error: 'Scene file id is required.' }
  }
  if (typeof value.name !== 'string' || value.name.trim().length === 0) {
    return { ok: false, error: 'Scene file name is required.' }
  }
  const scene = parseSceneDocument(value.scene)
  if (scene === null) {
    return { ok: false, error: 'Invalid scene document.' }
  }
  const structure = validateSceneDocumentStructure(scene)
  if (!structure.ok) return structure
  return {
    ok: true,
    file: {
      format: SCENE_FORMAT,
      version: SCENE_VERSION,
      id: value.id.trim(),
      name: value.name.trim(),
      scene,
    },
  }
}

export function serializeSceneDocumentFile(file: SceneDocumentFile): string {
  return JSON.stringify(file, null, 2)
}

export function parseSceneDocumentFile(content: string): ParseSceneDocumentResult {
  try {
    const json = JSON.parse(content) as unknown
    return validateSceneDocumentFile(json)
  } catch {
    return { ok: false, error: 'Scene file is not valid JSON.' }
  }
}
