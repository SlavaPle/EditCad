export type {
  AngularMate,
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
  PerpendicularMate,
} from './model'
export {
  createMateId,
  createParallelMateId,
  isMateSuppressed,
  mateEntityKindFromRef,
  mateKindAvailableForEntities,
  matePairKind,
  matePairSupportsAlignment,
  matePairSupportsOrient,
  normalizeAssemblyMate,
  normalizeParallelMate,
  signedMateOffsetMm,
  validateAngularMate,
  validateAssemblyMate,
  validateMateEntityRef,
  validateMateLineRef,
  validateMatePlaneRef,
  validateMateVertexRef,
  validateParallelMate,
  validatePerpendicularMate,
} from './model'
export { captureMatePlane, type CaptureMatePlaneResult } from './captureMatePlane'
export { captureMateLine, type CaptureMateLineResult } from './captureMateLine'
export { captureMateVertex, type CaptureMateVertexResult } from './captureMateVertex'
export {
  addAssemblyMate,
  angularMateFromDraft,
  createEmptyAngularMateDraft,
  createEmptyMateDraft,
  createEmptyParallelMateDraft,
  createEmptyPerpendicularMateDraft,
  mateConflictsWithExisting,
  mateDraftWithKind,
  mateFromDraft,
  parallelMateConflictsWithExisting,
  parallelMateFromDraft,
  perpendicularMateFromDraft,
  removeAssemblyMate,
  setAssemblyMateSuppressed,
  toggleAssemblyMateSuppressed,
  validateAngularMateDraft,
  validateMateDraft,
  validateParallelMateDraft,
  validatePerpendicularMateDraft,
  type AngularMateDraft,
  type MateDraft,
  type ParallelMateDraft,
  type PerpendicularMateDraft,
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
  projectOrientMateConstraint,
  type OrientMateProjectInput,
  type OrientMateProjectReason,
  type OrientMateProjectResult,
} from './constraint/projectOrientMateConstraint'
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
export { matePickExcludedPartId, rejectMatePickSamePart } from './rejectMatePickSamePart'
export {
  applyAssemblyMateConstraints,
  filterAssemblyMatesForPartIds,
  reapplyAllAssemblyMates,
  type ApplyAssemblyMateConstraintsInput,
  type ReapplyAllAssemblyMatesInput,
} from './applyAssemblyMateConstraints'
export {
  MATES_CHANGE_MUST_SYNC_PROGRAM_PARTS,
  syncProgramPartsAfterMatesChange,
  type SyncProgramPartsAfterMatesChangeInput,
} from './syncProgramPartsAfterMatesChange'
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
export {
  applyMateFaceClick,
  clearMateFacePair,
  createEmptyMateFacePair,
  isAdditiveMateFaceModifier,
  mateFacePairIsComplete,
  mateFacePairToHighlights,
  type ApplyMateFaceClickInput,
  type ApplyMateFaceClickResult,
  type MateFaceClickModifiers,
  type MateFacePair,
  type MateFacePick,
} from './mateFacePairSelection'
export {
  openMateFromFacePair,
  type OpenMateFromFacePairInput,
  type OpenMateFromFacePairResult,
} from './openMateFromFacePair'
export { MatePlaneFaceOverlay } from './matePlaneFaceOverlayView'
export { MateLineOverlay } from './mateLineOverlayView'
export { MateVertexOverlay } from './mateVertexOverlayView'

