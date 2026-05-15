import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DEFAULT_MODEL_APPEARANCE,
  clampOpacity,
  isValidHexColor,
  readImageFileAsDataUrl,
  type ModelAppearance,
  type ModelSurfaceKind,
} from '../features/viewer-display/modelAppearance'
import styles from './RightPanel.module.css'

export interface EditAppearanceControlsProps {
  appearance: ModelAppearance
  onAppearanceChange: (next: ModelAppearance) => void
  disabled?: boolean
}

export function EditAppearanceControls({
  appearance,
  onAppearanceChange,
  disabled = false,
}: EditAppearanceControlsProps) {
  const { t } = useTranslation()
  const textureInputRef = useRef<HTMLInputElement>(null)

  const setSurface = (surface: ModelSurfaceKind) => {
    onAppearanceChange({ ...appearance, surface })
  }

  const handleColorChange = (value: string) => {
    if (!isValidHexColor(value)) return
    onAppearanceChange({ ...appearance, color: value })
  }

  const handleOpacityChange = (value: number) => {
    onAppearanceChange({ ...appearance, opacity: clampOpacity(value) })
  }

  const handleTextureFile = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return
    try {
      const dataUrl = await readImageFileAsDataUrl(file)
      onAppearanceChange({
        ...appearance,
        surface: 'texture',
        texture: { kind: 'image', dataUrl },
      })
    } catch {
      // ignorujemy błąd odczytu pliku
    }
  }

  const handleResetTexture = () => {
    onAppearanceChange({
      ...appearance,
      texture: DEFAULT_MODEL_APPEARANCE.texture,
    })
  }

  return (
    <div className={styles.panelConstraintFields} role="group" aria-label={t('rightPanel.appearance.title')}>
      <div className={styles.faceDistanceRow}>
        <label className={styles.faceDistanceLabel} htmlFor="appearance-surface">
          {t('rightPanel.appearance.surface')}
        </label>
        <select
          id="appearance-surface"
          className={styles.faceDistanceInput}
          value={appearance.surface}
          disabled={disabled}
          onChange={(e) => setSurface(e.target.value as ModelSurfaceKind)}
        >
          <option value="color">{t('rightPanel.appearance.surfaceColor')}</option>
          <option value="texture">{t('rightPanel.appearance.surfaceTexture')}</option>
        </select>
      </div>

      <div className={styles.faceDistanceRow}>
        <label className={styles.faceDistanceLabel} htmlFor="appearance-color">
          {t('rightPanel.appearance.color')}
        </label>
        <input
          id="appearance-color"
          type="color"
          className={styles.appearanceColorInput}
          value={appearance.color}
          disabled={disabled || appearance.surface === 'texture'}
          title={t('rightPanel.appearance.color')}
          onChange={(e) => handleColorChange(e.target.value)}
        />
      </div>

      <div className={styles.panelFieldGroup}>
        <input
          ref={textureInputRef}
          type="file"
          accept="image/*"
          className={styles.visuallyHidden}
          disabled={disabled || appearance.surface !== 'texture'}
          onChange={(e) => {
            void handleTextureFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <button
          type="button"
          className={styles.panelCaptureBtn}
          disabled={disabled || appearance.surface !== 'texture'}
          onClick={() => textureInputRef.current?.click()}
        >
          {t('rightPanel.appearance.pickTexture')}
        </button>
        <button
          type="button"
          className={styles.panelCaptureBtnSecondary}
          disabled={disabled || appearance.surface !== 'texture'}
          onClick={handleResetTexture}
        >
          {t('rightPanel.appearance.defaultTexture')}
        </button>
      </div>

      <div className={styles.faceDistanceRow}>
        <label className={styles.faceDistanceLabel} htmlFor="appearance-opacity">
          {t('rightPanel.appearance.opacity')}
        </label>
        <input
          id="appearance-opacity"
          type="range"
          className={styles.appearanceRange}
          min={0}
          max={1}
          step={0.01}
          value={appearance.opacity}
          disabled={disabled}
          onChange={(e) => handleOpacityChange(Number(e.target.value))}
        />
        <span className={styles.appearanceOpacityValue}>{Math.round(appearance.opacity * 100)}%</span>
      </div>
    </div>
  )
}
