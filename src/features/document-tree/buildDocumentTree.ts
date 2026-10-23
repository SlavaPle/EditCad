import type { AssemblyMate } from '../assembly-mates/model'
import type { PreAssemblyProgramPart } from '../pre-assembly/preAssemblyProgram'
import type { PreparedModelElement } from '../../lib/preparedElementFormat'
import type { DocumentTreeNode } from './model'
import { isPartLocked, type PartLockMap } from './partLock'

export type SizeMm = { x: number; y: number; z: number }

export type BuildDocumentTreeInput = {
  /** Tryb detalu: nazwa pliku / modelu. */
  partRootLabel: string
  partSizeMm: SizeMm | null
  hasPartModel: boolean
  /** Tryb montażu. */
  assemblyName: string
  programParts: readonly PreAssemblyProgramPart[]
  partDisplayNameById: Readonly<Record<string, string>>
  partSizeMmById: Readonly<Record<string, SizeMm | undefined>>
  modelElementsByPartId: Readonly<Record<string, readonly PreparedModelElement[] | undefined>>
  mates: readonly AssemblyMate[]
  partLocks: PartLockMap
}

function formatSizeMm(value: number): string {
  if (!Number.isFinite(value)) return '—'
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}

function sizeChildren(prefix: string, size: SizeMm | null, partId?: string): DocumentTreeNode[] {
  const axes = [
    { axis: 'x' as const, value: size?.x },
    { axis: 'y' as const, value: size?.y },
    { axis: 'z' as const, value: size?.z },
  ]
  return axes.map(({ axis, value }) => ({
    id: `${prefix}:size:${axis}`,
    kind: 'size' as const,
    label: size != null && value != null ? `${axis.toUpperCase()}: ${formatSizeMm(value)} mm` : axis.toUpperCase(),
    axis,
    sizeMm: value,
    partId,
  }))
}

/** Id detali biorących udział w przywiązaniu (A i B — bez duplikatów). */
export function mateParticipantPartIds(mate: AssemblyMate): string[] {
  const ids = [mate.entityA.partId, mate.entityB.partId]
  return [...new Set(ids.filter((id) => id.trim().length > 0))]
}

function mateLabel(mate: AssemblyMate, index: number): string {
  const offset =
    Number.isFinite(mate.offsetMm) && mate.offsetMm !== 0
      ? ` · ${formatSizeMm(mate.offsetMm)} mm`
      : ''
  return `Parallel ${index + 1}${offset}`
}

function mateNodesForPart(
  partId: string,
  mates: readonly AssemblyMate[],
  mateIndexById: ReadonlyMap<string, number>,
): DocumentTreeNode[] {
  const prefix = `part:${partId}`
  const forPart = mates.filter((mate) => mateParticipantPartIds(mate).includes(partId))
  if (forPart.length === 0) return []

  const mateNodes: DocumentTreeNode[] = forPart.map((mate) => {
    const index = mateIndexById.get(mate.id) ?? 0
    const suppressed = mate.suppressed === true
    return {
      id: `${prefix}:mate:${mate.id}`,
      kind: 'mate' as const,
      label: mateLabel(mate, index),
      partId,
      mateId: mate.id,
      suppressed,
    }
  })

  return [
    {
      id: `${prefix}:mates`,
      kind: 'matesGroup',
      label: 'Mates',
      partId,
      children: mateNodes,
    },
  ]
}

function partSubtree(
  part: PreAssemblyProgramPart,
  displayName: string,
  size: SizeMm | undefined,
  elements: readonly PreparedModelElement[] | undefined,
  locked: boolean,
  mates: readonly AssemblyMate[],
  mateIndexById: ReadonlyMap<string, number>,
): DocumentTreeNode {
  const prefix = `part:${part.id}`
  const elementNodes: DocumentTreeNode[] = (elements ?? []).map((el) => ({
    id: `${prefix}:element:${el.id}`,
    kind: 'element',
    label: el.id,
    partId: part.id,
    elementId: el.id,
  }))

  const children: DocumentTreeNode[] = [
    {
      id: `${prefix}:model`,
      kind: 'model',
      label: 'Model',
      partId: part.id,
    },
    {
      id: `${prefix}:appearance`,
      kind: 'appearance',
      label: 'Appearance',
      partId: part.id,
    },
    ...sizeChildren(prefix, size ?? null, part.id),
  ]

  if (elementNodes.length > 0) {
    children.push({
      id: `${prefix}:elements`,
      kind: 'elementsGroup',
      label: 'Elements',
      partId: part.id,
      children: elementNodes,
    })
  }

  children.push(...mateNodesForPart(part.id, mates, mateIndexById))

  return {
    id: prefix,
    kind: 'part',
    label: displayName,
    partId: part.id,
    locked,
    children,
  }
}

/**
 * Buduje drzewo dokumentu: montaż (gdy są programParts) albo pojedynczy detal.
 * Etykiety „Model” / „Appearance” / „Elements” są stałe EN w modelu;
 * UI może je nadpisać przez i18n po kind.
 */
export function buildDocumentTree(input: BuildDocumentTreeInput): DocumentTreeNode | null {
  const {
    partRootLabel,
    partSizeMm,
    hasPartModel,
    assemblyName,
    programParts,
    partDisplayNameById,
    partSizeMmById,
    modelElementsByPartId,
    mates,
    partLocks,
  } = input

  if (programParts.length > 0) {
    const mateIndexById = new Map(mates.map((mate, index) => [mate.id, index]))
    const partNodes = programParts.map((part) =>
      partSubtree(
        part,
        partDisplayNameById[part.id] ?? part.name,
        partSizeMmById[part.id],
        modelElementsByPartId[part.id],
        isPartLocked(partLocks, part.id),
        mates,
        mateIndexById,
      ),
    )

    return {
      id: 'root:assembly',
      kind: 'root',
      label: assemblyName || 'Assembly',
      children: partNodes,
    }
  }

  if (!hasPartModel) {
    return null
  }

  return {
    id: 'root:part',
    kind: 'root',
    label: partRootLabel || 'Part',
    children: [
      {
        id: 'part:main:model',
        kind: 'model',
        label: 'Model',
      },
      {
        id: 'part:main:appearance',
        kind: 'appearance',
        label: 'Appearance',
      },
      ...sizeChildren('part:main', partSizeMm),
    ],
  }
}

/** Znajdź węzeł po id (DFS). */
export function findDocumentTreeNode(
  root: DocumentTreeNode | null,
  nodeId: string,
): DocumentTreeNode | null {
  if (!root) return null
  if (root.id === nodeId) return root
  for (const child of root.children ?? []) {
    const found = findDocumentTreeNode(child, nodeId)
    if (found) return found
  }
  return null
}

/** Zbierz wszystkie id węzłów z dziećmi (do expand/collapse all). */
export function collectExpandableNodeIds(root: DocumentTreeNode | null): string[] {
  if (!root) return []
  const ids: string[] = []
  const walk = (node: DocumentTreeNode) => {
    if (node.children && node.children.length > 0) {
      ids.push(node.id)
      for (const child of node.children) walk(child)
    }
  }
  walk(root)
  return ids
}
