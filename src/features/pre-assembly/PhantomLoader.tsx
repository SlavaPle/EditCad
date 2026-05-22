import { forwardRef, useImperativeHandle, useRef } from 'react'
import type { BrowserFileHandle } from '../../lib/saveModel'
import { ECDPRE_EXTENSION, PHANTOM_FILE_ACCEPT, readPhantomAssemblyFromFile } from './fileIo'
import type { PhantomAssemblyFile } from './model'

export type PhantomLoadResult =
  | { ok: true; file: PhantomAssemblyFile; fileName: string; sourceHandle?: BrowserFileHandle | null }
  | { ok: false; error: string }

export interface PhantomLoaderHandle {
  openFileDialog: () => void | Promise<void>
  loadFile: (file: File, sourceHandle?: BrowserFileHandle | null) => Promise<PhantomLoadResult>
}

export interface PhantomLoaderProps {
  onLoad: (
    file: PhantomAssemblyFile,
    sourceHandle?: BrowserFileHandle | null,
    fileName?: string,
  ) => void
  onError?: (message: string) => void
}

export const PhantomLoader = forwardRef<PhantomLoaderHandle, PhantomLoaderProps>(
  function PhantomLoader({ onLoad, onError }, ref) {
    const inputRef = useRef<HTMLInputElement>(null)

    const loadFile = async (
      file: File,
      sourceHandle?: BrowserFileHandle | null,
    ): Promise<PhantomLoadResult> => {
      const result = await readPhantomAssemblyFromFile(file)
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
                  description: 'EditCad Pre-assembly',
                  accept: { 'application/json': [ECDPRE_EXTENSION] },
                },
              ],
            })
            const handle = handles[0]
            if (!handle) return
            const file = await handle.getFile()
            await loadFile(file, handle)
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
        accept={PHANTOM_FILE_ACCEPT}
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
