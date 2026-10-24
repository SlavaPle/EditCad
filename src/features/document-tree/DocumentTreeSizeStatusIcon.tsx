import type { SizeNodeStatus } from './model'

const svgProps = {
  width: 14,
  height: 12,
  viewBox: '0 0 16 16',
  fill: 'currentColor',
  stroke: 'none',
  'aria-hidden': true as const,
}

/** Ikona statusu limitu: m / M / mM. */
export function DocumentTreeSizeStatusIcon({ status }: { status: SizeNodeStatus | undefined }) {
  switch (status) {
    case 'min':
      return (
        <svg {...svgProps}>
          <text
            x="8"
            y="12"
            textAnchor="middle"
            fontSize="9"
            fontWeight="600"
            fontFamily="system-ui, sans-serif"
          >
            m
          </text>
        </svg>
      )
    case 'max':
      return (
        <svg {...svgProps}>
          <text
            x="8"
            y="12"
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fontFamily="system-ui, sans-serif"
          >
            M
          </text>
        </svg>
      )
    case 'minmax':
      return (
        <svg {...svgProps} width={18} viewBox="0 0 20 16">
          <text
            x="4"
            y="12"
            textAnchor="middle"
            fontSize="9"
            fontWeight="600"
            fontFamily="system-ui, sans-serif"
          >
            m
          </text>
          <text
            x="14"
            y="12"
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fontFamily="system-ui, sans-serif"
          >
            M
          </text>
        </svg>
      )
    case 'const':
    case 'block':
    case 'panel':
    case 'profil':
    case 'lockedByCustom':
      return (
        <svg {...svgProps} fill="none" stroke="currentColor" strokeWidth={1.4}>
          <rect x="4" y="7" width="8" height="6" rx="1" />
          <path d="M6 7V5a2 2 0 0 1 4 0v2" strokeLinecap="round" />
        </svg>
      )
    case 'noFaces':
      return (
        <svg {...svgProps} fill="none" stroke="currentColor" strokeWidth={1.4}>
          <circle cx="8" cy="8" r="5" />
          <path d="M5 5l6 6" strokeLinecap="round" />
        </svg>
      )
    case 'free':
    default:
      return (
        <svg {...svgProps} fill="none" stroke="currentColor" strokeWidth={1.4}>
          <path d="M3 8h10" strokeLinecap="round" />
        </svg>
      )
  }
}
