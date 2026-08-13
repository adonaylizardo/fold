import * as THREE from 'three'
import type { PuffEvent } from '../input/InputManager'

export interface SimState {
  position: THREE.Vector3
  velocity: THREE.Vector3
  quaternion: THREE.Quaternion
  bankAngle: number
  pitchAngle: number
}

const BASE_SPEED = 6
const CHASE_STRENGTH = 2.8
const BANK_FACTOR = 0.55
const LEVEL_SPEED = 4
const PUFF_BOOST = 4
const LOCAL_GUST = 8
const MIN_Y = 0.8
const MAX_Y = 12

export class Simulation {
  position = new THREE.Vector3(0, 1.5, 0)
  velocity = new THREE.Vector3(0, 0, -BASE_SPEED)
  quaternion = new THREE.Quaternion()
  bankAngle = 0
  pitchAngle = 0

  private targetDir = new THREE.Vector3(0, 0, -1)
  private smoothPointer = new THREE.Vector2(0, 0)
  private readonly _forward = new THREE.Vector3()
  private readonly _lookMat = new THREE.Matrix4()
  private readonly _targetQuat = new THREE.Quaternion()
  private readonly _bankQuat = new THREE.Quaternion()
  private readonly _pitchQuat = new THREE.Quaternion()
  private readonly _flatVel = new THREE.Vector3()
  private readonly _breezeTarget = new THREE.Vector3()
  private readonly _toTarget = new THREE.Vector3()
  private readonly _desiredVel = new THREE.Vector3()
  private readonly _gust = new THREE.Vector3()
  private readonly _raycaster = new THREE.Raycaster()
  private readonly _ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  private readonly _hit = new THREE.Vector3()
  private readonly _lookTarget = new THREE.Vector3()
  private baseQuat = new THREE.Quaternion()

  update(
    dt: number,
    pointer: { normalizedX: number; normalizedY: number; isMoving: boolean },
    camera: THREE.PerspectiveCamera,
    puffs: PuffEvent[],
  ) {
    this.smoothPointer.x += (pointer.normalizedX - this.smoothPointer.x) * Math.min(1, dt * 6)
    this.smoothPointer.y += (pointer.normalizedY - this.smoothPointer.y) * Math.min(1, dt * 6)

    const breezeTarget = this.pointerToWorldTarget(this.smoothPointer, camera)
    this._toTarget.copy(breezeTarget).sub(this.position)
    this._toTarget.y *= 0.6

    if (pointer.isMoving) {
      this.targetDir.lerp(this._toTarget.normalize(), Math.min(1, dt * CHASE_STRENGTH))
    } else {
      this._flatVel.set(this.velocity.x, 0, this.velocity.z)
      if (this._flatVel.lengthSq() > 0.001) {
        this.targetDir.lerp(this._flatVel.normalize(), Math.min(1, dt * LEVEL_SPEED * 0.3))
      }
    }

    this._desiredVel.copy(this.targetDir).normalize().multiplyScalar(BASE_SPEED)
    this.velocity.lerp(this._desiredVel, Math.min(1, dt * 2.5))

    for (const puff of puffs) {
      this.applyPuff(puff)
    }

    this.position.addScaledVector(this.velocity, dt)
    this.position.y = THREE.MathUtils.clamp(this.position.y, MIN_Y, MAX_Y)

    this._flatVel.set(this.velocity.x, 0, this.velocity.z)
    if (this._flatVel.lengthSq() > 0.01) {
      this._forward.copy(this._flatVel).normalize()
      this._lookTarget.copy(this.position).add(this._forward)
      this._lookMat.lookAt(this.position, this._lookTarget, new THREE.Vector3(0, 1, 0))
      this._targetQuat.setFromRotationMatrix(this._lookMat)

      const turnRate = pointer.isMoving
        ? (pointer.normalizedX - this.smoothPointer.x) * 8
        : 0
      const targetBank = pointer.isMoving ? -turnRate * BANK_FACTOR : 0
      this.bankAngle += (targetBank - this.bankAngle) * Math.min(1, dt * LEVEL_SPEED)

      const velPitch = THREE.MathUtils.clamp(this.velocity.y * 0.08, -0.35, 0.35)
      this.pitchAngle += (velPitch - this.pitchAngle) * Math.min(1, dt * 3)

      this.baseQuat.slerp(this._targetQuat, Math.min(1, dt * 4))

      this._bankQuat.setFromAxisAngle(new THREE.Vector3(0, 0, 1), this.bankAngle)
      this._pitchQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.pitchAngle)
      this.quaternion.copy(this.baseQuat).multiply(this._bankQuat).multiply(this._pitchQuat)
    }
  }

  private pointerToWorldTarget(pointer: THREE.Vector2, camera: THREE.PerspectiveCamera): THREE.Vector3 {
    this._raycaster.setFromCamera(pointer, camera)
    this._raycaster.ray.intersectPlane(this._ground, this._hit)
    this._breezeTarget.copy(this._hit)
    this._breezeTarget.y = this.position.y
    return this._breezeTarget
  }

  private applyPuff(puff: PuffEvent) {
    this._forward.copy(this.velocity).normalize()
    this.velocity.addScaledVector(this._forward, PUFF_BOOST)

    if (puff.nearPlane) {
      this._gust.copy(puff.worldPoint).sub(this.position)
      this._gust.y *= 0.5
      if (this._gust.lengthSq() > 0.01) {
        this._gust.normalize().multiplyScalar(LOCAL_GUST)
        this.velocity.add(this._gust)
      }
    }
  }
}
