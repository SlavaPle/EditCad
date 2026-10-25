import { useTranslation } from 'react-i18next'
import type { MateDraftSession } from '../../features/assembly-mates/mateDraft'
import {
  mateKindAvailableForEntities,
  type MateAlignment,
  type MateKind,
} from '../../features/assembly-mates/model'
import type { MatesPickSlot } from '../../features/assembly-mates/matesPickMode'
import { AngularMateControls } from './AngularMateControls'
import { AngularMateTypeIcon } from './AngularMateTypeIcon'
import { ParallelMateControls } from './ParallelMateControls'
import { ParallelMateTypeIcon } from './ParallelMateTypeIcon'
import { PerpendicularMateControls } from './PerpendicularMateControls'
import { PerpendicularMateTypeIcon } from './PerpendicularMateTypeIcon'
import { useMatesPopupDrag } from './useMatesPopupDrag'
import styles from './MatesPopup.module.css'

export type MatesPopupProps = {
  session: MateDraftSession
  activePickSlot: MatesPickSlot | null
  offsetInput: string
  angleInput: string
  partNameById: Readonly<Record<string, string>>
  solverErrorKey: string | null
  canSave: boolean
  onKindChange: (kind: MateKind) => void
  onAlignmentChange: (alignment: MateAlignment) => void
  onOffsetChange: (value: string) => void
  onAngleChange: (value: string) => void
  onFlippedChange: (flipped: boolean) => void
  onStartPick: (slot: MatesPickSlot) => void
  onSave: () => void
  onSaveAndClose: () => void
  onClose: () => void
}

const MATE_KINDS: MateKind[] = ['parallel', 'perpendicular', 'angular']

export function MatesPopup({
  session,
  activePickSlot,
  offsetInput,
  angleInput,
  partNameById,
  solverErrorKey,
  canSave,
  onKindChange,
  onAlignmentChange,
  onOffsetChange,
  onAngleChange,
  onFlippedChange,
  onStartPick,
  onSave,
  onSaveAndClose,
  onClose,
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
          <div className={styles.typeList} role="listbox" aria-label={t('mates.popup.title')}>
            {MATE_KINDS.map((kind) => {
              const kindAvailable = mateKindAvailableForEntities(
                kind,
                draft.entityA,
                draft.entityB,
              )
              return (
                <button
                  key={kind}
                  type="button"
                  role="option"
                  disabled={!kindAvailable}
                  className={`${styles.typeBtn} ${draft.kind === kind ? styles.typeBtnActive : ''} ${!kindAvailable ? styles.typeBtnDisabled : ''}`}
                  aria-selected={draft.kind === kind}
                  aria-pressed={draft.kind === kind}
                  aria-disabled={!kindAvailable}
                  onClick={() => {
                    if (!kindAvailable) return
                    onKindChange(kind)
                  }}
                >
                  {kind === 'parallel' && <ParallelMateTypeIcon />}
                  {kind === 'perpendicular' && <PerpendicularMateTypeIcon />}
                  {kind === 'angular' && <AngularMateTypeIcon />}
                  {t(`mates.types.${kind}`)}
                </button>
              )
            })}
          </div>
          {draft.kind === 'parallel' && (
            <ParallelMateControls
              entityA={draft.entityA}
              entityB={draft.entityB}
              alignment={draft.alignment}
              offsetMm={offsetInput}
              flipped={draft.flipped}
              applyState={applyState}
              activePickSlot={activePickSlot}
              partNameById={partNameById}
              solverErrorKey={solverErrorKey}
              canSave={canSave}
              onAlignmentChange={onAlignmentChange}
              onOffsetChange={onOffsetChange}
              onFlippedChange={onFlippedChange}
              onStartPick={onStartPick}
              onSave={onSave}
              onSaveAndClose={onSaveAndClose}
            />
          )}
          {draft.kind === 'perpendicular' && (
            <PerpendicularMateControls
              entityA={draft.entityA}
              entityB={draft.entityB}
              flipped={draft.flipped}
              applyState={applyState}
              activePickSlot={activePickSlot}
              partNameById={partNameById}
              solverErrorKey={solverErrorKey}
              canSave={canSave}
              onFlippedChange={onFlippedChange}
              onStartPick={onStartPick}
              onSave={onSave}
              onSaveAndClose={onSaveAndClose}
            />
          )}
          {draft.kind === 'angular' && (
            <AngularMateControls
              entityA={draft.entityA}
              entityB={draft.entityB}
              angleDeg={angleInput}
              alignment={draft.alignment}
              applyState={applyState}
              activePickSlot={activePickSlot}
              partNameById={partNameById}
              solverErrorKey={solverErrorKey}
              canSave={canSave}
              onAngleChange={onAngleChange}
              onAlignmentChange={onAlignmentChange}
              onStartPick={onStartPick}
              onSave={onSave}
              onSaveAndClose={onSaveAndClose}
            />
          )}
        </div>
      </div>
    </div>
  )
}
