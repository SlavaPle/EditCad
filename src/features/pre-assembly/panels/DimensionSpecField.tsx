import { useTranslation } from 'react-i18next'
import type { DimensionSpec, PhantomParameter } from '../model'
import styles from './PreAssemblyPanels.module.css'

export type DimensionSpecFieldProps = {
  id: string
  label: string
  value: DimensionSpec
  parameters: readonly PhantomParameter[]
  onChange: (next: DimensionSpec) => void
}

function parseLiteralMm(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

export function DimensionSpecField({
  id,
  label,
  value,
  parameters,
  onChange,
}: DimensionSpecFieldProps) {
  const { t } = useTranslation()
  const isLiteral = typeof value === 'number'
  const literalValue = isLiteral ? String(value) : ''
  const paramId = !isLiteral ? value.paramId : parameters[0]?.id ?? ''

  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={`${id}-literal`}>
        {label}
      </label>
      <div className={styles.dimensionModeRow}>
        <button
          type="button"
          className={`${styles.modeBtn}${isLiteral ? ` ${styles.modeBtnActive}` : ''}`}
          onClick={() => {
            const fallback = typeof value === 'number' ? value : 0
            onChange(fallback)
          }}
        >
          {t('preAssembly.panels.dimension.modeLiteral')}
        </button>
        <button
          type="button"
          className={`${styles.modeBtn}${!isLiteral ? ` ${styles.modeBtnActive}` : ''}`}
          onClick={() => {
            const nextParamId =
              typeof value === 'number' ? (parameters[0]?.id ?? 'param') : value.paramId
            onChange({ paramId: nextParamId })
          }}
          disabled={parameters.length === 0}
          title={parameters.length === 0 ? t('preAssembly.panels.dimension.noParameters') : undefined}
        >
          {t('preAssembly.panels.dimension.modeParam')}
        </button>
      </div>
      {isLiteral ? (
        <div className={styles.fieldRow}>
          <input
            id={`${id}-literal`}
            className={styles.fieldInput}
            type="text"
            inputMode="decimal"
            value={literalValue}
            onChange={(e) => {
              const n = parseLiteralMm(e.target.value)
              if (n !== null) onChange(n)
            }}
          />
          <span className={styles.fieldUnit}>mm</span>
        </div>
      ) : (
        <select
          id={`${id}-param`}
          className={styles.fieldSelect}
          value={paramId}
          onChange={(e) => onChange({ paramId: e.target.value })}
        >
          {parameters.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name?.trim() || p.id}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
