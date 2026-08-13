import * as THREE from 'three'
import { PHOSPHOR, PHOSPHOR_BRIGHT, PHOSPHOR_FAINT } from '../theme/colors'

export interface BreezeMark {
  group: THREE.Group
  update: (target: THREE.Vector3, isMoving: boolean, dt: number) => void
  dispose: () => void
}

export function createBreezeMark(scene: THREE.Scene): BreezeMark {
  const group = new THREE.Group()
  scene.add(group)

  const ringGeo = new THREE.RingGeometry(0.35, 0.42, 32)
  const ringMat = new THREE.MeshBasicMaterial({
    color: PHOSPHOR,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.rotation.x = -Math.PI / 2
  group.add(ring)

  const dotGeo = new THREE.CircleGeometry(0.06, 16)
  const dotMat = new THREE.MeshBasicMaterial({
    color: PHOSPHOR_BRIGHT,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const dot = new THREE.Mesh(dotGeo, dotMat)
  dot.rotation.x = -Math.PI / 2
  group.add(dot)

  const crossMat = new THREE.LineBasicMaterial({
    color: PHOSPHOR_FAINT,
    transparent: true,
    opacity: 0.4,
  })
  const crossH = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.55, 0, 0),
      new THREE.Vector3(0.55, 0, 0),
    ]),
    crossMat,
  )
  const crossV = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -0.55),
      new THREE.Vector3(0, 0, 0.55),
    ]),
    crossMat,
  )
  group.add(crossH, crossV)

  let visible = 0

  return {
    group,
    update(target: THREE.Vector3, isMoving: boolean, dt: number) {
      group.position.copy(target)
      group.position.y = target.y + 0.02
      visible = THREE.MathUtils.lerp(visible, isMoving ? 1 : 0.35, Math.min(1, dt * 5))
      ringMat.opacity = 0.15 + visible * 0.35
      dotMat.opacity = 0.3 + visible * 0.45
      crossMat.opacity = 0.15 + visible * 0.3
      const pulse = 1 + Math.sin(performance.now() * 0.004) * 0.06 * visible
      ring.scale.setScalar(pulse)
    },
    dispose() {
      ringGeo.dispose()
      ringMat.dispose()
      dotGeo.dispose()
      dotMat.dispose()
      crossH.geometry.dispose()
      crossV.geometry.dispose()
      crossMat.dispose()
      scene.remove(group)
    },
  }
}

export function pointerToBreezeTarget(
  normalizedX: number,
  normalizedY: number,
  camera: THREE.PerspectiveCamera,
  planeY: number,
): THREE.Vector3 {
  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(new THREE.Vector2(normalizedX, normalizedY), camera)
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const hit = new THREE.Vector3()
  raycaster.ray.intersectPlane(ground, hit)
  hit.y = planeY
  return hit
}
