import { validateBindingsComplete } from './bindings'
import type { PhantomAssemblyFile } from './model'
import { hasAttachments } from './phantomStore'

export type PreAssemblyWizard = 'phantom' | 'element' | 'attachment' | 'connection' | null

export type PreAssemblyAddPartDisabledReason = 'noPhantom' | 'noAnchors'

export type PreAssemblySaveDisabledReason = 'noPhantom' | 'incompleteBindings'

export type PreAssemblyToolbarUi = {
  hasPhantom: boolean
  addPartDisabled: boolean
  addPartDisabledReason: PreAssemblyAddPartDisabledReason | null
  createAttachmentDisabled: boolean
  saveDisabled: boolean
  saveDisabledReason: PreAssemblySaveDisabledReason | null
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
      saveDisabled: true,
      saveDisabledReason: 'noPhantom',
    }
  }

  const anchorsPresent = hasAttachments(phantomDoc.phantom)
  const bindingsOk = validateBindingsComplete(phantomDoc.phantom).ok
  return {
    hasPhantom: true,
    addPartDisabled: !anchorsPresent,
    addPartDisabledReason: anchorsPresent ? null : 'noAnchors',
    createAttachmentDisabled: false,
    saveDisabled: !bindingsOk,
    saveDisabledReason: bindingsOk ? null : 'incompleteBindings',
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

export function getPreAssemblySaveTitleKey(
  ui: PreAssemblyToolbarUi,
): 'preAssembly.savePhantom.incomplete' | 'preAssembly.savePhantom.button' {
  if (ui.saveDisabledReason === 'incompleteBindings') {
    return 'preAssembly.savePhantom.incomplete'
  }
  return 'preAssembly.savePhantom.button'
}
