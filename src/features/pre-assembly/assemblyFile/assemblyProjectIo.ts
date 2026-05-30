import type { BrowserFileHandle } from '../../../lib/saveModel'
import { buildEcdasmFileName, readAssemblyFromFile, saveAssemblyToHandle } from './assemblyFileIo'
import type { AssemblyFile } from './assemblyModel'

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: {
    id?: string
    startIn?: FileSystemHandle
  }) => Promise<FileSystemDirectoryHandle>
}

type OpenFilePickerWindow = Window & {
  showOpenFilePicker?: (options?: {
    multiple?: boolean
    startIn?: FileSystemHandle
    types?: Array<{ description?: string; accept: Record<string, string[]> }>
  }) => Promise<Array<FileSystemFileHandle & { getFile: () => Promise<File> }>>
}

export async function pickAssemblyProjectDirectory(
  startIn?: FileSystemHandle | null,
): Promise<FileSystemDirectoryHandle | null> {
  const showDirectoryPicker = (window as DirectoryPickerWindow).showDirectoryPicker
  if (!showDirectoryPicker) return null
  try {
    return await showDirectoryPicker({
      id: 'ecdasm-project-root',
      startIn: startIn ?? undefined,
    })
  } catch {
    return null
  }
}

export async function openAssemblyFileFromRoot(
  root: FileSystemDirectoryHandle,
): Promise<
  | {
      ok: true
      file: AssemblyFile
      fileName: string
      sourceHandle: FileSystemFileHandle
    }
  | { ok: false; error: string }
> {
  const showOpenFilePicker = (window as OpenFilePickerWindow).showOpenFilePicker
  if (!showOpenFilePicker) {
    return { ok: false, error: 'Open dialog is not supported in this browser.' }
  }
  try {
    const handles = await showOpenFilePicker({
      multiple: false,
      startIn: root,
      types: [
        {
          description: 'EditCad Assembly',
          accept: { 'application/json': ['.ecdasm'] },
        },
      ],
    })
    const handle = handles[0]
    if (!handle) return { ok: false, error: 'No assembly file selected.' }
    const picked = await handle.getFile()
    const parsed = await readAssemblyFromFile(picked)
    if (!parsed.ok) return { ok: false, error: parsed.error }
    return {
      ok: true,
      file: parsed.file,
      fileName: parsed.fileName,
      sourceHandle: handle,
    }
  } catch {
    return { ok: false, error: 'Assembly file could not be opened.' }
  }
}

export async function saveAssemblyInProjectRoot(
  file: AssemblyFile,
  root: FileSystemDirectoryHandle,
  baseName?: string,
  existingFileName?: string | null,
): Promise<{ handle: BrowserFileHandle; fileName: string }> {
  const fileName = existingFileName ?? buildEcdasmFileName(baseName ?? file.name)
  const handle = await root.getFileHandle(fileName, { create: true })
  await saveAssemblyToHandle(file, handle)
  return { handle, fileName }
}
