import * as THREE from 'three'

/** Persistent 2D screen-space flight path — never clears during a session */
export class ScreenTrailOverlay {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private leftPath: { x: number; y: number }[] = []
  private rightPath: { x: number; y: number }[] = []
  private readonly maxPoints = 6000

  constructor(parent: HTMLElement) {
    this.canvas = document.createElement('canvas')
    this.canvas.className = 'screen-trail-overlay'
    parent.appendChild(this.canvas)
    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('2D context unavailable')
    this.ctx = ctx
    this.resize()
    window.addEventListener('resize', this.resize)
  }

  private resize = () => {
    const rect = this.canvas.parentElement?.getBoundingClientRect()
    if (!rect) return
    this.canvas.width = rect.width
    this.canvas.height = rect.height
  }

  update(left: { x: number; y: number }, right: { x: number; y: number }) {
    this.leftPath.push(left)
    this.rightPath.push(right)
    if (this.leftPath.length > this.maxPoints) {
      this.leftPath.shift()
      this.rightPath.shift()
    }
    this.draw()
  }

  private drawPath(path: { x: number; y: number }[], alpha: number) {
    if (path.length < 2) return
    const ctx = this.ctx
    ctx.beginPath()
    ctx.moveTo(path[0].x, path[0].y)
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y)
    ctx.strokeStyle = `rgba(0, 232, 90, ${alpha})`
    ctx.lineWidth = 1.2
    ctx.stroke()
  }

  private draw() {
    const { width, height } = this.canvas
    this.ctx.clearRect(0, 0, width, height)
    this.drawPath(this.leftPath, 0.35)
    this.drawPath(this.rightPath, 0.35)
  }

  dispose() {
    window.removeEventListener('resize', this.resize)
    this.canvas.remove()
  }
}

export function projectToScreen(
  point: THREE.Vector3,
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
): { x: number; y: number } | null {
  const p = point.clone().project(camera)
  if (p.z > 1) return null
  return {
    x: (p.x * 0.5 + 0.5) * width,
    y: (-p.y * 0.5 + 0.5) * height,
  }
}
