/**
 * Rodzaj dokumentu wg drzewa: montaż (program/fantom) albo pojedynczy detal.
 * Steruje zapisem Open/Save oraz aktywnością Add part / Create phantom.
 */

export type DocumentSessionKind = 'empty' | 'part' | 'assembly'

export type DocumentSaveTarget = 'part' | 'assembly'

export type DocumentSessionToolbarUi = {
  kind: DocumentSessionKind
  /** Zapis Save / Save As — detal albo montaż. */
  saveTarget: DocumentSaveTarget | null
  canSave: boolean
  /** Add part / Create phantom / Create attachment — wyłączone w trybie pojedynczego detalu. */
  canAddPart: boolean
  canCreatePhantom: boolean
  /** Attachment wymaga fantomu; w trybie detalu zawsze false. */
  canCreateAttachment: boolean
}

export function resolveDocumentSessionKind(input: {
  hasMainModel: boolean
  programPartCount: number
  hasPhantom: boolean
}): DocumentSessionKind {
  if (input.programPartCount > 0 || input.hasPhantom) {
    return 'assembly'
  }
  if (input.hasMainModel) {
    return 'part'
  }
  return 'empty'
}

export function getDocumentSessionToolbarUi(input: {
  hasMainModel: boolean
  programPartCount: number
  hasPhantom: boolean
}): DocumentSessionToolbarUi {
  const kind = resolveDocumentSessionKind(input)
  if (kind === 'assembly') {
    return {
      kind,
      saveTarget: 'assembly',
      canSave: true,
      canAddPart: true,
      canCreatePhantom: true,
      canCreateAttachment: input.hasPhantom,
    }
  }
  if (kind === 'part') {
    return {
      kind,
      saveTarget: 'part',
      canSave: true,
      canAddPart: false,
      canCreatePhantom: false,
      canCreateAttachment: false,
    }
  }
  return {
    kind,
    saveTarget: null,
    canSave: false,
    canAddPart: true,
    canCreatePhantom: true,
    canCreateAttachment: false,
  }
}
