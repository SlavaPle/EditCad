/**
 * Singleton ustawień programu (zaślepka pod przyszłe okno Settings).
 * UI okna jeszcze nie ma — wartości czytać/zapisywać stąd.
 */

export type ProgramSettings = {
  /** Bazowy krok edycji rozmiaru / suwaka (mm), gdy rozmiar ≥ sizeStepFineThresholdMm. */
  sizeStepMm: number
  /** Poniżej tego limitu (mm) używany jest sizeStepFineMm. */
  sizeStepFineThresholdMm: number
  /** Krok (mm), gdy rozmiar < sizeStepFineThresholdMm (i ≥ sizeStepExtraFineThresholdMm). */
  sizeStepFineMm: number
  /** Poniżej tego limitu (mm) używany jest sizeStepExtraFineMm. */
  sizeStepExtraFineThresholdMm: number
  /** Krok (mm), gdy rozmiar < sizeStepExtraFineThresholdMm. */
  sizeStepExtraFineMm: number
}

const DEFAULT_PROGRAM_SETTINGS: ProgramSettings = {
  sizeStepMm: 1,
  sizeStepFineThresholdMm: 5,
  sizeStepFineMm: 0.5,
  sizeStepExtraFineThresholdMm: 1,
  sizeStepExtraFineMm: 0.05,
}

let settings: ProgramSettings = { ...DEFAULT_PROGRAM_SETTINGS }

function positiveOrDefault(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback
}

/** Aktualny snapshot ustawień (kopia — mutacja przez settery). */
export function getProgramSettings(): Readonly<ProgramSettings> {
  return settings
}

/** Bazowy krok (bez uwzględnienia bieżącego rozmiaru). */
export function getSizeStepMm(): number {
  return positiveOrDefault(settings.sizeStepMm, DEFAULT_PROGRAM_SETTINGS.sizeStepMm)
}

/**
 * Płynny krok względem bieżącego rozmiaru:
 * &lt; extraFineThreshold → extraFine; &lt; fineThreshold → fine; inaczej bazowy.
 */
export function resolveSizeStepMm(sizeMm: number): number {
  const fineThreshold = positiveOrDefault(
    settings.sizeStepFineThresholdMm,
    DEFAULT_PROGRAM_SETTINGS.sizeStepFineThresholdMm,
  )
  const extraFineThreshold = positiveOrDefault(
    settings.sizeStepExtraFineThresholdMm,
    DEFAULT_PROGRAM_SETTINGS.sizeStepExtraFineThresholdMm,
  )
  const base = getSizeStepMm()
  const fine = positiveOrDefault(settings.sizeStepFineMm, DEFAULT_PROGRAM_SETTINGS.sizeStepFineMm)
  const extraFine = positiveOrDefault(
    settings.sizeStepExtraFineMm,
    DEFAULT_PROGRAM_SETTINGS.sizeStepExtraFineMm,
  )

  if (!Number.isFinite(sizeMm) || sizeMm <= 0) return base
  if (sizeMm < extraFineThreshold) return extraFine
  if (sizeMm < fineThreshold) return fine
  return base
}

export function setSizeStepMm(stepMm: number): void {
  if (!Number.isFinite(stepMm) || stepMm <= 0) return
  settings = { ...settings, sizeStepMm: stepMm }
}

export function setSizeStepFineThresholdMm(thresholdMm: number): void {
  if (!Number.isFinite(thresholdMm) || thresholdMm <= 0) return
  settings = { ...settings, sizeStepFineThresholdMm: thresholdMm }
}

export function setSizeStepFineMm(stepMm: number): void {
  if (!Number.isFinite(stepMm) || stepMm <= 0) return
  settings = { ...settings, sizeStepFineMm: stepMm }
}

export function setSizeStepExtraFineThresholdMm(thresholdMm: number): void {
  if (!Number.isFinite(thresholdMm) || thresholdMm <= 0) return
  settings = { ...settings, sizeStepExtraFineThresholdMm: thresholdMm }
}

export function setSizeStepExtraFineMm(stepMm: number): void {
  if (!Number.isFinite(stepMm) || stepMm <= 0) return
  settings = { ...settings, sizeStepExtraFineMm: stepMm }
}

/** Reset do domyślnych (testy / przyszły Settings). */
export function resetProgramSettings(): void {
  settings = { ...DEFAULT_PROGRAM_SETTINGS }
}
