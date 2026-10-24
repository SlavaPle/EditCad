export type {
  DocumentTreeAxis,
  DocumentTreeContextActionId,
  DocumentTreeContextMenuState,
  DocumentTreeNode,
  DocumentTreeNodeKind,
  SizeNodeLockReason,
  SizeNodeStatus,
} from './model'

export {
  buildDocumentTree,
  collectExpandableNodeIds,
  findDocumentTreeNode,
  mateParticipantPartIds,
  type BuildDocumentTreeInput,
  type SizeMm,
} from './buildDocumentTree'

export {
  resolveDocumentTreeSelectEffect,
  type DocumentTreeSelectEffect,
} from './documentTreeSelectActions'

export {
  resolveDocumentTreeEditAction,
  type DocumentTreeEditAction,
} from './resolveDocumentTreeEditAction'

export {
  resolveCanonicalSizeNodeBinding,
  resolveCustomSizeNodeBinding,
  isCustomSizeConstraint,
  type SizeNodeBinding,
} from './resolveSizeNodeBinding'

export { findAxisExtremeFacePatches } from './findAxisExtremeFacePatches'
export { createCustomSizeConstraint } from './createCustomSizeConstraint'
export { buildCustomSizeTreeNodes } from './buildCustomSizeTreeNodes'
export { classifyDocumentTreeSizeClick } from './documentTreeClickTiming'
export { isSizeLockedByCustom } from './isSizeLockedByCustom'

export {
  clampSizeEditValue,
  isSizeValueFieldDisabled,
  isSizeValueFieldMuted,
} from './clampSizeEditValue'

export type { SizeEditApplyPayload } from './sizeEditApplyPayload'

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
