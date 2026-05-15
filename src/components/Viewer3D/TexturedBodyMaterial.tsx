import { useEffect, useLayoutEffect, useMemo } from 'react'
import { ShaderMaterial, Vector3, type BufferGeometry } from 'three'
import { getDefaultModelTexture } from '../../features/viewer-display/defaultModelTexture'
import { computeTriplanarMappingUniforms } from '../../features/viewer-display/triplanarMapping'
import {
  TRIPLANAR_FRAGMENT_SHADER,
  TRIPLANAR_VERTEX_SHADER,
} from '../../features/viewer-display/triplanarShaders'

interface TexturedBodyMaterialProps {
  geometry: BufferGeometry
  geometryRevision: number
}

export function TexturedBodyMaterial({ geometry, geometryRevision }: TexturedBodyMaterialProps) {
  const texture = useMemo(() => {
    const tex = getDefaultModelTexture()
    tex.repeat.set(1, 1)
    return tex
  }, [])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uMap: { value: texture },
          uOrigin: { value: new Vector3() },
          uInvSize: { value: new Vector3(1, 1, 1) },
        },
        vertexShader: TRIPLANAR_VERTEX_SHADER,
        fragmentShader: TRIPLANAR_FRAGMENT_SHADER,
      }),
    [texture],
  )

  useLayoutEffect(() => {
    const { origin, invSize } = computeTriplanarMappingUniforms(geometry)
    material.uniforms.uOrigin.value.copy(origin)
    material.uniforms.uInvSize.value.copy(invSize)
    material.uniforms.uMap.value = texture
  }, [geometry, geometryRevision, texture, material])

  useEffect(() => () => material.dispose(), [material])

  return <primitive object={material} attach="material" />
}
