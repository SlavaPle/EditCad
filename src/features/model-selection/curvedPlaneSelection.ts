import { Vector3, type BufferGeometry } from 'three'
import { trySelectEllipseFromEdge, type EllipseChainResult } from './edgeEllipseSelection'
import { getFaceNeighbors, getFaceVertices } from './facePlaneSelection'

/**
 * Wybór „krzywej płaszczyzny” (pas ścian walca / stożka) między łukami.
 * Seed = trójkąt na ścianie bocznej; granice = elipsy/okręgi (lub wierzchołek stożka).
 */

/** Max kąt między normalnymi sąsiadów przy rozroście gładkiej ściany. */
const MAX_DIHEDRAL_DEG = 48
/** Min trójkątów w paśmie (odrzuca pojedynczą ścianę / płaską łatę). */
const MIN_CURVED_FACES = 4
const POSITION_EPSILON = 1e-5

export type CurvedPlaneBoundaryArc = {
  vertexIndices: number[]
  closed: boolean
}

export type CurvedPlaneSelectionResult = {
  faceIndices: number[]
  /** Reprezentatywny trójkąt (zwykle seed). */
  faceIndex: number
  arcA: CurvedPlaneBoundaryArc
  /** Drugi brzeg (walec / stożek ścięty). */
  arcB?: CurvedPlaneBoundaryArc
  /** Wierzchołek stożka zamiast arcB. */
  apexVertexIndex?: number
}

function edgeKey(a: number, b: number): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`
}

function buildCanonical(geometry: BufferGeometry): number[] {
  const position = geometry.getAttribute('position')
  const canonical = new Array<number>(position.count)
  const keyToCanon = new Map<string, number>()
  for (let i = 0; i < position.count; i++) {
    const key = `${Math.round(position.getX(i) / POSITION_EPSILON)}_${Math.round(position.getY(i) / POSITION_EPSILON)}_${Math.round(position.getZ(i) / POSITION_EPSILON)}`
    const existing = keyToCanon.get(key)
    if (existing !== undefined) {
      canonical[i] = existing
    } else {
      keyToCanon.set(key, i)
      canonical[i] = i
    }
  }
  return canonical
}

function faceNormal(
  geometry: BufferGeometry,
  faces: ReturnType<typeof getFaceVertices>,
  faceIndex: number,
  target: Vector3,
): Vector3 | null {
  const position = geometry.getAttribute('position')
  const tri = faces[faceIndex]
  if (!tri || !position) return null
  const [ia, ib, ic] = tri
  const ax = position.getX(ia)
  const ay = position.getY(ia)
  const az = position.getZ(ia)
  const bx = position.getX(ib)
  const by = position.getY(ib)
  const bz = position.getZ(ib)
  const cx = position.getX(ic)
  const cy = position.getY(ic)
  const cz = position.getZ(ic)
  target.set(
    (by - ay) * (cz - az) - (bz - az) * (cy - ay),
    (bz - az) * (cx - ax) - (bx - ax) * (cz - az),
    (bx - ax) * (cy - ay) - (by - ay) * (cx - ax),
  )
  if (target.lengthSq() < 1e-24) return null
  return target.normalize()
}

function dihedralDeg(n1: Vector3, n2: Vector3): number {
  const c = Math.max(-1, Math.min(1, n1.dot(n2)))
  return (Math.acos(c) * 180) / Math.PI
}

type GrowBandResult = {
  /** Pas zakrzywiony (walec/stożek) albo null. */
  patch: number[] | null
  /** Surowy wynik BFS (także płaska łata) — do skoku na sąsiednią ścianę. */
  rawPatch: number[]
  failReason?: 'badSeed' | 'noSeedNormal' | 'tooFewFaces' | 'tooFlat'
}

/** BFS: gładki pas ścian (walec/stożek), nie płaska łata. */
function growSmoothFaceBand(
  geometry: BufferGeometry,
  seedFaceIndex: number,
): GrowBandResult {
  const faces = getFaceVertices(geometry)
  if (seedFaceIndex < 0 || seedFaceIndex >= faces.length) {
    return { patch: null, rawPatch: [], failReason: 'badSeed' }
  }
  const neighbors = getFaceNeighbors(geometry)
  const nA = new Vector3()
  const nB = new Vector3()
  if (!faceNormal(geometry, faces, seedFaceIndex, nA)) {
    return { patch: null, rawPatch: [], failReason: 'noSeedNormal' }
  }

  const result: number[] = []
  const visited = new Set<number>([seedFaceIndex])
  const queue: number[] = [seedFaceIndex]

  while (queue.length > 0) {
    const current = queue.shift()!
    result.push(current)
    const nCurrent = faceNormal(geometry, faces, current, nA)
    if (!nCurrent) continue
    for (const nb of neighbors[current] ?? []) {
      if (visited.has(nb)) continue
      const nNb = faceNormal(geometry, faces, nb, nB)
      if (!nNb) continue
      const d = dihedralDeg(nCurrent, nNb)
      if (d > MAX_DIHEDRAL_DEG) continue
      visited.add(nb)
      queue.push(nb)
    }
  }

  if (result.length < MIN_CURVED_FACES) {
    return { patch: null, rawPatch: result, failReason: 'tooFewFaces' }
  }

  // Odrzuć prawie płaską łatę (wszystkie normalne ≈ seed)
  let maxAngle = 0
  const nSeed = faceNormal(geometry, faces, seedFaceIndex, nA)!
  for (const fi of result) {
    const n = faceNormal(geometry, faces, fi, nB)
    if (!n) continue
    maxAngle = Math.max(maxAngle, dihedralDeg(nSeed, n))
  }
  if (maxAngle < 8) {
    return { patch: null, rawPatch: result, failReason: 'tooFlat' }
  }

  return { patch: result, rawPatch: result }
}

function collectOutsideNeighborFaces(
  geometry: BufferGeometry,
  patch: readonly number[],
): number[] {
  const patchSet = new Set(patch)
  const neighbors = getFaceNeighbors(geometry)
  const outside: number[] = []
  const seen = new Set<number>()
  for (const fi of patch) {
    for (const nb of neighbors[fi] ?? []) {
      if (patchSet.has(nb) || seen.has(nb)) continue
      seen.add(nb)
      outside.push(nb)
    }
  }
  return outside
}

type BoundaryEdge = { a: number; b: number; ca: number; cb: number }

function collectBoundaryEdges(
  geometry: BufferGeometry,
  patch: readonly number[],
  canonical: readonly number[],
): BoundaryEdge[] {
  const faces = getFaceVertices(geometry)
  const patchSet = new Set(patch)
  const edgeFaces = new Map<string, number[]>()

  const add = (ia: number, ib: number, faceIndex: number) => {
    const ca = canonical[ia]!
    const cb = canonical[ib]!
    if (ca === cb) return
    const key = edgeKey(ca, cb)
    const list = edgeFaces.get(key)
    if (list) list.push(faceIndex)
    else edgeFaces.set(key, [faceIndex])
  }

  for (const fi of patch) {
    const tri = faces[fi]
    if (!tri) continue
    add(tri[0], tri[1], fi)
    add(tri[1], tri[2], fi)
    add(tri[2], tri[0], fi)
  }

  const boundary: BoundaryEdge[] = []
  for (const [key, faceList] of edgeFaces) {
    const inPatch = faceList.filter((f) => patchSet.has(f)).length
    // Krawędź graniczna: dokładnie jedna ściana z pasa (reszta poza lub brzeg siatki)
    if (inPatch !== 1) continue
    const [sa, sb] = key.split('_').map(Number) as [number, number]
    // Odtwórz surowe indeksy z pierwszej ściany w patchu
    let rawA = sa
    let rawB = sb
    for (const fi of faceList) {
      if (!patchSet.has(fi)) continue
      const tri = faces[fi]!
      const verts = [tri[0], tri[1], tri[2]]
      for (let i = 0; i < 3; i++) {
        const va = verts[i]!
        const vb = verts[(i + 1) % 3]!
        if (edgeKey(canonical[va]!, canonical[vb]!) === key) {
          rawA = va
          rawB = vb
          break
        }
      }
    }
    boundary.push({ a: rawA, b: rawB, ca: sa, cb: sb })
  }
  return boundary
}

function normalizeArcKey(indices: readonly number[]): string {
  if (indices.length === 0) return ''
  const forward = [...indices]
  const backward = [...indices].reverse()
  const rotations = (arr: number[]) => {
    const keys: string[] = []
    for (let i = 0; i < arr.length; i++) {
      keys.push([...arr.slice(i), ...arr.slice(0, i)].join(','))
    }
    return keys
  }
  return [...rotations(forward), ...rotations(backward)].sort()[0]!
}

function arcsEquivalent(a: EllipseChainResult, b: EllipseChainResult): boolean {
  return normalizeArcKey(a.vertexIndices) === normalizeArcKey(b.vertexIndices)
}

/** Ten sam okrąg/elipsa geometrycznie (fragmenty tej samej krawędzi CAD). */
function arcsSameGeometry(a: EllipseChainResult, b: EllipseChainResult): boolean {
  const nDot = Math.abs(
    a.normal[0] * b.normal[0] + a.normal[1] * b.normal[1] + a.normal[2] * b.normal[2],
  )
  if (nDot < 0.92) return false
  const scale = Math.max(a.radiusA, a.radiusB, b.radiusA, b.radiusB, 1e-6)
  const dx = a.center[0] - b.center[0]
  const dy = a.center[1] - b.center[1]
  const dz = a.center[2] - b.center[2]
  // Różne równoległe płaszczyzny (góra/dół walca) — NIE ten sam łuk
  const alongNormal = Math.abs(dx * a.normal[0] + dy * a.normal[1] + dz * a.normal[2])
  if (alongNormal > scale * 0.12) return false
  const dist = Math.hypot(dx, dy, dz)
  if (dist > scale * 0.25) return false
  const ra = (a.radiusA + a.radiusB) * 0.5
  const rb = (b.radiusA + b.radiusB) * 0.5
  return Math.abs(ra - rb) <= scale * 0.18
}

function arcPolylineLength(geometry: BufferGeometry, arc: EllipseChainResult): number {
  const position = geometry.getAttribute('position')
  if (!position) return 0
  const idx = arc.vertexIndices
  let total = 0
  for (let i = 0; i < idx.length - 1; i++) {
    const a = idx[i]!
    const b = idx[i + 1]!
    total += Math.hypot(
      position.getX(a) - position.getX(b),
      position.getY(a) - position.getY(b),
      position.getZ(a) - position.getZ(b),
    )
  }
  if (arc.closed && idx.length > 2) {
    const a = idx[idx.length - 1]!
    const b = idx[0]!
    total += Math.hypot(
      position.getX(a) - position.getX(b),
      position.getY(a) - position.getY(b),
      position.getZ(a) - position.getZ(b),
    )
  }
  return total
}

/** Scal fragmenty tej samej elipsy — zostaw najdłuższy łańcuch. */
function mergeArcsByGeometry(arcs: EllipseChainResult[]): EllipseChainResult[] {
  const merged: EllipseChainResult[] = []
  for (const arc of arcs) {
    const existingIdx = merged.findIndex((m) => arcsSameGeometry(m, arc))
    if (existingIdx < 0) {
      merged.push(arc)
      continue
    }
    if (arc.vertexIndices.length > merged[existingIdx]!.vertexIndices.length) {
      merged[existingIdx] = arc
    }
  }
  return merged
}

function collectDistinctBoundaryArcs(
  geometry: BufferGeometry,
  boundary: readonly BoundaryEdge[],
): EllipseChainResult[] {
  const arcs: EllipseChainResult[] = []
  for (const edge of boundary) {
    const selected = trySelectEllipseFromEdge(geometry, edge.a, edge.b)
    if (!selected || selected.vertexIndices.length < 5) continue
    if (arcs.some((existing) => arcsEquivalent(existing, selected))) continue
    arcs.push(selected)
  }
  return mergeArcsByGeometry(arcs).sort(
    (a, b) => b.vertexIndices.length - a.vertexIndices.length,
  )
}

const ARC_LENGTH_EQUAL_TOL = 0.22

function lengthsNearlyEqual(la: number, lb: number): boolean {
  const m = Math.max(la, lb, 1e-9)
  return Math.abs(la - lb) / m <= ARC_LENGTH_EQUAL_TOL
}

function planeNormalDot(a: EllipseChainResult, b: EllipseChainResult): number {
  return Math.abs(
    a.normal[0] * b.normal[0] + a.normal[1] * b.normal[1] + a.normal[2] * b.normal[2],
  )
}

function signedPlaneDist(
  px: number,
  py: number,
  pz: number,
  arc: EllipseChainResult,
): number {
  return (
    (px - arc.center[0]) * arc.normal[0] +
    (py - arc.center[1]) * arc.normal[1] +
    (pz - arc.center[2]) * arc.normal[2]
  )
}

function faceCentroid(
  geometry: BufferGeometry,
  faces: ReturnType<typeof getFaceVertices>,
  faceIndex: number,
): { x: number; y: number; z: number } | null {
  const position = geometry.getAttribute('position')
  const tri = faces[faceIndex]
  if (!position || !tri) return null
  return {
    x: (position.getX(tri[0]) + position.getX(tri[1]) + position.getX(tri[2])) / 3,
    y: (position.getY(tri[0]) + position.getY(tri[1]) + position.getY(tri[2])) / 3,
    z: (position.getZ(tri[0]) + position.getZ(tri[1]) + position.getZ(tri[2])) / 3,
  }
}

function minDistPointToArc(
  geometry: BufferGeometry,
  px: number,
  py: number,
  pz: number,
  arc: EllipseChainResult,
): number {
  const position = geometry.getAttribute('position')
  if (!position) return Number.POSITIVE_INFINITY
  let best = Number.POSITIVE_INFINITY
  for (const ix of arc.vertexIndices) {
    const d = Math.hypot(
      position.getX(ix) - px,
      position.getY(ix) - py,
      position.getZ(ix) - pz,
    )
    if (d < best) best = d
  }
  return best
}

type ArcPairCandidate = {
  arcA: EllipseChainResult
  arcB: EllipseChainResult
  lenA: number
  lenB: number
  score: number
}

/**
 * Para lokalnych łuków o zbliżonej długości (krawędzie tej samej ściany CAD),
 * nie pełne obręcze całej powierzchni. Preferuj krótkie / otwarte / blisko seed.
 */
function rankEqualLengthArcPairs(
  geometry: BufferGeometry,
  arcs: readonly EllipseChainResult[],
  seedFaceIndex: number,
): ArcPairCandidate[] {
  if (arcs.length < 2) return []
  const faces = getFaceVertices(geometry)
  const seedC = faceCentroid(geometry, faces, seedFaceIndex)
  if (!seedC) return []

  const lengths = arcs.map((a) => arcPolylineLength(geometry, a))
  const candidates: ArcPairCandidate[] = []

  for (let i = 0; i < arcs.length; i++) {
    const a = arcs[i]!
    const la = lengths[i]!
    for (let j = i + 1; j < arcs.length; j++) {
      const b = arcs[j]!
      if (arcsEquivalent(a, b)) continue
      const lb = lengths[j]!
      if (!lengthsNearlyEqual(la, lb)) continue
      const nDot = planeNormalDot(a, b)
      // Równoległe obręcze (także antyrównoległe normalne)
      if (nDot < 0.55) continue

      const dA = signedPlaneDist(seedC.x, seedC.y, seedC.z, a)
      const dB = signedPlaneDist(seedC.x, seedC.y, seedC.z, b)
      const sepCenters = Math.hypot(
        a.center[0] - b.center[0],
        a.center[1] - b.center[1],
        a.center[2] - b.center[2],
      )
      const scale = Math.max(a.radiusA, a.radiusB, b.radiusA, b.radiusB, 1e-6)
      // Ta sama płaszczyzna (nie para góra/dół)
      if (sepCenters < scale * 0.02 && Math.abs(dA - dB) < scale * 0.02) continue

      const between = dA * dB <= 0
      const lenSim = 1 - Math.abs(la - lb) / Math.max(la, lb, 1e-9)
      const meanLen = (la + lb) * 0.5
      const openBonus = !a.closed && !b.closed ? 8 : a.closed && b.closed ? -4 : 0
      const dist =
        minDistPointToArc(geometry, seedC.x, seedC.y, seedC.z, a) +
        minDistPointToArc(geometry, seedC.x, seedC.y, seedC.z, b)
      // Krótsze łuki = krawędzie ściany CAD; długie zamknięte = cała powierzchnia
      const score =
        lenSim * 10 +
        (between ? 6 : 0) +
        openBonus -
        meanLen * 0.08 -
        dist * 0.15

      candidates.push({ arcA: a, arcB: b, lenA: la, lenB: lb, score })
    }
  }

  candidates.sort((x, y) => y.score - x.score)
  return candidates
}

function wrapPi(a: number): number {
  let x = a
  while (x > Math.PI) x -= Math.PI * 2
  while (x < -Math.PI) x += Math.PI * 2
  return x
}

function angleInSector(angle: number, start: number, span: number): boolean {
  if (span >= Math.PI * 2 - 1e-3) return true
  let a = wrapPi(angle - start)
  if (a < 0) a += Math.PI * 2
  return a <= span + 1e-2
}

/** Kątowy zakres łuku z uporządkowanego łańcucha (końce + kierunek). */
function arcAngularSector(
  pointAngle: (ix: number) => number,
  arc: EllipseChainResult,
): { start: number; span: number } | null {
  const idx = arc.vertexIndices
  if (idx.length < 2) return null
  if (arc.closed) return { start: 0, span: Math.PI * 2 }

  const a0 = pointAngle(idx[0]!)
  const a1 = pointAngle(idx[idx.length - 1]!)
  // Dwa możliwe łuki między końcami — wybierz ten zgodny ze środkowym punktem łańcucha
  const mid = pointAngle(idx[Math.floor(idx.length / 2)]!)
  const ccwSpan = ((a1 - a0) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
  const cwSpan = ((a0 - a1) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)

  const midFrom0 = ((mid - a0) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
  if (midFrom0 <= ccwSpan + 1e-3 || ccwSpan < 1e-6) {
    return { start: a0, span: Math.max(ccwSpan, 1e-3) }
  }
  return { start: a1, span: Math.max(cwSpan, 1e-3) }
}

/** Przytnij pas do sektora między dwoma równymi łukami (rozmiar ściany CAD). */
function trimPatchToEqualArcs(
  geometry: BufferGeometry,
  patch: readonly number[],
  seedFaceIndex: number,
  arcA: EllipseChainResult,
  arcB: EllipseChainResult,
): number[] {
  const faces = getFaceVertices(geometry)
  const neighbors = getFaceNeighbors(geometry)
  const position = geometry.getAttribute('position')
  if (!position) return [...patch]

  const axisX = arcB.center[0] - arcA.center[0]
  const axisY = arcB.center[1] - arcA.center[1]
  const axisZ = arcB.center[2] - arcA.center[2]
  const axisLen = Math.hypot(axisX, axisY, axisZ)
  const nx = axisLen > 1e-12 ? axisX / axisLen : arcA.normal[0]
  const ny = axisLen > 1e-12 ? axisY / axisLen : arcA.normal[1]
  const nz = axisLen > 1e-12 ? axisZ / axisLen : arcA.normal[2]

  let bx = 1
  let by = 0
  let bz = 0
  if (Math.abs(nx) > 0.9) {
    bx = 0
    by = 1
  }
  const cx0 = by * nz - bz * ny
  const cy0 = bz * nx - bx * nz
  const cz0 = bx * ny - by * nx
  const cl = Math.hypot(cx0, cy0, cz0) || 1
  const ux = cx0 / cl
  const uy = cy0 / cl
  const uz = cz0 / cl
  const vx = ny * uz - nz * uy
  const vy = nz * ux - nx * uz
  const vz = nx * uy - ny * ux

  const midX = (arcA.center[0] + arcB.center[0]) * 0.5
  const midY = (arcA.center[1] + arcB.center[1]) * 0.5
  const midZ = (arcA.center[2] + arcB.center[2]) * 0.5

  const pointAngle = (ix: number) => {
    const dx = position.getX(ix) - midX
    const dy = position.getY(ix) - midY
    const dz = position.getZ(ix) - midZ
    return Math.atan2(dx * vx + dy * vy + dz * vz, dx * ux + dy * uy + dz * uz)
  }

  const open = !arcA.closed || !arcB.closed
  const secA = arcAngularSector(pointAngle, arcA)
  const secB = arcAngularSector(pointAngle, arcB)
  // Wspólny sektor: mniejszy z dwóch (ta sama ściana CAD)
  let startAng = 0
  let span = Math.PI * 2
  if (open && secA && secB) {
    if (secA.span <= secB.span) {
      startAng = secA.start
      span = secA.span
    } else {
      startAng = secB.start
      span = secB.span
    }
  } else if (open && secA) {
    startAng = secA.start
    span = secA.span
  } else if (open && secB) {
    startAng = secB.start
    span = secB.span
  }

  const axisMargin = Math.max(axisLen > 1e-12 ? 0.08 : 0.08, 1e-4)
  const patchSet = new Set(patch)
  const inBand: number[] = []
  for (const fi of patch) {
    const c = faceCentroid(geometry, faces, fi)
    if (!c) continue
    // Parametr wzdłuż osi między środkami łuków (odporny na znak normalnej fit)
    let alongAxis = true
    if (axisLen > 1e-12) {
      const t =
        ((c.x - arcA.center[0]) * nx +
          (c.y - arcA.center[1]) * ny +
          (c.z - arcA.center[2]) * nz) /
        axisLen
      alongAxis = t >= -axisMargin && t <= 1 + axisMargin
    } else {
      const dA = signedPlaneDist(c.x, c.y, c.z, arcA)
      const dB = signedPlaneDist(c.x, c.y, c.z, arcB)
      alongAxis = dA * dB <= 0 || Math.abs(dA) <= 1e-3 || Math.abs(dB) <= 1e-3
    }
    if (!alongAxis) continue

    if (open) {
      const ang = Math.atan2(
        (c.x - midX) * vx + (c.y - midY) * vy + (c.z - midZ) * vz,
        (c.x - midX) * ux + (c.y - midY) * uy + (c.z - midZ) * uz,
      )
      if (!angleInSector(ang, startAng, span)) continue
    }
    inBand.push(fi)
  }

  if (inBand.length === 0) return []
  const bandSet = new Set(inBand)
  if (!bandSet.has(seedFaceIndex)) {
    return []
  }

  const result: number[] = []
  const visited = new Set<number>([seedFaceIndex])
  const queue = [seedFaceIndex]
  while (queue.length > 0) {
    const cur = queue.shift()!
    result.push(cur)
    for (const nb of neighbors[cur] ?? []) {
      if (!bandSet.has(nb) || !patchSet.has(nb) || visited.has(nb)) continue
      visited.add(nb)
      queue.push(nb)
    }
  }
  return result.length >= MIN_CURVED_FACES ? result : []
}

function toBoundaryArc(arc: EllipseChainResult): CurvedPlaneBoundaryArc {
  return {
    vertexIndices: [...arc.vertexIndices],
    closed: arc.closed,
  }
}

function findConeApex(
  geometry: BufferGeometry,
  patch: readonly number[],
  arc: EllipseChainResult,
  canonical: readonly number[],
): number | null {
  const faces = getFaceVertices(geometry)
  const arcCanon = new Set(arc.vertexIndices.map((i) => canonical[i]!))
  const counts = new Map<number, number>()

  for (const fi of patch) {
    const tri = faces[fi]
    if (!tri) continue
    for (const vi of tri) {
      const c = canonical[vi]!
      if (arcCanon.has(c)) continue
      counts.set(c, (counts.get(c) ?? 0) + 1)
    }
  }

  let best: number | null = null
  let bestCount = 0
  for (const [c, count] of counts) {
    if (count > bestCount) {
      bestCount = count
      best = c
    }
  }
  // Apex powinien należeć do dużej części pasa
  if (best === null || bestCount < Math.max(3, Math.floor(patch.length * 0.35))) {
    return null
  }
  return best
}

function selectCurvedFromPatch(
  geometry: BufferGeometry,
  seedFaceIndex: number,
  patch: readonly number[],
): CurvedPlaneSelectionResult | null {
  const canonical = buildCanonical(geometry)
  const boundary = collectBoundaryEdges(geometry, patch, canonical)
  if (boundary.length < 3) return null

  const arcs = collectDistinctBoundaryArcs(geometry, boundary)
  if (arcs.length >= 2) {
    const ranked = rankEqualLengthArcPairs(geometry, arcs, seedFaceIndex)
    if (ranked.length === 0) return null

    // Najpierw lokalne łuki: przycięcie musi zawierać seed i być fragmentem, nie całą powierzchnią
    let chosen: {
      arcA: EllipseChainResult
      arcB: EllipseChainResult
      trimmed: number[]
    } | null = null

    for (const pair of ranked) {
      const trimmed = trimPatchToEqualArcs(
        geometry,
        patch,
        seedFaceIndex,
        pair.arcA,
        pair.arcB,
      )
      if (trimmed.length < MIN_CURVED_FACES) continue
      if (!trimmed.includes(seedFaceIndex)) continue
      const bothClosed = pair.arcA.closed && pair.arcB.closed
      // Otwarte łuki MUSZĄ wyciąć sektor — inaczej to nadal cała powierzchnia
      if (
        !bothClosed &&
        trimmed.length >= patch.length * 0.9 &&
        patch.length > MIN_CURVED_FACES * 2
      ) {
        continue
      }
      // Zamknięte pełne obręcze przy wielu kandydatach = cała powierzchnia — szukaj lokalnej pary
      if (bothClosed && ranked.length > 1 && trimmed.length >= patch.length * 0.85) {
        continue
      }
      chosen = { arcA: pair.arcA, arcB: pair.arcB, trimmed }
      break
    }

    // Fallback: najlepsza para z seed w trim (nawet pełny walec = jedna ściana CAD)
    if (!chosen) {
      for (const pair of ranked) {
        const trimmed = trimPatchToEqualArcs(
          geometry,
          patch,
          seedFaceIndex,
          pair.arcA,
          pair.arcB,
        )
        if (trimmed.length < MIN_CURVED_FACES) continue
        if (!trimmed.includes(seedFaceIndex)) continue
        chosen = { arcA: pair.arcA, arcB: pair.arcB, trimmed }
        break
      }
    }

    if (!chosen) return null

    return {
      faceIndices: [...chosen.trimmed].sort((a, b) => a - b),
      faceIndex: seedFaceIndex,
      arcA: toBoundaryArc(chosen.arcA),
      arcB: toBoundaryArc(chosen.arcB),
    }
  }

  if (arcs.length === 1) {
    const arcA = arcs[0]!
    const apex = findConeApex(geometry, patch, arcA, canonical)
    if (apex === null) return null
    return {
      faceIndices: [...patch].sort((a, b) => a - b),
      faceIndex: seedFaceIndex,
      arcA: toBoundaryArc(arcA),
      apexVertexIndex: apex,
    }
  }

  return null
}

/**
 * Ze seed-trójkąta na ścianie bocznej: pas gładkich ścian + 2 łuki
 * albo łuk + wierzchołek (stożek).
 * Przy płaskiej pokrywie z ostrą krawędzią — skok na sąsiednią ścianę walca.
 */
export function trySelectCurvedPlaneFromFace(
  geometry: BufferGeometry,
  seedFaceIndex: number,
): CurvedPlaneSelectionResult | null {
  const grown = growSmoothFaceBand(geometry, seedFaceIndex)
  if (grown.patch) {
    const selected = selectCurvedFromPatch(geometry, seedFaceIndex, grown.patch)
    if (selected) return selected
  }

  // Płaska łata (pokrywa) → spróbuj sąsiadów za ostrą krawędzią (ściana walca)
  if (grown.failReason !== 'tooFlat' || grown.rawPatch.length === 0) {
    return null
  }
  const outside = collectOutsideNeighborFaces(geometry, grown.rawPatch)
  for (const nb of outside) {
    const wall = growSmoothFaceBand(geometry, nb)
    if (!wall.patch) continue
    const selected = selectCurvedFromPatch(geometry, nb, wall.patch)
    if (selected) return selected
  }
  return null
}
