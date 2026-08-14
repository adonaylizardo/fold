import { useEffect, useRef, useState } from 'react'
import { createScene, updateCameraFollow } from './scene/createScene'
import { createEnvironment, wrapWorldPosition } from './scene/environment'
import { createBreezeMark, pointerToBreezeTarget } from './scene/breezeMark'
import { createPlane, getWorldWingtips } from './plane/createPlane'
import { WingtipTrails } from './plane/trails'
import { createInputManager } from './input/InputManager'
import { createWaveVisual, updateWaveVisuals, disposeAllWaveVisuals, type WaveVisual } from './input/waveVisuals'
import {
  createBreezeWave,
  updateBreezeWaves,
  type BreezeWave,
} from './sim/BreezeWave'
import { Simulation } from './sim/Simulation'
import { unlockAudio, playRoll, playWaveHit, updateTurnAudio } from './audio/whoosh'

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hintVisible, setHintVisible] = useState(true)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const { scene, camera, renderer, dispose: disposeScene } = createScene(container)
    const env = createEnvironment(scene)
    const breezeMark = createBreezeMark(scene)
    const plane = createPlane()
    scene.add(plane.group)

    const sim = new Simulation()
    const trails = new WingtipTrails(scene)
    const input = createInputManager(renderer.domElement, camera, () => sim.position)

    const breezeWaves: BreezeWave[] = []
    const waveVisuals: WaveVisual[] = []
    let lastTime = performance.now()
    let animId = 0

    const tick = () => {
      animId = requestAnimationFrame(tick)
      const now = performance.now()
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now

      input.update(dt)

      if (input.consumeFirstGesture()) {
        unlockAudio()
      }

      for (const spawn of input.consumeWaveSpawns()) {
        const wave = createBreezeWave(spawn, sim.position)
        breezeWaves.push(wave)
        waveVisuals.push(createWaveVisual(scene, wave))
      }

      const { waves: aliveWaves, hits } = updateBreezeWaves(breezeWaves, sim.position, dt)
      breezeWaves.length = 0
      breezeWaves.push(...aliveWaves)

      for (const hit of hits) {
        playWaveHit(hit.strength)
      }

      sim.update(dt, input.pointer, input.keyboard, camera, hits)
      updateTurnAudio(sim.bankAngle, dt)

      if (input.consumeRoll()) {
        if (plane.startRoll()) {
          playRoll()
          setTimeout(() => setHintVisible(false), 2500)
        }
      }

      plane.group.position.copy(sim.position)
      plane.group.quaternion.copy(sim.quaternion)
      plane.updateRoll(dt)
      plane.group.updateMatrixWorld(true)

      wrapWorldPosition(sim.position)
      plane.group.position.copy(sim.position)

      const breezeTarget = pointerToBreezeTarget(
        input.pointer.normalizedX,
        input.pointer.normalizedY,
        camera,
        sim.position.y,
      )
      breezeMark.update(breezeTarget, input.pointer.isMoving || input.keyboard.active, dt)

      const [leftTip, rightTip] = getWorldWingtips(plane.group, plane.leftTip, plane.rightTip)
      trails.update(leftTip, rightTip)

      updateCameraFollow(camera, sim.position, sim.quaternion, dt)
      env.update(dt, sim.position, sim.velocity)

      const aliveVis = updateWaveVisuals(waveVisuals, breezeWaves, dt)
      waveVisuals.length = 0
      waveVisuals.push(...aliveVis)

      renderer.render(scene, camera)
    }

    tick()

    return () => {
      cancelAnimationFrame(animId)
      trails.dispose()
      breezeMark.dispose()
      disposeAllWaveVisuals(waveVisuals)
      plane.dispose()
      env.dispose()
      input.dispose()
      disposeScene()
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setHintVisible(false), 8000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <div className="overlay">
        <div className="wordmark">FOLD</div>
        <div className="tagline">
          A paper plane.
          <br />
          A breeze.
          <br />
          A page.
        </div>
        <div className={`hint ${hintVisible ? '' : 'hidden'}`}>SPACE TO ROLL</div>
      </div>
    </>
  )
}
