import { Vector3, type BufferGeometry } from 'three'
import { getFaceVertices } from './facePlaneSelection'

const POSITION_EPSILON = 1e-5
/**
 * Łuk = krótkie odcinki o wspólnej zależności kąta skrętu i długości.
 * Kąt/długość mogą lekko pływać; skok = inny łuk / prosta / róg.
 */
const MIN_TURN_DEG = 2.5
const MAX_TURN_DEG = 78
/**
 * Lokalna ciągłość (nie średnia całego łańcucha): kąt/długość mogą
 * płynnie dryfować (elipsa), ale skok = inny łuk / prosta.
 * Elipsa 30×12 @ 20 pkt: consecutive turn ≈×1.85, length ≈×1.36.
 */
const TURN_REL_TOL = 1.0
const TURN_ABS_TOL_DEG = 12
const LEN_REL_TOL = 0.6
const LEN_ABS_TOL_FACTOR = 0.02
/** Min punktów na łuk / elipsę. */
const MIN_ELLIPSE_POINTS = 5
/** Max względny błąd residuali względem średniego „promienia”. */
const MAX_REL_RESIDUAL = 0.12
const MIN_POINTS_FOR_PLANE = 3
const COPLANAR_REL_TOL = 0.04

export type EllipseChainResult = {
  /** Uporządkowane indeksy wierzchołków siatki (bez powtórzenia startu). */
  vertexIndices: number[]
  closed: boolean
  /** true = a≈b w płaszczyźnie. */
  isCircle: boolean
  center: [number, number, number]
  normal: [number, number, number]
  radiusA: number
  radiusB: number
  rmsResidual: number
}

type Vec3 = { x: number; y: number; z: number }

function edgeKey(a: number, b: number): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`
}

function buildCanonicalMap(geometry: BufferGeometry): {
  canonical: number[]
  position: { getX(i: number): number; getY(i: number): number; getZ(i: number): number; count: number }
} {
  const position = geometry.getAttribute('position')
  if (!position) {
    return { canonical: [], position: { getX: () => 0, getY: () => 0, getZ: () => 0, count: 0 } }
  }
  const canonical = new Array<number>(position.count)
  const keyToCanon = new Map<string, number>()
  for (let i = 0; i < position.count; i++) {
    const kx = Math.round(position.getX(i) / POSITION_EPSILON)
    const ky = Math.round(position.getY(i) / POSITION_EPSILON)
    const kz = Math.round(position.getZ(i) / POSITION_EPSILON)
    const key = `${kx}_${ky}_${kz}`
    const existing = keyToCanon.get(key)
    if (existing !== undefined) {
      canonical[i] = existing
    } else {
      keyToCanon.set(key, i)
      canonical[i] = i
    }
  }
  return { canonical, position }
}

function readPoint(
  position: { getX(i: number): number; getY(i: number): number; getZ(i: number): number },
  index: number,
): Vec3 {
  return { x: position.getX(index), y: position.getY(index), z: position.getZ(index) }
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

function len(a: Vec3): number {
  return Math.hypot(a.x, a.y, a.z)
}

function normalize(a: Vec3): Vec3 | null {
  const l = len(a)
  if (l < 1e-18) return null
  return { x: a.x / l, y: a.y / l, z: a.z / l }
}

type EdgeAdjacencyGraph = {
  adj: Map<number, number[]>
  canonical: number[]
  position: { getX(i: number): number; getY(i: number): number; getZ(i: number): number; count: number }
}

/** Cache grafu — hover woła trySelect wiele razy na klatkę. */
const edgeAdjacencyCache = new WeakMap<BufferGeometry, EdgeAdjacencyGraph>()

/** Graf krawędzi siatki: kanoniczny wierzchołek → sąsiedzi. */
function buildEdgeAdjacency(geometry: BufferGeometry): EdgeAdjacencyGraph {
  const { canonical, position } = buildCanonicalMap(geometry)
  const adj = new Map<number, number[]>()
  const seen = new Set<string>()
  const faces = getFaceVertices(geometry)

  const add = (ia: number, ib: number) => {
    const ca = canonical[ia]!
    const cb = canonical[ib]!
    if (ca === cb) return
    const key = edgeKey(ca, cb)
    if (seen.has(key)) return
    seen.add(key)
    const la = adj.get(ca) ?? []
    la.push(cb)
    adj.set(ca, la)
    const lb = adj.get(cb) ?? []
    lb.push(ca)
    adj.set(cb, lb)
  }

  for (const [a, b, c] of faces) {
    add(a, b)
    add(b, c)
    add(c, a)
  }

  return { adj, canonical, position }
}

function getEdgeAdjacency(geometry: BufferGeometry): EdgeAdjacencyGraph {
  const cached = edgeAdjacencyCache.get(geometry)
  if (cached) return cached
  const built = buildEdgeAdjacency(geometry)
  edgeAdjacencyCache.set(geometry, built)
  return built
}

function triangleVertexIndices(geometry: BufferGeometry, faceIndex: number): [number, number, number] | null {
  const position = geometry.getAttribute('position')
  if (!position || faceIndex < 0) return null
  const index = geometry.getIndex()
  if (index) {
    const base = faceIndex * 3
    if (base + 2 >= index.count) return null
    return [index.getX(base), index.getX(base + 1), index.getX(base + 2)]
  }
  const ia = faceIndex * 3
  if (ia + 2 >= position.count) return null
  return [ia, ia + 1, ia + 2]
}

function finishEllipseFromGrown(
  grown: { indices: number[]; closed: boolean },
  position: EdgeAdjacencyGraph['position'],
  seedA: number,
  seedB: number,
): EllipseChainResult | null {
  if (grown.indices.length < MIN_ELLIPSE_POINTS) return null
  const pruned = pruneChainToCurve(grown.indices, position, seedA, seedB)
  if (pruned.length < MIN_ELLIPSE_POINTS) return null
  const fitted = fitChainEllipse(pruned, position)
  if (!fitted) return null
  const closed =
    grown.closed &&
    pruned.length >= MIN_ELLIPSE_POINTS &&
    pruned[0] === grown.indices[0] &&
    pruned[pruned.length - 1] === grown.indices[grown.indices.length - 1]
  return {
    vertexIndices: pruned,
    closed,
    isCircle: fitted.isCircle,
    center: fitted.center,
    normal: fitted.normal,
    radiusA: fitted.radiusA,
    radiusB: fitted.radiusB,
    rmsResidual: fitted.rms,
  }
}

function trySelectEllipseFromCanonicalEdge(
  graph: EdgeAdjacencyGraph,
  ca: number,
  cb: number,
): EllipseChainResult | null {
  if (ca === cb) return null
  const grown = growChainFromSeed(graph.adj, graph.position, ca, cb)
  return finishEllipseFromGrown(grown, graph.position, ca, cb)
}

function preferLongerArc(
  best: EllipseChainResult | null,
  candidate: EllipseChainResult | null,
): EllipseChainResult | null {
  if (!candidate) return best
  if (!best || candidate.vertexIndices.length > best.vertexIndices.length) return candidate
  return best
}

function turnDegrees(prev: Vec3, curr: Vec3, next: Vec3): number {
  const u = normalize(sub(curr, prev))
  const v = normalize(sub(next, curr))
  if (!u || !v) return 180
  const c = Math.max(-1, Math.min(1, dot(u, v)))
  return (Math.acos(c) * 180) / Math.PI
}

/** Skręt ze znakiem (kierunek krzywizny) względem normalnej płaszczyzny. */
function signedTurnDegrees(prev: Vec3, curr: Vec3, next: Vec3, planeNormal: Vec3 | null): number {
  const u = normalize(sub(curr, prev))
  const v = normalize(sub(next, curr))
  if (!u || !v) return 180
  const c = Math.max(-1, Math.min(1, dot(u, v)))
  const ang = (Math.acos(c) * 180) / Math.PI
  if (!planeNormal) return ang
  const cr = cross(u, v)
  const s = Math.sign(dot(cr, planeNormal))
  return (s === 0 ? 1 : s) * ang
}

function segmentLength(a: Vec3, b: Vec3): number {
  return len(sub(b, a))
}

/** Prawie prosta kontynuacja — nie należy do łuku. */
function isStraightContinuation(prev: Vec3, curr: Vec3, next: Vec3): boolean {
  return turnDegrees(prev, curr, next) < MIN_TURN_DEG
}

function isArcTurnMagnitude(turnAbsDeg: number): boolean {
  return turnAbsDeg >= MIN_TURN_DEG && turnAbsDeg <= MAX_TURN_DEG
}

function turnsMatchPattern(candidateTurn: number, expectedTurn: number): boolean {
  if (!isArcTurnMagnitude(Math.abs(candidateTurn))) return false
  // Ten sam kierunek krzywizny
  if (expectedTurn !== 0 && Math.sign(candidateTurn) !== Math.sign(expectedTurn)) return false
  const diff = Math.abs(Math.abs(candidateTurn) - Math.abs(expectedTurn))
  const tol = Math.max(TURN_ABS_TOL_DEG, Math.abs(expectedTurn) * TURN_REL_TOL)
  return diff <= tol
}

function lengthsMatchPattern(candidateLen: number, expectedLen: number, modelScale: number): boolean {
  if (!(candidateLen > 1e-18) || !(expectedLen > 1e-18)) return false
  const tol = Math.max(modelScale * LEN_ABS_TOL_FACTOR, expectedLen * LEN_REL_TOL)
  return Math.abs(candidateLen - expectedLen) <= tol
}

/** Długość odcinka na końcu łańcucha (forward = ostatni, else = pierwszy). */
function tipSegmentLength(
  chain: readonly number[],
  position: { getX(i: number): number; getY(i: number): number; getZ(i: number): number },
  forward: boolean,
): number {
  if (chain.length < 2) return 0
  if (forward) {
    return segmentLength(
      readPoint(position, chain[chain.length - 2]!),
      readPoint(position, chain[chain.length - 1]!),
    )
  }
  return segmentLength(readPoint(position, chain[0]!), readPoint(position, chain[1]!))
}

/** Ostatni znany skręt przy końcu, z którego rosną. */
function tipSignedTurn(
  chain: readonly number[],
  position: { getX(i: number): number; getY(i: number): number; getZ(i: number): number },
  planeNormal: Vec3 | null,
  forward: boolean,
): number | null {
  if (chain.length < 3) return null
  if (forward) {
    const n = chain.length
    return signedTurnDegrees(
      readPoint(position, chain[n - 3]!),
      readPoint(position, chain[n - 2]!),
      readPoint(position, chain[n - 1]!),
      planeNormal,
    )
  }
  return signedTurnDegrees(
    readPoint(position, chain[2]!),
    readPoint(position, chain[1]!),
    readPoint(position, chain[0]!),
    planeNormal,
  )
}

function fitPlane(points: readonly Vec3[]): { origin: Vec3; normal: Vec3 } | null {
  if (points.length < 3) return null
  let cx = 0
  let cy = 0
  let cz = 0
  for (const p of points) {
    cx += p.x
    cy += p.y
    cz += p.z
  }
  const n = points.length
  cx /= n
  cy /= n
  cz /= n
  const origin = { x: cx, y: cy, z: cz }

  // Kowariancja → najmniejsza składowa PCA (przybliżenie: cross skrajnych wektorów + poprawka)
  // Cross dwóch wektorów od centroidu o max powierzchni → normalna płaszczyzny
  let best = null as Vec3 | null
  let bestArea = -1
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const a = sub(points[i]!, origin)
      const b = sub(points[j]!, origin)
      const nrm = cross(a, b)
      const area = len(nrm)
      if (area > bestArea) {
        bestArea = area
        best = nrm
      }
    }
  }
  const normal = best ? normalize(best) : null
  if (!normal) return null
  return { origin, normal }
}

function pointPlaneDistance(p: Vec3, origin: Vec3, normal: Vec3): number {
  return Math.abs(dot(sub(p, origin), normal))
}

function projectToPlaneBasis(
  points: readonly Vec3[],
  origin: Vec3,
  normal: Vec3,
): { u: Vec3; v: Vec3; uv: Array<{ x: number; y: number }> } | null {
  const helper =
    Math.abs(normal.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 }
  const u = normalize(cross(helper, normal))
  if (!u) return null
  const v = normalize(cross(normal, u))
  if (!v) return null
  const uv = points.map((p) => {
    const d = sub(p, origin)
    return { x: dot(d, u), y: dot(d, v) }
  })
  return { u, v, uv }
}

/** Algebraiczny fit okręgu w 2D (Kåsa). */
function fitCircle2D(
  pts: readonly { x: number; y: number }[],
): { cx: number; cy: number; r: number; rms: number } | null {
  if (pts.length < 3) return null
  let sumX = 0
  let sumY = 0
  let sumX2 = 0
  let sumY2 = 0
  let sumXY = 0
  let sumX3 = 0
  let sumY3 = 0
  let sumX2Y = 0
  let sumXY2 = 0
  for (const p of pts) {
    const x = p.x
    const y = p.y
    const x2 = x * x
    const y2 = y * y
    sumX += x
    sumY += y
    sumX2 += x2
    sumY2 += y2
    sumXY += x * y
    sumX3 += x2 * x
    sumY3 += y2 * y
    sumX2Y += x2 * y
    sumXY2 += x * y2
  }
  const n = pts.length
  const C = n * sumX2 - sumX * sumX
  const D = n * sumXY - sumX * sumY
  const E = n * sumY2 - sumY * sumY
  const G = 0.5 * (n * sumX3 - sumX * sumX2 + n * sumXY2 - sumX * sumY2)
  const H = 0.5 * (n * sumY3 - sumY * sumY2 + n * sumX2Y - sumY * sumX2)
  const denom = C * E - D * D
  if (Math.abs(denom) < 1e-18) return null
  const cx = (G * E - H * D) / denom
  const cy = (C * H - D * G) / denom
  let rSum = 0
  let r2Sum = 0
  for (const p of pts) {
    const ri = Math.hypot(p.x - cx, p.y - cy)
    rSum += ri
    r2Sum += (ri - 0) ** 2
  }
  const r = rSum / n
  if (!(r > 1e-12)) return null
  let err = 0
  for (const p of pts) {
    const ri = Math.hypot(p.x - cx, p.y - cy)
    err += (ri - r) ** 2
  }
  return { cx, cy, r, rms: Math.sqrt(err / n) }
}

/**
 * Fit elipsy osiowo-wyrównanej w układzie PCA 2D (przybliżenie dla owalu po stretch).
 * Dla pełniejszej ogólnej elipsy wystarczy obrót PCA chmury.
 */
function fitEllipsePca2D(
  pts: readonly { x: number; y: number }[],
): { cx: number; cy: number; ra: number; rb: number; rms: number; isCircle: boolean } | null {
  if (pts.length < MIN_ELLIPSE_POINTS) return null
  let mx = 0
  let my = 0
  for (const p of pts) {
    mx += p.x
    my += p.y
  }
  mx /= pts.length
  my /= pts.length
  let sxx = 0
  let sxy = 0
  let syy = 0
  for (const p of pts) {
    const dx = p.x - mx
    const dy = p.y - my
    sxx += dx * dx
    sxy += dx * dy
    syy += dy * dy
  }
  const trace = sxx + syy
  const det = sxx * syy - sxy * sxy
  const disc = Math.sqrt(Math.max(0, (trace * trace) / 4 - det))
  const l1 = trace / 2 + disc
  // Osie PCA
  let ax = 1
  let ay = 0
  if (Math.abs(sxy) > 1e-18 || Math.abs(sxx - l1) > 1e-18) {
    ax = l1 - syy
    ay = sxy
    const al = Math.hypot(ax, ay)
    if (al > 1e-18) {
      ax /= al
      ay /= al
    }
  }
  const bx = -ay
  const by = ax

  // Półosie ≈ max |projekcji| na osie PCA (stabilniejsze niż RMS dla elipsy)
  let ra = 0
  let rb = 0
  for (const p of pts) {
    const dx = p.x - mx
    const dy = p.y - my
    const pa = Math.abs(dx * ax + dy * ay)
    const pb = Math.abs(dx * bx + dy * by)
    if (pa > ra) ra = pa
    if (pb > rb) rb = pb
  }
  if (!(ra > 1e-12) || !(rb > 1e-12)) return null
  if (rb > ra) {
    const t = ra
    ra = rb
    rb = t
  }

  let err = 0
  for (const p of pts) {
    const dx = p.x - mx
    const dy = p.y - my
    const pa = dx * ax + dy * ay
    const pb = dx * bx + dy * by
    const q = (pa * pa) / (ra * ra) + (pb * pb) / (rb * rb)
    // odległość przybliżona do elipsy
    err += (Math.sqrt(Math.max(q, 0)) - 1) ** 2 * ((ra + rb) * 0.5) ** 2
  }
  const rms = Math.sqrt(err / pts.length)
  const ratio = Math.max(ra, rb) / Math.min(ra, rb)
  return {
    cx: mx,
    cy: my,
    ra: Math.max(ra, rb),
    rb: Math.min(ra, rb),
    rms,
    isCircle: ratio < 1.08,
  }
}

function growChainFromSeed(
  adj: Map<number, number[]>,
  position: { getX(i: number): number; getY(i: number): number; getZ(i: number): number },
  startA: number,
  startB: number,
): { indices: number[]; closed: boolean } {
  const chain: number[] = [startA, startB]
  const used = new Set<string>([edgeKey(startA, startB)])
  const seedLen = segmentLength(readPoint(position, startA), readPoint(position, startB))
  const modelScale = Math.max(seedLen, 1e-3)

  const extend = (forward: boolean) => {
    for (;;) {
      const tip = forward ? chain[chain.length - 1]! : chain[0]!
      const prev = forward ? chain[chain.length - 2]! : chain[1]!
      const neighbors = adj.get(tip) ?? []
      let best: number | null = null
      let bestScore = Infinity

      const chainPts = chain.map((i) => readPoint(position, i))
      const plane =
        chainPts.length >= MIN_POINTS_FOR_PLANE ? fitPlane(chainPts) : null
      let extent = 0
      if (plane) {
        for (const p of chainPts) {
          extent = Math.max(extent, len(sub(p, plane.origin)))
        }
      }
      const planeTol = Math.max(1e-4, extent * COPLANAR_REL_TOL)
      const planeNormal = plane?.normal ?? null

      // Wzorzec lokalny: ostatni odcinek + ostatni skręt (dryf OK, skok nie)
      const expectedLen = tipSegmentLength(chain, position, forward) || seedLen
      const expectedTurn = tipSignedTurn(chain, position, planeNormal, forward)

      for (const next of neighbors) {
        if (next === prev) continue
        const key = edgeKey(tip, next)
        if (used.has(key)) continue
        const tipP = readPoint(position, tip)
        const prevP = readPoint(position, prev)
        const nextP = readPoint(position, next)
        const turn = signedTurnDegrees(prevP, tipP, nextP, planeNormal)
        const turnAbs = Math.abs(turn)
        if (!isArcTurnMagnitude(turnAbs)) continue

        const segLen = segmentLength(tipP, nextP)
        if (!lengthsMatchPattern(segLen, expectedLen, modelScale)) continue
        if (expectedTurn !== null && !turnsMatchPattern(turn, expectedTurn)) continue

        if (plane && pointPlaneDistance(nextP, plane.origin, plane.normal) > planeTol) {
          continue
        }

        const turnRef = expectedTurn !== null ? Math.abs(expectedTurn) : 18
        const score =
          Math.abs(segLen - expectedLen) / Math.max(expectedLen, 1e-9) +
          Math.abs(turnAbs - turnRef) / Math.max(turnRef, 1e-9)
        if (score < bestScore) {
          bestScore = score
          best = next
        }
      }

      if (best === null) return

      if (best === (forward ? chain[0] : chain[chain.length - 1])) {
        const tipP = readPoint(position, tip)
        const prevP = readPoint(position, prev)
        const nextP = readPoint(position, best)
        const turn = signedTurnDegrees(prevP, tipP, nextP, planeNormal)
        const segLen = segmentLength(tipP, nextP)
        if (!isArcTurnMagnitude(Math.abs(turn))) return
        if (expectedTurn !== null && !turnsMatchPattern(turn, expectedTurn)) return
        if (!lengthsMatchPattern(segLen, expectedLen, modelScale)) return
        used.add(edgeKey(tip, best))
        return
      }
      used.add(edgeKey(tip, best))
      if (forward) chain.push(best)
      else chain.unshift(best)
      if (chain.length > 10_000) return
    }
  }

  extend(true)
  extend(false)

  const trimmed = trimStraightRuns(chain, position)

  const closed =
    trimmed.length >= MIN_ELLIPSE_POINTS &&
    (adj.get(trimmed[0]!) ?? []).includes(trimmed[trimmed.length - 1]!) &&
    used.has(edgeKey(trimmed[0]!, trimmed[trimmed.length - 1]!))

  let reallyClosed = closed
  if (!reallyClosed && trimmed.length >= MIN_ELLIPSE_POINTS) {
    const a = trimmed[0]!
    const b = trimmed[trimmed.length - 1]!
    if ((adj.get(a) ?? []).includes(b)) {
      const tipP = readPoint(position, b)
      const prevP = readPoint(position, trimmed[trimmed.length - 2]!)
      const nextP = readPoint(position, a)
      const plane = fitPlane(trimmed.map((i) => readPoint(position, i)))
      const planeN = plane?.normal ?? null
      const turn = signedTurnDegrees(prevP, tipP, nextP, planeN)
      const expectedTurn = tipSignedTurn(trimmed, position, planeN, true)
      const expectedLen = tipSegmentLength(trimmed, position, true) || seedLen
      const segLen = segmentLength(tipP, nextP)
      if (
        isArcTurnMagnitude(Math.abs(turn)) &&
        (expectedTurn === null || turnsMatchPattern(turn, expectedTurn)) &&
        lengthsMatchPattern(segLen, expectedLen, modelScale)
      ) {
        reallyClosed = true
      }
    }
  }

  return { indices: trimmed, closed: reallyClosed }
}

/**
 * Usuwa wierzchołki z końców, gdzie kolejne skręty są prawie proste.
 * Zachowuje spójny środkowy łuk zawierający seed (środek łańcucha startowego).
 */
function trimStraightRuns(
  chain: readonly number[],
  position: { getX(i: number): number; getY(i: number): number; getZ(i: number): number },
): number[] {
  if (chain.length < 3) return [...chain]
  let lo = 0
  let hi = chain.length - 1
  while (hi - lo >= 2) {
    const p0 = readPoint(position, chain[lo]!)
    const p1 = readPoint(position, chain[lo + 1]!)
    const p2 = readPoint(position, chain[lo + 2]!)
    if (!isStraightContinuation(p0, p1, p2)) break
    lo += 1
  }
  while (hi - lo >= 2) {
    const p0 = readPoint(position, chain[hi - 2]!)
    const p1 = readPoint(position, chain[hi - 1]!)
    const p2 = readPoint(position, chain[hi]!)
    if (!isStraightContinuation(p0, p1, p2)) break
    hi -= 1
  }
  return chain.slice(lo, hi + 1)
}

/**
 * Przy trafieniu w wierzchołek (krótkie cięciwy łuku) — spróbuj łuku
 * z każdej krawędzi wychodzącej z wierzchołka; bierz najdłuższy trafiony łańcuch.
 */
export function trySelectEllipseFromVertex(
  geometry: BufferGeometry,
  vertexIndex: number,
): EllipseChainResult | null {
  const graph = getEdgeAdjacency(geometry)
  if (!graph.position.count) return null
  if (
    !Number.isInteger(vertexIndex) ||
    vertexIndex < 0 ||
    vertexIndex >= graph.position.count
  ) {
    return null
  }
  const cv = graph.canonical[vertexIndex]!
  const neighbors = graph.adj.get(cv) ?? []
  let best: EllipseChainResult | null = null
  for (const nb of neighbors) {
    best = preferLongerArc(best, trySelectEllipseFromCanonicalEdge(graph, cv, nb))
  }
  return best
}

/**
 * Ze seed-krawędzi siatki próbuje zbudować łańcuch łuku/okręgu/elipsy
 * (także częściowy — nie musi być zamknięty).
 */
export function trySelectEllipseFromEdge(
  geometry: BufferGeometry,
  vertexA: number,
  vertexB: number,
): EllipseChainResult | null {
  const graph = getEdgeAdjacency(geometry)
  if (!graph.position.count) return null
  if (
    !Number.isInteger(vertexA) ||
    !Number.isInteger(vertexB) ||
    vertexA < 0 ||
    vertexB < 0 ||
    vertexA >= graph.position.count ||
    vertexB >= graph.position.count
  ) {
    return null
  }

  const ca = graph.canonical[vertexA]!
  const cb = graph.canonical[vertexB]!
  return trySelectEllipseFromCanonicalEdge(graph, ca, cb)
}

/**
 * Hover na ścianie (bez crease-edge / vertex w tolerancji): spróbuj łuku
 * z wierzchołków i krawędzi trójkąta pod kursorem — od razu, bez flasha ściany.
 */
export function trySelectEllipseNearFace(
  geometry: BufferGeometry,
  faceIndex: number,
): EllipseChainResult | null {
  const tri = triangleVertexIndices(geometry, faceIndex)
  if (!tri) return null
  const [ia, ib, ic] = tri
  const graph = getEdgeAdjacency(geometry)
  const ca = graph.canonical[ia]!
  const cb = graph.canonical[ib]!
  const cc = graph.canonical[ic]!

  let best: EllipseChainResult | null = null
  // Najpierw krawędzie trójkąta (szybki seed), potem pełny wachlarz z wierzchołków
  for (const [a, b] of [
    [ca, cb],
    [cb, cc],
    [cc, ca],
  ] as const) {
    best = preferLongerArc(best, trySelectEllipseFromCanonicalEdge(graph, a, b))
  }
  for (const cv of [ca, cb, cc]) {
    const neighbors = graph.adj.get(cv) ?? []
    for (const nb of neighbors) {
      best = preferLongerArc(best, trySelectEllipseFromCanonicalEdge(graph, cv, nb))
    }
  }
  return best
}

function pointRadialError2D(
  uv: { x: number; y: number },
  chosen: { cx: number; cy: number; ra: number; rb: number; isCircle: boolean },
): number {
  if (chosen.isCircle || Math.abs(chosen.ra - chosen.rb) < 1e-9) {
    return Math.abs(Math.hypot(uv.x - chosen.cx, uv.y - chosen.cy) - chosen.ra)
  }
  // przybliżenie: PCA-elipsa w układzie już wycentrowanym w fitEllipsePca2D (osie ≈ XY po PCA)
  const dx = uv.x - chosen.cx
  const dy = uv.y - chosen.cy
  const q = (dx * dx) / (chosen.ra * chosen.ra) + (dy * dy) / (chosen.rb * chosen.rb)
  return Math.abs(Math.sqrt(Math.max(q, 0)) - 1) * ((chosen.ra + chosen.rb) * 0.5)
}

function fitChainEllipse(
  indices: readonly number[],
  position: { getX(i: number): number; getY(i: number): number; getZ(i: number): number },
): {
  center: [number, number, number]
  normal: [number, number, number]
  radiusA: number
  radiusB: number
  rms: number
  isCircle: boolean
  planeOrigin: Vec3
  planeNormal: Vec3
  u: Vec3
  v: Vec3
  chosen: { cx: number; cy: number; ra: number; rb: number; isCircle: boolean }
} | null {
  const points = indices.map((i) => readPoint(position, i))
  const plane = fitPlane(points)
  if (!plane) return null
  let extent = 0
  for (const p of points) {
    extent = Math.max(extent, len(sub(p, plane.origin)))
  }
  const planeTol = Math.max(1e-4, extent * COPLANAR_REL_TOL)
  for (const p of points) {
    if (pointPlaneDistance(p, plane.origin, plane.normal) > planeTol) return null
  }
  const proj = projectToPlaneBasis(points, plane.origin, plane.normal)
  if (!proj) return null
  const chosen = chooseCircleOrEllipse(fitCircle2D(proj.uv), fitEllipsePca2D(proj.uv))
  if (!chosen) return null
  const meanR = (chosen.ra + chosen.rb) * 0.5
  if (chosen.rms > meanR * MAX_REL_RESIDUAL) return null
  const center = {
    x: plane.origin.x + proj.u.x * chosen.cx + proj.v.x * chosen.cy,
    y: plane.origin.y + proj.u.y * chosen.cx + proj.v.y * chosen.cy,
    z: plane.origin.z + proj.u.z * chosen.cx + proj.v.z * chosen.cy,
  }
  return {
    center: [center.x, center.y, center.z],
    normal: [plane.normal.x, plane.normal.y, plane.normal.z],
    radiusA: chosen.ra,
    radiusB: chosen.rb,
    rms: chosen.rms,
    isCircle: chosen.isCircle,
    planeOrigin: plane.origin,
    planeNormal: plane.normal,
    u: proj.u,
    v: proj.v,
    chosen: {
      cx: chosen.cx,
      cy: chosen.cy,
      ra: chosen.ra,
      rb: chosen.rb,
      isCircle: chosen.isCircle,
    },
  }
}

/**
 * Wybór okrąg vs elipsa — ten sam co fitChainEllipse
 * (PCA-elipsa na otwartym łuku łatwo „psuje” residuale).
 */
function chooseCircleOrEllipse(
  circle: { cx: number; cy: number; r: number; rms: number } | null,
  ellipse: { cx: number; cy: number; ra: number; rb: number; rms: number; isCircle: boolean } | null,
): { cx: number; cy: number; ra: number; rb: number; rms: number; isCircle: boolean } | null {
  if (circle && ellipse) {
    const axisRatio = ellipse.ra / Math.max(ellipse.rb, 1e-12)
    if (axisRatio > 1.2 && ellipse.rms <= circle.rms * 1.35) {
      return {
        cx: ellipse.cx,
        cy: ellipse.cy,
        ra: ellipse.ra,
        rb: ellipse.rb,
        rms: ellipse.rms,
        isCircle: false,
      }
    }
    return circle.rms <= ellipse.rms * 1.05
      ? {
          cx: circle.cx,
          cy: circle.cy,
          ra: circle.r,
          rb: circle.r,
          rms: circle.rms,
          isCircle: true,
        }
      : {
          cx: ellipse.cx,
          cy: ellipse.cy,
          ra: ellipse.ra,
          rb: ellipse.rb,
          rms: ellipse.rms,
          isCircle: ellipse.isCircle,
        }
  }
  if (circle) {
    return { cx: circle.cx, cy: circle.cy, ra: circle.r, rb: circle.r, rms: circle.rms, isCircle: true }
  }
  if (ellipse) {
    return {
      cx: ellipse.cx,
      cy: ellipse.cy,
      ra: ellipse.ra,
      rb: ellipse.rb,
      rms: ellipse.rms,
      isCircle: ellipse.isCircle,
    }
  }
  return null
}

/** Usuwa punkty daleko od fitowanej krzywej; zostawia spójny fragment z seedem. */
function pruneChainToCurve(
  indices: readonly number[],
  position: { getX(i: number): number; getY(i: number): number; getZ(i: number): number },
  seedA: number,
  seedB: number,
): number[] {
  let current = trimStraightRuns(indices, position)
  for (let iter = 0; iter < 3; iter++) {
    if (current.length < MIN_ELLIPSE_POINTS) break
    const points = current.map((i) => readPoint(position, i))
    const plane = fitPlane(points)
    if (!plane) break
    const proj = projectToPlaneBasis(points, plane.origin, plane.normal)
    if (!proj) break
    const chosen = chooseCircleOrEllipse(fitCircle2D(proj.uv), fitEllipsePca2D(proj.uv))
    if (!chosen) break
    const meanR = (chosen.ra + chosen.rb) * 0.5
    const tol = meanR * MAX_REL_RESIDUAL
    const keepFlags = current.map((vi) => {
      const p = readPoint(position, vi)
      const d = sub(p, plane.origin)
      const uv = { x: dot(d, proj.u), y: dot(d, proj.v) }
      return pointRadialError2D(uv, chosen) <= tol
    })
    let seedIdx = current.findIndex((v) => v === seedA || v === seedB)
    if (seedIdx < 0) seedIdx = Math.floor(current.length / 2)
    if (!keepFlags[seedIdx]) {
      let found = -1
      for (let d = 0; d < current.length; d++) {
        if (seedIdx - d >= 0 && keepFlags[seedIdx - d]) {
          found = seedIdx - d
          break
        }
        if (seedIdx + d < current.length && keepFlags[seedIdx + d]) {
          found = seedIdx + d
          break
        }
      }
      // Żaden punkt nie leży na krzywej — nie kasuj łańcucha (zostaw grow)
      if (found < 0) break
      seedIdx = found
    }
    let lo = seedIdx
    let hi = seedIdx
    while (lo > 0 && keepFlags[lo - 1]) lo -= 1
    while (hi + 1 < current.length && keepFlags[hi + 1]) hi += 1
    const next = current.slice(lo, hi + 1)
    // Za krótki fragment wokół seeda = zły fit, nie przycinaj
    if (next.length < MIN_ELLIPSE_POINTS) break
    if (next.length === current.length) break
    current = next
  }
  return current
}

/** Pozycje lokalne polilinii do overlay (domyka pętlę gdy closed). */
export function ellipseChainLocalPolyline(
  geometry: BufferGeometry,
  vertexIndices: readonly number[],
  closed: boolean,
): Array<[number, number, number]> | null {
  const position = geometry.getAttribute('position')
  if (!position || vertexIndices.length < 2) return null
  const pts: Array<[number, number, number]> = []
  for (const i of vertexIndices) {
    if (i < 0 || i >= position.count) return null
    pts.push([position.getX(i), position.getY(i), position.getZ(i)])
  }
  if (closed && pts.length > 2) {
    pts.push(pts[0]!)
  }
  return pts
}

/** Pary punktów pod FatLineSegments (kolejne odcinki polilinii). */
export function ellipseChainToSegmentPositions(
  geometry: BufferGeometry,
  vertexIndices: readonly number[],
  closed: boolean,
): Float32Array | null {
  const pts = ellipseChainLocalPolyline(geometry, vertexIndices, closed)
  if (!pts || pts.length < 2) return null
  const segCount = pts.length - 1
  const arr = new Float32Array(segCount * 6)
  let w = 0
  for (let i = 0; i < segCount; i++) {
    const a = pts[i]!
    const b = pts[i + 1]!
    arr[w++] = a[0]
    arr[w++] = a[1]
    arr[w++] = a[2]
    arr[w++] = b[0]
    arr[w++] = b[1]
    arr[w++] = b[2]
  }
  return arr
}

/** Scratch Vector3 helper for callers that prefer three.js types. */
export function ellipseCenterToVector3(center: [number, number, number], target = new Vector3()): Vector3 {
  return target.set(center[0], center[1], center[2])
}

export type EllipseCenterLocal = {
  center: [number, number, number]
  radiusA: number
  radiusB: number
  isCircle: boolean
}

/** Fit środka z już wybranego łańcucha (overlay / pick centrum). */
export function ellipseCenterFromVertexChain(
  geometry: BufferGeometry,
  vertexIndices: readonly number[],
): EllipseCenterLocal | null {
  const position = geometry.getAttribute('position')
  if (!position || vertexIndices.length < MIN_ELLIPSE_POINTS) return null
  for (const i of vertexIndices) {
    if (i < 0 || i >= position.count) return null
  }
  const fitted = fitChainEllipse(vertexIndices, position)
  if (!fitted) return null
  return {
    center: fitted.center,
    radiusA: fitted.radiusA,
    radiusB: fitted.radiusB,
    isCircle: fitted.isCircle,
  }
}

/**
 * Czy lokalny punkt kliknięcia jest bliżej środka łuku niż typowy „promień” picka.
 * Używane zanim zdecydujemy: elipsa vs centrum.
 */
export function isLocalPointNearEllipseCenter(
  localPoint: { x: number; y: number; z: number },
  center: EllipseCenterLocal,
  factor = 0.22,
): boolean {
  const meanR = (center.radiusA + center.radiusB) * 0.5
  const tol = Math.max(meanR * factor, 1e-4)
  const dx = localPoint.x - center.center[0]
  const dy = localPoint.y - center.center[1]
  const dz = localPoint.z - center.center[2]
  return Math.hypot(dx, dy, dz) <= tol
}
