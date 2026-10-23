import { describe, expect, it } from 'vitest'
import {
  ACTIVE_PROGRAM_PART_OUTLINE_COLOR,
  PROGRAM_PART_PLACEHOLDER_COLOR,
  programPartPlaceholderColor,
  shouldShowActiveProgramPartOutline,
} from './activeProgramPartHighlight'

describe('activeProgramPartHighlight', () => {
  it('shows outline only when part is active', () => {
    expect(shouldShowActiveProgramPartOutline(true)).toBe(true)
    expect(shouldShowActiveProgramPartOutline(false)).toBe(false)
  })

  it('uses outline color for active placeholder', () => {
    expect(programPartPlaceholderColor(true)).toBe(ACTIVE_PROGRAM_PART_OUTLINE_COLOR)
    expect(programPartPlaceholderColor(false)).toBe(PROGRAM_PART_PLACEHOLDER_COLOR)
  })
})
