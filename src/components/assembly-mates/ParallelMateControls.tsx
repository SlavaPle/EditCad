import { useEffect, useRef } from 'react'
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
  canApply: boolean
  canSave: boolean
  onAlignmentChange: (alignment: MateAlignment) => void
  onOffsetChange: (value: string) => void
  onStartPick: (slot: MatesPickSlot) => void
  onApply: () => void
  onRevert: () => void
  onSave: () => void
  onSaveAndClose: () => void
  applyFocusToken?: number
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
  canApply,
  canSave,
  onAlignmentChange,
  onOffsetChange,
  onStartPick,
  onApply,
  onRevert,
  onSave,
  onSaveAndClose,
  applyFocusToken = 0,
}: ParallelMateControlsProps) {
  const { t } = useTranslation()
  const applyBtnRef = useRef<HTMLButtonElement>(null)
  const pickLocked = applyState === 'applied'

  useEffect(() => {
    if (applyFocusToken === 0 || !canApply || pickLocked) return
    applyBtnRef.current?.focus({ preventScroll: false })
    applyBtnRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [applyFocusToken, canApply, pickLocked])

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
          disabled={pickLocked}
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
          disabled={pickLocked}
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
          disabled={pickLocked}
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
            disabled={pickLocked}
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
        {applyState === 'applied' ? (
          <button type="button" className={styles.actionBtn} onClick={onRevert}>
            {t('mates.actions.revert')}
          </button>
        ) : (
          <button
            ref={applyBtnRef}
            type="button"
            className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
            disabled={!canApply}
            onClick={onApply}
          >
            {t('mates.actions.apply')}
          </button>
        )}
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
