import type { BrowserFileHandle } from '../../../lib/saveModel'
import { parseAssemblyFile, serializeAssemblyFile } from './assemblyCodec'
import type { AssemblyFile } from './assemblyModel'

export const ECDASM_EXTENSION = '.ecdasm' as const

export const ASSEMBLY_FILE_ACCEPT = `${ECDASM_EXTENSION},application/json`

const DEFAULT_EXPORT_NAME = 'assembly'

export type LoadAssemblyResult =
  | { ok: true; file: AssemblyFile; fileName: string }
  | { ok: false; error: string }

export type SaveAssemblyAsResult = {
  handle: BrowserFileHandle
  fileName: string
}

function sanitizeFileBaseName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return DEFAULT_EXPORT_NAME
  return trimmed.replace(/[^a-zA-Z0-9._-]+/g, '-')
}

export function buildEcdasmFileName(baseName?: string): string {
  const safeBase = sanitizeFileBaseName(baseName ?? DEFAULT_EXPORT_NAME)
  if (safeBase.toLowerCase().endsWith(ECDASM_EXTENSION)) {
    return safeBase
  }
  return `${safeBase}${ECDASM_EXTENSION}`
}

export function stripEcdasmExtension(name: string | null | undefined): string {
  if (!name) return DEFAULT_EXPORT_NAME
  const lower = name.toLowerCase()
  if (lower.endsWith(ECDASM_EXTENSION)) {
    return name.slice(0, -ECDASM_EXTENSION.length)
  }
  const i = name.lastIndexOf('.')
  if (i < 0) return name
  return name.slice(0, i)
}

export async function readAssemblyFromFile(file: File): Promise<LoadAssemblyResult> {
  try {
    const content = await file.text()
    const parsed = parseAssemblyFile(content)
    if (!parsed.ok) {
      return { ok: false, error: parsed.error }
    }
    return { ok: true, file: parsed.file, fileName: file.name }
  } catch {
    return { ok: false, error: 'Assembly file could not be read.' }
  }
}

async function writeTextToHandle(content: string, handle: BrowserFileHandle): Promise<void> {
  const writable = await handle.createWritable()
  await writable.write(new Blob([content], { type: 'application/json' }))
  await writable.close()
}

export async function saveAssemblyToHandle(
  file: AssemblyFile,
  handle: BrowserFileHandle,
): Promise<string | null> {
  const content = serializeAssemblyFile(file)
  await writeTextToHandle(content, handle)
  return handle.name ?? null
}

type SaveFilePicker = (options?: {
  suggestedName?: string
  startIn?: BrowserFileHandle
  types?: Array<{ description?: string; accept: Record<string, string[]> }>
}) => Promise<BrowserFileHandle>

export async function saveAssemblyFileAs(
  file: AssemblyFile,
  baseName?: string,
  startIn?: BrowserFileHandle,
): Promise<SaveAssemblyAsResult> {
  const showSaveFilePicker = (window as Window & { showSaveFilePicker?: SaveFilePicker })
    .showSaveFilePicker
  if (!showSaveFilePicker) {
    throw new Error('Save dialog is not supported in this browser.')
  }
  const suggestedName = buildEcdasmFileName(baseName ?? file.name)
  const handle = await showSaveFilePicker({
    suggestedName,
    startIn,
    types: [
      {
        description: 'EditCad Assembly',
        accept: { 'application/json': [ECDASM_EXTENSION] },
      },
    ],
  })
  await saveAssemblyToHandle(file, handle)
  return {
    handle,
    fileName: handle.name ?? suggestedName,
  }
}
