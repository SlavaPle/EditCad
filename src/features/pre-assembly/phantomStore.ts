import {
  PRE_ASSEMBLY_FORMAT,
  PRE_ASSEMBLY_VERSION,
  isBoxPhantomEnvelope,
  type AttachmentAnchor,
  type AttachmentRole,
  type BoxFaceId,
  type BoxPhantomEnvelope,
  type ElementConnection,
  type ElementDrivenProperty,
  type PhantomAssembly,
  type PhantomAssemblyFile,
  type PhantomElementSlot,
  type PhantomParameter,
} from './model'

function createUniqueId(prefix: string): string {
  const stamp = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${stamp}-${rand}`
}

export function createEmptyPhantomFile(options?: { name?: string; id?: string }): PhantomAssemblyFile {
  const rootId = options?.id ?? 'phantom-root'
  const name = options?.name ?? 'Phantom'
  return {
    format: PRE_ASSEMBLY_FORMAT,
    version: PRE_ASSEMBLY_VERSION,
    id: rootId,
    name,
    phantom: {
      id: createUniqueId('phantom'),
      name,
      transform: { positionMm: [0, 0, 0], rotationDeg: [0, 0, 0] },
      parameters: [],
      envelope: {
        kind: 'box',
        phantomKind: 'panel',
        widthMm: 600,
        heightMm: 400,
        depthMm: 18,
        thicknessAxis: 'z',
      },
      attachments: [],
      elements: [],
      connections: [],
    },
  }
}

export function hasAttachments(phantom: PhantomAssembly): boolean {
  return phantom.attachments.length > 0
}

export type ValidateElementAnchorResult =
  | { ok: true }
  | { ok: false; error: string }

/** Weryfikuje, że slot elementu ma obowiązkową i istniejącą kotwicę. */
export function validateElementAnchorRequired(
  phantom: PhantomAssembly,
  anchorId: string,
): ValidateElementAnchorResult {
  if (typeof anchorId !== 'string' || anchorId.trim().length === 0) {
    return { ok: false, error: 'Element slot requires anchorId.' }
  }
  const anchorExists = phantom.attachments.some((a) => a.id === anchorId)
  if (!anchorExists) {
    return {
      ok: false,
      error: `Element slot references unknown anchor "${anchorId}".`,
    }
  }
  return { ok: true }
}

export type AddElementSlotInput = {
  id?: string
  name?: string
  ref: string
  anchorId: string
  placementOffsetMm?: [number, number, number]
  replaceable?: boolean
  variants?: PhantomElementSlot['variants']
  activeVariantId?: string
}

export type PhantomMutationResult =
  | { ok: true; phantom: PhantomAssembly }
  | { ok: false; error: string }

export function addElementSlot(
  phantom: PhantomAssembly,
  input: AddElementSlotInput,
): PhantomMutationResult {
  if (typeof input.ref !== 'string' || input.ref.trim().length === 0) {
    return { ok: false, error: 'Element slot requires a ref.' }
  }

  const anchorCheck = validateElementAnchorRequired(phantom, input.anchorId)
  if (!anchorCheck.ok) return anchorCheck

  const id = input.id ?? createUniqueId('element')
  if (phantom.elements.some((slot) => slot.id === id)) {
    return { ok: false, error: `Element slot id "${id}" already exists.` }
  }

  const slot: PhantomElementSlot = {
    id,
    name: input.name,
    binding: 'rigid',
    anchorId: input.anchorId,
    ref: input.ref.trim(),
    placementOffsetMm: input.placementOffsetMm,
    replaceable: input.replaceable,
    variants: input.variants,
    activeVariantId: input.activeVariantId,
  }

  return {
    ok: true,
    phantom: {
      ...phantom,
      elements: [...phantom.elements, slot],
    },
  }
}

export type AddAttachmentInput = {
  id?: string
  role: AttachmentRole
  source: AttachmentAnchor['source']
  linkedPhantomId?: string
}

export function addAttachment(
  phantom: PhantomAssembly,
  input: AddAttachmentInput,
): PhantomMutationResult {
  const id = input.id ?? createUniqueId('anchor')
  if (phantom.attachments.some((a) => a.id === id)) {
    return { ok: false, error: `Attachment id "${id}" already exists.` }
  }

  const attachment: AttachmentAnchor = {
    id,
    role: input.role,
    source: input.source,
    linkedPhantomId: input.linkedPhantomId,
  }

  return {
    ok: true,
    phantom: {
      ...phantom,
      attachments: [...phantom.attachments, attachment],
    },
  }
}

export function updatePhantomInFile(
  file: PhantomAssemblyFile,
  phantom: PhantomAssembly,
): PhantomAssemblyFile {
  return { ...file, phantom }
}

export function updateEnvelope(
  phantom: PhantomAssembly,
  patch: Partial<BoxPhantomEnvelope>,
): PhantomMutationResult {
  if (!isBoxPhantomEnvelope(phantom.envelope)) {
    return {
      ok: false,
      error: `Envelope kind "${phantom.envelope.kind}" cannot be edited in MVP (phase 2 stub).`,
    }
  }
  return {
    ok: true,
    phantom: {
      ...phantom,
      envelope: { ...phantom.envelope, ...patch },
    },
  }
}

export type AddParameterInput = {
  id?: string
  name?: string
} & (
  | { kind: 'literal'; valueMm: number }
  | { kind: 'fromElement'; elementId: string; property: ElementDrivenProperty }
)

export function addParameter(
  phantom: PhantomAssembly,
  input: AddParameterInput,
): PhantomMutationResult {
  const id = input.id ?? createUniqueId('param')
  if (phantom.parameters.some((p) => p.id === id)) {
    return { ok: false, error: `Parameter id "${id}" already exists.` }
  }
  const param = { ...input, id } as PhantomParameter
  return {
    ok: true,
    phantom: { ...phantom, parameters: [...phantom.parameters, param] },
  }
}

export function updateParameter(
  phantom: PhantomAssembly,
  paramId: string,
  next: PhantomParameter,
): PhantomMutationResult {
  const index = phantom.parameters.findIndex((p) => p.id === paramId)
  if (index < 0) return { ok: false, error: `Parameter "${paramId}" not found.` }
  if (next.id !== paramId) {
    return { ok: false, error: 'Parameter id cannot be changed.' }
  }
  const parameters = [...phantom.parameters]
  parameters[index] = next
  return { ok: true, phantom: { ...phantom, parameters } }
}

export function removeParameter(phantom: PhantomAssembly, paramId: string): PhantomMutationResult {
  if (!phantom.parameters.some((p) => p.id === paramId)) {
    return { ok: false, error: `Parameter "${paramId}" not found.` }
  }
  return {
    ok: true,
    phantom: { ...phantom, parameters: phantom.parameters.filter((p) => p.id !== paramId) },
  }
}

export function updateAttachment(
  phantom: PhantomAssembly,
  anchorId: string,
  next: AttachmentAnchor,
): PhantomMutationResult {
  const index = phantom.attachments.findIndex((a) => a.id === anchorId)
  if (index < 0) return { ok: false, error: `Attachment "${anchorId}" not found.` }
  if (next.id !== anchorId) {
    return { ok: false, error: 'Attachment id cannot be changed.' }
  }
  const attachments = [...phantom.attachments]
  attachments[index] = next
  return { ok: true, phantom: { ...phantom, attachments } }
}

export function removeAttachment(phantom: PhantomAssembly, anchorId: string): PhantomMutationResult {
  if (!phantom.attachments.some((a) => a.id === anchorId)) {
    return { ok: false, error: `Attachment "${anchorId}" not found.` }
  }
  const inUse = phantom.elements.some((e) => e.anchorId === anchorId)
  if (inUse) {
    return { ok: false, error: `Attachment "${anchorId}" is used by element slots.` }
  }
  return {
    ok: true,
    phantom: {
      ...phantom,
      attachments: phantom.attachments.filter((a) => a.id !== anchorId),
    },
  }
}

export function updateElementSlot(
  phantom: PhantomAssembly,
  slotId: string,
  next: PhantomElementSlot,
): PhantomMutationResult {
  const index = phantom.elements.findIndex((e) => e.id === slotId)
  if (index < 0) return { ok: false, error: `Element slot "${slotId}" not found.` }
  if (next.id !== slotId) {
    return { ok: false, error: 'Element slot id cannot be changed.' }
  }
  const anchorCheck = validateElementAnchorRequired(phantom, next.anchorId)
  if (!anchorCheck.ok) return anchorCheck
  const elements = [...phantom.elements]
  elements[index] = next
  return { ok: true, phantom: { ...phantom, elements } }
}

export function removeElementSlot(phantom: PhantomAssembly, slotId: string): PhantomMutationResult {
  if (!phantom.elements.some((e) => e.id === slotId)) {
    return { ok: false, error: `Element slot "${slotId}" not found.` }
  }
  return {
    ok: true,
    phantom: { ...phantom, elements: phantom.elements.filter((e) => e.id !== slotId) },
  }
}

export type AddConnectionInput = {
  id?: string
  bindingKind?: ElementConnection['bindingKind']
  endpointA: ElementConnection['endpointA']
  endpointB: ElementConnection['endpointB']
  rule?: ElementConnection['rule']
}

export function addConnection(
  phantom: PhantomAssembly,
  input: AddConnectionInput,
): PhantomMutationResult {
  const id = input.id ?? createUniqueId('connection')
  if (phantom.connections.some((c) => c.id === id)) {
    return { ok: false, error: `Connection id "${id}" already exists.` }
  }
  const bindingKind = input.bindingKind ?? 'rigid'
  const rule =
    input.rule ??
    (bindingKind === 'floating'
      ? { kind: 'floating' as const, minOffsetMm: 0, maxOffsetMm: 10, axis: 'x' as const }
      : { kind: 'coincident' as const })
  const connection: ElementConnection = {
    id,
    bindingKind,
    endpointA: input.endpointA,
    endpointB: input.endpointB,
    rule,
  }
  return {
    ok: true,
    phantom: { ...phantom, connections: [...phantom.connections, connection] },
  }
}

export function updateConnection(
  phantom: PhantomAssembly,
  connectionId: string,
  next: ElementConnection,
): PhantomMutationResult {
  const index = phantom.connections.findIndex((c) => c.id === connectionId)
  if (index < 0) return { ok: false, error: `Connection "${connectionId}" not found.` }
  if (next.id !== connectionId) {
    return { ok: false, error: 'Connection id cannot be changed.' }
  }
  const connections = [...phantom.connections]
  connections[index] = next
  return { ok: true, phantom: { ...phantom, connections } }
}

export function removeConnection(
  phantom: PhantomAssembly,
  connectionId: string,
): PhantomMutationResult {
  if (!phantom.connections.some((c) => c.id === connectionId)) {
    return { ok: false, error: `Connection "${connectionId}" not found.` }
  }
  return {
    ok: true,
    phantom: {
      ...phantom,
      connections: phantom.connections.filter((c) => c.id !== connectionId),
    },
  }
}

export const BOX_FACE_IDS: readonly BoxFaceId[] = [
  'posX',
  'negX',
  'posY',
  'negY',
  'posZ',
  'negZ',
]

export const ATTACHMENT_ROLES: readonly AttachmentRole[] = [
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
