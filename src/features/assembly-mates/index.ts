export type {
  AssemblyMate,
  MateAlignment,
  MateEntityKind,
  MateEntityRef,
  MateKind,
  MateLineRef,
  MatePairKind,
  MatePlaneRef,
  MateVertexRef,
  ParallelMate,
  ParallelMateMode,
} from './model'
export {
  createParallelMateId,
  mateEntityKindFromRef,
  matePairKind,
  matePairSupportsAlignment,
  normalizeParallelMate,
  validateAssemblyMate,
  validateMateEntityRef,
  validateMateLineRef,
  validateMatePlaneRef,
  validateMateVertexRef,
  validateParallelMate,
} from './model'
export { captureMatePlane, type CaptureMatePlaneResult } from './captureMatePlane'
export { captureMateLine, type CaptureMateLineResult } from './captureMateLine'
export { captureMateVertex, type CaptureMateVertexResult } from './captureMateVertex'
export {
  addAssemblyMate,
  createEmptyParallelMateDraft,
  parallelMateConflictsWithExisting,
  parallelMateFromDraft,
  removeAssemblyMate,
  validateParallelMateDraft,
  type ParallelMateDraft,
} from './store'
export {
  mateEntityKind,
  mateEntityPartId,
  mateEntityRefsMatch,
  isMateLineRef,
  isMatePlaneEntityRef,
  isMateVertexRef,
  asMateVertexRef,
} from './mateEntityRef'
export {
  solveParallelMate,
  type ParallelMateSolverInput,
  type ParallelMateSolverReason,
  type ParallelMateSolverResult,
} from './parallelMateSolver'
export {
  solveParallelLineMate,
  type ParallelLineMateSolverInput,
  type ParallelLineMateSolverReason,
  type ParallelLineMateSolverResult,
} from './parallelLineMateSolver'
export {
  solveParallelEntityMate,
  type ParallelEntityMateSolverInput,
  type ParallelEntityMateSolverReason,
  type ParallelEntityMateSolverResult,
} from './solveParallelEntityMate'
export {
  projectMateConstraint,
  type MateProjectInput,
  type MateProjectReason,
  type MateProjectResult,
} from './constraint/projectMateConstraint'
export {
  getGeometryCenterOffset,
  matePlaneWorldFrame,
  rotationMatrixFromTransform,
  type PlaneWorldFrame,
} from './planeWorldFrame'
export { mateLineWorldFrame, type LineWorldFrame } from './lineWorldFrame'
export { mateVertexWorldFrame, type VertexWorldFrame } from './vertexWorldFrame'
export {
  createMateDraftSession,
  mateDraftApply,
  mateDraftHasUnsavedApply,
  mateDraftRevert,
  mateDraftSave,
  mateDraftSetEntity,
  mateDraftSetPlane,
  mateDraftUpdateDraft,
  type MateDraftApplyResult,
  type MateDraftApplyState,
  type MateDraftRevertResult,
  type MateDraftSaveResult,
  type MateDraftSession,
} from './mateDraft'
export {
  INACTIVE_MATES_PICK_MODE,
  matesPickModeForSlot,
  type MatesPickMode,
  type MatesPickSlot,
} from './matesPickMode'
export {
  initialMatesPickSlot,
  nextMatesPickFlowStep,
  type MatesPickFlowStep,
} from './matesPickFlow'
export {
  executeMateApply,
  type ExecuteMateApplyReason,
  type ExecuteMateApplyResult,
} from './executeMateApply'
export {
  applyAssemblyMateConstraints,
  filterAssemblyMatesForPartIds,
  reapplyAllAssemblyMates,
  type ApplyAssemblyMateConstraintsInput,
  type ReapplyAllAssemblyMatesInput,
} from './applyAssemblyMateConstraints'
export { pickMateLineEdge } from './pickMateLineEdge'
export {
  MATE_ENTITY_PICK_FILTER,
  meshBuiltinFacePickOnPointerDown,
  pickMateEntityAtPointer,
  resolveActiveMatesPickSlot,
  shouldBeginMatePlanePick,
  type PickMateEntityAtPointerInput,
  type PickMateEntityAtPointerReason,
  type PickMateEntityAtPointerResult,
} from './pickMateEntityAtPointer'
export {
  MATE_PLANE_PICK_FILTER,
  pickMatePlaneAtPointer,
  toggleMatesPickSlot,
  type PickMatePlaneAtPointerInput,
  type PickMatePlaneAtPointerReason,
  type PickMatePlaneAtPointerResult,
} from './pickMatePlaneAtPointer'
export {
  buildMateEntityHighlightsForPopup,
  buildMatePlaneFaceOverlayGeometry,
  buildMatePlaneHighlightsForPopup,
  hasMatePlaneHighlights,
  mateLineHighlightsForPart,
  matePlaneHighlightsForPart,
  mateVertexHighlightsForPart,
  MATE_PLANE_OVERLAY,
  type MateEntityHighlights,
  type MatePlaneHighlights,
} from './matePlaneFaceOverlay'
export { MatePlaneFaceOverlay } from './matePlaneFaceOverlayView'
export { MateLineOverlay } from './mateLineOverlayView'
export { MateVertexOverlay } from './mateVertexOverlayView'
