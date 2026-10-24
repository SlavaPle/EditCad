import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  alignSizeSliderBounds,
  getProgramSettings,
  resolveSizeStepMm,
  snapSizeMmToStep,
} from '../app-settings'
import type { FaceConstraintType } from '../face-constraints/model'
import {
  clampSizeEditValue,
  isSizeValueFieldDisabled,
  isSizeValueFieldMuted,
} from './clampSizeEditValue'
import type { SizeEditApplyPayload } from './sizeEditApplyPayload'
import styles from './DocumentTree.module.css'

const LIMIT_TYPES: FaceConstraintType[] = ['minmax', 'const', 'min', 'max']

export type DocumentTreeSizeEditPanelProps = {
  initialMm: number | null
  initialMinMm?: number | null
  initialMaxMm?: number | null
  constraintType: FaceConstraintType | 'free'
  constraintId?: string
  onApply: (payload: SizeEditApplyPayload) => void
  onCancel: () => void
  onRemoveLimit?: () => void
}

function parseMm(text: string): number | null {
  const n = Number(text.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Inline edycja wartości mm + limity (min/max) + slider w zakresie minmax. */
export function DocumentTreeSizeEditPanel({
  initialMm,
  initialMinMm,
  initialMaxMm,
  constraintType,
  constraintId,
  onApply,
  onCancel,
  onRemoveLimit,
}: DocumentTreeSizeEditPanelProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [limitType, setLimitType] = useState<FaceConstraintType | 'free'>(
    constraintType === 'block' || constraintType === 'panel' || constraintType === 'profil'
      ? 'free'
      : constraintType,
  )
  const [minText, setMinText] = useState(
    initialMinMm != null && Number.isFinite(initialMinMm) ? String(initialMinMm) : '0',
  )
  const [maxText, setMaxText] = useState(
    initialMaxMm != null && Number.isFinite(initialMaxMm) ? String(initialMaxMm) : '',
  )
  const [text, setText] = useState(
    initialMm != null && Number.isFinite(initialMm) ? String(initialMm) : '',
  )

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const minMm = parseMm(minText)
  const maxMm = parseMm(maxText)
  const muted = isSizeValueFieldMuted(limitType)
  const disabled = isSizeValueFieldDisabled(limitType)
  const showMinMax = limitType === 'minmax'
  const showMinOnly = limitType === 'min'
  const showMaxOnly = limitType === 'max'
  const currentMm = parseMm(text) ?? (initialMm != null && initialMm > 0 ? initialMm : 10)
  const sizeStepMm = resolveSizeStepMm(currentMm)
  const finestStep = getProgramSettings().sizeStepExtraFineMm
  const rawSliderMin = minMm != null && minMm >= 0 ? minMm : 0
  const rawSliderMax =
    maxMm != null && maxMm > rawSliderMin
      ? maxMm
      : Math.max(rawSliderMin + sizeStepMm, (initialMm ?? 10) * 2)
  const { min: sliderMin, max: sliderMax } = alignSizeSliderBounds(
    Math.max(finestStep, rawSliderMin),
    rawSliderMax,
    finestStep,
  )
  const canSlider = limitType === 'minmax' && sliderMax > sliderMin
  const canRemove =
    Boolean(constraintId) &&
    onRemoveLimit != null &&
    (limitType === 'min' ||
      limitType === 'max' ||
      limitType === 'minmax' ||
      limitType === 'const')

  const snapAdaptive = (raw: number) => snapSizeMmToStep(raw, resolveSizeStepMm(raw))

  const setClampedText = (raw: number) => {
    const snapped = snapAdaptive(raw)
    const clamped = clampSizeEditValue({
      value: snapped,
      limitType,
      minMm: minMm ?? undefined,
      maxMm: maxMm ?? undefined,
    })
    if (clamped == null) return
    setText(String(snapAdaptive(clamped)))
  }

  const commit = () => {
    const raw = parseMm(text)
    if (raw == null) return
    const snapped = snapAdaptive(raw)
    const clamped = clampSizeEditValue({
      value: snapped,
      limitType,
      minMm: minMm ?? undefined,
      maxMm: maxMm ?? undefined,
    })
    if (clamped == null) return
    const valueMm = snapAdaptive(clamped)
    if (disabled) {
      // CONST: tylko zapis limitu bez zmiany geometrii wartości — value = current
      onApply({
        valueMm,
        limitType,
        minMm: minMm ?? undefined,
        maxMm: maxMm ?? undefined,
      })
      return
    }
    onApply({
      valueMm,
      limitType,
      minMm: showMinMax || showMinOnly ? (minMm ?? undefined) : undefined,
      maxMm: showMinMax || showMaxOnly ? (maxMm ?? undefined) : undefined,
    })
  }

  return (
    <div className={styles.sizeEditPanel} onClick={(e) => e.stopPropagation()}>
      <input
        ref={inputRef}
        className={[
          styles.sizeEditInput,
          muted ? styles.sizeEditInputMuted : '',
        ]
          .filter(Boolean)
          .join(' ')}
        type="text"
        inputMode="decimal"
        aria-label={t('documentTree.size.valueAria')}
        title={muted ? t('documentTree.size.valueWithinLimitsHint') : undefined}
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const raw = parseMm(text)
          if (raw != null) setClampedText(raw)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          }
          if (e.key === 'Escape') {
            e.preventDefault()
            onCancel()
          }
        }}
      />
      {canSlider ? (
        <input
          type="range"
          className={styles.sizeEditSlider}
          min={sliderMin}
          max={sliderMax}
          step={sizeStepMm}
          aria-label={t('documentTree.size.sliderAria')}
          value={(() => {
            const v = parseMm(text)
            if (v == null) return sliderMin
            return Math.min(sliderMax, Math.max(sliderMin, v))
          })()}
          onChange={(e) => setClampedText(Number(e.target.value))}
        />
      ) : null}
      <label className={styles.sizeEditLimitRow}>
        <span className={styles.sizeEditLimitLabel}>{t('documentTree.size.limitLabel')}</span>
        <select
          className={styles.sizeEditLimitSelect}
          value={limitType}
          onChange={(e) => setLimitType(e.target.value as FaceConstraintType | 'free')}
        >
          <option value="free">{t('documentTree.size.limitFree')}</option>
          {LIMIT_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`documentTree.size.limitType.${type}`)}
            </option>
          ))}
        </select>
      </label>
      {showMinMax ? (
        <div className={styles.sizeEditBoundsRow}>
          <label className={styles.sizeEditBoundField}>
            <span>{t('documentTree.size.minLabel')}</span>
            <input
              className={styles.sizeEditInput}
              type="text"
              inputMode="decimal"
              value={minText}
              onChange={(e) => setMinText(e.target.value)}
            />
          </label>
          <label className={styles.sizeEditBoundField}>
            <span>{t('documentTree.size.maxLabel')}</span>
            <input
              className={styles.sizeEditInput}
              type="text"
              inputMode="decimal"
              value={maxText}
              onChange={(e) => setMaxText(e.target.value)}
            />
          </label>
        </div>
      ) : null}
      {showMinOnly ? (
        <label className={styles.sizeEditBoundField}>
          <span>{t('documentTree.size.minLabel')}</span>
          <input
            className={styles.sizeEditInput}
            type="text"
            inputMode="decimal"
            value={minText}
            onChange={(e) => setMinText(e.target.value)}
          />
        </label>
      ) : null}
      {showMaxOnly ? (
        <label className={styles.sizeEditBoundField}>
          <span>{t('documentTree.size.maxLabel')}</span>
          <input
            className={styles.sizeEditInput}
            type="text"
            inputMode="decimal"
            value={maxText}
            onChange={(e) => setMaxText(e.target.value)}
          />
        </label>
      ) : null}
      <div className={styles.sizeEditActions}>
        <button type="button" className={styles.sizeEditBtn} onClick={commit}>
          {t('documentTree.size.apply')}
        </button>
        <button type="button" className={styles.sizeEditBtnSecondary} onClick={onCancel}>
          {t('documentTree.size.cancel')}
        </button>
      </div>
      {canRemove ? (
        <button
          type="button"
          className={styles.sizeEditRemoveLimit}
          onClick={() => onRemoveLimit?.()}
        >
          {t('documentTree.size.removeLimit')}
        </button>
      ) : null}
    </div>
  )
}
