import { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ModelLoader } from './ModelLoader'
import { isSupportedExtension } from '../lib/loadModel'
import type { ModelLoaderHandle } from './ModelLoader'
import type { SaveFormat } from '../lib/saveModel'
import type { PreparedElementConstraints } from '../lib/preparedElementFormat'
import type { FaceConstraint } from '../features/face-constraints/model'
import { formatPanelConstraintSummary } from '../features/face-constraints/model'
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
              <span className={styles.sectionTitle}>{t('leftPanel.constraints.title')}</span>
              <button
                type="button"
                className={styles.constraintLock}
                onClick={() => onConstraintsLockedChange(!constraintsLocked)}
                title={
                  constraintsLocked
                    ? t('leftPanel.constraints.locked')
                    : t('leftPanel.constraints.unlocked')
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
              <p className={styles.placeholder}>{t('leftPanel.constraints.onlyPrepared')}</p>
            ) : faceConstraints.length === 0 ? (
              <p className={styles.placeholder}>{t('leftPanel.constraints.empty')}</p>
            ) : (
              <ul className={styles.constraintsList}>
                {faceConstraints.map((item) => (
                  <li key={item.id}>
                    {item.type.toUpperCase()}
                    {item.type === 'panel'
                      ? ` ${formatPanelConstraintSummary(item)}${item.ySameAsX ? t('leftPanel.constraints.panelYSameBadge') : ''}`
                      : item.type === 'block'
                        ? ''
                        : ` ${item.valueMm}mm`}
                    {item.elementAId && item.elementBId
                      ? ` (${item.elementAId} ↔ ${item.elementBId})`
                      : item.facePair
                        ? ` [${item.facePair.a}, ${item.facePair.b}]`
                        : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
