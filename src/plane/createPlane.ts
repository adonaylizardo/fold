import * as THREE from 'three'
import { PHOSPHOR, PHOSPHOR_BRIGHT, PHOSPHOR_MID } from '../theme/colors'

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

/** Classic dart: nose -Z, wings swept back, center spine, small tail flaps */
function buildDartGeometry(): THREE.BufferGeometry {
  // Key points (one folded sheet — top + bottom halves, slight dihedral)
  const nose = new THREE.Vector3(0, 0.04, -1.15)
  const spineMid = new THREE.Vector3(0, 0.06, -0.05)
  const spineTail = new THREE.Vector3(0, 0.04, 0.72)

  const wingL = new THREE.Vector3(-1.75, -0.02, 0.28)
  const wingR = new THREE.Vector3(1.75, -0.02, 0.28)
  const wingInnerL = new THREE.Vector3(-0.1, 0.02, -0.82)
  const wingInnerR = new THREE.Vector3(0.1, 0.02, -0.82)
  const trailingL = new THREE.Vector3(-0.55, 0.01, 0.62)
  const trailingR = new THREE.Vector3(0.55, 0.01, 0.62)

  const tailFlapL = new THREE.Vector3(-0.32, 0.02, 0.88)
  const tailFlapR = new THREE.Vector3(0.32, 0.02, 0.88)
  const tailFlapTipL = new THREE.Vector3(-0.22, -0.01, 1.02)
  const tailFlapTipR = new THREE.Vector3(0.22, -0.01, 1.02)

  // Underside fold (slight V dihedral)
  const bellyL = new THREE.Vector3(-1.72, -0.12, 0.22)
  const bellyR = new THREE.Vector3(1.72, -0.12, 0.22)
  const bellyNoseL = new THREE.Vector3(-0.08, -0.06, -0.78)
  const bellyNoseR = new THREE.Vector3(0.08, -0.06, -0.78)

  const verts: number[] = []
  const pushTri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
    verts.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
  }

  // Top left wing
  pushTri(nose, wingInnerL, wingL)
  pushTri(wingInnerL, trailingL, wingL)
  pushTri(wingInnerL, spineMid, trailingL)

  // Top right wing
  pushTri(nose, wingR, wingInnerR)
  pushTri(wingInnerR, wingR, trailingR)
  pushTri(wingInnerR, trailingR, spineMid)

  // Top center spine triangle strip
  pushTri(nose, spineMid, wingInnerL)
  pushTri(nose, wingInnerR, spineMid)

  // Bottom left wing (folded under)
  pushTri(nose, bellyNoseL, bellyL)
  pushTri(bellyNoseL, trailingL, bellyL)
  pushTri(bellyNoseL, spineMid, trailingL)

  // Bottom right wing
  pushTri(nose, bellyR, bellyNoseR)
  pushTri(bellyNoseR, bellyR, trailingR)
  pushTri(bellyNoseR, trailingR, spineMid)

  // Rear fuselage wedge
  pushTri(spineMid, trailingL, spineTail)
  pushTri(spineMid, spineTail, trailingR)

  // Tail flaps
  pushTri(spineTail, tailFlapL, tailFlapTipL)
  pushTri(spineTail, tailFlapTipR, tailFlapR)

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geo.computeVertexNormals()
  return geo
}

function addFilledWireframe(
  parent: THREE.Object3D,
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
  parent.add(new THREE.Mesh(geo, fillMat))

  const edgeGeo = new THREE.EdgesGeometry(geo, 12)
  const lineMat = new THREE.LineBasicMaterial({
    color: lineColor,
    transparent: true,
    opacity: 0.9,
  })
  parent.add(new THREE.LineSegments(edgeGeo, lineMat))

  return [fillMat, lineMat]
}

function buildSpineLine(): THREE.BufferGeometry {
  const pts = [
    new THREE.Vector3(0, 0.07, -1.12),
    new THREE.Vector3(0, 0.08, -0.4),
    new THREE.Vector3(0, 0.07, 0.1),
    new THREE.Vector3(0, 0.05, 0.72),
    new THREE.Vector3(0, 0.04, 0.95),
  ]
  return new THREE.BufferGeometry().setFromPoints(pts)
}

export function createPlane(): PlaneBundle {
  const group = new THREE.Group()
  const rollGroup = new THREE.Group()
  group.add(rollGroup)

  const materials: THREE.Material[] = []
  const geos: THREE.BufferGeometry[] = []

  const dartGeo = buildDartGeometry()
  geos.push(dartGeo)
  materials.push(...addFilledWireframe(rollGroup, dartGeo, PHOSPHOR, 0.26, PHOSPHOR_BRIGHT))

  const spineGeo = buildSpineLine()
  geos.push(spineGeo)
  const spineMat = new THREE.LineBasicMaterial({
    color: PHOSPHOR_BRIGHT,
    transparent: true,
    opacity: 0.95,
  })
  materials.push(spineMat)
  rollGroup.add(new THREE.Line(spineGeo, spineMat))

  // Crease lines (wing fold edges)
  const creasePts = [
    [nose2(-1.12), wingFoldL()],
    [nose2(-1.12), wingFoldR()],
    [wingFoldL(), trailL()],
    [wingFoldR(), trailR()],
  ] as const

  function nose2(z: number) {
    return new THREE.Vector3(0, 0.05, z)
  }
  function wingFoldL() {
    return new THREE.Vector3(-0.1, 0.03, -0.8)
  }
  function wingFoldR() {
    return new THREE.Vector3(0.1, 0.03, -0.8)
  }
  function trailL() {
    return new THREE.Vector3(-0.55, 0.02, 0.6)
  }
  function trailR() {
    return new THREE.Vector3(0.55, 0.02, 0.6)
  }

  const creaseMat = new THREE.LineBasicMaterial({
    color: PHOSPHOR_MID,
    transparent: true,
    opacity: 0.7,
  })
  materials.push(creaseMat)
  for (const [a, b] of creasePts) {
    const g = new THREE.BufferGeometry().setFromPoints([a, b])
    geos.push(g)
    rollGroup.add(new THREE.Line(g, creaseMat))
  }

  const leftTip = new THREE.Vector3(-1.75, -0.02, 0.28)
  const rightTip = new THREE.Vector3(1.75, -0.02, 0.28)

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
