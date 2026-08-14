import * as THREE from 'three'
import type { KeyboardSteer } from '../input/InputManager'
import type { WaveHit } from './BreezeWave'

const FORWARD_SPEED = 7.5
const GRAVITY = 3.2
const LIFT_FROM_PITCH = 2.4
const LIFT_FROM_SPEED = 0.35
const PITCH_RATE = 1.8
const YAW_RATE = 1.6
const BANK_RATE = 2.2
const MIN_Y = 0.6
const MAX_Y = 28
const POINTER_YAW = 1.4
const POINTER_PITCH = 0.55

export class Simulation {
  position = new THREE.Vector3(0, 4, 0)
  velocity = new THREE.Vector3(0, 0, -FORWARD_SPEED)
  quaternion = new THREE.Quaternion()
  heading = 0
  pitchAngle = 0
  bankAngle = 0
  verticalVelocity = 0
  gustBank = 0
  ambientTime = 0

  private smoothPointer = new THREE.Vector2(0, 0)
  private readonly _forward = new THREE.Vector3()
  private readonly _euler = new THREE.Euler(0, 0, 0, 'YXZ')

  update(
    dt: number,
    pointer: { normalizedX: number; normalizedY: number; isMoving: boolean },
    keyboard: KeyboardSteer,
    _camera: THREE.PerspectiveCamera,
    waveHits: WaveHit[],
  ) {
    this.ambientTime += dt
    void _camera

    this.smoothPointer.x += (pointer.normalizedX - this.smoothPointer.x) * Math.min(1, dt * 5)
    this.smoothPointer.y += (pointer.normalizedY - this.smoothPointer.y) * Math.min(1, dt * 5)

    let yawInput = 0
    let pitchInput = 0
    let bankInput = 0

    if (pointer.isMoving) {
      yawInput += this.smoothPointer.x * POINTER_YAW
      pitchInput -= this.smoothPointer.y * POINTER_PITCH
    }

    if (keyboard.active) {
      yawInput += keyboard.x * YAW_RATE
      pitchInput += keyboard.y * PITCH_RATE
      bankInput = -keyboard.x * 0.55
    }

    // Subtle ambient drift — horizontal only, never enough to hover
    yawInput += Math.sin(this.ambientTime * 0.21) * 0.08

    this.heading += yawInput * dt
    this.pitchAngle += (pitchInput - this.pitchAngle) * Math.min(1, dt * 3.5)
    this.pitchAngle = THREE.MathUtils.clamp(this.pitchAngle, -0.55, 0.45)

    const targetBank = bankInput + this.gustBank
    this.bankAngle += (targetBank - this.bankAngle) * Math.min(1, dt * BANK_RATE)

    for (const hit of waveHits) {
      this.applyWaveHit(hit)
    }
    this.gustBank *= Math.pow(0.02, dt)

    this._forward.set(Math.sin(this.heading), 0, -Math.cos(this.heading))

    // Gravity + lift — must work to stay up
    this.verticalVelocity -= GRAVITY * dt
    const pitchLift = Math.max(0, this.pitchAngle + 0.08) * FORWARD_SPEED * LIFT_FROM_PITCH * dt
    const speedLift = LIFT_FROM_SPEED * dt
    this.verticalVelocity += pitchLift + speedLift

    this.position.x += this._forward.x * FORWARD_SPEED * dt
    this.position.z += this._forward.z * FORWARD_SPEED * dt
    this.position.y += this.verticalVelocity * dt

    if (this.position.y < MIN_Y) {
      this.position.y = MIN_Y
      this.verticalVelocity = Math.max(this.verticalVelocity, 0) * 0.3
    }
    if (this.position.y > MAX_Y) {
      this.position.y = MAX_Y
      this.verticalVelocity = Math.min(this.verticalVelocity, 0)
    }

    this.velocity.set(
      this._forward.x * FORWARD_SPEED,
      this.verticalVelocity,
      this._forward.z * FORWARD_SPEED,
    )

    this._euler.set(this.pitchAngle, this.heading, this.bankAngle, 'YXZ')
    this.quaternion.setFromEuler(this._euler)
  }

  getHeading(): number {
    return this.heading
  }

  private applyWaveHit(hit: WaveHit) {
    const push = hit.pushDirection
    const strength = hit.strength * 0.12

    this.velocity.addScaledVector(push, strength)
    this.verticalVelocity += push.y * strength
    this.heading += push.x * strength * 0.04
    this.gustBank += push.x * (strength / 2) * 1.2
    this.pitchAngle += push.y * strength * 0.02
  }
}
