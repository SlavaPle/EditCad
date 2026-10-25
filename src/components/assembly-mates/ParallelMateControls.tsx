import { useTranslation } from 'react-i18next'
import type { MateAlignment, MateEntityRef } from '../../features/assembly-mates/model'
import { matePairKind, matePairSupportsAlignment } from '../../features/assembly-mates/model'
import type { MatesPickSlot } from '../../features/assembly-mates/matesPickMode'
import type { MateDraftApplyState } from '../../features/assembly-mates/mateDraft'
import { MateEntityPickRows } from './MateEntityPickRows'
import { MateFlipSelect } from './MateFlipSelect'
import styles from './MatesPopup.module.css'

export type ParallelMateControlsProps = {
  entityA: MateEntityRef | null
  entityB: MateEntityRef | null
  alignment: MateAlignment
  offsetMm: string
  flipped: boolean
  applyState: MateDraftApplyState
  activePickSlot: MatesPickSlot | null
  partNameById: Readonly<Record<string, string>>
  solverErrorKey: string | null
  canSave: boolean
  onAlignmentChange: (alignment: MateAlignment) => void
  onOffsetChange: (value: string) => void
  onFlippedChange: (flipped: boolean) => void
  onStartPick: (slot: MatesPickSlot) => void
  onSave: () => void
  onSaveAndClose: () => void
}

function distanceLabel(
  entityA: MateEntityRef | null,
  entityB: MateEntityRef | null,
  t: (key: string) => string,
): string {
  if (!entityA || !entityB) return t('mates.distance.label')
  const pair = matePairKind(entityA, entityB)
  const key = `mates.distance.${pair.replace('-', '')}` as const
  const translated = t(key)
  if (translated !== key) return translated
  return t('mates.distance.label')
}

export function ParallelMateControls({
  entityA,
  entityB,
  alignment,
  offsetMm,
  flipped,
  applyState,
  activePickSlot,
  partNameById,
  solverErrorKey,
  canSave,
  onAlignmentChange,
  onOffsetChange,
  onFlippedChange,
  onStartPick,
  onSave,
  onSaveAndClose,
}: ParallelMateControlsProps) {
  const { t } = useTranslation()
  const canEditMateParams = entityA !== null && entityB !== null
  const showOrientationFlip =
    entityA !== null && entityB !== null && matePairSupportsAlignment(matePairKind(entityA, entityB))

  return (
    <div className={styles.controls}>
      <MateEntityPickRows
        entityA={entityA}
        entityB={entityB}
        applyState={applyState}
        activePickSlot={activePickSlot}
        partNameById={partNameById}
        onStartPick={onStartPick}
      />

      {showOrientationFlip && (
        <MateFlipSelect
          flipped={alignment === 'sameDirection'}
          disabled={!canEditMateParams}
          onChange={(next) => onAlignmentChange(next ? 'sameDirection' : 'faceToFace')}
        />
      )}

      <div className={styles.fieldRow}>
        <label className={styles.planeLabel} htmlFor="mate-offset">
          {distanceLabel(entityA, entityB, t)}
        </label>
        <div className={styles.inputWrap}>
          <input
            id="mate-offset"
            className={styles.input}
            type="text"
            inputMode="decimal"
            value={offsetMm}
            disabled={!canEditMateParams}
            onChange={(e) => onOffsetChange(e.target.value)}
          />
          <span className={styles.unit}>mm</span>
          <label className={styles.flipLabel}>
            <input
              type="checkbox"
              checked={flipped}
              disabled={!canEditMateParams}
              onChange={(e) => onFlippedChange(e.target.checked)}
            />
            {t('mates.distance.reflect')}
          </label>
        </div>
      </div>

      {activePickSlot && <p className={styles.hint}>{t('mates.pickHint')}</p>}

      {solverErrorKey && <p className={styles.error}>{t(solverErrorKey)}</p>}

      <div className={styles.actions}>
        <button type="button" className={styles.actionBtn} disabled={!canSave} onClick={onSave}>
          {t('mates.actions.save')}
        </button>
        <button
          type="button"
          className={styles.actionBtn}
          disabled={!canSave}
          onClick={onSaveAndClose}
        >
          {t('mates.actions.saveAndClose')}
        </button>
      </div>
    </div>
  )
}
