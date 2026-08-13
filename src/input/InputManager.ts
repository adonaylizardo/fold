import * as THREE from 'three'
import { PHOSPHOR_BRIGHT, PHOSPHOR_MID } from '../theme/colors'

export interface PointerState {
  x: number
  y: number
  normalizedX: number
  normalizedY: number
  isMoving: boolean
}

export interface PuffEvent {
  screenX: number
  screenY: number
  worldPoint: THREE.Vector3
  nearPlane: boolean
}

export interface InputState {
  pointer: PointerState
  update: (dt: number) => void
  consumePuffs: () => PuffEvent[]
  consumeRoll: () => boolean
  consumeFirstGesture: () => boolean
}

const STILL_THRESHOLD = 0.008
const NEAR_PLANE_RADIUS = 3.5

export function createInputManager(
  domElement: HTMLElement,
  camera: THREE.PerspectiveCamera,
  getPlanePosition: () => THREE.Vector3,
): InputState {
  let pointerX = 0
  let pointerY = 0
  let normX = 0
  let normY = 0
  let prevNormX = 0
  let prevNormY = 0
  let isMoving = false
  let moveSpeed = 0

  const puffs: PuffEvent[] = []
  let rollRequested = false
  let planeClicked = false
  let firstGesture = false
  let hasGestured = false

  const raycaster = new THREE.Raycaster()
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const intersect = new THREE.Vector3()

  function screenToWorld(sx: number, sy: number): THREE.Vector3 {
    const rect = domElement.getBoundingClientRect()
    const x = ((sx - rect.left) / rect.width) * 2 - 1
    const y = -((sy - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera)
    raycaster.ray.intersectPlane(groundPlane, intersect)
    return intersect.clone()
  }

  function updatePointer(clientX: number, clientY: number) {
    const rect = domElement.getBoundingClientRect()
    pointerX = clientX
    pointerY = clientY
    normX = ((clientX - rect.left) / rect.width) * 2 - 1
    normY = -((clientY - rect.top) / rect.height) * 2 + 1
  }

  function markGesture() {
    if (!hasGestured) {
      hasGestured = true
      firstGesture = true
    }
  }

  function addPuff(clientX: number, clientY: number) {
    markGesture()
    const world = screenToWorld(clientX, clientY)
    const planePos = getPlanePosition()
    const dist = world.distanceTo(planePos)
    puffs.push({
      screenX: clientX,
      screenY: clientY,
      worldPoint: world,
      nearPlane: dist < NEAR_PLANE_RADIUS,
    })
  }

  const onPointerMove = (e: PointerEvent) => {
    markGesture()
    updatePointer(e.clientX, e.clientY)
  }

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    updatePointer(e.clientX, e.clientY)

    const planePos = getPlanePosition()
    const world = screenToWorld(e.clientX, e.clientY)
    const dist = world.distanceTo(planePos)

    if (dist < 1.8) {
      planeClicked = true
      markGesture()
      return
    }

    addPuff(e.clientX, e.clientY)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault()
      rollRequested = true
      markGesture()
    }
  }

  domElement.addEventListener('pointermove', onPointerMove)
  domElement.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('keydown', onKeyDown)

  return {
    get pointer() {
      return {
        x: pointerX,
        y: pointerY,
        normalizedX: normX,
        normalizedY: normY,
        isMoving,
      }
    },
    update(dt: number) {
      const dx = normX - prevNormX
      const dy = normY - prevNormY
      moveSpeed = Math.sqrt(dx * dx + dy * dy) / Math.max(dt, 0.001)
      isMoving = moveSpeed > STILL_THRESHOLD * 60
      prevNormX = normX
      prevNormY = normY
    },
    consumePuffs() {
      const out = [...puffs]
      puffs.length = 0
      return out
    },
    consumeRoll() {
      if (!rollRequested && !planeClicked) return false
      rollRequested = false
      planeClicked = false
      return true
    },
    consumeFirstGesture() {
      if (!firstGesture) return false
      firstGesture = false
      return true
    },
  }
}

export interface Ripple {
  mesh: THREE.Mesh
  age: number
  maxAge: number
}

export function createRipple(scene: THREE.Scene, point: THREE.Vector3): Ripple {
  const geo = new THREE.RingGeometry(0.1, 0.15, 32)
  const mat = new THREE.MeshBasicMaterial({
    color: PHOSPHOR_BRIGHT,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.copy(point)
  mesh.position.y = point.y > 0 ? point.y - 0.05 : -1.95
  scene.add(mesh)
  return { mesh, age: 0, maxAge: 0.9 }
}

export function updateRipples(ripples: Ripple[], dt: number): Ripple[] {
  const alive: Ripple[] = []
  for (const r of ripples) {
    r.age += dt
    const t = r.age / r.maxAge
    const scale = 1 + t * 6
    r.mesh.scale.set(scale, scale, scale)
    const mat = r.mesh.material as THREE.MeshBasicMaterial
    mat.opacity = 0.6 * (1 - t)
    mat.color.setHex(t < 0.5 ? PHOSPHOR_BRIGHT : PHOSPHOR_MID)
    if (r.age < r.maxAge) {
      alive.push(r)
    } else {
      r.mesh.geometry.dispose()
      mat.dispose()
      r.mesh.parent?.remove(r.mesh)
    }
  }
  return alive
}
