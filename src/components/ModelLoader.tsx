import { forwardRef, useImperativeHandle, useRef } from 'react'
import { loadModel, MODEL_FILE_ACCEPT } from '../lib/loadModel'
import type { BufferGeometry } from 'three'
import type { BrowserFileHandle, SaveFormat } from '../lib/saveModel'
import type { LoadModelResult } from '../types'
import type { PreparedElementConstraints } from '../lib/preparedElementFormat'

export interface ModelLoaderHandle {
  openFileDialog: () => void | Promise<void>
  loadFile: (file: File, sourceHandle?: BrowserFileHandle | null) => Promise<LoadModelResult>
}

export interface ModelLoaderProps {
  onLoad: (
    geometry: BufferGeometry,
    sourceHandle?: BrowserFileHandle | null,
    sourceFileName?: string,
    format?: SaveFormat,
    prepared?: { name: string; constraints: PreparedElementConstraints },
  ) => void
  onError?: (message: string) => void
}

export const ModelLoader = forwardRef<ModelLoaderHandle, ModelLoaderProps>(
  function ModelLoader({ onLoad, onError }, ref) {
    const inputRef = useRef<HTMLInputElement>(null)

    const loadFile = async (file: File, sourceHandle?: BrowserFileHandle | null): Promise<LoadModelResult> => {
      const result = await loadModel(file)
      if (result.ok) {
        onLoad(result.geometry, sourceHandle ?? null, file.name, result.format, result.prepared)
      } else if (onError) {
        onError(result.error)
      }
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
                  description: '3D model',
                  accept: {
                    'model/stl': ['.stl'],
                    'application/json': ['.ecdprt'],
                  },
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
        accept={MODEL_FILE_ACCEPT}
        style={{ display: 'none' }}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            loadFile(file)
            e.target.value = ''
          }
        }}
      />
    )
  }
)
