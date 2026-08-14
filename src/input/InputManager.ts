import * as THREE from 'three'

export interface PointerState {
  x: number
  y: number
  normalizedX: number
  normalizedY: number
  isMoving: boolean
}

export interface KeyboardSteer {
  x: number
  y: number
  active: boolean
}

export interface WaveSpawn {
  origin: THREE.Vector3
  distance: number
}

export interface InputState {
  pointer: PointerState
  keyboard: KeyboardSteer
  update: (dt: number) => void
  consumeWaveSpawns: () => WaveSpawn[]
  consumeRoll: () => boolean
  consumeFirstGesture: () => boolean
  dispose: () => void
}

const STILL_THRESHOLD = 0.008

const STEER_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
])

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

  const waveSpawns: WaveSpawn[] = []
  let rollRequested = false
  let planeClicked = false
  let firstGesture = false
  let hasGestured = false
  const keysDown = new Set<string>()

  const raycaster = new THREE.Raycaster()
  const intersect = new THREE.Vector3()

  function screenToWorld(sx: number, sy: number, planeY: number): THREE.Vector3 {
    const rect = domElement.getBoundingClientRect()
    const x = ((sx - rect.left) / rect.width) * 2 - 1
    const y = -((sy - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera)
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY)
    if (!raycaster.ray.intersectPlane(plane, intersect)) {
      intersect.set(0, planeY, 0)
    }
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

  function addWave(clientX: number, clientY: number) {
    markGesture()
    const planePos = getPlanePosition()
    const world = screenToWorld(clientX, clientY, planePos.y)
    const dist = world.distanceTo(planePos)
    waveSpawns.push({ origin: world, distance: dist })
  }

  const onPointerMove = (e: PointerEvent) => {
    markGesture()
    updatePointer(e.clientX, e.clientY)
  }

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    updatePointer(e.clientX, e.clientY)

    const planePos = getPlanePosition()
    const world = screenToWorld(e.clientX, e.clientY, planePos.y)
    const dist = world.distanceTo(planePos)

    if (dist < 1.5) {
      planeClicked = true
      markGesture()
      return
    }

    addWave(e.clientX, e.clientY)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault()
      rollRequested = true
      markGesture()
      return
    }
    if (STEER_KEYS.has(e.code)) {
      e.preventDefault()
      keysDown.add(e.code)
      markGesture()
    }
  }

  const onKeyUp = (e: KeyboardEvent) => {
    keysDown.delete(e.code)
  }

  const onBlur = () => keysDown.clear()

  domElement.addEventListener('pointermove', onPointerMove)
  domElement.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlur)

  function readKeyboard(): KeyboardSteer {
    let x = 0
    let y = 0
    if (keysDown.has('KeyA') || keysDown.has('ArrowLeft')) x -= 1
    if (keysDown.has('KeyD') || keysDown.has('ArrowRight')) x += 1
    if (keysDown.has('KeyW') || keysDown.has('ArrowUp')) y += 1
    if (keysDown.has('KeyS') || keysDown.has('ArrowDown')) y -= 1
    const len = Math.hypot(x, y)
    if (len > 1) {
      x /= len
      y /= len
    }
    return { x, y, active: len > 0 }
  }

  return {
    get pointer() {
      return { x: pointerX, y: pointerY, normalizedX: normX, normalizedY: normY, isMoving }
    },
    get keyboard() {
      return readKeyboard()
    },
    update(dt: number) {
      const dx = normX - prevNormX
      const dy = normY - prevNormY
      const moveSpeed = Math.sqrt(dx * dx + dy * dy) / Math.max(dt, 0.001)
      isMoving = moveSpeed > STILL_THRESHOLD * 60
      prevNormX = normX
      prevNormY = normY
    },
    consumeWaveSpawns() {
      const out = [...waveSpawns]
      waveSpawns.length = 0
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
    dispose() {
      domElement.removeEventListener('pointermove', onPointerMove)
      domElement.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    },
  }
}
