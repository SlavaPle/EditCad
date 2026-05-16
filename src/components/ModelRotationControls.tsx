import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  parseRotationDegrees,
  type RotationDegrees,
} from '../features/model-transform/rotateGeometryAroundCenter'
import styles from './RightPanel.module.css'

export interface ModelRotationControlsProps {
  disabled?: boolean
  onApply: (rotationDeg: RotationDegrees) => void
}

export function ModelRotationControls({ disabled = false, onApply }: ModelRotationControlsProps) {
  const { t } = useTranslation()
  const [axisX, setAxisX] = useState('0')
  const [axisY, setAxisY] = useState('0')
  const [axisZ, setAxisZ] = useState('0')
  const [error, setError] = useState(false)

  const handleApply = useCallback(() => {
    const x = parseRotationDegrees(axisX)
    const y = parseRotationDegrees(axisY)
    const z = parseRotationDegrees(axisZ)
    if (x === null || y === null || z === null) {
      setError(true)
      return
    }
    if (x === 0 && y === 0 && z === 0) {
      setError(false)
      return
    }
    setError(false)
    onApply({ x, y, z })
    setAxisX('0')
    setAxisY('0')
    setAxisZ('0')
  }, [axisX, axisY, axisZ, onApply])

  const renderAxis = (
    id: string,
    label: string,
    value: string,
    onChange: (next: string) => void,
  ) => (
    <div className={styles.faceDistanceRow} key={id}>
      <label className={styles.faceDistanceLabel} htmlFor={id}>
        {label}
      </label>
      <div className={styles.faceDistanceInputWrap}>
        <input
          id={id}
          className={styles.faceDistanceInput}
          type="text"
          inputMode="decimal"
          value={value}
          disabled={disabled}
          onChange={(e) => {
            setError(false)
            onChange(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            handleApply()
          }}
          aria-invalid={error}
        />
        <span className={styles.faceDistanceUnit}>{t('rightPanel.rotation.degreesUnit')}</span>
      </div>
    </div>
  )

  return (
    <div className={styles.panelConstraintFields} role="group" aria-label={t('rightPanel.rotation.title')}>
      <p className={styles.selectionHint}>{t('rightPanel.rotation.hint')}</p>
      {renderAxis('model-rotation-x', t('rightPanel.rotation.axisX'), axisX, setAxisX)}
      {renderAxis('model-rotation-y', t('rightPanel.rotation.axisY'), axisY, setAxisY)}
      {renderAxis('model-rotation-z', t('rightPanel.rotation.axisZ'), axisZ, setAxisZ)}
      <button
        type="button"
        className={styles.faceDistanceApply}
        disabled={disabled}
        onClick={handleApply}
      >
        {t('rightPanel.rotation.apply')}
      </button>
      {error && (
        <p className={styles.faceDistanceError} role="alert">
          {t('rightPanel.rotation.invalidAngle')}
        </p>
      )}
    </div>
  )
}
