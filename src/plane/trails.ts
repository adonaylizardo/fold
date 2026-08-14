import * as THREE from 'three'
import { phosphorRgb } from '../theme/colors'

/** ~15s of wingtip ribbon, then points fade out and drop */
const TRAIL_LIFETIME_S = 15
const MAX_POINTS = 2000
const MIN_BRIGHTNESS = 0.48
const SAMPLE_EVERY = 1

type TrailPoint = { pos: THREE.Vector3; t: number }

export class WingtipTrails {
  private leftPoints: TrailPoint[] = []
  private rightPoints: TrailPoint[] = []
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

    const now = performance.now() * 0.001
    this.pushPoint(this.leftPoints, leftTip, now)
    this.pushPoint(this.rightPoints, rightTip, now)
    this.rebuildLine(this.leftGeo, this.leftPoints, now, this.leftPosAttr, this.leftColAttr)
    this.rebuildLine(this.rightGeo, this.rightPoints, now, this.rightPosAttr, this.rightColAttr)
  }

  private pushPoint(points: TrailPoint[], p: THREE.Vector3, now: number) {
    points.push({ pos: p.clone(), t: now })
    while (points.length > 0 && now - points[0].t > TRAIL_LIFETIME_S) {
      points.shift()
    }
    while (points.length > MAX_POINTS) {
      points.shift()
    }
  }

  /** Oldest → newest order for Line geometry; fade by age within lifetime */
  private rebuildLine(
    geo: THREE.BufferGeometry,
    points: TrailPoint[],
    now: number,
    posAttr: THREE.BufferAttribute,
    colAttr: THREE.BufferAttribute,
  ) {
    const count = points.length
    if (count < 2) {
      geo.setDrawRange(0, 0)
      return
    }

    const pos = posAttr.array as Float32Array
    const col = colAttr.array as Float32Array

    for (let i = 0; i < count; i++) {
      const { pos: p, t } = points[i]
      pos[i * 3] = p.x
      pos[i * 3 + 1] = p.y
      pos[i * 3 + 2] = p.z

      const age = now - t
      const fade = Math.max(0, 1 - age / TRAIL_LIFETIME_S)
      const brightness = MIN_BRIGHTNESS + fade * (1 - MIN_BRIGHTNESS)
      const [r, g, b] = phosphorRgb(brightness)
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
