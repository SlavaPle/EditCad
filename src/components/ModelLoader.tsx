import { forwardRef, useImperativeHandle, useRef } from 'react'
import { loadModel, MODEL_FILE_ACCEPT } from '../lib/loadModel'
import type { BufferGeometry } from 'three'
import type { LoadModelResult } from '../types'

export interface ModelLoaderHandle {
  openFileDialog: () => void
  loadFile: (file: File) => Promise<LoadModelResult>
}

export interface ModelLoaderProps {
  onLoad: (geometry: BufferGeometry) => void
  onError?: (message: string) => void
}

export const ModelLoader = forwardRef<ModelLoaderHandle, ModelLoaderProps>(
  function ModelLoader({ onLoad, onError }, ref) {
    const inputRef = useRef<HTMLInputElement>(null)

    const loadFile = async (file: File): Promise<LoadModelResult> => {
      const result = await loadModel(file)
      if (result.ok) {
        onLoad(result.geometry)
      } else if (onError) {
        onError(result.error)
      }
      return result
    }

    useImperativeHandle(ref, () => ({
      openFileDialog() {
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
