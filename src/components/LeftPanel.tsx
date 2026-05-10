import { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ModelLoader } from './ModelLoader'
import { isSupportedExtension } from '../lib/loadModel'
import type { ModelLoaderHandle } from './ModelLoader'
import type { SaveFormat } from '../lib/saveModel'
import type { BufferGeometry } from 'three'
import type { PreparedElementConstraints, PreparedModelElement } from '../lib/preparedElementFormat'
import type { FaceConstraint } from '../features/face-constraints/model'
import { formatConstraintUiSummary } from '../features/face-constraints/formatConstraintUiSummary'
import styles from './LeftPanel.module.css'

export interface LeftPanelProps {
  modelLoaderRef: React.RefObject<ModelLoaderHandle | null>
  onModelLoad: (
    geometry: import('three').BufferGeometry,
    sourceHandle?: import('../lib/saveModel').BrowserFileHandle | null,
    sourceFileName?: string,
    format?: SaveFormat,
    prepared?: { name: string; constraints: PreparedElementConstraints },
  ) => void
  onLoadError: (message: string | null) => void
  loadError: string | null
  hasModel: boolean
  currentFileName?: string | null
  currentFileFormat?: SaveFormat | null
  faceConstraints: FaceConstraint[]
  constraintsLocked: boolean
  onConstraintsLockedChange: (next: boolean) => void
  limitsSummaryGeometry: BufferGeometry | null
  limitsSummaryModelElements: readonly PreparedModelElement[]
}

export function LeftPanel({
  modelLoaderRef,
  onModelLoad,
  onLoadError,
  loadError,
  hasModel,
  currentFileName,
  currentFileFormat,
  faceConstraints,
  constraintsLocked,
  onConstraintsLockedChange,
  limitsSummaryGeometry,
  limitsSummaryModelElements,
}: LeftPanelProps) {
  const { t } = useTranslation()
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const getFileIcon = () => {
    if (currentFileFormat === 'ecdprt') return '🧩'
    if (currentFileFormat === 'stl') return '📐'
    return '📄'
  }

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
            {currentFileName && (
              <div className={styles.currentFile} title={currentFileName}>
                <span className={styles.currentFileIcon} aria-hidden>
                  {getFileIcon()}
                </span>
                <span className={styles.currentFileName}>{currentFileName}</span>
              </div>
            )}
            <p className={styles.placeholder}>
              {hasModel ? t('leftPanel.dropHintReplace') : t('leftPanel.dropHint')}
            </p>
            {loadError && (
              <p className={styles.error} role="alert">
                {loadError}
              </p>
            )}
          </div>
          <div className={styles.section}>
            <div className={styles.sectionTitleRow}>
              <span className={styles.sectionTitle}>{t('leftPanel.limits.title')}</span>
              <button
                type="button"
                className={styles.constraintLock}
                onClick={() => onConstraintsLockedChange(!constraintsLocked)}
                title={
                  constraintsLocked
                    ? t('leftPanel.limits.locked')
                    : t('leftPanel.limits.unlocked')
                }
              >
                <span
                  className={`${styles.lockIcon} ${constraintsLocked ? styles.lockIconClosed : styles.lockIconOpen}`}
                  aria-hidden
                >
                  <span className={styles.lockIconBody} />
                  <span className={styles.lockIconShackle} />
                </span>
              </button>
            </div>
            {currentFileFormat !== 'ecdprt' ? (
              <p className={styles.placeholder}>{t('leftPanel.limits.onlyPrepared')}</p>
            ) : faceConstraints.length === 0 ? (
              <p className={styles.placeholder}>{t('leftPanel.limits.empty')}</p>
            ) : (
              <ul className={styles.constraintsList}>
                {faceConstraints.map((item) => {
                  const { primary, tooltip } = formatConstraintUiSummary({
                    constraint: item,
                    geometry: limitsSummaryGeometry,
                    modelElements: limitsSummaryModelElements,
                    t,
                  })
                  return (
                    <li key={item.id} title={tooltip}>
                      {item.type.toUpperCase()} · {primary}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
