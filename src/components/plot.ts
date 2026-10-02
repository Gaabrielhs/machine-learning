import type { Palette } from '../hooks/useCanvas'

export interface Frame {
  x: (v: number) => number
  y: (v: number) => number
  left: number
  right: number
  top: number
  bottom: number
}

export interface AxesOptions {
  xr: [number, number]
  yr: [number, number]
  pad?: { l: number; r: number; t: number; b: number }
  xLabel?: string
  yLabel?: string
  xTicks?: number
  yTicks?: number
}

export function niceTicks(a: number, b: number, n: number): number[] {
  const raw = (b - a) / Math.max(1, n)
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
  const out: number[] = []
  for (let v = Math.ceil(a / step) * step; v <= b + step * 1e-9; v += step) out.push(+v.toFixed(10))
  return out
}

export function fmtTick(v: number): string {
  if (v === 0) return '0'
  const a = Math.abs(v)
  if (a >= 1000 || a < 0.01) return v.toExponential(0)
  return String(+v.toFixed(3)).replace('.', ',')
}

/** Desenha grade, eixos e rótulos; devolve as funções de escala. */
export function drawAxes(ctx: CanvasRenderingContext2D, w: number, h: number, p: Palette, o: AxesOptions): Frame {
  const pad = o.pad ?? { l: 40, r: 12, t: 12, b: 28 }
  const f: Frame = {
    left: pad.l,
    right: w - pad.r,
    top: pad.t,
    bottom: h - pad.b,
    x: (v) => pad.l + ((v - o.xr[0]) / (o.xr[1] - o.xr[0])) * (w - pad.l - pad.r),
    y: (v) => h - pad.b - ((v - o.yr[0]) / (o.yr[1] - o.yr[0])) * (h - pad.t - pad.b),
  }
  ctx.font = '11px "JetBrains Mono", ui-monospace, monospace'
  ctx.lineWidth = 1
  for (const v of niceTicks(o.yr[0], o.yr[1], o.yTicks ?? 4)) {
    ctx.strokeStyle = p.line
    ctx.beginPath()
    ctx.moveTo(f.left, f.y(v))
    ctx.lineTo(f.right, f.y(v))
    ctx.stroke()
    ctx.fillStyle = p.muted
    ctx.textAlign = 'right'
    ctx.fillText(fmtTick(v), f.left - 6, f.y(v) + 4)
  }
  ctx.textAlign = 'center'
  for (const v of niceTicks(o.xr[0], o.xr[1], o.xTicks ?? 6)) ctx.fillText(fmtTick(v), f.x(v), f.bottom + 16)
  ctx.strokeStyle = p.muted
  if (o.yr[0] < 0 && o.yr[1] > 0) {
    ctx.beginPath()
    ctx.moveTo(f.left, f.y(0))
    ctx.lineTo(f.right, f.y(0))
    ctx.stroke()
  }
  if (o.xr[0] < 0 && o.xr[1] > 0) {
    ctx.beginPath()
    ctx.moveTo(f.x(0), f.top)
    ctx.lineTo(f.x(0), f.bottom)
    ctx.stroke()
  }
  ctx.fillStyle = p.muted
  if (o.xLabel) {
    ctx.textAlign = 'right'
    ctx.fillText(o.xLabel, f.right, h - 2)
  }
  if (o.yLabel) {
    ctx.textAlign = 'left'
    ctx.fillText(o.yLabel, f.left + 4, f.top + 10)
  }
  ctx.textAlign = 'left'
  return f
}

export function plotFunction(
  ctx: CanvasRenderingContext2D,
  f: Frame,
  fn: (x: number) => number,
  xr: [number, number],
  color: string,
  opts: { dash?: number[]; width?: number; clipY?: [number, number] } = {},
) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(f.left, f.top, f.right - f.left, f.bottom - f.top)
  ctx.clip()
  ctx.strokeStyle = color
  ctx.lineWidth = opts.width ?? 2.2
  ctx.setLineDash(opts.dash ?? [])
  ctx.beginPath()
  let started = false
  let prev: number | null = null
  for (let px = f.left; px <= f.right; px++) {
    const x = xr[0] + ((px - f.left) / (f.right - f.left)) * (xr[1] - xr[0])
    const y = fn(x)
    if (!Number.isFinite(y)) {
      started = false
      continue
    }
    // quebra a linha em descontinuidades (ex.: derivada da ReLU)
    if (prev !== null && Math.abs(f.y(y) - f.y(prev)) > 60) started = false
    if (started) ctx.lineTo(px, f.y(y))
    else ctx.moveTo(px, f.y(y))
    started = true
    prev = y
  }
  ctx.stroke()
  ctx.restore()
}

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '')
  if (h.length === 3) h = [...h].map((c) => c + c).join('')
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a)
  const B = hexToRgb(b)
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`
}

export function fmt(v: number, digits = 3): string {
  if (!Number.isFinite(v)) return Number.isNaN(v) ? 'nan' : v > 0 ? '∞' : '−∞'
  return v.toFixed(digits).replace('-', '−')
}
