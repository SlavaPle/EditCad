import type { BrowserFileHandle } from '../../lib/saveModel'
import { MODEL_FILE_ACCEPT } from '../../lib/loadModel'
import { ASSEMBLY_FILE_ACCEPT, ECDASM_EXTENSION } from '../pre-assembly/assemblyFile/assemblyFileIo'
import {
  classifyOpenDocumentFileName,
  type OpenDocumentFileKind,
} from './classifyOpenDocumentFile'

export const DOCUMENT_OPEN_FILE_ACCEPT = `${MODEL_FILE_ACCEPT},${ASSEMBLY_FILE_ACCEPT}`

export type PickOpenDocumentFileResult =
  | {
      ok: true
      file: File
      handle: BrowserFileHandle | null
      kind: OpenDocumentFileKind
    }
  | { ok: false; reason: 'cancel' | 'unsupported' }

type OpenFilePickerHandle = BrowserFileHandle & { getFile: () => Promise<File> }

/**
 * Wspólny dialog Open: detal (.ecdprt / mesh) albo montaż (.ecdasm).
 * Fallback: ukryty <input type="file"> gdy brak showOpenFilePicker.
 *
 * Uwaga: showOpenFilePicker odrzuca nieznane MIME — trzymaj te same klucze
 * co ModelLoader (model/stl + application/json), inaczej dialog pada jako „cancel”.
 */
export async function pickOpenDocumentFile(options?: {
  /** Opcjonalny input — używany gdy File System Access API niedostępne. */
  fallbackInput?: HTMLInputElement | null
}): Promise<PickOpenDocumentFileResult> {
  const showOpenFilePicker = (
    window as Window & {
      showOpenFilePicker?: (options?: {
        multiple?: boolean
        types?: Array<{ description?: string; accept: Record<string, string[]> }>
      }) => Promise<OpenFilePickerHandle[]>
    }
  ).showOpenFilePicker

  if (showOpenFilePicker) {
    try {
      const handles = await showOpenFilePicker({
        multiple: false,
        types: [
          {
            description: 'EditCad document',
            accept: {
              'model/stl': ['.stl'],
              'application/json': ['.ecdprt', ECDASM_EXTENSION],
            },
          },
        ],
      })
      const handle = handles[0]
      if (!handle) return { ok: false, reason: 'cancel' }
      const file = await handle.getFile()
      const kind = classifyOpenDocumentFileName(file.name)
      if (!kind) return { ok: false, reason: 'unsupported' }
      return { ok: true, file, handle, kind }
    } catch (err: unknown) {
      // AbortError = użytkownik anulował; inne błędy (np. TypeError MIME) → fallback.
      const name =
        err && typeof err === 'object' && 'name' in err
          ? String((err as { name: unknown }).name)
          : ''
      if (name === 'AbortError') {
        return { ok: false, reason: 'cancel' }
      }
    }
  }

  const input = options?.fallbackInput
  if (!input) return { ok: false, reason: 'cancel' }

  return new Promise((resolve) => {
    const onChange = () => {
      input.removeEventListener('change', onChange)
      const file = input.files?.[0]
      input.value = ''
      if (!file) {
        resolve({ ok: false, reason: 'cancel' })
        return
      }
      const kind = classifyOpenDocumentFileName(file.name)
      if (!kind) {
        resolve({ ok: false, reason: 'unsupported' })
        return
      }
      resolve({ ok: true, file, handle: null, kind })
    }
    input.addEventListener('change', onChange)
    input.click()
  })
}
