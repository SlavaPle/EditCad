import type { DocumentTreeAxis, DocumentTreeNodeKind } from './model'

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

export function DocumentTreeIcon({
  kind,
  axis,
  locked,
}: {
  kind: DocumentTreeNodeKind
  axis?: DocumentTreeAxis
  locked?: boolean
}) {
  if (kind === 'part' && locked) {
    return (
      <svg {...svgProps}>
        <rect x="4" y="7" width="8" height="6" rx="1" />
        <path d="M6 7V5a2 2 0 0 1 4 0v2" />
      </svg>
    )
  }

  switch (kind) {
    case 'root':
      return (
        <svg {...svgProps}>
          <path d="M2 4h12v9H2z" />
          <path d="M2 7h12" />
        </svg>
      )
    case 'part':
      return (
        <svg {...svgProps}>
          <path d="M3 5.5 8 3l5 2.5v5L8 13l-5-2.5v-5z" />
          <path d="M8 3v10M3 5.5l5 2.5 5-2.5" />
        </svg>
      )
    case 'model':
      return (
        <svg {...svgProps}>
          <path d="M3 5.5 8 3l5 2.5v5L8 13l-5-2.5v-5z" />
        </svg>
      )
    case 'appearance':
      return (
        <svg {...svgProps}>
          <circle cx="8" cy="8" r="5" />
          <circle cx="8" cy="8" r="2" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'size': {
      const letter = (axis ?? 'x').toUpperCase()
      return (
        <svg {...svgProps}>
          <text
            x="8"
            y="11"
            textAnchor="middle"
            fill="currentColor"
            stroke="none"
            fontSize="9"
            fontWeight="700"
            fontFamily="system-ui, sans-serif"
          >
            {letter}
          </text>
        </svg>
      )
    }
    case 'elementsGroup':
    case 'element':
      return (
        <svg {...svgProps}>
          <path d="M3 4h10v3H3zM3 9h10v3H3z" />
        </svg>
      )
    case 'matesGroup':
    case 'mate':
      return (
        <svg {...svgProps}>
          <path d="M3 5h4v6H3zM9 5h4v6H9z" />
          <path d="M7 8h2" />
        </svg>
      )
    default:
      return null
  }
}
