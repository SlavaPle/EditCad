import {
  CanvasTexture,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from 'three'
import { getDefaultModelTexture } from './defaultModelTexture'

export type ModelSurfaceKind = 'color' | 'texture'

export type ModelTextureRef =
  | { kind: 'default' }
  | { kind: 'image'; dataUrl: string }

export type ModelAppearance = {
  surface: ModelSurfaceKind
  /** Kolor ciała w trybie solid (#rrggbb). */
  color: string
  texture: ModelTextureRef
  /** 0 = przezroczysty, 1 = nieprzezroczysty */
  opacity: number
}

export const DEFAULT_MODEL_APPEARANCE: ModelAppearance = {
  surface: 'color',
  color: '#e2eaf4',
  texture: { kind: 'default' },
  opacity: 1,
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_RE.test(value)
}

export function clampOpacity(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(1, Math.max(0, value))
}

export function parseModelAppearance(value: unknown): ModelAppearance | undefined | null {
  if (value === undefined) return undefined
  if (typeof value !== 'object' || value === null) return null

  const record = value as Record<string, unknown>
  const surface = record.surface
  if (surface !== 'color' && surface !== 'texture') return null

  const color = record.color
  if (typeof color !== 'string' || !isValidHexColor(color)) return null

  const opacity = record.opacity
  if (typeof opacity !== 'number' || !Number.isFinite(opacity)) return null
  const clampedOpacity = clampOpacity(opacity)

  const texture = parseTextureRef(record.texture)
  if (!texture) return null

  return { surface, color, texture, opacity: clampedOpacity }
}

function parseTextureRef(value: unknown): ModelTextureRef | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  if (record.kind === 'default') return { kind: 'default' }
  if (record.kind === 'image') {
    const dataUrl = record.dataUrl
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return null
    if (dataUrl.length > 12_000_000) return null
    return { kind: 'image', dataUrl }
  }
  return null
}

/** Tekstura do podglądu triplanarnego z ustawień wyglądu. */
export function resolveModelTexture(appearance: ModelAppearance): Texture {
  if (appearance.surface === 'color') {
    return createSolidColorTexture(appearance.color)
  }
  if (appearance.texture.kind === 'default') {
    const tex = getDefaultModelTexture()
    tex.repeat.set(4, 4)
    return tex
  }
  const loader = new TextureLoader()
  const tex = loader.load(appearance.texture.dataUrl)
  tex.colorSpace = SRGBColorSpace
  tex.wrapS = RepeatWrapping
  tex.wrapT = RepeatWrapping
  tex.repeat.set(4, 4)
  return tex
}

/** Tekstura jednolitego koloru (gdy nie używamy obrazu). */
export function createSolidColorTexture(hex: string): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 4
  canvas.height = 4
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable')
  }
  ctx.fillStyle = hex
  ctx.fillRect(0, 0, 4, 4)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  return texture
}

export function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to read image file'))
      }
    }
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image file'))
    reader.readAsDataURL(file)
  })
}
