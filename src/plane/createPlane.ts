import * as THREE from 'three'
import { PHOSPHOR, PHOSPHOR_BRIGHT, PHOSPHOR_DIM, PHOSPHOR_MID } from '../theme/colors'

export interface PlaneBundle {
  group: THREE.Group
  leftTip: THREE.Vector3
  rightTip: THREE.Vector3
  rollAngle: number
  isRolling: boolean
  rollCooldown: number
  startRoll: () => boolean
  updateRoll: (dt: number) => void
  dispose: () => void
}

const ROLL_DURATION = 0.65
const ROLL_COOLDOWN = 1.4

function addWireframeMesh(
  parent: THREE.Group,
  geo: THREE.BufferGeometry,
  fillColor: number,
  fillOpacity: number,
  lineColor: number,
): THREE.Material[] {
  const fillMat = new THREE.MeshBasicMaterial({
    color: fillColor,
    transparent: true,
    opacity: fillOpacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const mesh = new THREE.Mesh(geo, fillMat)
  parent.add(mesh)

  const edgeGeo = new THREE.EdgesGeometry(geo, 18)
  const lineMat = new THREE.LineBasicMaterial({
    color: lineColor,
    transparent: true,
    opacity: 0.85,
  })
  const wire = new THREE.LineSegments(edgeGeo, lineMat)
  parent.add(wire)

  return [fillMat, lineMat]
}

export function createPlane(): PlaneBundle {
  const group = new THREE.Group()
  const rollGroup = new THREE.Group()
  group.add(rollGroup)

  const materials: THREE.Material[] = []
  const geos: THREE.BufferGeometry[] = []

  const noseGeo = new THREE.ConeGeometry(0.08, 0.35, 4)
  geos.push(noseGeo)
  const nose = new THREE.Mesh(
    noseGeo,
    new THREE.MeshBasicMaterial({
      color: PHOSPHOR_BRIGHT,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    }),
  )
  materials.push(nose.material as THREE.Material)
  nose.rotation.x = Math.PI / 2
  nose.position.z = -0.85
  rollGroup.add(nose)
  const noseEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(noseGeo),
    new THREE.LineBasicMaterial({ color: PHOSPHOR_BRIGHT, transparent: true, opacity: 0.95 }),
  )
  materials.push(noseEdges.material as THREE.Material)
  rollGroup.add(noseEdges)

  const bodyShape = new THREE.Shape()
  bodyShape.moveTo(0, 0)
  bodyShape.lineTo(-0.12, 0.7)
  bodyShape.lineTo(0.12, 0.7)
  bodyShape.closePath()
  const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, { depth: 0.04, bevelEnabled: false })
  bodyGeo.center()
  geos.push(bodyGeo)
  const bodyPivot = new THREE.Group()
  bodyPivot.rotation.x = -Math.PI / 2
  bodyPivot.position.set(0, 0, 0.1)
  rollGroup.add(bodyPivot)
  materials.push(...addWireframeMesh(bodyPivot, bodyGeo, PHOSPHOR_MID, 0.22, PHOSPHOR))

  const wingShape = new THREE.Shape()
  wingShape.moveTo(0, 0)
  wingShape.lineTo(-1.6, 0.85)
  wingShape.lineTo(-0.15, 0.05)
  wingShape.closePath()
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
    depth: 0.025,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
  })
  wingGeo.center()
  geos.push(wingGeo)

  const leftPivot = new THREE.Group()
  leftPivot.rotation.x = -Math.PI / 2
  leftPivot.rotation.z = 0.08
  leftPivot.position.set(-0.05, 0.02, 0.15)
  rollGroup.add(leftPivot)
  materials.push(...addWireframeMesh(leftPivot, wingGeo, PHOSPHOR, 0.28, PHOSPHOR_BRIGHT))

  const rightPivot = new THREE.Group()
  rightPivot.rotation.x = -Math.PI / 2
  rightPivot.rotation.z = -0.08
  rightPivot.position.set(0.05, 0.02, 0.15)
  rightPivot.scale.x = -1
  rollGroup.add(rightPivot)
  const wingGeoR = wingGeo.clone()
  geos.push(wingGeoR)
  materials.push(...addWireframeMesh(rightPivot, wingGeoR, PHOSPHOR, 0.28, PHOSPHOR_BRIGHT))

  const tailShape = new THREE.Shape()
  tailShape.moveTo(0, 0)
  tailShape.lineTo(-0.35, 0.45)
  tailShape.lineTo(0, 0.08)
  tailShape.closePath()
  const tailGeo = new THREE.ExtrudeGeometry(tailShape, { depth: 0.02, bevelEnabled: false })
  tailGeo.center()
  geos.push(tailGeo)
  const tailPivot = new THREE.Group()
  tailPivot.rotation.x = -Math.PI / 2
  tailPivot.position.set(0, 0.015, 0.75)
  rollGroup.add(tailPivot)
  materials.push(...addWireframeMesh(tailPivot, tailGeo, PHOSPHOR_DIM, 0.18, PHOSPHOR_MID))

  const leftTip = new THREE.Vector3(-1.55, 0.02, 0.5)
  const rightTip = new THREE.Vector3(1.55, 0.02, 0.5)

  let rollAngle = 0
  let rollProgress = 1
  let rollCooldown = 0

  return {
    group,
    leftTip,
    rightTip,
    get rollAngle() {
      return rollAngle
    },
    get isRolling() {
      return rollProgress < 1
    },
    get rollCooldown() {
      return rollCooldown
    },
    startRoll(): boolean {
      if (rollProgress < 1 || rollCooldown > 0) return false
      rollProgress = 0
      return true
    },
    updateRoll(dt: number) {
      if (rollCooldown > 0) rollCooldown -= dt
      if (rollProgress < 1) {
        rollProgress = Math.min(1, rollProgress + dt / ROLL_DURATION)
        const t = rollProgress
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
        rollAngle = ease * Math.PI * 2
        if (rollProgress >= 1) {
          rollAngle = 0
          rollCooldown = ROLL_COOLDOWN
        }
      }
      rollGroup.rotation.z = rollAngle
    },
    dispose: () => {
      geos.forEach((g) => g.dispose())
      materials.forEach((m) => m.dispose())
    },
  }
}

export function getWorldWingtips(
  group: THREE.Group,
  leftLocal: THREE.Vector3,
  rightLocal: THREE.Vector3,
): [THREE.Vector3, THREE.Vector3] {
  group.updateMatrixWorld(true)
  const left = leftLocal.clone().applyMatrix4(group.matrixWorld)
  const right = rightLocal.clone().applyMatrix4(group.matrixWorld)
  return [left, right]
}
