import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { PhantomTransform } from '../model'
import type { PreAssemblyProgramPart } from '../preAssemblyProgram'
import {
  cloneProgramPartTransform,
  syncProgramPartTransformsMap,
} from './programPartTransformsSync'

/** Ostatni znany transform detali — baza dla kolejnego drag/obrotu. */
export function useProgramPartTransformsRef(parts: readonly PreAssemblyProgramPart[]) {
  const transformsRef = useRef<Map<string, PhantomTransform>>(new Map())

  const partIdsKey = useMemo(() => parts.map((part) => part.id).join('\0'), [parts])
  const partsRef = useRef(parts)
  partsRef.current = parts

  useEffect(() => {
    syncProgramPartTransformsMap(partsRef.current, transformsRef.current)
  }, [partIdsKey])

  const getTransform = useCallback((partId: string, fallback: PhantomTransform): PhantomTransform => {
    return transformsRef.current.get(partId) ?? cloneProgramPartTransform(fallback)
  }, [])

  const setTransform = useCallback((partId: string, transform: PhantomTransform) => {
    transformsRef.current.set(partId, cloneProgramPartTransform(transform))
  }, [])

  return { getTransform, setTransform }
}
