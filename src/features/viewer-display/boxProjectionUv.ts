import { BufferAttribute, BufferGeometry, Vector3 } from 'three'

const _size = new Vector3()

/** UV z rzutu pudełkowego (triplanar po dominującej osi) — dla STL bez mapy UV. */
export function applyBoxProjectionUvs(geometry: BufferGeometry): void {
  const position = geometry.getAttribute('position')
  if (!position) return

  if (!geometry.boundingBox) geometry.computeBoundingBox()
  const box = geometry.boundingBox
  if (!box) return

  box.getSize(_size)
  const sx = Math.max(_size.x, 1e-8)
  const sy = Math.max(_size.y, 1e-8)
  const sz = Math.max(_size.z, 1e-8)
  const { min } = box

  const count = position.count
  const uv = new Float32Array(count * 2)

  for (let i = 0; i < count; i++) {
    const x = position.getX(i)
    const y = position.getY(i)
    const z = position.getZ(i)
    const cx = Math.abs((x - min.x) / sx - 0.5) * 2
    const cy = Math.abs((y - min.y) / sy - 0.5) * 2
    const cz = Math.abs((z - min.z) / sz - 0.5) * 2

    if (cx >= cy && cx >= cz) {
      uv[i * 2] = (y - min.y) / sy
      uv[i * 2 + 1] = (z - min.z) / sz
    } else if (cy >= cz) {
      uv[i * 2] = (x - min.x) / sx
      uv[i * 2 + 1] = (z - min.z) / sz
    } else {
      uv[i * 2] = (x - min.x) / sx
      uv[i * 2 + 1] = (y - min.y) / sy
    }
  }

  geometry.setAttribute('uv', new BufferAttribute(uv, 2))
}
