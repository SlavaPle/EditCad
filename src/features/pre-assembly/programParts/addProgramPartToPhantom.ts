import type { PhantomAssemblyFile } from '../model'
import { addElementSlot, updatePhantomInFile } from '../phantomStore'
import type { ProgramPartDescriptor } from './programPartFile'

export type AddProgramPartToPhantomResult =
  | { ok: true; file: PhantomAssemblyFile; elementId: string }
  | { ok: false; reason: 'noAnchors' | 'mutationFailed'; error?: string }

/** Dodaje slot detali programu (.ecdprt) do drzewa programu fantomu. */
export function addProgramPartToPhantom(
  phantomDoc: PhantomAssemblyFile,
  part: ProgramPartDescriptor,
): AddProgramPartToPhantomResult {
  const phantom = phantomDoc.phantom
  const anchorId = phantom.attachments[0]?.id
  if (!anchorId) {
    return { ok: false, reason: 'noAnchors' }
  }

  const result = addElementSlot(phantom, {
    ref: part.ref,
    name: part.name,
    anchorId,
  })
  if (!result.ok) {
    return { ok: false, reason: 'mutationFailed', error: result.error }
  }

  const created = result.phantom.elements[result.phantom.elements.length - 1]
  if (!created) {
    return { ok: false, reason: 'mutationFailed', error: 'Element slot was not created.' }
  }

  return {
    ok: true,
    file: updatePhantomInFile(phantomDoc, result.phantom),
    elementId: created.id,
  }
}
