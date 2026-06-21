import { useTranslation } from 'react-i18next'
import type { MateDraftSession } from '../../features/assembly-mates/mateDraft'
import type { MatesPickSlot } from '../../features/assembly-mates/matesPickMode'
import { ParallelMateControls } from './ParallelMateControls'
import { ParallelMateTypeIcon } from './ParallelMateTypeIcon'
import { useMatesPopupDrag } from './useMatesPopupDrag'
import styles from './MatesPopup.module.css'

export type MatesPopupProps = {
  session: MateDraftSession
  activePickSlot: MatesPickSlot | null
  offsetInput: string
  partNameById: Readonly<Record<string, string>>
  solverErrorKey: string | null
  canApply: boolean
  canSave: boolean
  onAlignmentChange: (alignment: MateDraftSession['draft']['alignment']) => void
  onOffsetChange: (value: string) => void
  onStartPick: (slot: MatesPickSlot) => void
  onApply: () => void
  onRevert: () => void
  onSave: () => void
  onSaveAndClose: () => void
  onClose: () => void
  applyFocusToken?: number
}

export function MatesPopup({
  session,
  activePickSlot,
  offsetInput,
  partNameById,
  solverErrorKey,
  canApply,
  canSave,
  onAlignmentChange,
  onOffsetChange,
  onStartPick,
  onApply,
  onRevert,
  onSave,
  onSaveAndClose,
  onClose,
  applyFocusToken = 0,
}: MatesPopupProps) {
  const { t } = useTranslation()
  const { draft, applyState } = session
  const { position, dragging, onHeaderPointerDown } = useMatesPopupDrag()

  return (
    <div className={styles.overlay} role="presentation">
      <div
        className={styles.popup}
        style={{ left: position.x, top: position.y }}
        role="dialog"
        aria-modal="false"
        aria-label={t('mates.popup.title')}
      >
        <div
          className={`${styles.header} ${dragging ? styles.headerDragging : ''}`}
          onPointerDown={onHeaderPointerDown}
        >
          <h2 className={styles.title}>{t('mates.popup.title')}</h2>
          <button
            type="button"
            className={styles.closeBtn}
            aria-label={t('mates.popup.close')}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className={styles.body}>
          <div className={styles.typeList}>
            <button
              type="button"
              className={`${styles.typeBtn} ${styles.typeBtnActive}`}
              aria-pressed
            >
              <ParallelMateTypeIcon />
              {t('mates.types.parallel')}
            </button>
          </div>
          <ParallelMateControls
            planeA={draft.planeA}
            planeB={draft.planeB}
            alignment={draft.alignment}
            offsetMm={offsetInput}
            applyState={applyState}
            activePickSlot={activePickSlot}
            partNameById={partNameById}
            solverErrorKey={solverErrorKey}
            canApply={canApply}
            canSave={canSave}
            onAlignmentChange={onAlignmentChange}
            onOffsetChange={onOffsetChange}
            onStartPick={onStartPick}
            onApply={onApply}
            onRevert={onRevert}
            onSave={onSave}
            onSaveAndClose={onSaveAndClose}
            applyFocusToken={applyFocusToken}
          />
        </div>
      </div>
    </div>
  )
}
