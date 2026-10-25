import type { MateEntityRef } from './model'
import { mateEntityPartId } from './mateEntityRef'
import type { MateDraft } from './store'
import type { MatesPickSlot } from './matesPickMode'

/**
 * Czy wybór `entity` w `slot` koliduje z drugim elementem na tym samym detalu.
 * Null = OK; inaczej reason do UI.
 */
export function rejectMatePickSamePart(
  draft: MateDraft,
  slot: MatesPickSlot,
  entity: MateEntityRef,
): 'samePart' | null {
  const other = slot === 'entityA' ? draft.entityB : draft.entityA
  if (!other) return null
  if (mateEntityPartId(other) === mateEntityPartId(entity)) return 'samePart'
  return null
}

/**
 * Id detalu zajętego przez drugi slot — nie podświetlać / nie pickować podczas wyboru.
 */
export function matePickExcludedPartId(
  draft: MateDraft,
  activeSlot: MatesPickSlot | null,
): string | null {
  if (!activeSlot) return null
  const other = activeSlot === 'entityA' ? draft.entityB : draft.entityA
  return other ? mateEntityPartId(other) : null
}
