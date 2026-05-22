/** Wybór węzła drzewa montażu fantomu w panelach bocznych. */
export type PreAssemblyPanelSelection =
  | { kind: 'envelope' }
  | { kind: 'parameter'; id: string }
  | { kind: 'attachment'; id: string }
  | { kind: 'element'; id: string }
  | { kind: 'connection'; id: string }
  | null

export function preAssemblySelectionAnchorId(selection: PreAssemblyPanelSelection): string | null {
  return selection?.kind === 'attachment' ? selection.id : null
}

export function preAssemblySelectionElementId(selection: PreAssemblyPanelSelection): string | null {
  return selection?.kind === 'element' ? selection.id : null
}
