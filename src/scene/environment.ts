import * as THREE from 'three'
import { PHOSPHOR, PHOSPHOR_DIM, PHOSPHOR_FAINT } from '../theme/colors'

export interface EnvironmentBundle {
  dispose: () => void
  update: (dt: number, planePos: THREE.Vector3, planeVel: THREE.Vector3) => void
}

interface StarLayer {
  points: THREE.Points
  positions: Float32Array
  twinklePhase: Float32Array
  parallax: number
  count: number
}

interface StreamLine {
  line: THREE.Line
  z: number
  speed: number
}

export function createEnvironment(scene: THREE.Scene): EnvironmentBundle {
  const disposables: Array<() => void> = []
  const layers: StarLayer[] = []

  const layerConfigs = [
    { count: 280, spread: 140, yRange: 50, parallax: 0.08, size: 0.06, opacity: 0.5 },
    { count: 180, spread: 100, yRange: 35, parallax: 0.18, size: 0.1, opacity: 0.65 },
    { count: 70, spread: 70, yRange: 25, parallax: 0.35, size: 0.16, opacity: 0.85 },
  ]

  for (const cfg of layerConfigs) {
    const positions = new Float32Array(cfg.count * 3)
    const twinklePhase = new Float32Array(cfg.count)
    for (let i = 0; i < cfg.count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * cfg.spread
      positions[i * 3 + 1] = Math.random() * cfg.yRange - 5
      positions[i * 3 + 2] = (Math.random() - 0.5) * cfg.spread - 20
      twinklePhase[i] = Math.random() * Math.PI * 2
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({
      color: PHOSPHOR,
      size: cfg.size,
      transparent: true,
      opacity: cfg.opacity,
      sizeAttenuation: true,
      depthWrite: false,
    })
    const points = new THREE.Points(geo, mat)
    scene.add(points)
    layers.push({ points, positions, twinklePhase, parallax: cfg.parallax, count: cfg.count })
    disposables.push(() => {
      geo.dispose()
      mat.dispose()
      scene.remove(points)
    })
  }

  const streamCount = 36
  const streamLines: StreamLine[] = []
  const streamMat = new THREE.LineBasicMaterial({
    color: PHOSPHOR_FAINT,
    transparent: true,
    opacity: 0.2,
  })

  for (let i = 0; i < streamCount; i++) {
    const x = (Math.random() - 0.5) * 50
    const y = Math.random() * 20 + 1
    const z = -Math.random() * 80 - 10
    const len = 1.5 + Math.random() * 3
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, y, z),
      new THREE.Vector3(x + (Math.random() - 0.5) * 0.3, y, z + len),
    ])
    const line = new THREE.Line(geo, streamMat.clone())
    scene.add(line)
    streamLines.push({ line, z, speed: 4 + Math.random() * 6 })
  }
  disposables.push(() => {
    streamMat.dispose()
    streamLines.forEach((s) => {
      s.line.geometry.dispose()
      ;(s.line.material as THREE.Material).dispose()
      scene.remove(s.line)
    })
  })

  const dustCount = 200
  const dustPos = new Float32Array(dustCount * 3)
  const dustVel: THREE.Vector3[] = []
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 80
    dustPos[i * 3 + 1] = Math.random() * 25
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 80
    dustVel.push(new THREE.Vector3(0, 0, 2 + Math.random() * 3))
  }
  const dustGeo = new THREE.BufferGeometry()
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
  const dustMat = new THREE.PointsMaterial({
    color: PHOSPHOR_DIM,
    size: 0.05,
    transparent: true,
    opacity: 0.28,
    sizeAttenuation: true,
    depthWrite: false,
  })
  const dust = new THREE.Points(dustGeo, dustMat)
  scene.add(dust)
  disposables.push(() => {
    dustGeo.dispose()
    dustMat.dispose()
    scene.remove(dust)
  })

  let time = 0

  const update = (dt: number, planePos: THREE.Vector3, planeVel: THREE.Vector3) => {
    time += dt
    const speed = Math.max(planeVel.length(), 1)

    for (const layer of layers) {
      const mat = layer.points.material as THREE.PointsMaterial
      mat.opacity = 0.35 + Math.sin(time * 0.5) * 0.04

      for (let i = 0; i < layer.count; i++) {
        const tw = 0.55 + Math.sin(time * 1.8 + layer.twinklePhase[i]) * 0.45
        layer.positions[i * 3] -= planeVel.x * dt * layer.parallax * 0.15
        layer.positions[i * 3 + 2] -= planeVel.z * dt * layer.parallax * 0.15

        const dx = layer.positions[i * 3] - planePos.x
        const dz = layer.positions[i * 3 + 2] - planePos.z
        if (Math.abs(dx) > 70) layer.positions[i * 3] = planePos.x - Math.sign(dx) * 35
        if (Math.abs(dz) > 70) layer.positions[i * 3 + 2] = planePos.z - Math.sign(dz) * 35

        void tw
      }
      ;(layer.points.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
    }

    for (const s of streamLines) {
      const pos = s.line.geometry.getAttribute('position') as THREE.BufferAttribute
      const scroll = speed * dt * 0.35 + s.speed * dt
      for (let v = 0; v < pos.count; v++) {
        pos.setZ(v, pos.getZ(v) + scroll)
      }
      pos.needsUpdate = true

      const midZ = pos.getZ(0)
      if (midZ > 15) {
        const nx = planePos.x + (Math.random() - 0.5) * 50
        const ny = Math.random() * 20 + 1
        const nz = planePos.z - 60 - Math.random() * 40
        const len = 1.5 + Math.random() * 3
        pos.setXYZ(0, nx, ny, nz)
        pos.setXYZ(1, nx + (Math.random() - 0.5) * 0.3, ny, nz + len)
        pos.needsUpdate = true
      }

      ;(s.line.material as THREE.LineBasicMaterial).opacity =
        0.12 + Math.sin(time * 2 + s.z) * 0.06
    }

    const dAttr = dustGeo.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] += dustVel[i].x * dt + planeVel.x * dt * 0.05
      dustPos[i * 3 + 1] += dustVel[i].y * dt
      dustPos[i * 3 + 2] += (dustVel[i].z * speed * 0.4 + planeVel.z * 0.1) * dt

      if (dustPos[i * 3 + 2] - planePos.z > 40) {
        dustPos[i * 3] = planePos.x + (Math.random() - 0.5) * 80
        dustPos[i * 3 + 1] = Math.random() * 25
        dustPos[i * 3 + 2] = planePos.z - 50 - Math.random() * 30
      }
    }
    dAttr.needsUpdate = true
    dustMat.opacity = 0.2 + Math.sin(time * 0.6) * 0.06
  }

  return {
    dispose: () => disposables.forEach((d) => d()),
    update,
  }
}

export function wrapWorldPosition(pos: THREE.Vector3): void {
  const limit = 60
  if (pos.x > limit) pos.x -= limit * 2
  if (pos.x < -limit) pos.x += limit * 2
  if (pos.z > limit) pos.z -= limit * 2
  if (pos.z < -limit) pos.z += limit * 2
}
