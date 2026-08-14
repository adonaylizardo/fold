let ctx: AudioContext | null = null
let unlocked = false
let bedGain: GainNode | null = null
let bedSource: AudioBufferSourceNode | null = null
let lastTurnSound = 0
let lastBankForSound = 0

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

function makeNoiseBuffer(ac: AudioContext, seconds: number): AudioBuffer {
  const len = ac.sampleRate * seconds
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const data = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1
    last = last * 0.96 + white * 0.04
    data[i] = last
  }
  return buf
}

export function unlockAudio(): void {
  const ac = getContext()
  if (!ac || unlocked) return
  if (ac.state === 'suspended') void ac.resume()
  unlocked = true
  startAmbientBed()
}

function startAmbientBed(): void {
  const ac = getContext()
  if (!ac || bedGain) return

  const buffer = makeNoiseBuffer(ac, 4)
  bedSource = ac.createBufferSource()
  bedSource.buffer = buffer
  bedSource.loop = true

  const filter = ac.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 180
  filter.Q.value = 0.6

  const lfo = ac.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = 0.12
  const lfoGain = ac.createGain()
  lfoGain.gain.value = 40
  lfo.connect(lfoGain)
  lfoGain.connect(filter.frequency)
  lfo.start()

  bedGain = ac.createGain()
  bedGain.gain.value = 0.012

  bedSource.connect(filter)
  filter.connect(bedGain)
  bedGain.connect(ac.destination)
  bedSource.start()
}

export function stopAmbientBed(): void {
  try {
    bedSource?.stop()
  } catch {
    /* already stopped */
  }
  bedSource = null
  bedGain = null
}

function playTone(
  freqStart: number,
  freqEnd: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine',
): void {
  const ac = getContext()
  if (!ac || !unlocked) return

  const now = ac.currentTime
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  const filter = ac.createBiquadFilter()

  osc.type = type
  osc.frequency.setValueAtTime(freqStart, now)
  osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 20), now + duration)

  filter.type = 'lowpass'
  filter.frequency.value = 520

  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.linearRampToValueAtTime(volume, now + 0.025)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  osc.connect(filter)
  filter.connect(gain)
  gain.connect(ac.destination)

  osc.start(now)
  osc.stop(now + duration + 0.05)
}

export function playWhoosh(intensity = 0.3): void {
  playTone(160 + intensity * 60, 55, 0.38, 0.025 * intensity)
}

export function playWaveHit(strength: number): void {
  const t = Math.min(strength / 20, 1)
  playTone(120 + t * 80, 45, 0.32, 0.018 + t * 0.022)
  playTone(200 + t * 100, 90, 0.2, 0.008 + t * 0.01, 'triangle')
}

export function playRoll(): void {
  playTone(140, 70, 0.55, 0.035)
  playTone(220, 100, 0.35, 0.015, 'triangle')
}

export function updateTurnAudio(bankAngle: number, dt: number): void {
  if (!unlocked) return
  const bankDelta = Math.abs(bankAngle - lastBankForSound)
  lastBankForSound = bankAngle

  if (bankDelta < 0.008) return
  const now = performance.now()
  if (now - lastTurnSound < 120) return
  lastTurnSound = now

  const intensity = Math.min(bankDelta * 8, 1)
  playTone(90 + intensity * 50, 60, 0.18, 0.006 + intensity * 0.008, 'triangle')
  void dt
}

export function setBedVolume(v: number): void {
  if (bedGain) bedGain.gain.value = v
}
