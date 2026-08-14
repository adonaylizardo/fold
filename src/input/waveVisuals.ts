import * as THREE from 'three'
import { PHOSPHOR, PHOSPHOR_BRIGHT, PHOSPHOR_MID } from '../theme/colors'
import { currentWaveRadius, type BreezeWave } from '../sim/BreezeWave'

export interface WaveVisual {
  waveId: number
  reticle: THREE.Mesh
  ring: THREE.Mesh
  streaks: THREE.Line[]
  streakAngles: number[]
}

export function createWaveVisual(scene: THREE.Scene, wave: BreezeWave): WaveVisual {
  const y = wave.origin.y > 0.5 ? wave.origin.y : 1.2
  const ox = wave.origin.x
  const oz = wave.origin.z

  const reticleGeo = new THREE.RingGeometry(0.04, 0.07, 16)
  const reticleMat = new THREE.MeshBasicMaterial({
    color: PHOSPHOR_BRIGHT,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const reticle = new THREE.Mesh(reticleGeo, reticleMat)
  reticle.rotation.x = -Math.PI / 2
  reticle.position.set(ox, y + 0.03, oz)
  scene.add(reticle)

  const ringGeo = new THREE.RingGeometry(0.98, 1.0, 64)
  const ringMat = new THREE.MeshBasicMaterial({
    color: PHOSPHOR,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.rotation.x = -Math.PI / 2
  ring.position.set(ox, y + 0.01, oz)
  scene.add(ring)

  const streakCount = 14
  const streaks: THREE.Line[] = []
  const streakAngles: number[] = []
  const streakMat = new THREE.LineBasicMaterial({
    color: PHOSPHOR_MID,
    transparent: true,
    opacity: 0.45,
  })

  for (let i = 0; i < streakCount; i++) {
    const angle = (i / streakCount) * Math.PI * 2
    streakAngles.push(angle)
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(ox, y + 0.015, oz),
      new THREE.Vector3(ox, y + 0.015, oz),
    ])
    const line = new THREE.Line(geo, streakMat.clone())
    scene.add(line)
    streaks.push(line)
  }

  return { waveId: wave.id, reticle, ring, streaks, streakAngles }
}

export function updateWaveVisuals(
  visuals: WaveVisual[],
  waves: BreezeWave[],
  dt: number,
): WaveVisual[] {
  const waveMap = new Map(waves.map((w) => [w.id, w]))
  const alive: WaveVisual[] = []

  for (const vis of visuals) {
    const wave = waveMap.get(vis.waveId)
    if (!wave) {
      disposeWaveVisual(vis)
      continue
    }

    const t = wave.age / wave.maxAge
    const radius = currentWaveRadius(wave)
    const fade = 1 - t * t
    const y = wave.origin.y > 0.5 ? wave.origin.y : 1.2

    vis.ring.scale.set(radius, radius, radius)
    ;(vis.ring.material as THREE.MeshBasicMaterial).opacity = 0.5 * fade

    ;(vis.reticle.material as THREE.MeshBasicMaterial).opacity = 0.85 * fade

    for (let i = 0; i < vis.streaks.length; i++) {
      const angle = vis.streakAngles[i]
      const cx = wave.origin.x + Math.cos(angle) * radius
      const cz = wave.origin.z + Math.sin(angle) * radius
      const tx = wave.origin.x + Math.cos(angle) * (radius + 0.55)
      const tz = wave.origin.z + Math.sin(angle) * (radius + 0.55)
      const pos = vis.streaks[i].geometry.getAttribute('position') as THREE.BufferAttribute
      pos.setXYZ(0, cx, y + 0.015, cz)
      pos.setXYZ(1, tx, y + 0.015, tz)
      pos.needsUpdate = true
      ;(vis.streaks[i].material as THREE.LineBasicMaterial).opacity = 0.4 * fade
    }

    alive.push(vis)
  }

  void dt
  return alive
}

function disposeWaveVisual(vis: WaveVisual) {
  vis.reticle.geometry.dispose()
  ;(vis.reticle.material as THREE.Material).dispose()
  vis.reticle.parent?.remove(vis.reticle)
  vis.ring.geometry.dispose()
  ;(vis.ring.material as THREE.Material).dispose()
  vis.ring.parent?.remove(vis.ring)
  for (const s of vis.streaks) {
    s.geometry.dispose()
    ;(s.material as THREE.Material).dispose()
    s.parent?.remove(s)
  }
}

export function disposeAllWaveVisuals(visuals: WaveVisual[]) {
  for (const v of visuals) disposeWaveVisual(v)
}
