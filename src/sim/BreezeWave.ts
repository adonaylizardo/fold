import * as THREE from 'three'

export interface WaveSpawn {
  origin: THREE.Vector3
  distance: number
}

export interface BreezeWave {
  id: number
  origin: THREE.Vector3
  age: number
  maxAge: number
  expansionSpeed: number
  maxRadius: number
  spawnDistance: number
  strength: number
  hit: boolean
}

const WAVE_SPEED = 13
const WAVE_MAX_AGE = 1.85
const WAVE_MAX_REACH = 42
const HIT_TOLERANCE = 1.1
const MIN_STRENGTH = 4
const MAX_STRENGTH = 20

let nextId = 0

export function createBreezeWave(spawn: WaveSpawn, _planePos: THREE.Vector3): BreezeWave {
  const dist = Math.min(spawn.distance, WAVE_MAX_REACH)
  const t = 1 - dist / WAVE_MAX_REACH
  const strength = MIN_STRENGTH + t * (MAX_STRENGTH - MIN_STRENGTH)

  return {
    id: nextId++,
    origin: spawn.origin.clone(),
    age: 0,
    maxAge: WAVE_MAX_AGE,
    expansionSpeed: WAVE_SPEED,
    maxRadius: WAVE_MAX_REACH,
    spawnDistance: dist,
    strength,
    hit: false,
  }
}

export function currentWaveRadius(wave: BreezeWave): number {
  return 0.35 + wave.age * wave.expansionSpeed
}

export function radialPushFromOrigin(origin: THREE.Vector3, planePos: THREE.Vector3): THREE.Vector3 {
  const push = new THREE.Vector3().subVectors(planePos, origin)
  push.y *= 0.45
  if (push.lengthSq() < 0.01) push.set(0, 0, 1)
  return push.normalize()
}

export interface WaveHit {
  wave: BreezeWave
  strength: number
  pushDirection: THREE.Vector3
}

export function updateBreezeWaves(
  waves: BreezeWave[],
  planePos: THREE.Vector3,
  dt: number,
): { waves: BreezeWave[]; hits: WaveHit[] } {
  const hits: WaveHit[] = []
  const alive: BreezeWave[] = []

  for (const wave of waves) {
    wave.age += dt
    const radius = currentWaveRadius(wave)

    if (!wave.hit) {
      const dist = wave.origin.distanceTo(planePos)
      if (radius >= dist - HIT_TOLERANCE) {
        wave.hit = true
        hits.push({
          wave,
          strength: wave.strength,
          pushDirection: radialPushFromOrigin(wave.origin, planePos),
        })
      }
    }

    if (wave.age < wave.maxAge && radius < wave.maxRadius + 2) {
      alive.push(wave)
    }
  }

  return { waves: alive, hits }
}

export { WAVE_MAX_AGE, WAVE_SPEED }
