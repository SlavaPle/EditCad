/**
 * Ładowanie modeli 3D (STL, opcjonalnie STEP/IGES) do BufferGeometry dla Three.js.
 */
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import type { BufferGeometry } from 'three'
import type { LoadModelResult } from '../types'

const STL_EXTENSIONS: readonly string[] = ['.stl']
const STEP_EXTENSIONS: readonly string[] = ['.stp', '.step']
const IGES_EXTENSIONS: readonly string[] = ['.igs', '.iges']

function getExtension(filename: string): string {
  const i = filename.lastIndexOf('.')
  return i >= 0 ? filename.slice(i).toLowerCase() : ''
}

function isSTL(ext: string): boolean {
  return STL_EXTENSIONS.includes(ext)
}

function isSTEP(ext: string): boolean {
  return STEP_EXTENSIONS.includes(ext)
}

function isIGES(ext: string): boolean {
  return IGES_EXTENSIONS.includes(ext)
}

/**
 * Ładuje plik STL i zwraca BufferGeometry.
 */
async function loadSTLFromFile(file: File): Promise<BufferGeometry> {
  const url = URL.createObjectURL(file)
  try {
    const loader = new STLLoader()
    const geometry = await loader.loadAsync(url)
    return geometry
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Ładuje plik modelu (STL obsługiwany; STEP/IGES — komunikat o przyszłej obsłudze).
 * @param file — plik wybrany przez użytkownika
 * @returns LoadModelResult z geometrią lub błędem
 */
export async function loadModel(file: File): Promise<LoadModelResult> {
  const ext = getExtension(file.name)

  if (isSTL(ext)) {
    try {
      const geometry = await loadSTLFromFile(file)
      return { ok: true, geometry, format: 'stl' }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { ok: false, error: message }
    }
  }

  if (isSTEP(ext) || isIGES(ext)) {
    return {
      ok: false,
      error: 'STEP/IGES support is not implemented yet. Please export your model as STL from SolidWorks.',
    }
  }

  return {
    ok: false,
    error: `Unsupported format: ${ext}. Use .stl, .stp, .step, .igs, or .iges.`,
  }
}

/**
 * Sprawdza, czy rozszerzenie pliku jest obsługiwane (w tym przyszłościowo STEP/IGES).
 */
export function isSupportedExtension(filename: string): boolean {
  const ext = getExtension(filename)
  return (
    STL_EXTENSIONS.includes(ext) ||
    STEP_EXTENSIONS.includes(ext) ||
    IGES_EXTENSIONS.includes(ext)
  )
}

/** Akceptowana wartość dla <input accept=""> (STL + opcjonalnie STEP/IGES). */
export const MODEL_FILE_ACCEPT =
  '.stl,.STL,.stp,.step,.STP,.STEP,.igs,.iges,.IGS,.IGES'
