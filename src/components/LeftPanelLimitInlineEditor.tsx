import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  ConstFaceConstraint,
  FaceConstraint,
  MaxFaceConstraint,
  MinFaceConstraint,
  MinMaxFaceConstraint,
  PanelAxisBounds,
  PanelFaceConstraint,
  ProfilFaceConstraint,
} from '../features/face-constraints/model'
import { validateFaceConstraint } from '../features/face-constraints/model'
import { parsePositiveMm } from '../lib/parsePositiveMm'
import styles from './LeftPanel.module.css'

export type LeftPanelLimitInlineEditorProps = {
  constraint: FaceConstraint
  onSave: (next: FaceConstraint) => void
  onDelete: () => void
}

export function LeftPanelLimitInlineEditor({ constraint: c, onSave, onDelete }: LeftPanelLimitInlineEditorProps) {
  const { t } = useTranslation()

  if (c.type === 'block') {
    return (
      <div className={styles.limitEditor}>
        <div className={styles.limitEditorTitle}>{t('leftPanel.limits.editTitle')}</div>
        <p className={styles.limitEditorHint}>{t('leftPanel.limits.editBlockHint')}</p>
        <button type="button" className={styles.limitEditorDelete} onClick={onDelete}>
          {t('leftPanel.limits.deleteLimit')}
        </button>
      </div>
    )
  }

  if (c.type === 'min' || c.type === 'max') {
    return <ScalarLimitEditor constraint={c} onSave={onSave} onDelete={onDelete} />
  }

  if (c.type === 'minmax') {
    return <MinMaxLimitEditor constraint={c} onSave={onSave} onDelete={onDelete} />
  }

  if (c.type === 'const') {
    return <ScalarLimitEditor constraint={c} onSave={onSave} onDelete={onDelete} />
  }

  if (c.type === 'profil') {
    return <ProfilLimitEditor constraint={c} onSave={onSave} onDelete={onDelete} />
  }

  if (c.type === 'panel') {
    return <PanelLimitEditor constraint={c} onSave={onSave} onDelete={onDelete} />
  }

  return null
}

function MinMaxLimitEditor({
  constraint: c,
  onSave,
  onDelete,
}: {
  constraint: MinMaxFaceConstraint
  onSave: (next: FaceConstraint) => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  const [useMin, setUseMin] = useState(c.minMm > 1e-9)
  const [minStr, setMinStr] = useState(c.minMm > 1e-9 ? String(c.minMm) : '')
  const [maxStr, setMaxStr] = useState(String(c.maxMm))
  const [error, setError] = useState<string | null>(null)

  const handleSave = useCallback(() => {
    const maxMm = parsePositiveMm(maxStr)
    if (maxMm === null) {
      setError(t('leftPanel.limits.editInvalidValue'))
      return
    }
    let minMm = 0
    if (useMin) {
      const parsedMin = parsePositiveMm(minStr)
      if (parsedMin === null) {
        setError(t('leftPanel.limits.editInvalidValue'))
        return
      }
      minMm = parsedMin
    }
    if (minMm > maxMm + 1e-9) {
      setError(t('leftPanel.limits.editRangeOrder'))
      return
    }
    const next: MinMaxFaceConstraint = { ...c, minMm, maxMm }
    if (!validateFaceConstraint(next)) {
      setError(t('leftPanel.limits.editInvalid'))
      return
    }
    setError(null)
    onSave(next)
  }, [c, useMin, minStr, maxStr, onSave, t])

  return (
    <div className={styles.limitEditor}>
      <div className={styles.limitEditorTitle}>{t('leftPanel.limits.editTitle')}</div>
      <label className={styles.limitEditorCheck}>
        <input type="checkbox" checked={useMin} onChange={(e) => setUseMin(e.target.checked)} />
        {t('leftPanel.limits.editMinMaxUseMin')}
      </label>
      {useMin && (
        <>
          <label className={styles.limitEditorLabel} htmlFor="limit-edit-minmax-min">
            {t('leftPanel.limits.editMinMaxMin')}
          </label>
          <div className={styles.limitEditorRow}>
            <input
              id="limit-edit-minmax-min"
              className={styles.limitEditorInput}
              type="text"
              inputMode="decimal"
              value={minStr}
              onChange={(e) => setMinStr(e.target.value)}
              aria-invalid={Boolean(error)}
            />
            <span className={styles.limitEditorUnit}>mm</span>
          </div>
        </>
      )}
      <label className={styles.limitEditorLabel} htmlFor="limit-edit-minmax-max">
        {t('leftPanel.limits.editMinMaxMax')}
      </label>
      <div className={styles.limitEditorRow}>
        <input
          id="limit-edit-minmax-max"
          className={styles.limitEditorInput}
          type="text"
          inputMode="decimal"
          value={maxStr}
          onChange={(e) => setMaxStr(e.target.value)}
          aria-invalid={Boolean(error)}
        />
        <span className={styles.limitEditorUnit}>mm</span>
      </div>
      {error && (
        <p className={styles.limitEditorError} role="alert">
          {error}
        </p>
      )}
      <div className={styles.limitEditorActions}>
        <button type="button" className={styles.limitEditorApply} onClick={handleSave}>
          {t('leftPanel.limits.saveChanges')}
        </button>
        <button type="button" className={styles.limitEditorDelete} onClick={onDelete}>
          {t('leftPanel.limits.deleteLimit')}
        </button>
      </div>
    </div>
  )
}

function ScalarLimitEditor({
  constraint,
  onSave,
  onDelete,
}: {
  constraint: MinFaceConstraint | MaxFaceConstraint | ConstFaceConstraint
  onSave: (next: FaceConstraint) => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  const [valueStr, setValueStr] = useState(String(constraint.valueMm))
  const [error, setError] = useState<string | null>(null)

  const handleSave = useCallback(() => {
    const n = parsePositiveMm(valueStr)
    if (n === null) {
      setError(t('leftPanel.limits.editInvalidValue'))
      return
    }
    const next = { ...constraint, valueMm: n } as FaceConstraint
    if (!validateFaceConstraint(next)) {
      setError(t('leftPanel.limits.editInvalid'))
      return
    }
    setError(null)
    onSave(next)
  }, [constraint, valueStr, onSave, t])

  return (
    <div className={styles.limitEditor}>
      <div className={styles.limitEditorTitle}>{t('leftPanel.limits.editTitle')}</div>
      <label className={styles.limitEditorLabel} htmlFor="limit-edit-mm">
        {t('leftPanel.limits.editValueMm')}
      </label>
      <div className={styles.limitEditorRow}>
        <input
          id="limit-edit-mm"
          className={styles.limitEditorInput}
          type="text"
          inputMode="decimal"
          value={valueStr}
          onChange={(e) => setValueStr(e.target.value)}
          aria-invalid={Boolean(error)}
        />
        <span className={styles.limitEditorUnit}>mm</span>
      </div>
      {error && (
        <p className={styles.limitEditorError} role="alert">
          {error}
        </p>
      )}
      <div className={styles.limitEditorActions}>
        <button type="button" className={styles.limitEditorApply} onClick={handleSave}>
          {t('leftPanel.limits.saveChanges')}
        </button>
        <button type="button" className={styles.limitEditorDelete} onClick={onDelete}>
          {t('leftPanel.limits.deleteLimit')}
        </button>
      </div>
    </div>
  )
}

function ProfilLimitEditor({
  constraint: c,
  onSave,
  onDelete,
}: {
  constraint: ProfilFaceConstraint
  onSave: (next: FaceConstraint) => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  const [maxStr, setMaxStr] = useState(String(c.valueMm))
  const [minOn, setMinOn] = useState(c.stretchMinMm !== undefined)
  const [minStr, setMinStr] = useState(c.stretchMinMm !== undefined ? String(c.stretchMinMm) : '')
  const [error, setError] = useState<string | null>(null)

  const handleSave = useCallback(() => {
    const maxN = parsePositiveMm(maxStr)
    if (maxN === null) {
      setError(t('leftPanel.limits.editInvalidValue'))
      return
    }
    let stretchMinMm: number | undefined
    if (minOn) {
      const minN = parsePositiveMm(minStr)
      if (minN === null) {
        setError(t('leftPanel.limits.editInvalidValue'))
        return
      }
      if (minN > maxN) {
        setError(t('leftPanel.limits.editRangeOrder'))
        return
      }
      stretchMinMm = minN
    }
    const next: ProfilFaceConstraint = {
      ...c,
      valueMm: maxN,
      stretchMinMm,
    }
    if (!validateFaceConstraint(next)) {
      setError(t('leftPanel.limits.editInvalid'))
      return
    }
    setError(null)
    onSave(next)
  }, [c, maxStr, minOn, minStr, onSave, t])

  return (
    <div className={styles.limitEditor}>
      <div className={styles.limitEditorTitle}>{t('leftPanel.limits.editTitle')}</div>
      <label className={styles.limitEditorLabel}>{t('leftPanel.limits.editProfilMaxGap')}</label>
      <div className={styles.limitEditorRow}>
        <input
          className={styles.limitEditorInput}
          type="text"
          inputMode="decimal"
          value={maxStr}
          onChange={(e) => setMaxStr(e.target.value)}
        />
        <span className={styles.limitEditorUnit}>mm</span>
      </div>
      <label className={styles.limitEditorCheck}>
        <input type="checkbox" checked={minOn} onChange={(e) => setMinOn(e.target.checked)} />
        {t('leftPanel.limits.editProfilUseMin')}
      </label>
      {minOn && (
        <div className={styles.limitEditorRow}>
          <input
            className={styles.limitEditorInput}
            type="text"
            inputMode="decimal"
            value={minStr}
            onChange={(e) => setMinStr(e.target.value)}
            placeholder={t('rightPanel.limits.profilMinStretchPlaceholder')}
          />
          <span className={styles.limitEditorUnit}>mm</span>
        </div>
      )}
      {error && (
        <p className={styles.limitEditorError} role="alert">
          {error}
        </p>
      )}
      <div className={styles.limitEditorActions}>
        <button type="button" className={styles.limitEditorApply} onClick={handleSave}>
          {t('leftPanel.limits.saveChanges')}
        </button>
        <button type="button" className={styles.limitEditorDelete} onClick={onDelete}>
          {t('leftPanel.limits.deleteLimit')}
        </button>
      </div>
    </div>
  )
}

function buildAxisBounds(maxStr: string, minOn: boolean, minStr: string): PanelAxisBounds | null {
  const maxN = parsePositiveMm(maxStr)
  if (maxN === null) return null
  if (!minOn) return { maxMm: maxN }
  const minN = parsePositiveMm(minStr)
  if (minN === null) return null
  if (minN > maxN) return null
  return { maxMm: maxN, minMm: minN }
}

function PanelLimitEditor({
  constraint: c,
  onSave,
  onDelete,
}: {
  constraint: PanelFaceConstraint
  onSave: (next: FaceConstraint) => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  const [thickStr, setThickStr] = useState(String(c.thicknessMm))
  const [xMaxStr, setXMaxStr] = useState(String(c.panelX.maxMm))
  const [xMinOn, setXMinOn] = useState(c.panelX.minMm !== undefined)
  const [xMinStr, setXMinStr] = useState(c.panelX.minMm !== undefined ? String(c.panelX.minMm) : '')
  const [yMaxStr, setYMaxStr] = useState(String(c.panelY.maxMm))
  const [yMinOn, setYMinOn] = useState(c.panelY.minMm !== undefined)
  const [yMinStr, setYMinStr] = useState(c.panelY.minMm !== undefined ? String(c.panelY.minMm) : '')
  const [error, setError] = useState<string | null>(null)

  const handleSave = useCallback(() => {
    const tMm = parsePositiveMm(thickStr)
    if (tMm === null) {
      setError(t('leftPanel.limits.editInvalidValue'))
      return
    }
    const panelX = buildAxisBounds(xMaxStr, xMinOn, xMinStr)
    if (!panelX) {
      setError(t('leftPanel.limits.editInvalidValue'))
      return
    }
    let panelY: PanelAxisBounds
    if (c.ySameAsX) {
      panelY =
        panelX.minMm === undefined ? { maxMm: panelX.maxMm } : { maxMm: panelX.maxMm, minMm: panelX.minMm }
    } else {
      const yB = buildAxisBounds(yMaxStr, yMinOn, yMinStr)
      if (!yB) {
        setError(t('leftPanel.limits.editInvalidValue'))
        return
      }
      panelY = yB
    }
    const next: PanelFaceConstraint = {
      ...c,
      thicknessMm: tMm,
      panelX,
      panelY,
    }
    if (!validateFaceConstraint(next)) {
      setError(t('leftPanel.limits.editInvalid'))
      return
    }
    setError(null)
    onSave(next)
  }, [c, thickStr, xMaxStr, xMinOn, xMinStr, yMaxStr, yMinOn, yMinStr, onSave, t])

  return (
    <div className={styles.limitEditor}>
      <div className={styles.limitEditorTitle}>{t('leftPanel.limits.editTitle')}</div>
      <label className={styles.limitEditorLabel}>{t('leftPanel.limits.editPanelThickness')}</label>
      <div className={styles.limitEditorRow}>
        <input
          className={styles.limitEditorInput}
          type="text"
          inputMode="decimal"
          value={thickStr}
          onChange={(e) => setThickStr(e.target.value)}
        />
        <span className={styles.limitEditorUnit}>mm</span>
      </div>
      <div className={styles.limitEditorSubtitle}>{t('leftPanel.limits.editPanelAxisX')}</div>
      <div className={styles.limitEditorRow}>
        <input
          className={styles.limitEditorInput}
          type="text"
          inputMode="decimal"
          value={xMaxStr}
          onChange={(e) => setXMaxStr(e.target.value)}
          placeholder={t('rightPanel.limits.panelMaxPlaceholder')}
        />
        <span className={styles.limitEditorUnit}>mm</span>
      </div>
      <label className={styles.limitEditorCheck}>
        <input type="checkbox" checked={xMinOn} onChange={(e) => setXMinOn(e.target.checked)} />
        {t('rightPanel.limits.panelRestrictMin')}
      </label>
      {xMinOn && (
        <div className={styles.limitEditorRow}>
          <input
            className={styles.limitEditorInput}
            type="text"
            inputMode="decimal"
            value={xMinStr}
            onChange={(e) => setXMinStr(e.target.value)}
            placeholder={t('rightPanel.limits.panelMinPlaceholder')}
          />
          <span className={styles.limitEditorUnit}>mm</span>
        </div>
      )}
      {!c.ySameAsX && (
        <>
          <div className={styles.limitEditorSubtitle}>{t('leftPanel.limits.editPanelAxisY')}</div>
          <div className={styles.limitEditorRow}>
            <input
              className={styles.limitEditorInput}
              type="text"
              inputMode="decimal"
              value={yMaxStr}
              onChange={(e) => setYMaxStr(e.target.value)}
              placeholder={t('rightPanel.limits.panelMaxPlaceholder')}
            />
            <span className={styles.limitEditorUnit}>mm</span>
          </div>
          <label className={styles.limitEditorCheck}>
            <input type="checkbox" checked={yMinOn} onChange={(e) => setYMinOn(e.target.checked)} />
            {t('rightPanel.limits.panelRestrictMin')}
          </label>
          {yMinOn && (
            <div className={styles.limitEditorRow}>
              <input
                className={styles.limitEditorInput}
                type="text"
                inputMode="decimal"
                value={yMinStr}
                onChange={(e) => setYMinStr(e.target.value)}
                placeholder={t('rightPanel.limits.panelMinPlaceholder')}
              />
              <span className={styles.limitEditorUnit}>mm</span>
            </div>
          )}
        </>
      )}
      {c.ySameAsX && (
        <p className={styles.limitEditorHint}>{t('leftPanel.limits.editPanelYSameNote')}</p>
      )}
      {error && (
        <p className={styles.limitEditorError} role="alert">
          {error}
        </p>
      )}
      <div className={styles.limitEditorActions}>
        <button type="button" className={styles.limitEditorApply} onClick={handleSave}>
          {t('leftPanel.limits.saveChanges')}
        </button>
        <button type="button" className={styles.limitEditorDelete} onClick={onDelete}>
          {t('leftPanel.limits.deleteLimit')}
        </button>
      </div>
    </div>
  )
}
