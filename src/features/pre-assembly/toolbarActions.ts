import { validateBindingsComplete } from './bindings'
import type { PhantomAssemblyFile } from './model'
import { hasAttachments } from './phantomStore'

export type PreAssemblyWizard = 'phantom' | 'element' | 'attachment' | 'connection' | null

export type PreAssemblySaveDisabledReason = 'noPhantom' | 'incompleteBindings'

export type PreAssemblyToolbarUi = {
  hasPhantom: boolean
  createAttachmentDisabled: boolean
  saveDisabled: boolean
  saveDisabledReason: PreAssemblySaveDisabledReason | null
  hasProgramParts: boolean
  /** Zapis .ecdasm — program lub co najmniej jeden fantom. */
  canSaveAssembly: boolean
}

export function getPreAssemblyToolbarUi(input: {
  phantomDoc: PhantomAssemblyFile | null
  programPartCount: number
}): PreAssemblyToolbarUi {
  const phantomDoc = input.phantomDoc
  const hasProgramParts = input.programPartCount > 0
  const canSaveAssembly = hasProgramParts || !!phantomDoc
  if (!phantomDoc) {
    return {
      hasPhantom: false,
      createAttachmentDisabled: true,
      saveDisabled: true,
      saveDisabledReason: 'noPhantom',
      hasProgramParts,
      canSaveAssembly,
    }
  }

  const bindingsOk = validateBindingsComplete(phantomDoc.phantom).ok
  return {
    hasPhantom: true,
    createAttachmentDisabled: false,
    saveDisabled: !bindingsOk,
    saveDisabledReason: bindingsOk ? null : 'incompleteBindings',
    hasProgramParts,
    canSaveAssembly,
  }
}

export function getPreAssemblySaveTitleKey(
  ui: PreAssemblyToolbarUi,
): 'preAssembly.savePhantom.incomplete' | 'preAssembly.savePhantom.button' {
  if (ui.saveDisabledReason === 'incompleteBindings') {
    return 'preAssembly.savePhantom.incomplete'
  }
  return 'preAssembly.savePhantom.button'
}

/** Tylko do create attachment — wymaga fantomu. */
export function getPreAssemblyCreateAttachmentDisabled(
  phantomDoc: PhantomAssemblyFile | null,
): boolean {
  return !phantomDoc
}

export { hasAttachments }
