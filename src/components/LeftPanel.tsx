import { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ModelLoader } from './ModelLoader'
import { isSupportedExtension } from '../lib/loadModel'
import type { ModelLoaderHandle } from './ModelLoader'
import styles from './LeftPanel.module.css'

export interface LeftPanelProps {
  modelLoaderRef: React.RefObject<ModelLoaderHandle | null>
  onModelLoad: (geometry: import('three').BufferGeometry) => void
  onLoadError: (message: string | null) => void
  loadError: string | null
  hasModel: boolean
}

export function LeftPanel({
  modelLoaderRef,
  onModelLoad,
  onLoadError,
  loadError,
  hasModel,
}: LeftPanelProps) {
  const { t } = useTranslation()
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      onLoadError(null)
      const file = e.dataTransfer.files?.[0]
      if (!file) return
      if (!isSupportedExtension(file.name)) {
        onLoadError(t('leftPanel.unsupportedFormat'))
        return
      }
      modelLoaderRef.current?.loadFile(file)
    },
    [modelLoaderRef, onLoadError, t]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>{t('leftPanel.header')}</div>
      <div className={styles.content}>
        <ModelLoader
          ref={modelLoaderRef}
          onLoad={onModelLoad}
          onError={onLoadError}
        />
        <div
          ref={dropZoneRef}
          className={styles.dropZone}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className={styles.section}>
            <div className={styles.sectionTitle}>{t('leftPanel.file')}</div>
            <p className={styles.placeholder}>
              {hasModel ? t('leftPanel.dropHintReplace') : t('leftPanel.dropHint')}
            </p>
            {loadError && (
              <p className={styles.error} role="alert">
                {loadError}
              </p>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
