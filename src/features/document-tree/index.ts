export type {
  DocumentTreeAxis,
  DocumentTreeContextActionId,
  DocumentTreeContextMenuState,
  DocumentTreeNode,
  DocumentTreeNodeKind,
} from './model'

export {
  buildDocumentTree,
  collectExpandableNodeIds,
  findDocumentTreeNode,
  type BuildDocumentTreeInput,
  type SizeMm,
} from './buildDocumentTree'

export {
  resolveDocumentTreeSelectEffect,
  type DocumentTreeSelectEffect,
} from './documentTreeSelectActions'

export {
  filterPartLocksForPartIds,
  isPartLocked,
  lockedPartIdSet,
  setPartLock,
  togglePartLock,
  type PartLockMap,
} from './partLock'

export {
  highlightsFromAssemblyMate,
  highlightsFromMateEntities,
  mergeMateEntityHighlights,
} from './mateHighlightsFromTree'

export { DocumentTreeOverlay, type DocumentTreeOverlayProps } from './DocumentTreeOverlay'
export { DocumentTree, type DocumentTreeProps } from './DocumentTree'
