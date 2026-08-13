import * as THREE from 'three'
import { PHOSPHOR, PHOSPHOR_DIM, PHOSPHOR_FAINT } from '../theme/colors'

export interface EnvironmentBundle {
  dispose: () => void
  updateParticles: (dt: number) => void
}

export function createEnvironment(scene: THREE.Scene): EnvironmentBundle {
  const disposables: Array<() => void> = []

  const gridMat = new THREE.LineBasicMaterial({
    color: PHOSPHOR_FAINT,
    transparent: true,
    opacity: 0.22,
  })
  const gridLines: THREE.Line[] = []

  for (let i = -10; i <= 10; i++) {
    const x = i * 10
    for (const [a, b] of [
      [new THREE.Vector3(x, -2, -90), new THREE.Vector3(x, -2, 50)],
      [new THREE.Vector3(-100, -2, i * 10 - 20), new THREE.Vector3(100, -2, i * 10 - 20)],
    ] as const) {
      const geo = new THREE.BufferGeometry().setFromPoints([a, b])
      const line = new THREE.Line(geo, gridMat)
      scene.add(line)
      gridLines.push(line)
    }
  }
  disposables.push(() => {
    gridMat.dispose()
    gridLines.forEach((l) => {
      l.geometry.dispose()
      scene.remove(l)
    })
  })

  const horizonGeo = new THREE.PlaneGeometry(320, 40)
  const horizonMat = new THREE.MeshBasicMaterial({
    color: PHOSPHOR_DIM,
    transparent: true,
    opacity: 0.06,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const horizon = new THREE.Mesh(horizonGeo, horizonMat)
  horizon.position.set(0, 8, -85)
  scene.add(horizon)
  disposables.push(() => {
    horizonGeo.dispose()
    horizonMat.dispose()
    scene.remove(horizon)
  })

  const particleCount = 420
  const positions = new Float32Array(particleCount * 3)
  const velocities: THREE.Vector3[] = []
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 120
    positions[i * 3 + 1] = Math.random() * 30 - 2
    positions[i * 3 + 2] = (Math.random() - 0.5) * 120
    velocities.push(
      new THREE.Vector3(
        (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * 0.08,
        (Math.random() - 0.5) * 0.15,
      ),
    )
  }

  const particleGeo = new THREE.BufferGeometry()
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const particleMat = new THREE.PointsMaterial({
    color: PHOSPHOR,
    size: 0.08,
    transparent: true,
    opacity: 0.35,
    sizeAttenuation: true,
    depthWrite: false,
  })
  const particles = new THREE.Points(particleGeo, particleMat)
  scene.add(particles)
  disposables.push(() => {
    particleGeo.dispose()
    particleMat.dispose()
    scene.remove(particles)
  })

  const updateParticles = (dt: number) => {
    const attr = particleGeo.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] += velocities[i].x * dt
      positions[i * 3 + 1] += velocities[i].y * dt
      positions[i * 3 + 2] += velocities[i].z * dt
      if (Math.abs(positions[i * 3]) > 60) positions[i * 3] *= -0.95
      if (positions[i * 3 + 1] > 28 || positions[i * 3 + 1] < -4) velocities[i].y *= -1
      if (Math.abs(positions[i * 3 + 2]) > 60) positions[i * 3 + 2] *= -0.95
    }
    attr.needsUpdate = true
    particleMat.opacity = 0.22 + Math.sin(performance.now() * 0.0004) * 0.06
  }

  return {
    dispose: () => disposables.forEach((d) => d()),
    updateParticles,
  }
}

export function wrapWorldPosition(pos: THREE.Vector3): void {
  const limit = 60
  if (pos.x > limit) pos.x -= limit * 2
  if (pos.x < -limit) pos.x += limit * 2
  if (pos.z > limit) pos.z -= limit * 2
  if (pos.z < -limit) pos.z += limit * 2
}
