let ctx: AudioContext | null = null
let unlocked = false

function getContext(): AudioContext | null {
  if (!ctx) {
    try {
      ctx = new AudioContext()
    } catch {
      return null
    }
  }
  return ctx
}

export function unlockAudio(): void {
  const ac = getContext()
  if (!ac || unlocked) return
  if (ac.state === 'suspended') {
    void ac.resume()
  }
  unlocked = true
}

export function playWhoosh(intensity = 0.3): void {
  const ac = getContext()
  if (!ac || !unlocked) return

  const now = ac.currentTime
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  const filter = ac.createBiquadFilter()

  osc.type = 'sine'
  osc.frequency.setValueAtTime(180 + intensity * 80, now)
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.35)

  filter.type = 'lowpass'
  filter.frequency.value = 400

  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.linearRampToValueAtTime(0.04 * intensity, now + 0.04)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4)

  osc.connect(filter)
  filter.connect(gain)
  gain.connect(ac.destination)

  osc.start(now)
  osc.stop(now + 0.45)
}

export function playPuff(): void {
  playWhoosh(0.2)
}

export function playRoll(): void {
  playWhoosh(0.45)
}
