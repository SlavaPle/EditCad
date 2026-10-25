import { useTranslation } from 'react-i18next'
import type { MateEntityRef } from '../../features/assembly-mates/model'
import type { MatesPickSlot } from '../../features/assembly-mates/matesPickMode'
import type { MateDraftApplyState } from '../../features/assembly-mates/mateDraft'
import { MateEntityPickRows } from './MateEntityPickRows'
import { MateFlipSelect } from './MateFlipSelect'
import styles from './MatesPopup.module.css'

export type AngularMateControlsProps = {
  entityA: MateEntityRef | null
  entityB: MateEntityRef | null
  angleDeg: string
  flipped: boolean
  applyState: MateDraftApplyState
  activePickSlot: MatesPickSlot | null
  partNameById: Readonly<Record<string, string>>
  solverErrorKey: string | null
  canSave: boolean
  onAngleChange: (value: string) => void
  onFlippedChange: (flipped: boolean) => void
  onStartPick: (slot: MatesPickSlot) => void
  onSave: () => void
  onSaveAndClose: () => void
}

export function AngularMateControls({
  entityA,
  entityB,
  angleDeg,
  flipped,
  applyState,
  activePickSlot,
  partNameById,
  solverErrorKey,
  canSave,
  onAngleChange,
  onFlippedChange,
  onStartPick,
  onSave,
  onSaveAndClose,
}: AngularMateControlsProps) {
  const { t } = useTranslation()
  const canEditMateParams = entityA !== null && entityB !== null

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

      <div className={styles.fieldRow}>
        <label className={styles.planeLabel} htmlFor="mate-angle">
          {t('mates.angle.label')}
        </label>
        <div className={styles.inputWrap}>
          <input
            id="mate-angle"
            className={styles.input}
            type="text"
            inputMode="decimal"
            value={angleDeg}
            disabled={!canEditMateParams}
            onChange={(e) => onAngleChange(e.target.value)}
          />
          <span className={styles.unit}>{t('mates.angle.unit')}</span>
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
