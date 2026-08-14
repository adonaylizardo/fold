import * as THREE from 'three'
import { FOG, PHOSPHOR_DIM, PHOSPHOR_FAINT, VOID } from '../theme/colors'

export interface SceneBundle {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  dispose: () => void
}

export function createScene(container: HTMLElement): SceneBundle {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(VOID)
  scene.fog = new THREE.Fog(FOG, 40, 180)

  const camera = new THREE.PerspectiveCamera(
    50,
    container.clientWidth / container.clientHeight,
    0.1,
    400,
  )
  camera.position.set(0, 4, 12)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.shadowMap.enabled = false
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  container.appendChild(renderer.domElement)

  const ambient = new THREE.AmbientLight(PHOSPHOR_DIM, 0.35)
  scene.add(ambient)

  const key = new THREE.DirectionalLight(PHOSPHOR_DIM, 0.9)
  key.position.set(6, 14, 8)
  scene.add(key)

  const rim = new THREE.DirectionalLight(PHOSPHOR_FAINT, 0.25)
  rim.position.set(-8, 2, -6)
  scene.add(rim)

  const onResize = () => {
    const w = container.clientWidth
    const h = container.clientHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  }
  window.addEventListener('resize', onResize)

  const dispose = () => {
    window.removeEventListener('resize', onResize)
    renderer.dispose()
    container.removeChild(renderer.domElement)
  }

  return { scene, camera, renderer, dispose }
}

/** Stable chase camera — yaw-based, minimal roll coupling */
export function updateCameraFollow(
  camera: THREE.PerspectiveCamera,
  planePos: THREE.Vector3,
  heading: number,
  pitch: number,
  dt: number,
) {
  const dist = 9
  const height = 3.2
  const fx = Math.sin(heading)
  const fz = -Math.cos(heading)

  const targetPos = new THREE.Vector3(
    planePos.x - fx * dist,
    planePos.y + height - pitch * 1.5,
    planePos.z - fz * dist,
  )

  camera.position.lerp(targetPos, 1 - Math.pow(0.0008, dt))

  const lookAt = new THREE.Vector3(
    planePos.x + fx * 12,
    planePos.y + pitch * 2,
    planePos.z + fz * 12,
  )
  camera.lookAt(lookAt)
}
