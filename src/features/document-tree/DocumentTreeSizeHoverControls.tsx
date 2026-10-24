import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  alignSizeSliderBounds,
  getProgramSettings,
  resolveSizeStepMm,
  snapSizeMmToStep,
} from '../app-settings'
import type { FaceConstraintType } from '../face-constraints/model'
import { clampSizeEditValue } from './clampSizeEditValue'
import type { SizeEditApplyPayload } from './sizeEditApplyPayload'
import styles from './DocumentTree.module.css'

export type DocumentTreeSizeHoverControlsProps = {
  initialMm: number | null
  limitMinMm?: number | null
  limitMaxMm?: number | null
  limitType: FaceConstraintType | 'free'
  disabled?: boolean
  onApply: (payload: SizeEditApplyPayload) => void
}

function parseMm(text: string): number | null {
  const n = Number(text.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/**
 * Kompaktowe pole wartości + slider przy hover na węźle size.
 * Pełny panel limitów — nadal przez dblclick / menu.
 */
export function DocumentTreeSizeHoverControls({
  initialMm,
  limitMinMm,
  limitMaxMm,
  limitType,
  disabled,
  onApply,
}: DocumentTreeSizeHoverControlsProps) {
  const { t } = useTranslation()
  const [text, setText] = useState(
    initialMm != null && Number.isFinite(initialMm) ? String(initialMm) : '',
  )

  useEffect(() => {
    setText(initialMm != null && Number.isFinite(initialMm) ? String(initialMm) : '')
  }, [initialMm])

  const minMm = limitMinMm ?? undefined
  const maxMm = limitMaxMm ?? undefined
  const currentMm = parseMm(text) ?? (initialMm != null && initialMm > 0 ? initialMm : 10)
  const sizeStepMm = resolveSizeStepMm(currentMm)
  const finestStep = getProgramSettings().sizeStepExtraFineMm
  const base = initialMm != null && initialMm > 0 ? initialMm : 10
  const rawMin =
    limitType === 'minmax' && minMm != null && Number.isFinite(minMm)
      ? Math.max(0, minMm)
      : Math.max(finestStep, base * 0.25)
  const rawMax =
    limitType === 'minmax' && maxMm != null && Number.isFinite(maxMm) && maxMm > rawMin
      ? maxMm
      : Math.max(rawMin + sizeStepMm, base * 2)
  const { min: sliderMin, max: sliderMax } = alignSizeSliderBounds(rawMin, rawMax, finestStep)

  const snapAdaptive = (raw: number) => snapSizeMmToStep(raw, resolveSizeStepMm(raw))

  const commit = (raw: number) => {
    const snapped = snapAdaptive(raw)
    const clamped = clampSizeEditValue({
      value: snapped,
      limitType,
      minMm,
      maxMm,
    })
    if (clamped == null) return
    const valueMm = snapAdaptive(clamped)
    setText(String(valueMm))
    onApply({
      valueMm,
      limitType,
      minMm,
      maxMm,
    })
  }

  return (
    <div
      className={styles.sizeHoverControls}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <input
        className={[
          styles.sizeEditInput,
          limitType !== 'free' ? styles.sizeEditInputMuted : '',
        ]
          .filter(Boolean)
          .join(' ')}
        type="text"
        inputMode="decimal"
        disabled={disabled}
        aria-label={t('documentTree.size.valueAria')}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return
          e.preventDefault()
          const v = parseMm(text)
          if (v != null) commit(v)
        }}
        onBlur={() => {
          const v = parseMm(text)
          if (v != null && v !== initialMm) commit(v)
        }}
      />
      {!disabled ? (
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
          onChange={(e) => {
            setText(String(snapAdaptive(Number(e.target.value))))
          }}
          onMouseUp={(e) => {
            commit(Number((e.target as HTMLInputElement).value))
          }}
        />
      ) : null}
    </div>
  )
}
