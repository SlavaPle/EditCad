import { BufferGeometry, Float32BufferAttribute, Mesh, OrthographicCamera, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { pickMateLineEdge } from './pickMateLineEdge'

function quadInPlaneZ(): BufferGeometry {
  const geo = new BufferGeometry()
  geo.setAttribute(
    'position',
    new Float32BufferAttribute(
      [
        0, 0, 0, 10, 0, 0, 10, 10, 0, //
        0, 0, 0, 10, 10, 0, 0, 10, 0,
      ],
      3,
    ),
  )
  geo.computeBoundingBox()
  return geo
}

describe('pickMateLineEdge', () => {
  it('picks closest triangle edge in local space', () => {
    const geometry = quadInPlaneZ()
    const edge = pickMateLineEdge(geometry, 0, new Vector3(0.05, 0, 0))
    expect(edge).toEqual({ a: 0, b: 1 })
  })

  it('picks edge near pointer in screen space on large face', () => {
    const geometry = quadInPlaneZ()
    const mesh = new Mesh(geometry)
    const camera = new OrthographicCamera(-20, 20, 20, -20, 0.1, 100)
    camera.position.set(0, 0, 50)
    camera.lookAt(0, 0, 0)

    const edge = pickMateLineEdge(
      geometry,
      0,
      new Vector3(5, 0, 0),
      {
        camera,
        mesh,
        pointer: { x: 100, y: 100 },
        viewport: { width: 200, height: 200 },
      },
    )

    expect(edge).not.toBeNull()
  })
})
