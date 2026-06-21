import { useTranslation } from 'react-i18next'
import type { MateAlignment, MateEntityRef } from '../../features/assembly-mates/model'
import { matePairKind, matePairSupportsAlignment } from '../../features/assembly-mates/model'
import { isMateLineRef, isMatePlaneEntityRef, isMateVertexRef } from '../../features/assembly-mates/mateEntityRef'
import type { MatesPickSlot } from '../../features/assembly-mates/matesPickMode'
import type { MateDraftApplyState } from '../../features/assembly-mates/mateDraft'
import styles from './MatesPopup.module.css'

export type ParallelMateControlsProps = {
  entityA: MateEntityRef | null
  entityB: MateEntityRef | null
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

function entitySummary(
  entity: MateEntityRef | null,
  partNameById: Readonly<Record<string, string>>,
  emptyLabel: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  if (!entity) return emptyLabel
  const name = partNameById[entity.partId] ?? entity.partId
  if (isMateVertexRef(entity)) {
    return t('mates.vertex.summary', { name })
  }
  if (isMateLineRef(entity)) {
    return t('mates.edge.summary', { name })
  }
  if (isMatePlaneEntityRef(entity)) {
    return t('mates.face.summary', { name, count: entity.faceIndices.length })
  }
  return emptyLabel
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
  const entitiesLocked = applyState === 'applied'
  const canEditMateParams = entityA !== null && entityB !== null
  const showAlignment =
    entityA !== null && entityB !== null && matePairSupportsAlignment(matePairKind(entityA, entityB))
  const notSelectedLabel = t('mates.entity.notSelected')

  return (
    <div className={styles.controls}>
      <div className={styles.planeRow}>
        <span className={styles.planeLabel}>{t('mates.entity.first')}</span>
        <span
          className={`${styles.planeSummary} ${!entityA ? styles.planeSummaryMuted : ''}`}
        >
          {entitySummary(entityA, partNameById, notSelectedLabel, t)}
        </span>
        <button
          type="button"
          className={`${styles.pickBtn} ${activePickSlot === 'entityA' ? styles.pickBtnActive : ''}`}
          disabled={entitiesLocked}
          onClick={() => onStartPick('entityA')}
        >
          {entityA ? t('mates.entity.redefine') : t('mates.entity.pick')}
        </button>
      </div>

      <div className={styles.planeRow}>
        <span className={styles.planeLabel}>{t('mates.entity.second')}</span>
        <span
          className={`${styles.planeSummary} ${!entityB ? styles.planeSummaryMuted : ''}`}
        >
          {entitySummary(entityB, partNameById, notSelectedLabel, t)}
        </span>
        <button
          type="button"
          className={`${styles.pickBtn} ${activePickSlot === 'entityB' ? styles.pickBtnActive : ''}`}
          disabled={entitiesLocked}
          onClick={() => onStartPick('entityB')}
        >
          {entityB ? t('mates.entity.redefine') : t('mates.entity.pick')}
        </button>
      </div>

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
