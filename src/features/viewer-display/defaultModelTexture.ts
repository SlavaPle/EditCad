import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

let cached: CanvasTexture | null = null

function drawCheckerTexture(ctx: CanvasRenderingContext2D, size: number): void {
  const cells = 8
  const cell = size / cells
  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < cells; col++) {
      const even = (row + col) % 2 === 0
      ctx.fillStyle = even ? '#c8d4e4' : '#9aa8bc'
      ctx.fillRect(col * cell, row * cell, cell, cell)
    }
  }

  ctx.strokeStyle = 'rgba(30, 41, 59, 0.35)'
  ctx.lineWidth = 1
  for (let i = 0; i <= cells; i++) {
    const p = i * cell
    ctx.beginPath()
    ctx.moveTo(p, 0)
    ctx.lineTo(p, size)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, p)
    ctx.lineTo(size, p)
    ctx.stroke()
  }
}

/** Domyślna tekstura podglądu (wzorzec szachownicy). */
export function getDefaultModelTexture(): CanvasTexture {
  if (cached) return cached

  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable')
  }
  drawCheckerTexture(ctx, size)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(4, 4)
  cached = texture
  return texture
}
