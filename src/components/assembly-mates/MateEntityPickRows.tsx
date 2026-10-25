import { useTranslation } from 'react-i18next'
import type { MateEntityRef } from '../../features/assembly-mates/model'
import { isMateLineRef, isMatePlaneEntityRef, isMateVertexRef } from '../../features/assembly-mates/mateEntityRef'
import type { MatesPickSlot } from '../../features/assembly-mates/matesPickMode'
import type { MateDraftApplyState } from '../../features/assembly-mates/mateDraft'
import styles from './MatesPopup.module.css'

export type MateEntityPickRowsProps = {
  entityA: MateEntityRef | null
  entityB: MateEntityRef | null
  applyState: MateDraftApplyState
  activePickSlot: MatesPickSlot | null
  partNameById: Readonly<Record<string, string>>
  onStartPick: (slot: MatesPickSlot) => void
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

export function MateEntityPickRows({
  entityA,
  entityB,
  applyState,
  activePickSlot,
  partNameById,
  onStartPick,
}: MateEntityPickRowsProps) {
  const { t } = useTranslation()
  const entitiesLocked = applyState === 'applied'
  const notSelectedLabel = t('mates.entity.notSelected')

  return (
    <>
      <div className={styles.planeRow}>
        <span className={styles.planeLabel}>{t('mates.entity.first')}</span>
        <span className={`${styles.planeSummary} ${!entityA ? styles.planeSummaryMuted : ''}`}>
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
        <span className={`${styles.planeSummary} ${!entityB ? styles.planeSummaryMuted : ''}`}>
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
    </>
  )
}
