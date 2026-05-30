import { forwardRef, useImperativeHandle, useRef } from 'react'
import type { BrowserFileHandle } from '../../../lib/saveModel'
import { ASSEMBLY_FILE_ACCEPT, ECDASM_EXTENSION, readAssemblyFromFile } from './assemblyFileIo'
import type { AssemblyFile } from './assemblyModel'

export type AssemblyLoadResult =
  | { ok: true; file: AssemblyFile; fileName: string; sourceHandle?: BrowserFileHandle | null }
  | { ok: false; error: string }

export interface AssemblyLoaderHandle {
  openFileDialog: () => void | Promise<void>
  loadFile: (file: File, sourceHandle?: BrowserFileHandle | null) => Promise<AssemblyLoadResult>
}

export interface AssemblyLoaderProps {
  onLoad: (
    file: AssemblyFile,
    sourceHandle?: BrowserFileHandle | null,
    fileName?: string,
  ) => void
  onError?: (message: string) => void
}

export const AssemblyLoader = forwardRef<AssemblyLoaderHandle, AssemblyLoaderProps>(
  function AssemblyLoader({ onLoad, onError }, ref) {
    const inputRef = useRef<HTMLInputElement>(null)

    const loadFile = async (
      file: File,
      sourceHandle?: BrowserFileHandle | null,
    ): Promise<AssemblyLoadResult> => {
      const result = await readAssemblyFromFile(file)
      if (result.ok) {
        onLoad(result.file, sourceHandle ?? null, result.fileName)
        return { ...result, sourceHandle: sourceHandle ?? null }
      }
      onError?.(result.error)
      return result
    }

    useImperativeHandle(ref, () => ({
      async openFileDialog() {
        const showOpenFilePicker = (
          window as Window & {
            showOpenFilePicker?: (options?: {
              multiple?: boolean
              types?: Array<{ description?: string; accept: Record<string, string[]> }>
            }) => Promise<Array<BrowserFileHandle & { getFile: () => Promise<File> }>>
          }
        ).showOpenFilePicker
        if (showOpenFilePicker) {
          try {
            const handles = await showOpenFilePicker({
              multiple: false,
              types: [
                {
                  description: 'EditCad Assembly',
                  accept: { 'application/json': [ECDASM_EXTENSION] },
                },
              ],
            })
            const handle = handles[0]
            if (!handle) return
            const picked = await handle.getFile()
            await loadFile(picked, handle)
            return
          } catch {
            return
          }
        }
        inputRef.current?.click()
      },
      loadFile,
    }))

    return (
      <input
        ref={inputRef}
        type="file"
        accept={ASSEMBLY_FILE_ACCEPT}
        style={{ display: 'none' }}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            void loadFile(file)
            e.target.value = ''
          }
        }}
      />
    )
  },
)
