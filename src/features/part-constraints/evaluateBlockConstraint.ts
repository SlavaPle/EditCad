import type { PreparedStretchPrecheckError } from '../../lib/preparedStretchPrecheckErrors'
import type { BlockFaceConstraint } from '../face-constraints/model'

/**
 * BLOCK — żadnego rozmiaru się nie zmienia: każda operacja rozciągania jest niedopuszczalna.
 */
export function evaluateBlockConstraint(_c: BlockFaceConstraint): PreparedStretchPrecheckError {
  return 'lockedByBlock'
}
