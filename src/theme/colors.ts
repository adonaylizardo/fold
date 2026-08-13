/** Phosphor / terminal-green palette — varying brightness, not flat neon */
export const VOID = 0x000000
export const FOG = 0x000804

export const PHOSPHOR_BRIGHT = 0x5dff8a
export const PHOSPHOR = 0x00e85a
export const PHOSPHOR_MID = 0x00b846
export const PHOSPHOR_DIM = 0x007a2e
export const PHOSPHOR_FAINT = 0x003818
export const PHOSPHOR_GLOW = 0x1aff6a

export function phosphorRgb(t: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t))
  return [0, 0.55 + clamped * 0.45, 0.2 + clamped * 0.35]
}

export function phosphorColor(t: number): number {
  const [r, g, b] = phosphorRgb(t)
  return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255)
}
