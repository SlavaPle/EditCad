import {
  DEFAULT_MODEL_APPEARANCE,
  type ModelAppearance,
} from '../../viewer-display/modelAppearance'

/** Wygląd detali programu — z pliku .ecdprt lub domyślny. */
export function resolveProgramPartAppearance(
  partId: string,
  appearances: Readonly<Record<string, ModelAppearance | undefined>> = {},
): ModelAppearance {
  return appearances[partId] ?? DEFAULT_MODEL_APPEARANCE
}
