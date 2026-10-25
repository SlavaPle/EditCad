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
  const showAlignment =
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

      {showAlignment && (
        <div className={styles.fieldRow}>
          <label className={styles.planeLabel} htmlFor="mate-alignment">
            {matePairKind(entityA!, entityB!) === 'line-line'
              ? t('mates.alignment.lineLabel')
              : t('mates.alignment.label')}
          </label>
          <select
            id="mate-alignment"
            className={styles.select}
            value={alignment}
            disabled={!canEditMateParams}
            onChange={(e) => onAlignmentChange(e.target.value as MateAlignment)}
          >
            <option value="faceToFace">
              {matePairKind(entityA!, entityB!) === 'line-line'
                ? t('mates.alignment.oppositeDirection')
                : t('mates.alignment.faceToFace')}
            </option>
            <option value="sameDirection">
              {matePairKind(entityA!, entityB!) === 'line-line'
                ? t('mates.alignment.sameDirectionLine')
                : t('mates.alignment.sameDirection')}
            </option>
          </select>
        </div>
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
        </div>
      </div>

      <MateFlipSelect
        flipped={flipped}
        disabled={!canEditMateParams}
        onChange={onFlippedChange}
      />

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
