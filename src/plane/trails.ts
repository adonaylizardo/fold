import * as THREE from 'three'
import { phosphorRgb } from '../theme/colors'

/** Long session ribbon — ring buffer, no wrap, no fog fade */
const MAX_POINTS = 5000
const MIN_BRIGHTNESS = 0.48
const SAMPLE_EVERY = 1

export class WingtipTrails {
  private leftBuf: THREE.Vector3[] = []
  private rightBuf: THREE.Vector3[] = []
  private leftHead = 0
  private leftCount = 0
  private rightHead = 0
  private rightCount = 0
  private leftLine: THREE.Line
  private rightLine: THREE.Line
  private leftGeo: THREE.BufferGeometry
  private rightGeo: THREE.BufferGeometry
  private leftPosAttr: THREE.BufferAttribute
  private rightPosAttr: THREE.BufferAttribute
  private leftColAttr: THREE.BufferAttribute
  private rightColAttr: THREE.BufferAttribute
  private tick = 0

  constructor(scene: THREE.Scene) {
    this.leftBuf = Array.from({ length: MAX_POINTS }, () => new THREE.Vector3())
    this.rightBuf = Array.from({ length: MAX_POINTS }, () => new THREE.Vector3())

    this.leftGeo = new THREE.BufferGeometry()
    this.rightGeo = new THREE.BufferGeometry()

    this.leftPosAttr = new THREE.BufferAttribute(new Float32Array(MAX_POINTS * 3), 3)
    this.rightPosAttr = new THREE.BufferAttribute(new Float32Array(MAX_POINTS * 3), 3)
    this.leftColAttr = new THREE.BufferAttribute(new Float32Array(MAX_POINTS * 3), 3)
    this.rightColAttr = new THREE.BufferAttribute(new Float32Array(MAX_POINTS * 3), 3)

    this.leftGeo.setAttribute('position', this.leftPosAttr)
    this.leftGeo.setAttribute('color', this.leftColAttr)
    this.rightGeo.setAttribute('position', this.rightPosAttr)
    this.rightGeo.setAttribute('color', this.rightColAttr)

    const matOpts = {
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      fog: false,
      depthWrite: false,
    }
    this.leftLine = new THREE.Line(this.leftGeo, new THREE.LineBasicMaterial(matOpts))
    this.rightLine = new THREE.Line(this.rightGeo, new THREE.LineBasicMaterial(matOpts))
    this.leftLine.frustumCulled = false
    this.rightLine.frustumCulled = false
    scene.add(this.leftLine)
    scene.add(this.rightLine)
  }

  update(leftTip: THREE.Vector3, rightTip: THREE.Vector3) {
    this.tick++
    if (this.tick % SAMPLE_EVERY !== 0) return

    this.pushPoint(this.leftBuf, 'left', leftTip)
    this.pushPoint(this.rightBuf, 'right', rightTip)
    this.rebuildLine(this.leftGeo, this.leftBuf, this.leftHead, this.leftCount, this.leftPosAttr, this.leftColAttr)
    this.rebuildLine(this.rightGeo, this.rightBuf, this.rightHead, this.rightCount, this.rightPosAttr, this.rightColAttr)
  }

  private pushPoint(buf: THREE.Vector3[], side: 'left' | 'right', p: THREE.Vector3) {
    const head = side === 'left' ? this.leftHead : this.rightHead
    const count = side === 'left' ? this.leftCount : this.rightCount
    buf[head].copy(p)
    const newHead = (head + 1) % MAX_POINTS
    const newCount = Math.min(count + 1, MAX_POINTS)
    if (side === 'left') {
      this.leftHead = newHead
      this.leftCount = newCount
    } else {
      this.rightHead = newHead
      this.rightCount = newCount
    }
  }

  /** Oldest → newest order for Line geometry */
  private rebuildLine(
    geo: THREE.BufferGeometry,
    buf: THREE.Vector3[],
    head: number,
    count: number,
    posAttr: THREE.BufferAttribute,
    colAttr: THREE.BufferAttribute,
  ) {
    if (count < 2) return
    const pos = posAttr.array as Float32Array
    const col = colAttr.array as Float32Array
    const start = (head - count + MAX_POINTS) % MAX_POINTS

    for (let i = 0; i < count; i++) {
      const idx = (start + i) % MAX_POINTS
      const p = buf[idx]
      pos[i * 3] = p.x
      pos[i * 3 + 1] = p.y
      pos[i * 3 + 2] = p.z
      const age = i / Math.max(count - 1, 1)
      const t = MIN_BRIGHTNESS + (1 - age) * (1 - MIN_BRIGHTNESS)
      const [r, g, b] = phosphorRgb(t)
      col[i * 3] = r
      col[i * 3 + 1] = g
      col[i * 3 + 2] = b
    }
    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
    geo.setDrawRange(0, count)
    geo.computeBoundingSphere()
  }

  dispose() {
    this.leftGeo.dispose()
    this.rightGeo.dispose()
    ;(this.leftLine.material as THREE.Material).dispose()
    ;(this.rightLine.material as THREE.Material).dispose()
  }
}
