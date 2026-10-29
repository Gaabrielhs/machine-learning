import { useState, type ReactNode } from 'react'
import { useTooltip, useWidth } from '../sleep-debt/chartHooks'
import { int, num } from '../sleep-debt/format'

export type Tone = 'main' | 'strong' | 'muted' | 'accent' | 'warn'

const TONE: Record<Tone, string> = {
  main: 'var(--sd-line)',
  strong: 'var(--sd-series-strong)',
  muted: 'var(--muted)',
  accent: 'var(--accent)',
  warn: 'var(--neg)',
}

/** Marcas "redondas" para um eixo numérico. */
function niceTicks(lo: number, hi: number, count: number): number[] {
  const raw = (hi - lo) / Math.max(1, count - 1)
  const mag = 10 ** Math.floor(Math.log10(raw || 1))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
  const out: number[] = []
  for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9; v += step) out.push(Number(v.toPrecision(12)))
  return out
}

/* ------------------------------------------------------------------ */
/* Gráfico de linhas ao longo do tempo (séries, previsões, perfis)     */
/* ------------------------------------------------------------------ */

export interface SeriesLine {
  label: string
  /** `null` interrompe a linha */
  values: (number | null)[]
  tone: Tone
  dashed?: boolean
  width?: number
  /** posição no eixo x do primeiro valor */
  offset?: number
}

interface SeriesProps {
  lines: SeriesLine[]
  /** faixa sombreada (intervalo de confiança, desvio-padrão) */
  band?: { lo: number[]; hi: number[]; label: string; offset?: number; tone?: Tone }
  /** trecho de fundo destacado, por exemplo o período de teste */
  shade?: { from: number; to?: number; label: string }
  xTicks: { index: number; label: string }[]
  xLabel?: string
  /** texto do tooltip para a posição i do eixo x */
  xHover: (i: number) => string
  yFormat: (v: number) => string
  yLabel?: string
  yDomain?: [number, number]
  height?: number
  ariaLabel: string
}

export function SeriesChart({
  lines,
  band,
  shade,
  xTicks,
  xLabel,
  xHover,
  yFormat,
  yLabel,
  yDomain,
  height = 240,
  ariaLabel,
}: SeriesProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const { show, hide, node } = useTooltip()
  const [hover, setHover] = useState<number | null>(null)
  const pad = { l: 58, r: 14, t: yLabel ? 24 : 12, b: xLabel ? 48 : 30 }
  const n = Math.max(2, ...lines.map((l) => (l.offset ?? 0) + l.values.length))
  const all: number[] = []
  for (const l of lines) for (const v of l.values) if (v !== null) all.push(v)
  if (band) for (let k = 0; k < band.lo.length; k++) all.push(band.lo[k], band.hi[k])
  let lo = yDomain?.[0] ?? all.reduce((a, b) => Math.min(a, b), Infinity)
  let hi = yDomain?.[1] ?? all.reduce((a, b) => Math.max(a, b), -Infinity)
  if (!yDomain) {
    const m = (hi - lo) * 0.06 || 1
    lo -= m
    hi += m
  }
  const X = (i: number) => pad.l + (i / (n - 1)) * (width - pad.l - pad.r)
  const Y = (v: number) => height - pad.b - ((v - lo) / (hi - lo || 1)) * (height - pad.t - pad.b)
  const ticks = niceTicks(lo, hi, 5)

  const pathOf = (l: SeriesLine) => {
    let d = ''
    let pen = false
    l.values.forEach((v, k) => {
      if (v === null) {
        pen = false
        return
      }
      d += `${pen ? 'L' : 'M'}${X(k + (l.offset ?? 0)).toFixed(1)},${Y(v).toFixed(1)}`
      pen = true
    })
    return d
  }
  const bandPath = () => {
    if (!band) return ''
    const off = band.offset ?? 0
    const up = band.hi.map((v, k) => `${k ? 'L' : 'M'}${X(k + off).toFixed(1)},${Y(v).toFixed(1)}`).join('')
    const down = band.lo
      .map((v, k) => `L${X(k + off).toFixed(1)},${Y(v).toFixed(1)}`)
      .reverse()
      .join('')
    return `${up}${down}Z`
  }

  const move = (e: React.PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const i = Math.max(0, Math.min(n - 1, Math.round(((e.clientX - box.left) / box.width) * (n - 1))))
    setHover(i)
    show(
      e,
      <>
        <strong>{xHover(i)}</strong>
        {lines.map((l) => {
          const v = l.values[i - (l.offset ?? 0)]
          return v === null || v === undefined ? null : (
            <div key={l.label}>
              {l.label}: {yFormat(v)}
            </div>
          )
        })}
        {band && band.lo[i - (band.offset ?? 0)] !== undefined && (
          <div className="sd-muted">
            {band.label}: {yFormat(band.lo[i - (band.offset ?? 0)])} a {yFormat(band.hi[i - (band.offset ?? 0)])}
          </div>
        )}
      </>,
    )
  }
  const leave = () => {
    setHover(null)
    hide()
  }

  return (
    <div className="sd-chart" ref={ref}>
      <svg width={width} height={height} role="img" aria-label={ariaLabel}>
        {yLabel && (
          <text x={pad.l} y={12} className="sd-axis">
            {yLabel}
          </text>
        )}
        {shade && (
          <rect
            x={X(shade.from)}
            y={pad.t}
            width={Math.max(0, X(shade.to ?? n - 1) - X(shade.from))}
            height={height - pad.t - pad.b}
            className="dc-shade"
          />
        )}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={width - pad.r} y1={Y(t)} y2={Y(t)} className="sd-grid" />
            <text x={pad.l - 8} y={Y(t) + 4} textAnchor="end" className="sd-axis">
              {yFormat(t)}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={t.index} x={X(t.index)} y={height - pad.b + 16} textAnchor="middle" className="sd-axis">
            {t.label}
          </text>
        ))}
        {xLabel && (
          <text x={pad.l + (width - pad.l - pad.r) / 2} y={height - 4} textAnchor="middle" className="sd-axis">
            {xLabel}
          </text>
        )}
        {band && <path d={bandPath()} className="dc-band" style={{ fill: TONE[band.tone ?? 'accent'] }} />}
        {lines.map((l) => (
          <path
            key={l.label}
            d={pathOf(l)}
            className="dc-line"
            style={{ stroke: TONE[l.tone] }}
            strokeWidth={l.width ?? 2}
            strokeDasharray={l.dashed ? '5 4' : undefined}
          />
        ))}
        {hover !== null && (
          <g>
            <line x1={X(hover)} x2={X(hover)} y1={pad.t} y2={height - pad.b} className="sd-cross" />
            {lines.map((l) => {
              const v = l.values[hover - (l.offset ?? 0)]
              return v === null || v === undefined ? null : (
                <circle key={l.label} cx={X(hover)} cy={Y(v)} r={4} style={{ fill: TONE[l.tone] }} className="dc-dot" />
              )
            })}
          </g>
        )}
        <rect
          x={pad.l}
          y={pad.t}
          width={width - pad.l - pad.r}
          height={height - pad.t - pad.b}
          fill="transparent"
          onPointerMove={move}
          onPointerLeave={leave}
        />
      </svg>
      {node}
      <ul className="sd-legend dc-legend">
        {lines.map((l) => (
          <li key={l.label}>
            <Swatch tone={l.tone} dashed={l.dashed} /> {l.label}
          </li>
        ))}
        {band && (
          <li>
            <Swatch tone={band.tone ?? 'accent'} area /> {band.label}
          </li>
        )}
        {shade && (
          <li>
            <span className="dc-swatch dc-swatch-shade" aria-hidden="true" /> {shade.label}
          </li>
        )}
      </ul>
    </div>
  )
}

function Swatch({ tone, dashed, area }: { tone: Tone; dashed?: boolean; area?: boolean }) {
  return (
    <span
      className={`dc-swatch${dashed ? ' dashed' : ''}${area ? ' area' : ''}`}
      style={{ ['--c' as string]: TONE[tone] }}
      aria-hidden="true"
    />
  )
}

/* ------------------------------------------------------------------ */
/* Autocorrelação (ACF, PACF e resíduos): hastes e faixa de confiança  */
/* ------------------------------------------------------------------ */

export function StemChart({
  values,
  ci,
  guides = [],
  ariaLabel,
  height = 190,
}: {
  values: number[]
  ci: number
  /** defasagens com linha vertical (ex.: 24, 48, 72) */
  guides?: number[]
  ariaLabel: string
  height?: number
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const { show, hide, node } = useTooltip()
  const pad = { l: 44, r: 12, t: 12, b: 38 }
  const n = values.length
  const ymax = Math.max(0.2, Math.ceil(Math.max(ci, ...values.map(Math.abs)) * 10) / 10)
  const plotW = width - pad.l - pad.r
  const X = (lag: number) => pad.l + ((lag - 0.5) / n) * plotW
  const Y = (v: number) => height - pad.b - ((v + ymax) / (2 * ymax)) * (height - pad.t - pad.b)
  const yt = [-ymax, -ymax / 2, 0, ymax / 2, ymax]
  return (
    <div className="sd-chart" ref={ref}>
      <svg width={width} height={height} role="img" aria-label={ariaLabel}>
        {yt.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={width - pad.r} y1={Y(t)} y2={Y(t)} className="sd-grid" />
            <text x={pad.l - 8} y={Y(t) + 4} textAnchor="end" className="sd-axis">
              {num(t, 1)}
            </text>
          </g>
        ))}
        <rect x={pad.l} y={Y(ci)} width={plotW} height={Y(-ci) - Y(ci)} className="dc-ci" />
        {guides.map((g) => (
          <g key={g}>
            <line x1={X(g)} x2={X(g)} y1={pad.t} y2={height - pad.b} className="sd-ref" />
            <text x={X(g)} y={height - pad.b + 16} textAnchor="middle" className="sd-axis">
              {g}
            </text>
          </g>
        ))}
        <text x={pad.l + plotW / 2} y={height - 4} textAnchor="middle" className="sd-axis">
          defasagem (horas)
        </text>
        {values.map((v, k) => {
          const lag = k + 1
          const out = Math.abs(v) > ci
          const tip = `defasagem ${lag} h: ${num(v, 3)}${out ? ' (fora da faixa)' : ''}`
          return (
            <g
              key={lag}
              tabIndex={0}
              onPointerMove={(e) => show(e, tip)}
              onPointerLeave={hide}
              onFocus={(e) => show(e, tip)}
              onBlur={hide}
            >
              <rect
                x={X(lag) - plotW / n / 2}
                y={pad.t}
                width={plotW / n}
                height={height - pad.t - pad.b}
                fill="transparent"
              />
              <line x1={X(lag)} x2={X(lag)} y1={Y(0)} y2={Y(v)} className={`dc-stem${out ? ' out' : ''}`} />
              <circle cx={X(lag)} cy={Y(v)} r={2.4} className={`dc-stem-dot${out ? ' out' : ''}`} />
            </g>
          )
        })}
      </svg>
      {node}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Histograma (resíduos)                                               */
/* ------------------------------------------------------------------ */

export function DcHistogram({
  bins,
  counts,
  xLabel,
  unit,
  ticks,
  tickFormat,
  marker,
  ariaLabel,
}: {
  bins: number[]
  counts: number[]
  xLabel: string
  /** o que cada barra conta, no plural: "horas" */
  unit: string
  ticks: number[]
  tickFormat: (v: number) => string
  marker?: { value: number; label: string }
  ariaLabel: string
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const { show, hide, node } = useTooltip()
  const h = 200
  const pad = { l: 12, r: 12, t: 22, b: 40 }
  const nb = counts.length
  const plotW = width - pad.l - pad.r
  const X = (v: number) => pad.l + ((v - bins[0]) / (bins[nb] - bins[0])) * plotW
  const mx = Math.max(1, ...counts)
  const Y = (c: number) => h - pad.b - (c / mx) * (h - pad.t - pad.b)
  return (
    <div className="sd-chart" ref={ref}>
      <svg width={width} height={h} role="img" aria-label={ariaLabel}>
        <line x1={pad.l} x2={width - pad.r} y1={h - pad.b} y2={h - pad.b} className="sd-grid" />
        {counts.map((c, i) => {
          const x0 = X(bins[i])
          const tip = `${tickFormat(bins[i])} a ${tickFormat(bins[i + 1])}: ${int(c)} ${unit}`
          return (
            <rect
              key={i}
              x={x0 + 0.5}
              y={Y(c)}
              width={Math.max(1, X(bins[i + 1]) - x0 - 1)}
              height={h - pad.b - Y(c)}
              rx={2}
              fill="var(--sd-series-strong)"
              tabIndex={c ? 0 : -1}
              onPointerMove={(e) => show(e, tip)}
              onPointerLeave={hide}
              onFocus={(e) => show(e, tip)}
              onBlur={hide}
            />
          )
        })}
        {ticks.map((t) => (
          <text key={t} x={X(t)} y={h - pad.b + 16} textAnchor="middle" className="sd-axis">
            {tickFormat(t)}
          </text>
        ))}
        <text x={pad.l + plotW / 2} y={h - 4} textAnchor="middle" className="sd-axis">
          {xLabel}
        </text>
        {marker && (
          <g>
            <line x1={X(marker.value)} x2={X(marker.value)} y1={pad.t - 6} y2={h - pad.b} className="sd-ref" />
            <text x={X(marker.value) + 6} y={pad.t} className="sd-label">
              {marker.label}
            </text>
          </g>
        )}
      </svg>
      {node}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Linha do tempo treino × teste                                       */
/* ------------------------------------------------------------------ */

export function SplitBar({
  train,
  test,
  trainLabel,
  testLabel,
}: {
  train: number
  test: number
  trainLabel: ReactNode
  testLabel: ReactNode
}) {
  const total = train + test
  return (
    <div
      className="dc-split"
      role="img"
      aria-label={`Treino com ${train} horas e teste com ${test} horas, em ordem no tempo`}
    >
      <div className="dc-split-train" style={{ flexGrow: train / total }}>
        {trainLabel}
      </div>
      <div className="dc-split-test" style={{ flexGrow: test / total, minWidth: 'max-content' }}>
        {testLabel}
      </div>
    </div>
  )
}
