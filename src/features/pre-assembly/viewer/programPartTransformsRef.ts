import { useCallback, useEffect, useRef } from 'react'
import type { PhantomTransform } from '../model'
import type { PreAssemblyProgramPart } from '../preAssemblyProgram'
import {
  cloneProgramPartTransform,
  syncProgramPartTransformsMap,
} from './programPartTransformsSync'

/** Ostatni znany transform detali — baza dla kolejnego drag/obrotu. */
export function useProgramPartTransformsRef(parts: readonly PreAssemblyProgramPart[]) {
  const transformsRef = useRef<Map<string, PhantomTransform>>(new Map())

  useEffect(() => {
    syncProgramPartTransformsMap(parts, transformsRef.current)
  }, [parts])

  const getTransform = useCallback((partId: string, fallback: PhantomTransform): PhantomTransform => {
    return transformsRef.current.get(partId) ?? cloneProgramPartTransform(fallback)
  }, [])

  const setTransform = useCallback((partId: string, transform: PhantomTransform) => {
    transformsRef.current.set(partId, cloneProgramPartTransform(transform))
  }, [])

  return { getTransform, setTransform }
}
