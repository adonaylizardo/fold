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
  speed: number
  phase: number
}

export function createEnvironment(scene: THREE.Scene): EnvironmentBundle {
  const disposables: Array<() => void> = []
  const layers: StarLayer[] = []

  const layerConfigs = [
    { count: 500, spread: 220, yRange: 80, parallax: 0.05, size: 0.05, opacity: 0.42 },
    { count: 320, spread: 170, yRange: 60, parallax: 0.12, size: 0.08, opacity: 0.55 },
    { count: 140, spread: 120, yRange: 45, parallax: 0.24, size: 0.12, opacity: 0.72 },
    { count: 45, spread: 90, yRange: 35, parallax: 0.42, size: 0.2, opacity: 0.88 },
  ]

  for (const cfg of layerConfigs) {
    const positions = new Float32Array(cfg.count * 3)
    const twinklePhase = new Float32Array(cfg.count)
    for (let i = 0; i < cfg.count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * cfg.spread
      positions[i * 3 + 1] = Math.random() * cfg.yRange - 5
      positions[i * 3 + 2] = (Math.random() - 0.5) * cfg.spread - 20 - Math.random() * 60
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
      fog: false,
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

  const streamCount = 48
  const streamLines: StreamLine[] = []
  const streamMat = new THREE.LineBasicMaterial({
    color: PHOSPHOR_FAINT,
    transparent: true,
    opacity: 0.18,
    fog: false,
  })

  for (let i = 0; i < streamCount; i++) {
    const x = (Math.random() - 0.5) * 60
    const y = Math.random() * 24 + 1
    const zPos = -Math.random() * 120 - 20
    const len = 2 + Math.random() * 4
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, y, zPos),
      new THREE.Vector3(x + (Math.random() - 0.5) * 0.3, y, zPos + len),
    ])
    const line = new THREE.Line(geo, streamMat.clone())
    line.frustumCulled = false
    scene.add(line)
    streamLines.push({ line, speed: 4 + Math.random() * 6, phase: Math.random() * 10 })
  }
  disposables.push(() => {
    streamMat.dispose()
    streamLines.forEach((s) => {
      s.line.geometry.dispose()
      ;(s.line.material as THREE.Material).dispose()
      scene.remove(s.line)
    })
  })

  const dustCount = 260
  const dustPos = new Float32Array(dustCount * 3)
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 100
    dustPos[i * 3 + 1] = Math.random() * 28
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 100
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
    fog: false,
  })
  const dust = new THREE.Points(dustGeo, dustMat)
  scene.add(dust)
  disposables.push(() => {
    dustGeo.dispose()
    dustMat.dispose()
    scene.remove(dust)
  })

  let time = 0
  const follow = new THREE.Vector3()

  const update = (dt: number, pPos: THREE.Vector3, planeVel: THREE.Vector3) => {
    time += dt
    follow.copy(pPos)
    const speed = Math.max(planeVel.length(), 2)
    const fwd = planeVel.lengthSq() > 0.01
      ? planeVel.clone().normalize()
      : new THREE.Vector3(0, 0, -1)

    for (const layer of layers) {
      const mat = layer.points.material as THREE.PointsMaterial
      mat.opacity = 0.38 + Math.sin(time * 0.45) * 0.04

      for (let i = 0; i < layer.count; i++) {
        layer.positions[i * 3] -= fwd.x * speed * dt * layer.parallax * 0.12
        layer.positions[i * 3 + 2] -= fwd.z * speed * dt * layer.parallax * 0.12

        const dx = layer.positions[i * 3] - follow.x
        const dz = layer.positions[i * 3 + 2] - follow.z
        if (Math.abs(dx) > 120) layer.positions[i * 3] = follow.x - Math.sign(dx) * 60
        if (Math.abs(dz) > 120) layer.positions[i * 3 + 2] = follow.z - Math.sign(dz) * 60
      }
      ;(layer.points.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
    }

    for (const s of streamLines) {
      const pos = s.line.geometry.getAttribute('position') as THREE.BufferAttribute
      const scroll = speed * dt * 0.5 + s.speed * dt
      for (let v = 0; v < pos.count; v++) {
        pos.setZ(v, pos.getZ(v) + scroll)
        pos.setX(v, pos.getX(v) - fwd.x * speed * dt * 0.06)
      }
      pos.needsUpdate = true

      if (pos.getZ(0) - follow.z > 30) {
        const nx = follow.x + (Math.random() - 0.5) * 60
        const ny = Math.random() * 24 + 1
        const nz = follow.z - 70 - Math.random() * 90
        const len = 2 + Math.random() * 4
        pos.setXYZ(0, nx, ny, nz)
        pos.setXYZ(1, nx + (Math.random() - 0.5) * 0.3, ny, nz + len)
        pos.needsUpdate = true
      }

      ;(s.line.material as THREE.LineBasicMaterial).opacity =
        0.1 + Math.sin(time * 2.2 + s.phase) * 0.06
    }

    const dAttr = dustGeo.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] -= fwd.x * speed * dt * 0.08
      dustPos[i * 3 + 2] -= fwd.z * speed * dt * 0.55

      if (dustPos[i * 3 + 2] - follow.z > 45) {
        dustPos[i * 3] = follow.x + (Math.random() - 0.5) * 100
        dustPos[i * 3 + 1] = Math.random() * 28
        dustPos[i * 3 + 2] = follow.z - 55 - Math.random() * 70
      }
    }
    dAttr.needsUpdate = true
    dustMat.opacity = 0.22 + Math.sin(time * 0.55) * 0.06
  }

  return {
    dispose: () => disposables.forEach((d) => d()),
    update,
  }
}
