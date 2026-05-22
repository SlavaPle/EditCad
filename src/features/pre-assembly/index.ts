export {
  PRE_ASSEMBLY_FORMAT,
  PRE_ASSEMBLY_VERSION,
  type AttachmentAnchor,
  type AttachmentRole,
  type BoxFaceId,
  type ConnectionEndpoint,
  type ConnectionRule,
  type DimensionSpec,
  type ElementConnection,
  type ElementDrivenProperty,
  type ElementPropertyValues,
  type ElementVariant,
  type FloatingDof,
  type ParsePhantomAssemblyResult,
  type PhantomAssembly,
  type PhantomAssemblyFile,
  type PhantomAxis,
  type PhantomElementSlot,
  type PhantomEnvelope,
  type PhantomParameter,
  type PhantomTransform,
  type ResolvePhantomParametersResult,
  type ValidateBindingsResult,
} from './model'
export {
  isDimensionSpecResolvable,
  resolveDimensionSpec,
  resolvePhantomParameters,
  validateBindingsComplete,
} from './bindings'
export {
  parsePhantomAssemblyFile,
  serializePhantomAssemblyFile,
  validatePhantomAssemblyFile,
} from './codec'
export { degToRad, mmToScene, sceneToMm } from './phantomUnits'
export {
  attachmentAnchorPoseMm,
  boxFacePoseMm,
  mapEnvelopeDimensionsToAxes,
  phantomRootRotationRad,
  planeOverlaySizeMm,
  planeRotationFromOutwardNormal,
  resolveEnvelopeSizeMm,
  type BoxFacePoseMm,
  type EnvelopeSizeMm,
  type Vec3Mm,
} from './phantomGeometry'
export {
  AttachmentPlaneOverlay,
  ElementInstanceLayer,
  PhantomAssemblyLayer,
  PhantomEnvelopeMesh,
} from './viewer'
