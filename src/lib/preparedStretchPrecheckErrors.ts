import type { TwoFaceStretchError } from './twoFaceStretch'

/** Kody błędu walidacji przed lub po rozciągnięciu (ECDPRT). */
export type PreparedStretchPrecheckError =
  | TwoFaceStretchError
  | 'lockedByBlock'
  | 'constraintBrokenConst'
  | 'constraintBrokenMin'
  | 'constraintBrokenMax'
  | 'constraintBrokenProfil'
  | 'profilWrongTarget'
  | 'constraintPanelBroken'
