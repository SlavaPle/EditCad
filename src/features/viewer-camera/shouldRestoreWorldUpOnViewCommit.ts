/**
 * OrbitControls (spherical) po tweenie gizmosu potrzebuje przywrócenia world-up
 * przed update(). Trackball trzymaj up z applyOrbitViewOrientation — inaczej
 * kostka „skacze” / kończy w złej orientacji po free orbit.
 */
export function shouldRestoreWorldUpOnViewCommit(controls: unknown): boolean {
  if (controls == null || typeof controls !== 'object') return false
  return typeof (controls as { getPolarAngle?: unknown }).getPolarAngle === 'function'
}
