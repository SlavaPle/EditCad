import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  collectExpandableNodeIds,
  findDocumentTreeNode,
} from './buildDocumentTree'
import { DocumentTreeContextMenu } from './DocumentTreeContextMenu'
import { DocumentTreeIcon } from './DocumentTreeIcons'
import type {
  DocumentTreeContextActionId,
  DocumentTreeContextMenuState,
  DocumentTreeNode,
  DocumentTreeNodeKind,
} from './model'
import styles from './DocumentTree.module.css'

function labelForKind(kind: DocumentTreeNodeKind, fallback: string, t: (key: string) => string): string {
  switch (kind) {
    case 'model':
      return t('documentTree.nodes.model')
    case 'appearance':
      return t('documentTree.nodes.appearance')
    case 'elementsGroup':
      return t('documentTree.nodes.elements')
    case 'matesGroup':
      return t('documentTree.nodes.mates')
    default:
      return fallback
  }
}

export type DocumentTreeProps = {
  root: DocumentTreeNode
  activePartId: string | null
  selectedNodeId: string | null
  onSelectNode: (node: DocumentTreeNode) => void
  onContextAction: (action: DocumentTreeContextActionId, node: DocumentTreeNode) => void
}

function TreeNodeRow({
  node,
  depth,
  expandedIds,
  activePartId,
  selectedNodeId,
  onToggleExpand,
  onSelect,
  onContextMenu,
}: {
  node: DocumentTreeNode
  depth: number
  expandedIds: ReadonlySet<string>
  activePartId: string | null
  selectedNodeId: string | null
  onToggleExpand: (id: string) => void
  onSelect: (node: DocumentTreeNode) => void
  onContextMenu: (e: MouseEvent, node: DocumentTreeNode) => void
}) {
  const { t } = useTranslation()
  const hasChildren = (node.children?.length ?? 0) > 0
  const expanded = expandedIds.has(node.id)
  const isSelected =
    selectedNodeId === node.id ||
    (node.kind === 'part' && node.partId != null && node.partId === activePartId)

  const displayLabel = labelForKind(node.kind, node.label, t)

  return (
    <li>
      <div
        className={isSelected ? `${styles.row} ${styles.rowSelected}` : styles.row}
        style={{ paddingLeft: 4 + depth * 2 }}
        onContextMenu={(e) => onContextMenu(e, node)}
      >
        {hasChildren ? (
          <button
            type="button"
            className={styles.expandBtn}
            aria-expanded={expanded}
            aria-label={expanded ? t('documentTree.collapse') : t('documentTree.expand')}
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand(node.id)
            }}
          >
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className={styles.expandSpacer} />
        )}
        <span className={styles.icon}>
          <DocumentTreeIcon kind={node.kind} axis={node.axis} locked={node.locked} />
        </span>
        <button
          type="button"
          className={styles.label}
          onClick={() => onSelect(node)}
          title={displayLabel}
        >
          {displayLabel}
        </button>
      </div>
      {hasChildren && expanded ? (
        <ul className={styles.treeListNested}>
          {node.children!.map((child) => (
            <TreeNodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              activePartId={activePartId}
              selectedNodeId={selectedNodeId}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export function DocumentTree({
  root,
  activePartId,
  selectedNodeId,
  onSelectNode,
  onContextAction,
}: DocumentTreeProps) {
  const { t } = useTranslation()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(collectExpandableNodeIds(root)),
  )
  const [menu, setMenu] = useState<DocumentTreeContextMenuState | null>(null)

  // Gdy zmienia się korzeń (nowy dokument), rozwiń domyślnie — nie przy lock/size.
  const rootId = root.id
  useEffect(() => {
    setExpandedIds(new Set(collectExpandableNodeIds(root)))
    setMenu(null)
    // Tylko zmiana dokumentu (root.id), nie przebudowa etykiet.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- root.id
  }, [rootId])

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleContextMenu = useCallback((e: MouseEvent, node: DocumentTreeNode) => {
    e.preventDefault()
    e.stopPropagation()
    setMenu({ x: e.clientX, y: e.clientY, nodeId: node.id })
  }, [])

  const menuNode = menu ? findDocumentTreeNode(root, menu.nodeId) : null

  const handleMenuAction = useCallback(
    (action: DocumentTreeContextActionId) => {
      if (!menuNode) return
      if (action === 'expandAll') {
        setExpandedIds(new Set(collectExpandableNodeIds(root)))
        return
      }
      if (action === 'collapseAll') {
        setExpandedIds(new Set())
        return
      }
      onContextAction(action, menuNode)
    },
    [menuNode, onContextAction, root],
  )

  return (
    <>
      <ul className={styles.treeList} aria-label={t('documentTree.title')}>
        <TreeNodeRow
          node={root}
          depth={0}
          expandedIds={expandedIds}
          activePartId={activePartId}
          selectedNodeId={selectedNodeId}
          onToggleExpand={toggleExpand}
          onSelect={onSelectNode}
          onContextMenu={handleContextMenu}
        />
      </ul>
      {menu && menuNode ? (
        <DocumentTreeContextMenu
          x={menu.x}
          y={menu.y}
          node={menuNode}
          onAction={handleMenuAction}
          onClose={() => setMenu(null)}
        />
      ) : null}
    </>
  )
}
