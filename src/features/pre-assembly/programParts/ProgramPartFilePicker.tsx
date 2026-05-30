import { forwardRef, useImperativeHandle, useRef } from 'react'
import type { BrowserFileHandle } from '../../../lib/saveModel'
import { PROGRAM_PART_FILE_ACCEPT, readProgramPartFromFile, type ProgramPartDescriptor } from './programPartFile'
import { loadProgramPartGeometryFromFile } from './programPartGeometry'
import type { BufferGeometry } from 'three'

export type ProgramPartPickEntry = {
  part: ProgramPartDescriptor
  geometry: BufferGeometry
}

export type ProgramPartPickBatchResult = {
  picked: ProgramPartPickEntry[]
  errors: string[]
}

export interface ProgramPartFilePickerHandle {
  openFileDialog: () => void | Promise<void>
}

export interface ProgramPartFilePickerProps {
  onPick: (parts: ProgramPartPickEntry[]) => void
  onError?: (message: string) => void
}

async function pickFilesFromList(files: FileList | File[]): Promise<ProgramPartPickBatchResult> {
  const picked: ProgramPartPickEntry[] = []
  const errors: string[] = []
  for (const file of files) {
    const meta = await readProgramPartFromFile(file)
    if (!meta.ok) {
      errors.push(`${file.name}: ${meta.error}`)
      continue
    }
    const geometry = await loadProgramPartGeometryFromFile(file)
    if (!geometry.ok) {
      errors.push(`${file.name}: ${geometry.error}`)
      continue
    }
    picked.push({ part: meta.part, geometry: geometry.geometry })
  }
  return { picked, errors }
}

export const ProgramPartFilePicker = forwardRef<ProgramPartFilePickerHandle, ProgramPartFilePickerProps>(
  function ProgramPartFilePicker({ onPick, onError }, ref) {
    const inputRef = useRef<HTMLInputElement>(null)

    const handleFiles = async (files: FileList | File[]) => {
      if (files.length === 0) return
      const { picked, errors } = await pickFilesFromList(files)
      if (picked.length > 0) {
        onPick(picked)
      }
      if (errors.length > 0) {
        onError?.(errors.join('\n'))
      }
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
              multiple: true,
              types: [
                {
                  description: 'EditCad program part',
                  accept: { 'application/json': ['.ecdprt'] },
                },
              ],
            })
            if (handles.length === 0) return
            const files = await Promise.all(handles.map((h) => h.getFile()))
            await handleFiles(files)
            return
          } catch {
            return
          }
        }
        inputRef.current?.click()
      },
    }))

    return (
      <input
        ref={inputRef}
        type="file"
        accept={PROGRAM_PART_FILE_ACCEPT}
        multiple
        style={{ display: 'none' }}
        aria-hidden
        onChange={(e) => {
          const fileList = e.target.files
          if (fileList && fileList.length > 0) {
            void handleFiles(fileList)
            e.target.value = ''
          }
        }}
      />
    )
  },
)
