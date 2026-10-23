/** Typy węzłów drzewa dokumentu (overlay viewport). */

export type DocumentTreeAxis = 'x' | 'y' | 'z'

export type DocumentTreeNodeKind =
  | 'root'
  | 'part'
  | 'model'
  | 'appearance'
  | 'size'
  | 'elementsGroup'
  | 'element'
  | 'matesGroup'
  | 'mate'

export type DocumentTreeNode = {
  id: string
  kind: DocumentTreeNodeKind
  label: string
  /** Id detalu programu (dla węzłów part / dzieci part). */
  partId?: string
  mateId?: string
  elementId?: string
  axis?: DocumentTreeAxis
  /** Wartość mm dla węzła size (do wyświetlenia). */
  sizeMm?: number
  locked?: boolean
  children?: DocumentTreeNode[]
}

export type DocumentTreeContextMenuState = {
  x: number
  y: number
  nodeId: string
}

export type DocumentTreeContextActionId =
  | 'select'
  | 'lock'
  | 'unlock'
  | 'removePart'
  | 'editAppearance'
  | 'copySize'
  | 'highlightElement'
  | 'highlightMate'
  | 'clearMateHighlight'
  | 'expandAll'
  | 'collapseAll'
