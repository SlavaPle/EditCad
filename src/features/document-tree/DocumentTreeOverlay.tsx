import { useMemo, useState, useCallback, useEffect } from 'react'
import type { BufferGeometry } from 'three'
import { useTranslation } from 'react-i18next'
import type { AssemblyMate } from '../assembly-mates/model'
import type { MateEntityHighlights } from '../assembly-mates/matePlaneFaceOverlay'
import type { PreAssemblyProgramPart } from '../pre-assembly/preAssemblyProgram'
import { geometryExtentMm } from '../pre-assembly/viewer/layoutProgramPartPositionsMm'
import { buildProgramPartDisplayNameById } from '../pre-assembly/programParts/programPartDisplayName'
import type { PreparedElementConstraints } from '../../lib/preparedElementFormat'
import { buildDocumentTree } from './buildDocumentTree'
import { DocumentTree } from './DocumentTree'
import { resolveDocumentTreeSelectEffect } from './documentTreeSelectActions'
import { highlightsFromAssemblyMate } from './mateHighlightsFromTree'
import type { DocumentTreeContextActionId, DocumentTreeNode } from './model'
import type { PartLockMap } from './partLock'
import styles from './DocumentTree.module.css'

export type DocumentTreeOverlayProps = {
  /** Główny model (tryb detalu). */
  mainModel: BufferGeometry | null
  mainFileName: string | null
  assemblyName: string
  programParts: readonly PreAssemblyProgramPart[]
  programPartGeometries: Readonly<Record<string, BufferGeometry | undefined>>
  programPartConstraints: Readonly<Record<string, PreparedElementConstraints | undefined>>
  assemblyMates: readonly AssemblyMate[]
  activeProgramPartId: string | null
  partLocks: PartLockMap
  onActivePartChange: (partId: string | null) => void
  onTogglePartLock: (partId: string) => void
  onRemovePart?: (partId: string) => void
  onEditAppearance: (partId: string | null) => void
  onTreeMateHighlightsChange: (highlights: MateEntityHighlights | null) => void
  onHighlightElementFaces?: (partId: string | null, faceIndices: number[]) => void
  /** Epoch z App po clear pustego kliknięcia — zeruje zaznaczenie węzła w drzewie. */
  selectionClearEpoch?: number
}

export function DocumentTreeOverlay({
  mainModel,
  mainFileName,
  assemblyName,
  programParts,
  programPartGeometries,
  programPartConstraints,
  assemblyMates,
  activeProgramPartId,
  partLocks,
  onActivePartChange,
  onTogglePartLock,
  onRemovePart,
  onEditAppearance,
  onTreeMateHighlightsChange,
  onHighlightElementFaces,
  selectionClearEpoch = 0,
}: DocumentTreeOverlayProps) {
  const { t } = useTranslation()
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  useEffect(() => {
    if (selectionClearEpoch === 0) return
    setSelectedNodeId(null)
  }, [selectionClearEpoch])

  const partDisplayNameById = useMemo(
    () => buildProgramPartDisplayNameById(programParts),
    [programParts],
  )

  const partSizeMmById = useMemo(() => {
    const map: Record<string, { x: number; y: number; z: number }> = {}
    for (const part of programParts) {
      map[part.id] = geometryExtentMm(programPartGeometries[part.id]).sizeMm
    }
    return map
  }, [programParts, programPartGeometries])

  const modelElementsByPartId = useMemo(() => {
    const map: Record<string, PreparedElementConstraints['modelElements']> = {}
    for (const part of programParts) {
      map[part.id] = programPartConstraints[part.id]?.modelElements
    }
    return map
  }, [programParts, programPartConstraints])

  const root = useMemo(
    () =>
      buildDocumentTree({
        partRootLabel: mainFileName ?? t('documentTree.untitledPart'),
        partSizeMm: mainModel ? geometryExtentMm(mainModel).sizeMm : null,
        hasPartModel: !!mainModel,
        assemblyName: assemblyName || t('documentTree.untitledAssembly'),
        programParts,
        partDisplayNameById,
        partSizeMmById,
        modelElementsByPartId,
        mates: assemblyMates,
        partLocks,
      }),
    [
      mainFileName,
      mainModel,
      assemblyName,
      programParts,
      partDisplayNameById,
      partSizeMmById,
      modelElementsByPartId,
      assemblyMates,
      partLocks,
      t,
    ],
  )

  const findMate = useCallback(
    (mateId: string | undefined) =>
      mateId ? assemblyMates.find((m) => m.id === mateId) : undefined,
    [assemblyMates],
  )

  const matesById = useMemo(() => {
    const map: Record<string, AssemblyMate> = {}
    for (const mate of assemblyMates) {
      map[mate.id] = mate
    }
    return map
  }, [assemblyMates])

  const handleSelectNode = useCallback(
    (node: DocumentTreeNode) => {
      setSelectedNodeId(node.id)
      const effect = resolveDocumentTreeSelectEffect(node, {
        matesById,
        modelElementsByPartId,
      })
      if (effect.kind === 'activatePart') {
        onActivePartChange(effect.partId)
        return
      }
      if (effect.kind === 'highlightMate') {
        onTreeMateHighlightsChange(effect.highlights)
        return
      }
      if (effect.kind === 'highlightElement') {
        onActivePartChange(effect.partId)
        onHighlightElementFaces?.(effect.partId, effect.faceIndices)
      }
    },
    [
      matesById,
      modelElementsByPartId,
      onActivePartChange,
      onHighlightElementFaces,
      onTreeMateHighlightsChange,
    ],
  )

  const handleContextAction = useCallback(
    (action: DocumentTreeContextActionId, node: DocumentTreeNode) => {
      switch (action) {
        case 'select':
          if (node.partId) onActivePartChange(node.partId)
          setSelectedNodeId(node.id)
          break
        case 'lock':
        case 'unlock':
          if (node.partId) onTogglePartLock(node.partId)
          break
        case 'removePart':
          if (node.partId && onRemovePart) onRemovePart(node.partId)
          break
        case 'editAppearance':
          onEditAppearance(node.partId ?? null)
          break
        case 'copySize':
          if (node.sizeMm != null && Number.isFinite(node.sizeMm)) {
            void navigator.clipboard?.writeText(String(node.sizeMm))
          }
          break
        case 'highlightElement':
          if (node.partId && node.elementId) {
            const elements = programPartConstraints[node.partId]?.modelElements ?? []
            const el = elements.find((e) => e.id === node.elementId)
            if (el && onHighlightElementFaces) {
              onActivePartChange(node.partId)
              onHighlightElementFaces(node.partId, [...el.faceIndices])
            }
          }
          break
        case 'highlightMate':
          if (node.mateId) {
            onTreeMateHighlightsChange(highlightsFromAssemblyMate(findMate(node.mateId)) ?? null)
          }
          break
        case 'clearMateHighlight':
          onTreeMateHighlightsChange(null)
          break
        default:
          break
      }
    },
    [
      findMate,
      onActivePartChange,
      onEditAppearance,
      onHighlightElementFaces,
      onRemovePart,
      onTogglePartLock,
      onTreeMateHighlightsChange,
      programPartConstraints,
    ],
  )

  if (!root) {
    return null
  }

  return (
    <div className={styles.overlayRoot}>
      <div className={styles.panel}>
        <DocumentTree
          root={root}
          activePartId={activeProgramPartId}
          selectedNodeId={selectedNodeId}
          onSelectNode={handleSelectNode}
          onContextAction={handleContextAction}
        />
      </div>
    </div>
  )
}
