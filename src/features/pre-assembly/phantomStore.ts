import {
  PRE_ASSEMBLY_FORMAT,
  PRE_ASSEMBLY_VERSION,
  type AttachmentAnchor,
  type AttachmentRole,
  type PhantomAssembly,
  type PhantomAssemblyFile,
  type PhantomElementSlot,
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
        phantomKind: 'plate',
        widthMm: 600,
        heightMm: 400,
        depthMm: 18,
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
