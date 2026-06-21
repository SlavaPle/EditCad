import { useTranslation } from 'react-i18next'
import type { MateAlignment, MatePlaneRef } from '../../features/assembly-mates/model'
import type { MatesPickSlot } from '../../features/assembly-mates/matesPickMode'
import type { MateDraftApplyState } from '../../features/assembly-mates/mateDraft'
import styles from './MatesPopup.module.css'

export type ParallelMateControlsProps = {
  planeA: MatePlaneRef | null
  planeB: MatePlaneRef | null
  alignment: MateAlignment
  offsetMm: string
  applyState: MateDraftApplyState
  activePickSlot: MatesPickSlot | null
  partNameById: Readonly<Record<string, string>>
  solverErrorKey: string | null
  canSave: boolean
  onAlignmentChange: (alignment: MateAlignment) => void
  onOffsetChange: (value: string) => void
  onStartPick: (slot: MatesPickSlot) => void
  onSave: () => void
  onSaveAndClose: () => void
}

function planeSummary(
  plane: MatePlaneRef | null,
  partNameById: Readonly<Record<string, string>>,
  emptyLabel: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  if (!plane) return emptyLabel
  const name = partNameById[plane.partId] ?? plane.partId
  return t('mates.plane.summary', { name, count: plane.faceIndices.length })
}

export function ParallelMateControls({
  planeA,
  planeB,
  alignment,
  offsetMm,
  applyState,
  activePickSlot,
  partNameById,
  solverErrorKey,
  canSave,
  onAlignmentChange,
  onOffsetChange,
  onStartPick,
  onSave,
  onSaveAndClose,
}: ParallelMateControlsProps) {
  const { t } = useTranslation()
  const planesLocked = applyState === 'applied'
  const canEditMateParams = planeA !== null && planeB !== null

  return (
    <div className={styles.controls}>
      <div className={styles.planeRow}>
        <span className={styles.planeLabel}>{t('mates.plane.first')}</span>
        <span
          className={`${styles.planeSummary} ${!planeA ? styles.planeSummaryMuted : ''}`}
        >
          {planeSummary(planeA, partNameById, t('mates.plane.notSelected'), t)}
        </span>
        <button
          type="button"
          className={`${styles.pickBtn} ${activePickSlot === 'planeA' ? styles.pickBtnActive : ''}`}
          disabled={planesLocked}
          onClick={() => onStartPick('planeA')}
        >
          {planeA ? t('mates.plane.redefine') : t('mates.plane.pick')}
        </button>
      </div>

      <div className={styles.planeRow}>
        <span className={styles.planeLabel}>{t('mates.plane.second')}</span>
        <span
          className={`${styles.planeSummary} ${!planeB ? styles.planeSummaryMuted : ''}`}
        >
          {planeSummary(planeB, partNameById, t('mates.plane.notSelected'), t)}
        </span>
        <button
          type="button"
          className={`${styles.pickBtn} ${activePickSlot === 'planeB' ? styles.pickBtnActive : ''}`}
          disabled={planesLocked}
          onClick={() => onStartPick('planeB')}
        >
          {planeB ? t('mates.plane.redefine') : t('mates.plane.pick')}
        </button>
      </div>

      <div className={styles.fieldRow}>
        <label className={styles.planeLabel} htmlFor="mate-alignment">
          {t('mates.alignment.label')}
        </label>
        <select
          id="mate-alignment"
          className={styles.select}
          value={alignment}
          disabled={!canEditMateParams}
          onChange={(e) => onAlignmentChange(e.target.value as MateAlignment)}
        >
          <option value="faceToFace">{t('mates.alignment.faceToFace')}</option>
          <option value="sameDirection">{t('mates.alignment.sameDirection')}</option>
        </select>
      </div>

      <div className={styles.fieldRow}>
        <label className={styles.planeLabel} htmlFor="mate-offset">
          {t('mates.distance.label')}
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

      {activePickSlot && (
        <p className={styles.hint}>{t('mates.pickHint')}</p>
      )}

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
