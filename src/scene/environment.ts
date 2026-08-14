import * as THREE from 'three'
import {
  PHOSPHOR,
  PHOSPHOR_BRIGHT,
  PHOSPHOR_DIM,
  PHOSPHOR_FAINT,
  PHOSPHOR_MID,
} from '../theme/colors'

export interface EnvironmentBundle {
  dispose: () => void
  update: (dt: number, planePos: THREE.Vector3, planeVel: THREE.Vector3) => void
}

interface StarLayer {
  points: THREE.Points
  positions: Float32Array
  twinklePhase: Float32Array
  sizes: Float32Array
  parallax: number
  count: number
}

interface StreamLine {
  line: THREE.Line
  speed: number
  phase: number
}

interface PlanetBody {
  group: THREE.Group
  wire: THREE.LineSegments
  fill: THREE.Mesh
  ring?: THREE.Mesh
  zOffset: number
  baseScale: number
  lane: number
}

function makePlanetGroup(wireframe: boolean, radius: number, hasRing: boolean): PlanetBody {
  const group = new THREE.Group()
  const geo = new THREE.IcosahedronGeometry(radius, 2)
  const fillMat = new THREE.MeshBasicMaterial({
    color: PHOSPHOR_DIM,
    transparent: true,
    opacity: wireframe ? 0.06 : 0.1,
    wireframe: false,
    depthWrite: false,
  })
  const fill = new THREE.Mesh(geo, fillMat)
  group.add(fill)

  const edgeGeo = new THREE.EdgesGeometry(geo, 12)
  const wireMat = new THREE.LineBasicMaterial({
    color: PHOSPHOR_MID,
    transparent: true,
    opacity: 0.55,
  })
  const wire = new THREE.LineSegments(edgeGeo, wireMat)
  group.add(wire)

  let ring: THREE.Mesh | undefined
  if (hasRing) {
    const ringGeo = new THREE.RingGeometry(radius * 1.4, radius * 1.55, 48)
    const ringMat = new THREE.MeshBasicMaterial({
      color: PHOSPHOR_FAINT,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = Math.PI / 2
    group.add(ring)
  }

  return {
    group,
    wire,
    fill,
    ring,
    zOffset: 0,
    baseScale: 1,
    lane: Math.random(),
  }
}

export function createEnvironment(scene: THREE.Scene): EnvironmentBundle {
  const disposables: Array<() => void> = []
  const layers: StarLayer[] = []

  const layerConfigs = [
    { count: 650, spread: 200, yRange: 70, parallax: 0.06, size: 0.05, opacity: 0.45 },
    { count: 420, spread: 160, yRange: 55, parallax: 0.14, size: 0.08, opacity: 0.58 },
    { count: 200, spread: 120, yRange: 45, parallax: 0.28, size: 0.13, opacity: 0.72 },
    { count: 60, spread: 90, yRange: 35, parallax: 0.5, size: 0.22, opacity: 0.9 },
  ]

  for (const cfg of layerConfigs) {
    const positions = new Float32Array(cfg.count * 3)
    const twinklePhase = new Float32Array(cfg.count)
    const sizes = new Float32Array(cfg.count)
    for (let i = 0; i < cfg.count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * cfg.spread
      positions[i * 3 + 1] = Math.random() * cfg.yRange - 8
      positions[i * 3 + 2] = (Math.random() - 0.5) * cfg.spread - 30
      twinklePhase[i] = Math.random() * Math.PI * 2
      sizes[i] = cfg.size * (0.6 + Math.random() * 0.8)
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
    layers.push({ points, positions, twinklePhase, sizes, parallax: cfg.parallax, count: cfg.count })
    disposables.push(() => {
      geo.dispose()
      mat.dispose()
      scene.remove(points)
    })
    void sizes
  }

  const streamCount = 64
  const streamLines: StreamLine[] = []
  const streamMat = new THREE.LineBasicMaterial({
    color: PHOSPHOR_FAINT,
    transparent: true,
    opacity: 0.22,
  })

  for (let i = 0; i < streamCount; i++) {
    const x = (Math.random() - 0.5) * 70
    const y = Math.random() * 28 + 0.5
    const z = -Math.random() * 120 - 15
    const len = 2 + Math.random() * 5
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, y, z),
      new THREE.Vector3(x + (Math.random() - 0.5) * 0.4, y, z + len),
    ])
    const line = new THREE.Line(geo, streamMat.clone())
    scene.add(line)
    streamLines.push({ line, speed: 5 + Math.random() * 8, phase: Math.random() * 10 })
  }
  disposables.push(() => {
    streamMat.dispose()
    streamLines.forEach((s) => {
      s.line.geometry.dispose()
      ;(s.line.material as THREE.Material).dispose()
      scene.remove(s.line)
    })
  })

  const dustCount = 320
  const dustPos = new Float32Array(dustCount * 3)
  const dustVel: THREE.Vector3[] = []
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 120
    dustPos[i * 3 + 1] = Math.random() * 30
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 120
    dustVel.push(new THREE.Vector3((Math.random() - 0.5) * 0.2, 0, 2.5 + Math.random() * 4))
  }
  const dustGeo = new THREE.BufferGeometry()
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
  const dustMat = new THREE.PointsMaterial({
    color: PHOSPHOR_DIM,
    size: 0.06,
    transparent: true,
    opacity: 0.32,
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

  const planetDefs = [
    { r: 2.2, ring: true, wire: true },
    { r: 1.4, ring: false, wire: true },
    { r: 3.5, ring: true, wire: true },
    { r: 0.9, ring: false, wire: false },
    { r: 1.8, ring: false, wire: true },
    { r: 2.8, ring: true, wire: true },
    { r: 1.1, ring: false, wire: true },
    { r: 4.2, ring: false, wire: true },
    { r: 1.6, ring: true, wire: true },
    { r: 0.7, ring: false, wire: false },
  ]

  const planets: PlanetBody[] = planetDefs.map((d) => {
    const p = makePlanetGroup(d.wire, d.r, d.ring)
    p.baseScale = d.r
    scene.add(p.group)
    disposables.push(() => {
      p.fill.geometry.dispose()
      ;(p.fill.material as THREE.Material).dispose()
      p.wire.geometry.dispose()
      ;(p.wire.material as THREE.Material).dispose()
      p.ring?.geometry.dispose()
      ;(p.ring?.material as THREE.Material)?.dispose()
      scene.remove(p.group)
    })
    return p
  })

  const spawnPlanet = (
    p: PlanetBody,
    planePos: THREE.Vector3,
    planeVel: THREE.Vector3,
    ahead: number,
  ) => {
    p.zOffset = ahead
    p.lane = Math.random()
    repositionPlanet(p, planePos, planeVel)
    const distScale = THREE.MathUtils.clamp(1 - ahead / 220, 0.08, 0.35)
    p.group.scale.setScalar(distScale * p.baseScale * 0.35)
    ;(p.wire.material as THREE.LineBasicMaterial).opacity = 0.15 + distScale * 0.5
    ;(p.fill.material as THREE.MeshBasicMaterial).opacity = 0.04 + distScale * 0.12
  }

  const repositionPlanet = (p: PlanetBody, planePos: THREE.Vector3, planeVel: THREE.Vector3) => {
    const fwd = planeVel.lengthSq() > 0.01
      ? planeVel.clone().normalize()
      : new THREE.Vector3(0, 0, -1)
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize()
    const lateral = (p.lane - 0.5) * 55
    const vertical = Math.sin(p.lane * 12.3) * 9 + 4
    p.group.position
      .copy(planePos)
      .add(fwd.clone().multiplyScalar(-p.zOffset))
      .add(right.clone().multiplyScalar(lateral))
    p.group.position.y = vertical + planePos.y * 0.05
  }

  for (let i = 0; i < planets.length; i++) {
    spawnPlanet(planets[i], new THREE.Vector3(0, 1.5, 0), new THREE.Vector3(0, 0, -6), 40 + i * 22)
  }

  let time = 0

  const update = (dt: number, planePos: THREE.Vector3, planeVel: THREE.Vector3) => {
    time += dt
    const speed = Math.max(planeVel.length(), 2)

    for (const layer of layers) {
      const mat = layer.points.material as THREE.PointsMaterial
      mat.opacity = 0.4 + Math.sin(time * 0.45) * 0.05

      for (let i = 0; i < layer.count; i++) {
        layer.positions[i * 3] -= planeVel.x * dt * layer.parallax * 0.2
        layer.positions[i * 3 + 2] -= planeVel.z * dt * layer.parallax * 0.2
        layer.positions[i * 3 + 1] += Math.sin(time * 1.5 + layer.twinklePhase[i]) * 0.002

        const dx = layer.positions[i * 3] - planePos.x
        const dz = layer.positions[i * 3 + 2] - planePos.z
        if (Math.abs(dx) > 100) layer.positions[i * 3] = planePos.x - Math.sign(dx) * 50
        if (Math.abs(dz) > 100) layer.positions[i * 3 + 2] = planePos.z - Math.sign(dz) * 50
      }
      ;(layer.points.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
    }

    for (const s of streamLines) {
      const pos = s.line.geometry.getAttribute('position') as THREE.BufferAttribute
      const scroll = speed * dt * 0.55 + s.speed * dt
      for (let v = 0; v < pos.count; v++) {
        pos.setZ(v, pos.getZ(v) + scroll)
        pos.setX(v, pos.getX(v) - planeVel.x * dt * 0.08)
      }
      pos.needsUpdate = true

      if (pos.getZ(0) > planePos.z + 25) {
        const nx = planePos.x + (Math.random() - 0.5) * 70
        const ny = Math.random() * 28 + 0.5
        const nz = planePos.z - 80 - Math.random() * 80
        const len = 2 + Math.random() * 5
        pos.setXYZ(0, nx, ny, nz)
        pos.setXYZ(1, nx + (Math.random() - 0.5) * 0.4, ny, nz + len)
        pos.needsUpdate = true
      }

      ;(s.line.material as THREE.LineBasicMaterial).opacity =
        0.14 + Math.sin(time * 2.2 + s.phase) * 0.07
    }

    const dAttr = dustGeo.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] += dustVel[i].x * dt - planeVel.x * dt * 0.06
      dustPos[i * 3 + 1] += dustVel[i].y * dt
      dustPos[i * 3 + 2] += (dustVel[i].z * speed * 0.55) * dt

      if (dustPos[i * 3 + 2] - planePos.z > 50) {
        dustPos[i * 3] = planePos.x + (Math.random() - 0.5) * 120
        dustPos[i * 3 + 1] = Math.random() * 30
        dustPos[i * 3 + 2] = planePos.z - 60 - Math.random() * 80
      }
    }
    dAttr.needsUpdate = true
    dustMat.opacity = 0.24 + Math.sin(time * 0.55) * 0.08

    for (const p of planets) {
      p.zOffset -= speed * dt
      repositionPlanet(p, planePos, planeVel)

      const approach = THREE.MathUtils.clamp(1 - p.zOffset / 180, 0, 1)
      const scale = (0.08 + approach * approach * 2.2) * p.baseScale * 0.35
      p.group.scale.setScalar(scale)
      p.group.rotation.y += dt * 0.15
      p.group.rotation.x += dt * 0.05

      const wireMat = p.wire.material as THREE.LineBasicMaterial
      const fillMat = p.fill.material as THREE.MeshBasicMaterial
      wireMat.opacity = 0.12 + approach * 0.65
      fillMat.opacity = 0.03 + approach * 0.18
      wireMat.color.setHex(approach > 0.5 ? PHOSPHOR_BRIGHT : PHOSPHOR_MID)

      if (p.zOffset < -12) {
        spawnPlanet(p, planePos, planeVel, 90 + Math.random() * 130)
      }
    }
  }

  return {
    dispose: () => disposables.forEach((d) => d()),
    update,
  }
}

export function wrapWorldPosition(pos: THREE.Vector3): THREE.Vector3 | null {
  const limit = 60
  const delta = new THREE.Vector3()
  if (pos.x > limit) { delta.x = -limit * 2; pos.x -= limit * 2 }
  if (pos.x < -limit) { delta.x = limit * 2; pos.x += limit * 2 }
  if (pos.z > limit) { delta.z = -limit * 2; pos.z -= limit * 2 }
  if (pos.z < -limit) { delta.z = limit * 2; pos.z += limit * 2 }
  return delta.lengthSq() > 0 ? delta : null
}
