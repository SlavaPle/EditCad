import type { DocumentTreeContextActionId } from './model'

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

/** Ikony pozycji menu kontekstowego drzewa dokumentu. */
export function DocumentTreeContextMenuIcon({
  actionId,
}: {
  actionId: DocumentTreeContextActionId
}) {
  switch (actionId) {
    case 'select':
      return (
        <svg {...svgProps}>
          <path d="M3 3l4 10 2-4 4-2L3 3z" />
        </svg>
      )
    case 'lock':
      return (
        <svg {...svgProps}>
          <rect x="4" y="7" width="8" height="6" rx="1" />
          <path d="M6 7V5a2 2 0 0 1 4 0v2" />
        </svg>
      )
    case 'unlock':
      return (
        <svg {...svgProps}>
          <rect x="4" y="7" width="8" height="6" rx="1" />
          <path d="M6 7V5a2 2 0 0 1 3.5-.5" />
        </svg>
      )
    case 'removePart':
    case 'deleteMate':
      return (
        <svg {...svgProps}>
          <path d="M3 4h10M6 4V3h4v1M5 4l.5 9h5L11 4" />
        </svg>
      )
    case 'editAppearance':
      return (
        <svg {...svgProps}>
          <circle cx="8" cy="8" r="5" />
          <circle cx="8" cy="8" r="2" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'copySize':
      return (
        <svg {...svgProps}>
          <rect x="5" y="5" width="8" height="8" rx="1" />
          <path d="M3 11V3h8" />
        </svg>
      )
    case 'highlightElement':
    case 'highlightMate':
      return (
        <svg {...svgProps}>
          <circle cx="8" cy="8" r="3" />
          <path d="M8 2v2M8 12v2M2 8h2M12 8h2M4 4l1.5 1.5M10.5 10.5 12 12M12 4l-1.5 1.5M4 12l1.5-1.5" />
        </svg>
      )
    case 'clearMateHighlight':
      return (
        <svg {...svgProps}>
          <circle cx="8" cy="8" r="3" />
          <path d="M8 2v2M8 12v2M2 8h2M12 8h2M4.5 4.5 11.5 11.5" />
        </svg>
      )
    case 'suppressMate':
      return (
        <svg {...svgProps}>
          <circle cx="8" cy="8" r="5" />
          <path d="M5 8h6" />
        </svg>
      )
    case 'unsuppressMate':
      return (
        <svg {...svgProps}>
          <circle cx="8" cy="8" r="5" />
          <path d="M8 5v6M5 8h6" />
        </svg>
      )
    case 'expandAll':
      return (
        <svg {...svgProps}>
          <path d="M3 5h10M3 8h10M3 11h10" />
          <path d="M12 4v2M12 10v2" />
        </svg>
      )
    case 'collapseAll':
      return (
        <svg {...svgProps}>
          <path d="M3 5h10M3 8h7M3 11h10" />
        </svg>
      )
    default:
      return null
  }
}

/** Czy akcja ma dedykowaną ikonę (do testów kontraktu UI). */
export function documentTreeContextActionHasIcon(
  actionId: DocumentTreeContextActionId,
): boolean {
  const known: DocumentTreeContextActionId[] = [
    'select',
    'lock',
    'unlock',
    'removePart',
    'editAppearance',
    'copySize',
    'highlightElement',
    'highlightMate',
    'clearMateHighlight',
    'suppressMate',
    'unsuppressMate',
    'deleteMate',
    'expandAll',
    'collapseAll',
  ]
  return known.includes(actionId)
}
