import * as THREE from 'three'
import type { KeyboardSteer } from '../input/InputManager'
import type { WaveHit } from './BreezeWave'

export interface SimState {
  position: THREE.Vector3
  velocity: THREE.Vector3
  quaternion: THREE.Quaternion
  bankAngle: number
  pitchAngle: number
}

const BASE_SPEED = 6.2
const CHASE_STRENGTH = 2.6
const BANK_FACTOR = 0.55
const LEVEL_SPEED = 3.5
const MIN_Y = 0.8
const MAX_Y = 14
const KEY_OFFSET = 14
const KEY_CLIMB = 10

export class Simulation {
  position = new THREE.Vector3(0, 1.5, 0)
  velocity = new THREE.Vector3(0, 0, -BASE_SPEED)
  quaternion = new THREE.Quaternion()
  bankAngle = 0
  pitchAngle = 0
  gustBank = 0
  ambientTime = 0

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
  private readonly _ambientDir = new THREE.Vector3()
  private readonly _raycaster = new THREE.Raycaster()
  private readonly _ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  private readonly _hit = new THREE.Vector3()
  private readonly _lookTarget = new THREE.Vector3()
  private readonly _camRight = new THREE.Vector3()
  private readonly _camUp = new THREE.Vector3()
  private readonly _keyWorld = new THREE.Vector3()
  private baseQuat = new THREE.Quaternion()

  update(
    dt: number,
    pointer: { normalizedX: number; normalizedY: number; isMoving: boolean },
    keyboard: KeyboardSteer,
    camera: THREE.PerspectiveCamera,
    waveHits: WaveHit[],
  ) {
    this.ambientTime += dt

    this.smoothPointer.x += (pointer.normalizedX - this.smoothPointer.x) * Math.min(1, dt * 6)
    this.smoothPointer.y += (pointer.normalizedY - this.smoothPointer.y) * Math.min(1, dt * 6)

    const breezeTarget = this.pointerToWorldTarget(this.smoothPointer, camera)

    if (keyboard.active) {
      camera.getWorldDirection(this._forward)
      this._forward.y = 0
      if (this._forward.lengthSq() > 0.001) this._forward.normalize()
      else this._forward.set(0, 0, -1)

      this._camRight.crossVectors(this._forward, new THREE.Vector3(0, 1, 0)).normalize()
      this._camUp.set(0, 1, 0)

      this._keyWorld
        .copy(this._camRight).multiplyScalar(keyboard.x * KEY_OFFSET)
        .add(this._camUp.clone().multiplyScalar(keyboard.y * KEY_CLIMB))
      breezeTarget.add(this._keyWorld)
    }

    // Ambient glide — perpetual drifting wind even with no input
    const t = this.ambientTime
    this._ambientDir.set(
      Math.sin(t * 0.31) * 0.55 + Math.sin(t * 0.13) * 0.35,
      Math.sin(t * 0.23) * 0.12 + Math.sin(t * 0.41) * 0.06,
      Math.cos(t * 0.27) * 0.45 + Math.sin(t * 0.19) * 0.3,
    )
    breezeTarget.add(this._ambientDir)

    this._toTarget.copy(breezeTarget).sub(this.position)

    const chasing = pointer.isMoving || keyboard.active
    if (chasing) {
      this.targetDir.lerp(this._toTarget.normalize(), Math.min(1, dt * CHASE_STRENGTH))
    } else {
      // Even idle: gentle ambient steering keeps the plane alive in the wind
      this.targetDir.lerp(this._toTarget.normalize(), Math.min(1, dt * 0.85))
    }

    this._desiredVel.copy(this.targetDir).normalize().multiplyScalar(BASE_SPEED)
    this.velocity.lerp(this._desiredVel, Math.min(1, dt * 2.2))

    for (const hit of waveHits) {
      this.applyWaveHit(hit)
    }

    this.gustBank *= Math.pow(0.02, dt)

    // Gentle vertical bob from ambient wind
    this.velocity.y += Math.sin(t * 0.37) * 0.08 * dt
    this.velocity.y += Math.cos(t * 0.53) * 0.05 * dt

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
      const keyBank = keyboard.active ? -keyboard.x * 0.45 : 0
      const ambientBank = Math.sin(t * 0.29) * 0.12
      const targetBank =
        (pointer.isMoving ? -turnRate * BANK_FACTOR : ambientBank) + keyBank + this.gustBank
      this.bankAngle += (targetBank - this.bankAngle) * Math.min(1, dt * LEVEL_SPEED)

      const velPitch = THREE.MathUtils.clamp(this.velocity.y * 0.08, -0.35, 0.35)
      const keyPitch = keyboard.active ? keyboard.y * 0.18 : 0
      const ambientPitch = Math.sin(t * 0.33) * 0.06
      this.pitchAngle += (velPitch + keyPitch + ambientPitch - this.pitchAngle) * Math.min(1, dt * 3)

      this.baseQuat.slerp(this._targetQuat, Math.min(1, dt * 4))

      this._bankQuat.setFromAxisAngle(new THREE.Vector3(0, 0, 1), this.bankAngle)
      this._pitchQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.pitchAngle)
      this.quaternion.copy(this.baseQuat).multiply(this._bankQuat).multiply(this._pitchQuat)
    }
  }

  private pointerToWorldTarget(pointer: THREE.Vector2, camera: THREE.PerspectiveCamera): THREE.Vector3 {
    this._raycaster.setFromCamera(pointer, camera)
    this._ground.constant = -this.position.y
    this._raycaster.ray.intersectPlane(this._ground, this._hit)
    this._breezeTarget.copy(this._hit)
    return this._breezeTarget
  }

  private applyWaveHit(hit: WaveHit) {
    const push = hit.pushDirection
    const strength = hit.strength

    this.velocity.addScaledVector(push, strength)
    this.targetDir.lerp(push, 0.35 + (strength / 20) * 0.35)
    this.gustBank += push.x * (strength / 20) * 1.6

    this._forward.set(this.velocity.x, 0, this.velocity.z)
    if (this._forward.lengthSq() > 0.01) {
      this._forward.normalize()
      this.velocity.addScaledVector(this._forward, 1.2)
    }
  }
}
