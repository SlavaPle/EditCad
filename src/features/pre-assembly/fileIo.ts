import type { BrowserFileHandle } from '../../lib/saveModel'
import { validateBindingsComplete } from './bindings'
import { parsePhantomAssemblyFile, serializePhantomAssemblyFile } from './codec'
import type { PhantomAssemblyFile } from './model'

export const ECDPRE_EXTENSION = '.ecdpre' as const
export const PHANTOM_FILE_ACCEPT = `${ECDPRE_EXTENSION},application/json`

const DEFAULT_EXPORT_NAME = 'phantom'

export type LoadPhantomResult =
  | { ok: true; file: PhantomAssemblyFile; fileName: string }
  | { ok: false; error: string }

export type SavePhantomAsResult = {
  handle: BrowserFileHandle
  fileName: string
}

function sanitizeFileBaseName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return DEFAULT_EXPORT_NAME
  return trimmed.replace(/[^a-zA-Z0-9._-]+/g, '-')
}

export function buildEcdpreFileName(baseName?: string): string {
  const safeBase = sanitizeFileBaseName(baseName ?? DEFAULT_EXPORT_NAME)
  if (safeBase.toLowerCase().endsWith(ECDPRE_EXTENSION)) {
    return safeBase
  }
  return `${safeBase}${ECDPRE_EXTENSION}`
}

export function stripEcdpreExtension(name: string | null | undefined): string {
  if (!name) return DEFAULT_EXPORT_NAME
  const lower = name.toLowerCase()
  if (lower.endsWith(ECDPRE_EXTENSION)) {
    return name.slice(0, -ECDPRE_EXTENSION.length)
  }
  const i = name.lastIndexOf('.')
  if (i < 0) return name
  return name.slice(0, i)
}

export function validatePhantomForSave(
  file: PhantomAssemblyFile,
): { ok: true } | { ok: false; error: string } {
  return validateBindingsComplete(file.phantom)
}

export async function readPhantomAssemblyFromText(content: string): Promise<LoadPhantomResult> {
  const parsed = parsePhantomAssemblyFile(content)
  if (!parsed.ok) {
    return { ok: false, error: parsed.error }
  }
  return { ok: true, file: parsed.file, fileName: buildEcdpreFileName(parsed.file.name) }
}

export async function readPhantomAssemblyFromFile(file: File): Promise<LoadPhantomResult> {
  try {
    const content = await file.text()
    const parsed = parsePhantomAssemblyFile(content)
    if (!parsed.ok) {
      return { ok: false, error: parsed.error }
    }
    return { ok: true, file: parsed.file, fileName: file.name }
  } catch {
    return { ok: false, error: 'Pre-assembly file could not be read.' }
  }
}

async function writeTextToHandle(
  content: string,
  handle: BrowserFileHandle,
): Promise<void> {
  const writable = await handle.createWritable()
  await writable.write(new Blob([content], { type: 'application/json' }))
  await writable.close()
}

export async function savePhantomAssemblyToHandle(
  file: PhantomAssemblyFile,
  handle: BrowserFileHandle,
): Promise<string | null> {
  const validation = validatePhantomForSave(file)
  if (!validation.ok) {
    throw new Error(validation.error)
  }
  const content = serializePhantomAssemblyFile(file)
  await writeTextToHandle(content, handle)
  return handle.name ?? null
}

type SaveFilePicker = (options?: {
  suggestedName?: string
  startIn?: BrowserFileHandle
  types?: Array<{ description?: string; accept: Record<string, string[]> }>
}) => Promise<BrowserFileHandle>

export async function savePhantomAssemblyFileAs(
  file: PhantomAssemblyFile,
  baseName?: string,
  startIn?: BrowserFileHandle,
): Promise<SavePhantomAsResult> {
  const showSaveFilePicker = (window as Window & { showSaveFilePicker?: SaveFilePicker })
    .showSaveFilePicker
  if (!showSaveFilePicker) {
    throw new Error('Save dialog is not supported in this browser.')
  }
  const suggestedName = buildEcdpreFileName(baseName ?? file.name)
  const handle = await showSaveFilePicker({
    suggestedName,
    startIn,
    types: [
      {
        description: 'EditCad Pre-assembly',
        accept: { 'application/json': [ECDPRE_EXTENSION] },
      },
    ],
  })
  await savePhantomAssemblyToHandle(file, handle)
  return {
    handle,
    fileName: handle.name ?? suggestedName,
  }
}
