import { useEffect, useLayoutEffect, useMemo } from 'react'
import { DoubleSide, FrontSide, ShaderMaterial, Vector3, type BufferGeometry } from 'three'
import type { ModelAppearance } from '../../features/viewer-display/modelAppearance'
import { resolveModelTexture } from '../../features/viewer-display/modelAppearance'
import { getBodyTransparencyRenderState } from '../../features/viewer-display/bodyTransparencySettings'
import { computeTriplanarMappingUniforms } from '../../features/viewer-display/triplanarMapping'
import {
  TRIPLANAR_FRAGMENT_SHADER,
  TRIPLANAR_VERTEX_SHADER,
} from '../../features/viewer-display/triplanarShaders'

interface TexturedBodyMaterialProps {
  geometry: BufferGeometry
  geometryRevision: number
  appearance: ModelAppearance
}

function textureCacheKey(appearance: ModelAppearance): string {
  if (appearance.surface === 'color') {
    return `color:${appearance.color}`
  }
  if (appearance.texture.kind === 'image') {
    return `image:${appearance.texture.dataUrl.length}:${appearance.texture.dataUrl.slice(0, 48)}`
  }
  return 'default'
}

export function TexturedBodyMaterial({ geometry, geometryRevision, appearance }: TexturedBodyMaterialProps) {
  const textureKey = textureCacheKey(appearance)
  const bodyTransparency = getBodyTransparencyRenderState(appearance.opacity)
  const texture = useMemo(() => {
    const tex = resolveModelTexture(appearance)
    tex.repeat.set(4, 4)
    return tex
  }, [textureKey, appearance])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uMap: { value: texture },
          uOrigin: { value: new Vector3() },
          uInvSize: { value: new Vector3(1, 1, 1) },
          uOpacity: { value: bodyTransparency.opacity },
        },
        vertexShader: TRIPLANAR_VERTEX_SHADER,
        fragmentShader: TRIPLANAR_FRAGMENT_SHADER,
        transparent: bodyTransparency.transparent,
        depthWrite: bodyTransparency.depthWrite,
        side: bodyTransparency.doubleSided ? DoubleSide : FrontSide,
      }),
    [texture, appearance.opacity],
  )

  useLayoutEffect(() => {
    const bt = getBodyTransparencyRenderState(appearance.opacity)
    const { origin, invSize } = computeTriplanarMappingUniforms(geometry)
    material.uniforms.uOrigin.value.copy(origin)
    material.uniforms.uInvSize.value.copy(invSize)
    material.uniforms.uMap.value = texture
    material.uniforms.uOpacity.value = bt.opacity
    material.transparent = bt.transparent
    material.depthWrite = bt.depthWrite
    material.side = bt.doubleSided ? DoubleSide : FrontSide
  }, [geometry, geometryRevision, texture, material, appearance.opacity])

  useEffect(() => () => material.dispose(), [material])

  useEffect(() => {
    if (appearance.surface === 'color' || appearance.texture.kind === 'image') {
      return () => {
        texture.dispose()
      }
    }
    return undefined
  }, [texture, appearance.surface, appearance.texture])

  return <primitive object={material} attach="material" />
}
