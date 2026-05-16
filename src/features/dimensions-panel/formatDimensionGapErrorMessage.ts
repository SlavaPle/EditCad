import type { TFunction } from 'i18next'
import type { i18n as I18nInstance } from 'i18next'
import type { StretchBasicEnvelope } from '../part-constraints/stretchBasicEnvelopeForMergedPair'

const BOUND_HINT_ERRORS = new Set(['belowMin', 'aboveMax', 'constMismatch'])

/** Tekst błędu wiersza Dimensions — bound hinty z interpolacją jak na prawym panelu. */
export function formatDimensionGapErrorMessage(
  t: TFunction,
  i18n: I18nInstance,
  error: string,
  envelope: StretchBasicEnvelope | null,
): string {
  if (BOUND_HINT_ERRORS.has(error) && envelope !== null) {
    return t(`rightPanel.faceDistance.boundHints.${error}`, {
      minMm: Number(envelope.lower.toFixed(4)),
      maxMm: Number(envelope.upper.toFixed(4)),
      exactMm: envelope.pinConstMm !== null ? Number(envelope.pinConstMm.toFixed(4)) : 0,
    })
  }
  if (i18n.exists(`rightPanel.faceDistance.errors.${error}`)) {
    return t(`rightPanel.faceDistance.errors.${error}`)
  }
  return error
}
