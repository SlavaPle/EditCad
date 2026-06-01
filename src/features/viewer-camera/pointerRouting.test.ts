import { describe, expect, it } from 'vitest'
import {
  isSceneManipulatorPointerButton,
  SCENE_MANIPULATOR_POINTER_BUTTONS,
} from './pointerRouting'

describe('pointerRouting', () => {
  it('treats LMB and MMB as manipulator buttons', () => {
    expect(SCENE_MANIPULATOR_POINTER_BUTTONS).toEqual([0, 1])
    expect(isSceneManipulatorPointerButton(0)).toBe(true)
    expect(isSceneManipulatorPointerButton(1)).toBe(true)
    expect(isSceneManipulatorPointerButton(2)).toBe(false)
  })
})
