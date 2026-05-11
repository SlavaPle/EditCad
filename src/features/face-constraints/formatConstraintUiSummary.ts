import type { TFunction } from 'i18next'
import type { BufferGeometry } from 'three'
import type { FaceConstraint, PanelFaceConstraint, ProfilFaceConstraint, ProfilFrozenSlotStored } from './model'
import { formatPanelAxisMm, formatProfilStretchGapLabelMm } from './model'
import type { PreparedModelElement } from '../../lib/preparedElementFormat'
import { measurePreparedElementPairGapMm } from '../part-constraints/measurePairGapMm'
import { measureEdgeLengthMm } from '../part-constraints/measureEdgeLengthMm'

/** Skrót długich identyfikatorów elementów w listach UI — pełny tekst w tooltip. */
export function shortenConstraintElementId(raw: string, maxTotal = 28): string {
  const id = raw.trim()
  if (id.length <= maxTotal) return id
  const inner = maxTotal - 1
  const head = Math.max(8, Math.ceil(inner * 0.5))
  const tail = inner - head
  return `${id.slice(0, head)}…${id.slice(-tail)}`
}

function formatMmLabel(n: number): string {
  return String(Number(n.toFixed(3)))
}

function measureFrozenSlotSpanMm(
  geometry: BufferGeometry | null,
  slot: ProfilFrozenSlotStored,
  elements: readonly PreparedModelElement[] | undefined,
): number | null {
  if (!geometry) return null
  if (slot.edgeVertexPair) {
    const { va, vb } = slot.edgeVertexPair
    return measureEdgeLengthMm(geometry, va, vb)
  }
  const a = slot.elementAId?.trim()
  const b = slot.elementBId?.trim()
  if (!a || !b) return null
  return measurePreparedElementPairGapMm(geometry, a, b, elements)
}

function profilSectionDimsMm(
  c: ProfilFaceConstraint,
  geometry: BufferGeometry | null,
  elements: readonly PreparedModelElement[] | undefined,
): { d1: number; d2: number } | null {
  if (!c.frozen1 || !c.frozen2) return null
  const m1 = measureFrozenSlotSpanMm(geometry, c.frozen1, elements)
  const m2 = measureFrozenSlotSpanMm(geometry, c.frozen2, elements)
  if (m1 === null || m2 === null) return null
  return { d1: m1, d2: m2 }
}

/** Para skróconych ID + wpis tooltip z pełnymi ID. */
function elementPairSnippet(
  a: string | undefined,
  b: string | undefined,
  tooltipParts: string[],
  keyFull: string,
  t: TFunction,
): string | undefined {
  const ea = a?.trim()
  const eb = b?.trim()
  if (!ea || !eb) return undefined
  tooltipParts.push(t(keyFull, { a: ea, b: eb }))
  return `${shortenConstraintElementId(ea)} ↔ ${shortenConstraintElementId(eb)}`
}

function appendProfilTechnicalTooltip(
  c: ProfilFaceConstraint,
  t: TFunction,
  tooltipParts: string[],
): void {
  const pushSlot = (slot: ProfilFrozenSlotStored | undefined, label: string) => {
    if (!slot) return
    if (slot.edgeVertexPair) {
      const { va, vb } = slot.edgeVertexPair
      tooltipParts.push(t('limitsSummary.profilFrozenTooltipEdge', { label, va, vb }))
      return
    }
    const a = slot.elementAId?.trim()
    const b = slot.elementBId?.trim()
    if (a && b) tooltipParts.push(t('limitsSummary.profilFrozenTooltipPair', { label, a, b }))
  }
  pushSlot(c.frozen1, t('limitsSummary.profilFrozenLabel1'))
  pushSlot(c.frozen2, t('limitsSummary.profilFrozenLabel2'))
}

export function formatConstraintUiSummary(params: {
  constraint: FaceConstraint
  geometry: BufferGeometry | null
  modelElements: readonly PreparedModelElement[] | undefined
  t: TFunction
}): { primary: string; tooltip: string } {
  const { constraint: c, geometry, modelElements: elements, t } = params
  const tooltipParts: string[] = []
  tooltipParts.push(t('limitsSummary.tooltipId', { id: c.id }))

  if (c.type === 'panel') {
    return formatPanelSummary(c, t, tooltipParts)
  }

  if (c.type === 'profil') {
    return formatProfilSummary(c, geometry, elements, t, tooltipParts)
  }

  if (c.type === 'block') {
    return { primary: t('limitsSummary.blockBody'), tooltip: tooltipParts.join('\n') }
  }

  if (c.type === 'minmax') {
    const primary = t('limitsSummary.minMaxRangeMm', {
      min: formatMmLabel(c.minMm),
      max: formatMmLabel(c.maxMm),
    })
    const pair = elementPairSnippet(c.elementAId, c.elementBId, tooltipParts, 'limitsSummary.elementPairFull', t)
    if (c.facePair) {
      tooltipParts.push(t('limitsSummary.facePairFull', { a: c.facePair.a, b: c.facePair.b }))
    }
    return {
      primary: pair ? `${primary} · ${t('limitsSummary.measurementPair', { pair })}` : primary,
      tooltip: tooltipParts.join('\n'),
    }
  }

  if (c.type === 'const' && c.edgeVertexPair) {
    const { va, vb } = c.edgeVertexPair
    tooltipParts.push(t('limitsSummary.meshVerticesPair', { va, vb }))
    const primary = t('limitsSummary.basicWithEdge', {
      value: formatMmLabel(c.valueMm),
      va,
      vb,
    })
    return { primary, tooltip: tooltipParts.join('\n') }
  }

  const valuePart = t('limitsSummary.basicValueMm', { value: formatMmLabel(c.valueMm) })
  const pair = elementPairSnippet(c.elementAId, c.elementBId, tooltipParts, 'limitsSummary.elementPairFull', t)
  if (c.facePair) {
    tooltipParts.push(t('limitsSummary.facePairFull', { a: c.facePair.a, b: c.facePair.b }))
  }
  const primary = pair ? `${valuePart} · ${t('limitsSummary.measurementPair', { pair })}` : valuePart
  return { primary, tooltip: tooltipParts.join('\n') }
}

function formatPanelSummary(
  c: PanelFaceConstraint,
  t: TFunction,
  tooltipParts: string[],
): { primary: string; tooltip: string } {
  const thickness = t('limitsSummary.panelThickness', { mm: formatMmLabel(c.thicknessMm) })
  const x = t('limitsSummary.panelAxis', {
    axis: 'X',
    range: formatPanelAxisMm(c.panelX),
  })
  const y = t('limitsSummary.panelAxis', {
    axis: 'Y',
    range: formatPanelAxisMm(c.panelY),
  })
  let primary = t('limitsSummary.panelLead', { thickness, x, y })
  if (c.ySameAsX) primary += t('limitsSummary.panelYSameBadge')
  if (c.panelMeasureMode === 'bboxExtents') {
    primary += t('limitsSummary.panelMeasureBboxBadge')
  } else {
    const xa = elementPairSnippet(
      c.panelXElementAId,
      c.panelXElementBId,
      tooltipParts,
      'limitsSummary.panelXPairFull',
      t,
    )
    const ya = elementPairSnippet(
      c.panelYElementAId,
      c.panelYElementBId,
      tooltipParts,
      'limitsSummary.panelYPairFull',
      t,
    )
    if (xa && ya) {
      primary += ` · ${t('limitsSummary.panelMeasurePairs', { x: xa, y: ya })}`
    }
  }
  if (c.facePair) {
    tooltipParts.push(t('limitsSummary.facePairFull', { a: c.facePair.a, b: c.facePair.b }))
  }
  return { primary, tooltip: tooltipParts.join('\n') }
}

function formatProfilSummary(
  c: ProfilFaceConstraint,
  geometry: BufferGeometry | null,
  elements: readonly PreparedModelElement[] | undefined,
  t: TFunction,
  tooltipParts: string[],
): { primary: string; tooltip: string } {
  const stretchRange = formatProfilStretchGapLabelMm(c)
  const lengthStr = t('limitsSummary.profilLength', { range: stretchRange })
  appendProfilTechnicalTooltip(c, t, tooltipParts)

  const dims = profilSectionDimsMm(c, geometry, elements)
  let primary: string
  if (dims) {
    const sectionStr = t('limitsSummary.profilSection', {
      h: formatMmLabel(dims.d1),
      w: formatMmLabel(dims.d2),
    })
    primary = `${sectionStr} · ${lengthStr}`
  } else {
    primary = lengthStr
  }

  const stretchPair = elementPairSnippet(
    c.elementAId,
    c.elementBId,
    tooltipParts,
    'limitsSummary.profilStretchPairFull',
    t,
  )
  if (stretchPair) {
    primary += ` · ${t('limitsSummary.profilStretchPair', { pair: stretchPair })}`
  }

  if (c.facePair) {
    tooltipParts.push(t('limitsSummary.facePairFull', { a: c.facePair.a, b: c.facePair.b }))
  }

  return { primary, tooltip: tooltipParts.join('\n') }
}
