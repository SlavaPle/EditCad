import { selectFaces, type SelectionState } from '../../lib/selection'

export type ResolveFaceSelectionInput = {
  currentSelection: SelectionState
  primaryFaces: readonly number[]
  pickedFaces: readonly number[]
  probableFromPick?: readonly number[]
  probableFaces: readonly number[]
  shiftHeld: boolean
}

export type ResolveFaceSelectionResult = {
  nextSelection: SelectionState
  nextPrimaryFaces: readonly number[]
  nextProbableFaces: readonly number[]
  ignored: boolean
}

export function resolveFaceSelectionFlow(input: ResolveFaceSelectionInput): ResolveFaceSelectionResult {
  const { currentSelection, pickedFaces, probableFromPick = [], shiftHeld } = input

  const nextSelection = selectFaces(currentSelection, pickedFaces, 'replace')

  if (!shiftHeld) {
    return {
      nextSelection,
      nextPrimaryFaces: [...nextSelection.faces],
      nextProbableFaces: [],
      ignored: false,
    }
  }

  const selectedSet = new Set(nextSelection.faces)
  const nextProbableFaces = probableFromPick.filter((fi) => !selectedSet.has(fi))
  return {
    nextSelection,
    nextPrimaryFaces: [...nextSelection.faces],
    nextProbableFaces,
    ignored: false,
  }
}
