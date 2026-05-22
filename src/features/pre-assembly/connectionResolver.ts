import type {
  PhantomAssembly,
  ResolvePhantomConnectionsResult,
  ResolveSceneConnectionsResult,
  SceneDocument,
} from './model'

/** Stub — resolver połączeń floating wewnątrz fantomu (faza 2). */
export function resolvePhantomConnections(
  phantom: PhantomAssembly,
  _paramValues: Readonly<Record<string, number>> = {},
): ResolvePhantomConnectionsResult {
  const floating = phantom.connections.filter((c) => c.bindingKind === 'floating')
  if (floating.length > 0) {
    return {
      ok: false,
      error: 'Floating connection resolver is not implemented (phase 2).',
      reason: 'unsupported',
    }
  }

  const customRules = phantom.connections.filter((c) => c.rule.kind === 'custom')
  if (customRules.length > 0) {
    return {
      ok: false,
      error: 'Custom connection rules are not implemented (phase 2).',
      reason: 'unsupported',
    }
  }

  return { ok: true, placements: [] }
}

/** Stub — resolver połączeń między fantomami w scenie (faza 2). */
export function resolveSceneConnections(
  scene: SceneDocument,
): ResolveSceneConnectionsResult {
  if (scene.connections.length > 0) {
    return {
      ok: false,
      error: 'Scene connection resolver is not implemented (phase 2).',
      reason: 'unsupported',
    }
  }

  const phantomTransforms: Record<string, PhantomAssembly['transform']> = {}
  for (const ref of scene.phantoms) {
    phantomTransforms[ref.id] = ref.transform
  }
  return { ok: true, phantomTransforms }
}
