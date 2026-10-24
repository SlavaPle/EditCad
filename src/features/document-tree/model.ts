/** Typy węzłów drzewa dokumentu (overlay viewport). */

export type DocumentTreeAxis = 'x' | 'y' | 'z'

export type SizeNodeStatus =
  | 'free'
  | 'min'
  | 'max'
  | 'minmax'
  | 'const'
  | 'block'
  | 'panel'
  | 'profil'
  | 'lockedByCustom'
  | 'noFaces'

export type SizeNodeLockReason =
  | 'none'
  | 'block'
  | 'const'
  | 'fullConstraint'
  | 'customConflict'
  | 'noFaces'

export type DocumentTreeNodeKind =
  | 'root'
  | 'part'
  | 'model'
  | 'appearance'
  | 'size'
  | 'sizeCustom'
  | 'sizesGroup'
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
  /** Przywiązka wyłączona (nadal w drzewie, bez wpływu na solver). */
  suppressed?: boolean
  /** FaceConstraint.id powiązany z rozmiarem. */
  constraintId?: string
  /** Etykieta użytkownika (persist w .ecdprt). */
  displayName?: string
  /** Czy można edytować wartość (dblclick). */
  editable?: boolean
  sizeStatus?: SizeNodeStatus
  sizeLockReason?: SizeNodeLockReason
  /** Indeksy trójkątów do podświetlenia / stretch. */
  faceIndices?: number[]
  /** Granice limitu (minmax / min / max) z FaceConstraint. */
  limitMinMm?: number
  limitMaxMm?: number
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
  | 'editSize'
  | 'renameSize'
  | 'removeSizeLimit'
  | 'addCustomSize'
  | 'highlightElement'
  | 'highlightMate'
  | 'clearMateHighlight'
  | 'suppressMate'
  | 'unsuppressMate'
  | 'deleteMate'
  | 'expandAll'
  | 'collapseAll'
