/** Ikona dwóch równoległych płaszczyzn w izometrii (α u góry, β u dołu). */
export function ParallelMateTypeIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="matesTypeIconSvg">
      <path
        d="M6 28 L20 20 L38 28 L24 36 Z"
        fill="rgba(96, 165, 250, 0.45)"
        stroke="#2563eb"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M6 16 L20 8 L38 16 L24 24 Z"
        fill="rgba(248, 113, 113, 0.45)"
        stroke="#dc2626"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <text x="9" y="33" fill="#2563eb" fontSize="8" fontFamily="serif" fontStyle="italic">
        β
      </text>
      <text x="9" y="21" fill="#dc2626" fontSize="8" fontFamily="serif" fontStyle="italic">
        α
      </text>
    </svg>
  )
}
