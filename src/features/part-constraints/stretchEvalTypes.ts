/** Współdzielony kontekst dla 6 funkcji sprawdzania ograniczeń po symulowanym rozciągnięciu. */
import type { BufferGeometry } from 'three'
import type { PreparedModelElement } from '../../lib/preparedElementFormat'

export type StretchConstraintEvalContext = {
  geometryBefore: BufferGeometry
  geometryAfter: BufferGeometry
  mergedFacesForEdit: readonly number[]
  elements: readonly PreparedModelElement[]
}
