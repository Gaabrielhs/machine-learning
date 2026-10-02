import type { Frame } from '../../../components/plot'
import { mix } from '../../../components/plot'
import type { Palette } from '../../../hooks/useCanvas'
import { predict, type Dataset, type Network } from '../engine/network'

/** Pinta o plano conforme a saída da rede: laranja ≈ classe 0, azul ≈ classe 1. */
export function drawBoundary(
  ctx: CanvasRenderingContext2D,
  f: Frame,
  net: Network,
  domain: [number, number],
  p: Palette,
  cells = 60,
) {
  const [lo, hi] = domain
  const cw = (f.right - f.left) / cells
  const ch = (f.bottom - f.top) / cells
  for (let i = 0; i < cells; i++)
    for (let j = 0; j < cells; j++) {
      const x = lo + ((i + 0.5) / cells) * (hi - lo)
      const y = hi - ((j + 0.5) / cells) * (hi - lo)
      const out = predict(net, [x, y])[0]
      const t = Math.min(1, Math.abs(out - 0.5) * 2) * 0.55
      ctx.fillStyle = mix(p.bg, out >= 0.5 ? p.pos : p.neg, t)
      ctx.fillRect(f.left + i * cw, f.top + j * ch, cw + 0.6, ch + 0.6)
    }
}

export function drawPoints(
  ctx: CanvasRenderingContext2D,
  f: Frame,
  data: Dataset,
  p: Palette,
  opts: { hollow?: boolean; r?: number } = {},
) {
  const r = opts.r ?? 3.6
  data.X.forEach((x, i) => {
    const color = data.Y[i][0] >= 0.5 ? p.pos : p.neg
    ctx.beginPath()
    ctx.arc(f.x(x[0]), f.y(x[1]), r, 0, 2 * Math.PI)
    if (opts.hollow) {
      ctx.fillStyle = p.surface
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = color
      ctx.stroke()
    } else {
      ctx.fillStyle = color
      ctx.fill()
      ctx.lineWidth = 1
      ctx.strokeStyle = p.surface
      ctx.stroke()
    }
  })
}

/** Curva de perda com escala log no eixo y. */
export function drawLossCurve(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: Palette,
  series: { values: number[]; color: string; label: string }[],
) {
  const pad = { l: 46, r: 12, t: 14, b: 24 }
  const all = series.flatMap((s) => s.values).filter((v) => v > 0 && Number.isFinite(v))
  ctx.font = '11px "JetBrains Mono", ui-monospace, monospace'
  if (all.length < 2) {
    ctx.fillStyle = p.muted
    ctx.fillText('A curva de perda aparece quando o treino começa.', pad.l, h / 2)
    return
  }
  const n = Math.max(...series.map((s) => s.values.length))
  const lo = Math.floor(Math.log10(Math.min(...all)))
  const hi = Math.ceil(Math.log10(Math.max(...all)))
  const span = Math.max(1, hi - lo)
  const X = (i: number) => pad.l + (i / Math.max(1, n - 1)) * (w - pad.l - pad.r)
  const Y = (v: number) => h - pad.b - ((Math.log10(v) - lo) / span) * (h - pad.t - pad.b)
  for (let e = lo; e <= lo + span; e++) {
    ctx.strokeStyle = p.line
    ctx.beginPath()
    ctx.moveTo(pad.l, Y(10 ** e))
    ctx.lineTo(w - pad.r, Y(10 ** e))
    ctx.stroke()
    ctx.fillStyle = p.muted
    ctx.textAlign = 'right'
    ctx.fillText(e >= -2 ? String(10 ** e).replace('.', ',') : `1e${e}`, pad.l - 6, Y(10 ** e) + 4)
  }
  ctx.textAlign = 'left'
  series.forEach((s, k) => {
    ctx.strokeStyle = s.color
    ctx.lineWidth = 2
    ctx.beginPath()
    s.values.forEach((v, i) => {
      const y = Y(Math.max(v, 10 ** lo))
      if (i === 0) ctx.moveTo(X(i), y)
      else ctx.lineTo(X(i), y)
    })
    ctx.stroke()
    const last = s.values[s.values.length - 1]
    if (last !== undefined) {
      ctx.fillStyle = s.color
      ctx.beginPath()
      ctx.arc(X(s.values.length - 1), Y(Math.max(last, 10 ** lo)), 3.5, 0, 2 * Math.PI)
      ctx.fill()
    }
    ctx.fillText(s.label, pad.l + 8 + k * 110, pad.t + 2)
  })
  ctx.fillStyle = p.muted
  ctx.textAlign = 'right'
  ctx.fillText('época', w - pad.r, h - 4)
  ctx.textAlign = 'left'
}

/** Reduz uma série longa para no máximo `max` pontos (média por janelas). */
export function downsample(values: number[], max = 400): number[] {
  if (values.length <= max) return values
  const step = values.length / max
  const out: number[] = []
  for (let i = 0; i < max; i++) {
    const a = Math.floor(i * step)
    const b = Math.max(a + 1, Math.floor((i + 1) * step))
    let s = 0
    for (let k = a; k < b; k++) s += values[k]
    out.push(s / (b - a))
  }
  return out
}
