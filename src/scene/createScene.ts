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
  scene.fog = new THREE.Fog(FOG, 25, 95)

  const camera = new THREE.PerspectiveCamera(
    55,
    container.clientWidth / container.clientHeight,
    0.1,
    200,
  )
  camera.position.set(0, 3, 10)

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

export function updateCameraFollow(
  camera: THREE.PerspectiveCamera,
  planePos: THREE.Vector3,
  planeQuat: THREE.Quaternion,
  dt: number,
) {
  const offset = new THREE.Vector3(0, 2.2, 7)
  offset.applyQuaternion(planeQuat)
  const targetPos = planePos.clone().add(offset)

  camera.position.lerp(targetPos, 1 - Math.pow(0.001, dt))

  const lookAhead = new THREE.Vector3(0, 0, -6)
  lookAhead.applyQuaternion(planeQuat)
  const lookTarget = planePos.clone().add(lookAhead)
  camera.lookAt(lookTarget)
}
