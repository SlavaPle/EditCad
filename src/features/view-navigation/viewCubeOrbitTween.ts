export {
  isOrbitControlsLike,
  resolveOrbitCamera,
  computeDreiBrokenViewQuaternion,
  type OrbitControlsLike,
} from '../viewer-camera/orbitViewRotation'

export {
  ORBIT_VIEW_SNAP_ANGLE as VIEW_CUBE_SNAP_ANGLE,
  ORBIT_VIEW_TURN_RATE as VIEW_CUBE_TURN_RATE,
  beginOrbitViewTweenToDirection as beginViewCubeTween,
  stepOrbitViewTween as stepViewCubeTween,
  applyOrbitViewTweenFrame as applyViewCubeTweenFrame,
  finishOrbitViewTween as finishViewCubeTween,
  type OrbitViewTweenSession as ViewCubeTweenSession,
} from '../viewer-camera/orbitViewTween'
