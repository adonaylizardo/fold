import * as THREE from 'three'
import { phosphorRgb } from '../theme/colors'

/** ~many seconds of ribbon at 60fps — never a vanishing wisp */
const MAX_POINTS = 1800
const MIN_BRIGHTNESS = 0.42

export class WingtipTrails {
  private leftPoints: THREE.Vector3[] = []
  private rightPoints: THREE.Vector3[] = []
  private leftLine: THREE.Line
  private rightLine: THREE.Line
  private leftGeo: THREE.BufferGeometry
  private rightGeo: THREE.BufferGeometry
  private leftPosAttr: THREE.BufferAttribute
  private rightPosAttr: THREE.BufferAttribute
  private leftColAttr: THREE.BufferAttribute
  private rightColAttr: THREE.BufferAttribute

  constructor(scene: THREE.Scene) {
    this.leftGeo = new THREE.BufferGeometry()
    this.rightGeo = new THREE.BufferGeometry()

    const posL = new Float32Array(MAX_POINTS * 3)
    const posR = new Float32Array(MAX_POINTS * 3)
    const colL = new Float32Array(MAX_POINTS * 3)
    const colR = new Float32Array(MAX_POINTS * 3)

    this.leftPosAttr = new THREE.BufferAttribute(posL, 3)
    this.rightPosAttr = new THREE.BufferAttribute(posR, 3)
    this.leftColAttr = new THREE.BufferAttribute(colL, 3)
    this.rightColAttr = new THREE.BufferAttribute(colR, 3)

    this.leftGeo.setAttribute('position', this.leftPosAttr)
    this.leftGeo.setAttribute('color', this.leftColAttr)
    this.rightGeo.setAttribute('position', this.rightPosAttr)
    this.rightGeo.setAttribute('color', this.rightColAttr)
    this.leftGeo.setDrawRange(0, 0)
    this.rightGeo.setDrawRange(0, 0)

    const matLeft = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
    })
    const matRight = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
    })

    this.leftLine = new THREE.Line(this.leftGeo, matLeft)
    this.rightLine = new THREE.Line(this.rightGeo, matRight)
    scene.add(this.leftLine)
    scene.add(this.rightLine)
  }

  update(leftTip: THREE.Vector3, rightTip: THREE.Vector3) {
    this.leftPoints.unshift(leftTip.clone())
    this.rightPoints.unshift(rightTip.clone())
    if (this.leftPoints.length > MAX_POINTS) this.leftPoints.length = MAX_POINTS
    if (this.rightPoints.length > MAX_POINTS) this.rightPoints.length = MAX_POINTS

    this.refreshGeo(this.leftGeo, this.leftPoints, this.leftPosAttr, this.leftColAttr)
    this.refreshGeo(this.rightGeo, this.rightPoints, this.rightPosAttr, this.rightColAttr)
  }

  shift(offset: THREE.Vector3) {
    for (const p of this.leftPoints) p.add(offset)
    for (const p of this.rightPoints) p.add(offset)
  }

  private refreshGeo(
    geo: THREE.BufferGeometry,
    pts: THREE.Vector3[],
    posAttr: THREE.BufferAttribute,
    colAttr: THREE.BufferAttribute,
  ) {
    if (pts.length < 2) return
    const n = pts.length
    const pos = posAttr.array as Float32Array
    const col = colAttr.array as Float32Array
    for (let i = 0; i < n; i++) {
      pos[i * 3] = pts[i].x
      pos[i * 3 + 1] = pts[i].y
      pos[i * 3 + 2] = pts[i].z
      const age = i / Math.max(n - 1, 1)
      const t = MIN_BRIGHTNESS + (1 - age) * (1 - MIN_BRIGHTNESS)
      const [r, g, b] = phosphorRgb(t)
      col[i * 3] = r
      col[i * 3 + 1] = g
      col[i * 3 + 2] = b
    }
    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
    geo.setDrawRange(0, n)
  }

  dispose() {
    this.leftGeo.dispose()
    this.rightGeo.dispose()
    ;(this.leftLine.material as THREE.Material).dispose()
    ;(this.rightLine.material as THREE.Material).dispose()
  }
}
