/**
 * Zaślepka okna ustawień programu.
 * Na razie bez UI — singleton {@link getProgramSettings} / {@link resolveSizeStepMm}.
 * Później: formularz (kroki mm, progi 5 / 1) i zapis przez settery z programSettings.
 */

import {
  getProgramSettings,
  getSizeStepMm,
  resolveSizeStepMm,
  setSizeStepExtraFineMm,
  setSizeStepExtraFineThresholdMm,
  setSizeStepFineMm,
  setSizeStepFineThresholdMm,
  setSizeStepMm,
  type ProgramSettings,
} from './programSettings'

export type SettingsWindowProps = {
  open?: boolean
  onClose?: () => void
}

/** Placeholder — nie renderuje dialogu, tylko trzyma API pod przyszłe okno. */
export function SettingsWindow(_props: SettingsWindowProps): null {
  return null
}

/** Re-exporty pod przyszłe powiązanie UI ↔ singleton. */
export {
  getProgramSettings,
  getSizeStepMm,
  resolveSizeStepMm,
  setSizeStepMm,
  setSizeStepFineThresholdMm,
  setSizeStepFineMm,
  setSizeStepExtraFineThresholdMm,
  setSizeStepExtraFineMm,
  type ProgramSettings,
}
