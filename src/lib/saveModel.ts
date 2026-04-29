import { Mesh, type BufferGeometry } from 'three'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import {
  PREPARED_ELEMENT_FORMAT,
  PREPARED_ELEMENT_VERSION,
  serializePreparedElementFile,
  type PreparedElementConstraints,
} from './preparedElementFormat'

const DEFAULT_EXPORT_NAME = 'edited-model'
export const ECDPRT_EXTENSION = '.ecdprt' as const
export const STL_EXTENSION = '.stl' as const
export type SaveFormat = 'stl' | 'ecdprt'
export type SaveAsResult = {
  handle: BrowserFileHandle
  format: SaveFormat
  fileName: string
}

function sanitizeFileBaseName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return DEFAULT_EXPORT_NAME
  return trimmed.replace(/[^a-zA-Z0-9._-]+/g, '-')
}

export function buildStlFileName(baseName?: string): string {
  const safeBase = sanitizeFileBaseName(baseName ?? DEFAULT_EXPORT_NAME)
  if (safeBase.toLowerCase().endsWith('.stl')) {
    return safeBase
  }
  return `${safeBase}.stl`
}

export function buildEcdprtFileName(baseName?: string): string {
  const safeBase = sanitizeFileBaseName(baseName ?? DEFAULT_EXPORT_NAME)
  if (safeBase.toLowerCase().endsWith(ECDPRT_EXTENSION)) {
    return safeBase
  }
  return `${safeBase}${ECDPRT_EXTENSION}`
}

function detectSaveFormatByFileName(name: string | undefined, fallback: SaveFormat = 'ecdprt'): SaveFormat {
  const normalized = (name ?? '').toLowerCase()
  if (normalized.endsWith(STL_EXTENSION)) return 'stl'
  if (normalized.endsWith(ECDPRT_EXTENSION)) return 'ecdprt'
  return fallback
}

export function exportGeometryToAsciiStl(geometry: BufferGeometry): string {
  const exporter = new STLExporter()
  const mesh = new Mesh(geometry)
  const result = exporter.parse(mesh, { binary: false })
  return typeof result === 'string' ? result : new TextDecoder().decode(result)
}

type WritableFile = {
  write: (data: Blob | string) => Promise<void>
  close: () => Promise<void>
}

export type BrowserFileHandle = {
  name?: string
  createWritable: () => Promise<WritableFile>
}

type SaveFilePicker = (options?: {
  suggestedName?: string
  startIn?: BrowserFileHandle
  types?: Array<{ description?: string; accept: Record<string, string[]> }>
}) => Promise<BrowserFileHandle>

async function writeStlToHandle(stl: string, handle: BrowserFileHandle): Promise<void> {
  const writable = await handle.createWritable()
  await writable.write(new Blob([stl], { type: 'model/stl' }))
  await writable.close()
}

async function writeTextToHandle(content: string, handle: BrowserFileHandle, mime: string): Promise<void> {
  const writable = await handle.createWritable()
  await writable.write(new Blob([content], { type: mime }))
  await writable.close()
}

export async function saveGeometryAsStlFile(
  geometry: BufferGeometry,
  handle: BrowserFileHandle,
): Promise<string | null> {
  const stl = exportGeometryToAsciiStl(geometry)
  await writeStlToHandle(stl, handle)
  return handle.name ?? null
}

export async function saveGeometryAsStlFileAs(
  geometry: BufferGeometry,
  baseName?: string,
  startIn?: BrowserFileHandle,
): Promise<BrowserFileHandle> {
  const stl = exportGeometryToAsciiStl(geometry)
  const fileName = buildStlFileName(baseName)
  const showSaveFilePicker = (window as Window & { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker
  if (!showSaveFilePicker) {
    throw new Error('Save dialog is not supported in this browser.')
  }
  const handle = await showSaveFilePicker({
    suggestedName: fileName,
    startIn,
    types: [{ description: 'STL model', accept: { 'model/stl': ['.stl'] } }],
  })
  await writeStlToHandle(stl, handle)
  return handle
}

export function buildPreparedElementJson(
  geometry: BufferGeometry,
  name: string,
  constraints: PreparedElementConstraints,
): string {
  return serializePreparedElementFile({
    format: PREPARED_ELEMENT_FORMAT,
    version: PREPARED_ELEMENT_VERSION,
    name,
    constraints,
    geometry: {
      format: 'stl-ascii',
      data: exportGeometryToAsciiStl(geometry),
    },
  })
}

export async function saveGeometryAsEcdprtFile(
  geometry: BufferGeometry,
  handle: BrowserFileHandle,
  name: string,
  constraints: PreparedElementConstraints,
): Promise<string | null> {
  const content = buildPreparedElementJson(geometry, name, constraints)
  await writeTextToHandle(content, handle, 'application/json')
  return handle.name ?? null
}

export async function saveGeometryAsEcdprtFileAs(
  geometry: BufferGeometry,
  baseName?: string,
  startIn?: BrowserFileHandle,
  constraints: PreparedElementConstraints = { mode: 'fixed' },
): Promise<BrowserFileHandle> {
  const fileName = buildEcdprtFileName(baseName)
  const showSaveFilePicker = (window as Window & { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker
  if (!showSaveFilePicker) {
    throw new Error('Save dialog is not supported in this browser.')
  }
  const handle = await showSaveFilePicker({
    suggestedName: fileName,
    startIn,
    types: [{ description: 'EditCad Prepared Part', accept: { 'application/json': ['.ecdprt'] } }],
  })
  await saveGeometryAsEcdprtFile(geometry, handle, baseName ?? DEFAULT_EXPORT_NAME, constraints)
  return handle
}

export async function saveGeometryWithFormatAs(
  geometry: BufferGeometry,
  baseName?: string,
  startIn?: BrowserFileHandle,
  constraints: PreparedElementConstraints = { mode: 'fixed' },
): Promise<SaveAsResult> {
  const showSaveFilePicker = (window as Window & { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker
  if (!showSaveFilePicker) {
    throw new Error('Save dialog is not supported in this browser.')
  }
  const suggestedName = buildEcdprtFileName(baseName)
  const handle = await showSaveFilePicker({
    suggestedName,
    startIn,
    // ECDPRT is first, so combobox defaults to this option.
    types: [
      { description: 'EditCad Prepared Part', accept: { 'application/json': ['.ecdprt'] } },
      { description: 'STL model', accept: { 'model/stl': ['.stl'] } },
    ],
  })
  const selectedFormat = detectSaveFormatByFileName(handle.name, 'ecdprt')
  if (selectedFormat === 'stl') {
    await saveGeometryAsStlFile(geometry, handle)
  } else {
    await saveGeometryAsEcdprtFile(geometry, handle, baseName ?? DEFAULT_EXPORT_NAME, constraints)
  }
  return {
    handle,
    format: selectedFormat,
    fileName: handle.name ?? (selectedFormat === 'stl' ? buildStlFileName(baseName) : suggestedName),
  }
}
