import { Mesh, type BufferGeometry } from 'three'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'

const DEFAULT_EXPORT_NAME = 'edited-model'

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
