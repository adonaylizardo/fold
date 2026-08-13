import * as THREE from 'three'
import { PHOSPHOR, PHOSPHOR_BRIGHT, PHOSPHOR_DIM, PHOSPHOR_MID } from '../theme/colors'

export interface PuffVisual {
  ripples: Ripple[]
  streaks: WindStreak[]
  age: number
  maxAge: number
  worldPoint: THREE.Vector3
  isNear: boolean
}

export interface Ripple {
  mesh: THREE.Mesh
  age: number
  maxAge: number
}

export interface WindStreak {
  line: THREE.Line
  dir: THREE.Vector3
  age: number
  maxAge: number
}

export function createPuffVisual(scene: THREE.Scene, point: THREE.Vector3, isNear: boolean): PuffVisual {
  const ripples: Ripple[] = []
  const streaks: WindStreak[] = []
  const y = point.y > 0.5 ? point.y - 0.05 : 1.2

  // Primary expanding ripple
  ripples.push(createRippleRing(scene, point, y, 0.2, 0.28, 1.1, PHOSPHOR_BRIGHT))
  // Secondary outer ring
  ripples.push(createRippleRing(scene, point, y, 0.35, 0.42, 1.4, PHOSPHOR_MID))

  if (isNear) {
    ripples.push(createRippleRing(scene, point, y, 0.08, 0.12, 0.7, PHOSPHOR_BRIGHT))
  }

  const streakCount = isNear ? 10 : 6
  for (let i = 0; i < streakCount; i++) {
    const angle = (i / streakCount) * Math.PI * 2 + Math.random() * 0.3
    const dir = new THREE.Vector3(Math.cos(angle), 0.05 + Math.random() * 0.15, Math.sin(angle)).normalize()
    const len = isNear ? 1.8 + Math.random() * 1.2 : 1.0 + Math.random() * 0.8
    const start = new THREE.Vector3(point.x, y + 0.02, point.z)
    const end = start.clone().add(dir.clone().multiplyScalar(len))
    const geo = new THREE.BufferGeometry().setFromPoints([start, end])
    const mat = new THREE.LineBasicMaterial({
      color: isNear ? PHOSPHOR_BRIGHT : PHOSPHOR,
      transparent: true,
      opacity: isNear ? 0.85 : 0.55,
    })
    const line = new THREE.Line(geo, mat)
    scene.add(line)
    streaks.push({ line, dir, age: 0, maxAge: isNear ? 0.55 : 0.4 })
  }

  return {
    ripples,
    streaks,
    age: 0,
    maxAge: 1.2,
    worldPoint: point.clone(),
    isNear,
  }
}

function createRippleRing(
  scene: THREE.Scene,
  point: THREE.Vector3,
  y: number,
  inner: number,
  outer: number,
  maxAge: number,
  color: number,
  opacity = 0.75,
): Ripple {
  const geo = new THREE.RingGeometry(inner, outer, 40)
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(point.x, y, point.z)
  scene.add(mesh)
  return { mesh, age: 0, maxAge }
}

export function updatePuffVisuals(visuals: PuffVisual[], dt: number): PuffVisual[] {
  const alive: PuffVisual[] = []

  for (const v of visuals) {
    v.age += dt

    for (const r of v.ripples) {
      r.age += dt
      const t = r.age / r.maxAge
      const scale = 1 + t * (v.isNear ? 10 : 7)
      r.mesh.scale.set(scale, scale, scale)
      const mat = r.mesh.material as THREE.MeshBasicMaterial
      mat.opacity = (v.isNear ? 0.75 : 0.55) * (1 - t)
    }

    for (const s of v.streaks) {
      s.age += dt
      const t = s.age / s.maxAge
      const mat = s.line.material as THREE.LineBasicMaterial
      mat.opacity = (v.isNear ? 0.85 : 0.55) * (1 - t)
      const pos = s.line.geometry.getAttribute('position') as THREE.BufferAttribute
      const extend = 1 + t * 2.5
      if (pos.count >= 2) {
        const ox = v.worldPoint.x
        const oy = (v.worldPoint.y > 0.5 ? v.worldPoint.y : 1.2) + 0.02
        const oz = v.worldPoint.z
        pos.setXYZ(0, ox, oy, oz)
        pos.setXYZ(1, ox + s.dir.x * extend, oy + s.dir.y * extend, oz + s.dir.z * extend)
        pos.needsUpdate = true
      }
    }

    if (v.age < v.maxAge) {
      alive.push(v)
    } else {
      disposePuffVisual(v)
    }
  }

  return alive
}

function disposePuffVisual(v: PuffVisual) {
  for (const r of v.ripples) {
    r.mesh.geometry.dispose()
    ;(r.mesh.material as THREE.Material).dispose()
    r.mesh.parent?.remove(r.mesh)
  }
  for (const s of v.streaks) {
    s.line.geometry.dispose()
    ;(s.line.material as THREE.Material).dispose()
    s.line.parent?.remove(s.line)
  }
}

// Legacy exports used by App — delegate to puff visuals
export function createRipple(scene: THREE.Scene, point: THREE.Vector3): Ripple {
  const y = point.y > 0.5 ? point.y - 0.05 : 1.2
  return createRippleRing(scene, point, y, 0.2, 0.28, 1.1, PHOSPHOR_BRIGHT)
}

export function updateRipples(ripples: Ripple[], dt: number): Ripple[] {
  const alive: Ripple[] = []
  for (const r of ripples) {
    r.age += dt
    const t = r.age / r.maxAge
    const scale = 1 + t * 7
    r.mesh.scale.set(scale, scale, scale)
    const mat = r.mesh.material as THREE.MeshBasicMaterial
    mat.opacity = 0.65 * (1 - t)
    mat.color.setHex(t < 0.5 ? PHOSPHOR_BRIGHT : PHOSPHOR_DIM)
    if (r.age < r.maxAge) alive.push(r)
    else {
      r.mesh.geometry.dispose()
      mat.dispose()
      r.mesh.parent?.remove(r.mesh)
    }
  }
  return alive
}
