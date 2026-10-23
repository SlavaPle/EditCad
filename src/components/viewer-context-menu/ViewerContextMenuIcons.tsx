import type { ViewerContextMenuActionId } from './ViewerContextMenu'

const svgProps = {
  width: 14,
  height: 14,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const,
}

export function ViewerContextMenuIcon({
  actionId,
}: {
  actionId: ViewerContextMenuActionId
}) {
  switch (actionId) {
    case 'addMate':
      return (
        <svg {...svgProps}>
          <path d="M3 5h4v6H3zM9 5h4v6H9z" />
          <path d="M7 8h2M12 3v4M10 5h4" />
        </svg>
      )
    default:
      return null
  }
}

export function viewerContextActionHasIcon(actionId: ViewerContextMenuActionId): boolean {
  return actionId === 'addMate'
}
