import type { PhantomAssemblyFile } from './model'
import { hasAttachments } from './phantomStore'

export type PreAssemblyWizard = 'phantom' | 'element' | 'attachment' | 'connection' | null

export type PreAssemblyAddPartDisabledReason = 'noPhantom' | 'noAnchors'

export type PreAssemblyToolbarUi = {
  hasPhantom: boolean
  addPartDisabled: boolean
  addPartDisabledReason: PreAssemblyAddPartDisabledReason | null
  createAttachmentDisabled: boolean
}

export function getPreAssemblyToolbarUi(input: {
  phantomDoc: PhantomAssemblyFile | null
}): PreAssemblyToolbarUi {
  const phantomDoc = input.phantomDoc
  if (!phantomDoc) {
    return {
      hasPhantom: false,
      addPartDisabled: true,
      addPartDisabledReason: 'noPhantom',
      createAttachmentDisabled: true,
    }
  }

  const anchorsPresent = hasAttachments(phantomDoc.phantom)
  return {
    hasPhantom: true,
    addPartDisabled: !anchorsPresent,
    addPartDisabledReason: anchorsPresent ? null : 'noAnchors',
    createAttachmentDisabled: false,
  }
}

export function getPreAssemblyAddPartTitleKey(
  ui: PreAssemblyToolbarUi,
  active: boolean,
): 'preAssembly.addPart.active' | 'preAssembly.addPart.noAnchors' | 'preAssembly.addPart.button' {
  if (active) return 'preAssembly.addPart.active'
  if (ui.addPartDisabledReason === 'noAnchors') return 'preAssembly.addPart.noAnchors'
  return 'preAssembly.addPart.button'
}
