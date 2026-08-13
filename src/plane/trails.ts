import * as THREE from 'three'
import { phosphorRgb } from '../theme/colors'

const MAX_POINTS = 72

export class WingtipTrails {
  private leftPoints: THREE.Vector3[] = []
  private rightPoints: THREE.Vector3[] = []
  private leftLine: THREE.Line
  private rightLine: THREE.Line
  private leftGeo: THREE.BufferGeometry
  private rightGeo: THREE.BufferGeometry
  private tick = 0

  constructor(scene: THREE.Scene) {
    this.leftGeo = new THREE.BufferGeometry()
    this.rightGeo = new THREE.BufferGeometry()

    const matLeft = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
    })
    const matRight = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
    })

    this.leftLine = new THREE.Line(this.leftGeo, matLeft)
    this.rightLine = new THREE.Line(this.rightGeo, matRight)
    scene.add(this.leftLine)
    scene.add(this.rightLine)
  }

  update(leftTip: THREE.Vector3, rightTip: THREE.Vector3) {
    this.tick++
    if (this.tick % 2 !== 0) return

    this.leftPoints.unshift(leftTip.clone())
    this.rightPoints.unshift(rightTip.clone())
    if (this.leftPoints.length > MAX_POINTS) this.leftPoints.pop()
    if (this.rightPoints.length > MAX_POINTS) this.rightPoints.pop()

    this.refreshGeo(this.leftGeo, this.leftPoints)
    this.refreshGeo(this.rightGeo, this.rightPoints)
  }

  private refreshGeo(geo: THREE.BufferGeometry, pts: THREE.Vector3[]) {
    if (pts.length < 2) return
    const positions = new Float32Array(pts.length * 3)
    const colors = new Float32Array(pts.length * 3)
    for (let i = 0; i < pts.length; i++) {
      positions[i * 3] = pts[i].x
      positions[i * 3 + 1] = pts[i].y
      positions[i * 3 + 2] = pts[i].z
      const t = 1 - i / pts.length
      const [r, g, b] = phosphorRgb(t)
      colors[i * 3] = r
      colors[i * 3 + 1] = g
      colors[i * 3 + 2] = b
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  }

  dispose() {
    this.leftGeo.dispose()
    this.rightGeo.dispose()
    ;(this.leftLine.material as THREE.Material).dispose()
    ;(this.rightLine.material as THREE.Material).dispose()
  }
}
