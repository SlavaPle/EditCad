import { useTranslation } from 'react-i18next'
import type { MateEntityRef } from '../../features/assembly-mates/model'
import {
  isMateLineRef,
  isMatePlaneEntityRef,
  isMateVertexRef,
} from '../../features/assembly-mates/mateEntityRef'
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

function FaceGlyph() {
  return (
    <svg viewBox="0 0 16 16" className={styles.entityGlyph} aria-hidden>
      <path
        d="M2 11 L8 5 L14 11 L8 14 Z"
        fill="currentColor"
        fillOpacity="0.35"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function EdgeGlyph() {
  return (
    <svg viewBox="0 0 16 16" className={styles.entityGlyph} aria-hidden>
      <line x1="3" y1="12" x2="13" y2="4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="3" cy="12" r="1.4" fill="currentColor" />
      <circle cx="13" cy="4" r="1.4" fill="currentColor" />
    </svg>
  )
}

function VertexGlyph() {
  return (
    <svg viewBox="0 0 16 16" className={styles.entityGlyph} aria-hidden>
      <circle cx="8" cy="8" r="2.2" fill="currentColor" />
      <circle
        cx="8"
        cy="8"
        r="5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeOpacity="0.45"
      />
    </svg>
  )
}

function EmptyGlyph() {
  return (
    <svg viewBox="0 0 16 16" className={styles.entityGlyph} aria-hidden>
      <rect
        x="2.5"
        y="2.5"
        width="11"
        height="11"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeDasharray="2.5 2"
      />
    </svg>
  )
}

function entityGlyph(entity: MateEntityRef | null) {
  if (!entity) return <EmptyGlyph />
  if (isMateVertexRef(entity)) return <VertexGlyph />
  if (isMateLineRef(entity)) return <EdgeGlyph />
  if (isMatePlaneEntityRef(entity)) return <FaceGlyph />
  return <EmptyGlyph />
}

function entityKindLabel(entity: MateEntityRef | null, t: (key: string) => string): string {
  if (!entity) return t('mates.entity.kindEmpty')
  if (isMateVertexRef(entity)) return t('mates.entity.kindVertex')
  if (isMateLineRef(entity)) return t('mates.entity.kindEdge')
  return t('mates.entity.kindFace')
}

function EntitySlot({
  slot,
  indexLabel,
  entity,
  active,
  partNameById,
  onStartPick,
}: {
  slot: MatesPickSlot
  indexLabel: string
  entity: MateEntityRef | null
  active: boolean
  partNameById: Readonly<Record<string, string>>
  onStartPick: (slot: MatesPickSlot) => void
}) {
  const { t } = useTranslation()
  const empty = entity === null
  const title = empty
    ? t('mates.entity.notSelected')
    : (partNameById[entity.partId] ?? entity.partId)

  return (
    <div
      className={[
        styles.entitySlot,
        active ? styles.entitySlotActive : '',
        empty ? styles.entitySlotEmpty : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={styles.entitySlotIndex} aria-hidden>
        {indexLabel}
      </div>
      <div className={styles.entitySlotIcon}>{entityGlyph(entity)}</div>
      <div className={styles.entitySlotBody}>
        <div className={styles.entitySlotKind}>{entityKindLabel(entity, t)}</div>
        <div className={`${styles.entitySlotTitle} ${empty ? styles.entitySlotTitleMuted : ''}`}>
          {title}
        </div>
        {empty && <div className={styles.entitySlotMeta}>{t('mates.entity.pickHintShort')}</div>}
      </div>
      <button
        type="button"
        className={`${styles.entitySlotPick} ${active ? styles.entitySlotPickActive : ''}`}
        onClick={() => onStartPick(slot)}
      >
        {entity ? t('mates.entity.redefine') : t('mates.entity.pick')}
      </button>
    </div>
  )
}

export function MateEntityPickRows({
  entityA,
  entityB,
  activePickSlot,
  partNameById,
  onStartPick,
}: MateEntityPickRowsProps) {
  const { t } = useTranslation()

  return (
    <div className={styles.entitySlots}>
      <div className={styles.entitySlotsHeader}>{t('mates.entity.selection')}</div>
      <EntitySlot
        slot="entityA"
        indexLabel="1"
        entity={entityA}
        active={activePickSlot === 'entityA'}
        partNameById={partNameById}
        onStartPick={onStartPick}
      />
      <EntitySlot
        slot="entityB"
        indexLabel="2"
        entity={entityB}
        active={activePickSlot === 'entityB'}
        partNameById={partNameById}
        onStartPick={onStartPick}
      />
    </div>
  )
}
