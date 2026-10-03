import { useState, type ReactNode } from 'react'
import { useTooltip, useWidth } from './chartHooks'
import { classColor, int, num, pct } from './format'

/* ------------------------------------------------------------------ */
/* Barras horizontais (classes, atributos, cenários)                   */
/* ------------------------------------------------------------------ */

export interface HBarDatum {
  label: string
  value: number
  color?: string
  /** texto à direita da barra; padrão: o valor */
  note?: string
  tip?: ReactNode
  strong?: boolean
}

interface HBarProps {
  data: HBarDatum[]
  max: number
  format: (v: number) => string
  /** linha de referência vertical */
  reference?: { value: number; label: string }
  labelWidth?: number
  rowHeight?: number
  ariaLabel: string
}

export function HBars({ data, max, format, reference, labelWidth = 170, rowHeight = 30, ariaLabel }: HBarProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const { show, hide, node } = useTooltip()
  const narrow = width < 520
  const lw = narrow ? Math.min(labelWidth, 120) : labelWidth
  const noteW = 92
  const plotW = Math.max(60, width - lw - noteW)
  const h = data.length * rowHeight + (reference ? 22 : 6)
  const x = (v: number) => lw + (v / max) * plotW
  return (
    <div className="sd-chart" ref={ref}>
      <svg width={width} height={h} role="img" aria-label={ariaLabel}>
        {data.map((d, i) => {
          const y = i * rowHeight + 4
          const bh = rowHeight - 10
          return (
            <g
              key={d.label}
              tabIndex={0}
              onPointerMove={(e) => show(e, d.tip ?? `${d.label}: ${format(d.value)}`)}
              onPointerLeave={hide}
              onFocus={(e) => show(e, d.tip ?? `${d.label}: ${format(d.value)}`)}
              onBlur={hide}
            >
              <rect x={0} y={y - 4} width={width} height={rowHeight} fill="transparent" />
              <text x={lw - 8} y={y + bh / 2 + 4} textAnchor="end" className={`sd-label${d.strong ? ' strong' : ''}`}>
                {narrow && d.label.length > 16 ? `${d.label.slice(0, 15)}…` : d.label}
              </text>
              <rect
                x={lw}
                y={y}
                width={Math.max(2, x(d.value) - lw)}
                height={bh}
                rx={4}
                fill={d.color ?? 'var(--sd-series)'}
              />
              <text x={x(d.value) + 6} y={y + bh / 2 + 4} className="sd-value">
                {d.note ?? format(d.value)}
              </text>
            </g>
          )
        })}
        {reference && (
          <g>
            <line x1={x(reference.value)} x2={x(reference.value)} y1={0} y2={h - 16} className="sd-ref" />
            <text x={x(reference.value)} y={h - 3} textAnchor="middle" className="sd-axis">
              {reference.label}
            </text>
          </g>
        )}
      </svg>
      {node}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Barras 100% empilhadas (proporção de classes em treino e teste)     */
/* ------------------------------------------------------------------ */

export function StackedShare({ rows, classes }: { rows: { label: string; counts: number[] }[]; classes: string[] }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const { show, hide, node } = useTooltip()
  const lw = 70
  const plotW = width - lw - 4
  const rh = 34
  return (
    <div className="sd-chart" ref={ref}>
      <svg
        width={width}
        height={rows.length * rh}
        role="img"
        aria-label="Proporção de cada classe no treino e no teste"
      >
        {rows.map((r, i) => {
          const total = r.counts.reduce((a, b) => a + b, 0)
          let acc = 0
          return (
            <g key={r.label}>
              <text x={lw - 8} y={i * rh + 19} textAnchor="end" className="sd-label">
                {r.label}
              </text>
              {r.counts.map((c, k) => {
                const w = (c / total) * plotW
                const x0 = lw + acc
                acc += w
                const tip = `${r.label} · ${classes[k]}: ${int(c)} (${pct(c / total)})`
                return (
                  <rect
                    key={k}
                    x={x0 + 1}
                    y={i * rh + 4}
                    width={Math.max(0, w - 2)}
                    height={rh - 10}
                    rx={3}
                    fill={classColor(k)}
                    tabIndex={0}
                    onPointerMove={(e) => show(e, tip)}
                    onPointerLeave={hide}
                    onFocus={(e) => show(e, tip)}
                    onBlur={hide}
                  />
                )
              })}
            </g>
          )
        })}
      </svg>
      {node}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Linha simples (curva de perda, acurácia de validação)               */
/* ------------------------------------------------------------------ */

interface LineProps {
  values: number[]
  yLabel: string
  format: (v: number) => string
  yDomain?: [number, number]
  marker?: { index: number; label: string }
  ariaLabel: string
}

export function LineChart({ values, yLabel, format, yDomain, marker, ariaLabel }: LineProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const h = 236
  const pad = { l: 52, r: 16, t: 22, b: 44 }
  const lo = yDomain?.[0] ?? Math.min(...values)
  const hi = yDomain?.[1] ?? Math.max(...values)
  const n = values.length
  const X = (i: number) => pad.l + (i / Math.max(1, n - 1)) * (width - pad.l - pad.r)
  const Y = (v: number) => h - pad.b - ((v - lo) / (hi - lo || 1)) * (h - pad.t - pad.b)
  const ticks = Array.from({ length: 5 }, (_, k) => lo + ((hi - lo) * k) / 4)
  // épocas 1, 5, 10, ... e a última, sem encostar na anterior
  const every = [0, ...Array.from({ length: Math.floor(n / 5) }, (_, k) => (k + 1) * 5 - 1)].filter((v) => v < n - 3)
  const xticks = [...every, n - 1]
  const path = values.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('')
  const area = `${path}L${X(n - 1).toFixed(1)},${h - pad.b}L${X(0).toFixed(1)},${h - pad.b}Z`
  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const i = Math.round(((e.clientX - box.left) / box.width) * (n - 1))
    setHover(Math.max(0, Math.min(n - 1, i)))
  }
  return (
    <div className="sd-chart" ref={ref}>
      <svg width={width} height={h} role="img" aria-label={ariaLabel}>
        <text x={pad.l} y={12} className="sd-axis">
          {yLabel}
        </text>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={width - pad.r} y1={Y(t)} y2={Y(t)} className="sd-grid" />
            <text x={pad.l - 8} y={Y(t) + 4} textAnchor="end" className="sd-axis">
              {format(t)}
            </text>
          </g>
        ))}
        {xticks.map((i) => (
          <text key={i} x={X(i)} y={h - pad.b + 16} textAnchor="middle" className="sd-axis">
            {i + 1}
          </text>
        ))}
        <text x={pad.l + (width - pad.l - pad.r) / 2} y={h - 4} textAnchor="middle" className="sd-axis">
          época
        </text>
        <path d={area} className="sd-area" />
        <path d={path} className="sd-line" />
        {marker && (
          <g>
            <line x1={X(marker.index)} x2={X(marker.index)} y1={pad.t} y2={h - pad.b} className="sd-ref" />
            <circle cx={X(marker.index)} cy={Y(values[marker.index])} r={5} className="sd-dot" />
            <text
              x={X(marker.index) + (X(marker.index) > width - 160 ? -8 : 8)}
              y={pad.t + 10}
              textAnchor={X(marker.index) > width - 160 ? 'end' : 'start'}
              className="sd-label"
            >
              {marker.label}
            </text>
          </g>
        )}
        <circle cx={X(n - 1)} cy={Y(values[n - 1])} r={4} className="sd-dot" />
        {hover !== null && (
          <g>
            <line x1={X(hover)} x2={X(hover)} y1={pad.t} y2={h - pad.b} className="sd-cross" />
            <circle cx={X(hover)} cy={Y(values[hover])} r={5} className="sd-dot" />
          </g>
        )}
        <rect
          x={pad.l}
          y={pad.t}
          width={width - pad.l - pad.r}
          height={h - pad.t - pad.b}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {hover !== null && (
        <div className="sd-tip" style={{ left: X(hover), top: Y(values[hover]) }}>
          época {hover + 1}: <strong>{format(values[hover])}</strong>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Histogramas em pequenos múltiplos (horas de sono por classe)        */
/* ------------------------------------------------------------------ */

export function SmallHistograms({ bins, counts, classes }: { bins: number[]; counts: number[][]; classes: string[] }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const { show, hide, node } = useTooltip()
  const lw = width < 520 ? 96 : 150
  const rowH = 58
  const axisH = 26
  const plotW = width - lw - 8
  const nb = bins.length - 1
  const bw = plotW / nb
  const xAt = (v: number) => lw + ((v - bins[0]) / (bins[nb] - bins[0])) * plotW
  return (
    <div className="sd-chart" ref={ref}>
      <svg
        width={width}
        height={classes.length * rowH + axisH}
        role="img"
        aria-label="Distribuição das horas de sono em cada classe"
      >
        {classes.map((c, k) => {
          const mx = Math.max(...counts[k])
          const base = (k + 1) * rowH - 6
          return (
            <g key={c}>
              <text x={lw - 10} y={base - 14} textAnchor="end" className="sd-label">
                {c}
              </text>
              <line x1={lw} x2={lw + plotW} y1={base} y2={base} className="sd-grid" />
              {counts[k].map((n, i) => {
                const hh = mx ? (n / mx) * (rowH - 14) : 0
                const tip = `${c}: ${int(n)} pessoas entre ${num(bins[i])} h e ${num(bins[i + 1])} h`
                return (
                  <rect
                    key={i}
                    x={lw + i * bw + 1}
                    y={base - hh}
                    width={Math.max(1, bw - 2)}
                    height={hh}
                    rx={2}
                    fill={classColor(k)}
                    tabIndex={n ? 0 : -1}
                    onPointerMove={(e) => show(e, tip)}
                    onPointerLeave={hide}
                    onFocus={(e) => show(e, tip)}
                    onBlur={hide}
                  />
                )
              })}
            </g>
          )
        })}
        {[3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
          <text key={v} x={xAt(v)} y={classes.length * rowH + 16} textAnchor="middle" className="sd-axis">
            {v} h
          </text>
        ))}
      </svg>
      {node}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Matriz de confusão                                                  */
/* ------------------------------------------------------------------ */

export function ConfusionMatrix({ matrix, classes }: { matrix: number[][]; classes: string[] }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const { show, hide, node } = useTooltip()
  const k = matrix.length
  const narrow = width < 560
  const lw = narrow ? 96 : 150
  const top = 40
  const cell = Math.min(110, (width - lw - 8) / k)
  return (
    <div className="sd-chart" ref={ref}>
      <svg width={width} height={top + cell * k + 8} role="img" aria-label="Matriz de confusão no conjunto de teste">
        <text x={lw + (cell * k) / 2} y={12} textAnchor="middle" className="sd-axis">
          classe prevista →
        </text>
        {classes.map((c, j) => (
          <text key={c} x={lw + j * cell + cell / 2} y={32} textAnchor="middle" className="sd-label small">
            {narrow ? shortClass(c) : c}
          </text>
        ))}
        {matrix.map((row, i) => {
          const total = row.reduce((a, b) => a + b, 0)
          return (
            <g key={i}>
              <TwoLineLabel x={lw - 10} y={top + i * cell + cell / 2} text={classes[i]} split={narrow} />
              {row.map((v, j) => {
                const share = v / total
                const tip = (
                  <>
                    Real <strong>{classes[i]}</strong>, previsto <strong>{classes[j]}</strong>: {int(v)} ({pct(share)}{' '}
                    da linha)
                  </>
                )
                return (
                  <g
                    key={j}
                    tabIndex={0}
                    onPointerMove={(e) => show(e, tip)}
                    onPointerLeave={hide}
                    onFocus={(e) => show(e, tip)}
                    onBlur={hide}
                  >
                    <rect
                      x={lw + j * cell + 1}
                      y={top + i * cell + 1}
                      width={cell - 2}
                      height={cell - 2}
                      rx={4}
                      fill="var(--sd-heat)"
                      fillOpacity={v === 0 ? 0.04 : 0.12 + 0.88 * share}
                    />
                    <text
                      x={lw + j * cell + cell / 2}
                      y={top + i * cell + cell / 2 + 5}
                      textAnchor="middle"
                      className={`sd-cell${share > 0.55 ? ' on-dark' : ''}`}
                    >
                      {int(v)}
                    </text>
                  </g>
                )
              })}
            </g>
          )
        })}
      </svg>
      <p className="sd-chart-note">Linhas: classe real. A diagonal são os acertos; a cor mostra a fração da linha.</p>
      {node}
    </div>
  )
}

/** "Dívida moderada" → "Moderada": a palavra que distingue as classes. */
const shortClass = (c: string) => {
  const w = c.split(' ').at(-1) ?? c
  return w[0].toUpperCase() + w.slice(1)
}

function TwoLineLabel({ x, y, text, split }: { x: number; y: number; text: string; split: boolean }) {
  const words = text.split(' ')
  if (!split || words.length < 2)
    return (
      <text x={x} y={y + 4} textAnchor="end" className="sd-label">
        {text}
      </text>
    )
  return (
    <text x={x} y={y - 3} textAnchor="end" className="sd-label">
      <tspan x={x}>{words[0]}</tspan>
      <tspan x={x} dy="1.2em">
        {words.slice(1).join(' ')}
      </tspan>
    </text>
  )
}

/* ------------------------------------------------------------------ */
/* Ponto com barra de erro (validação cruzada)                         */
/* ------------------------------------------------------------------ */

export function DotWhisker({
  data,
  domain,
  highlight,
}: {
  data: { label: string; mean: number; std: number }[]
  domain: [number, number]
  highlight?: string
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const { show, hide, node } = useTooltip()
  const lw = 110
  const rh = 36
  const plotW = width - lw - 20
  const X = (v: number) => lw + ((v - domain[0]) / (domain[1] - domain[0])) * plotW
  const ticks = Array.from({ length: 5 }, (_, i) => domain[0] + ((domain[1] - domain[0]) * i) / 4)
  const h = data.length * rh + 30
  return (
    <div className="sd-chart" ref={ref}>
      <svg width={width} height={h} role="img" aria-label="F1 macro na validação cruzada para cada arquitetura">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={X(t)} x2={X(t)} y1={0} y2={h - 24} className="sd-grid" />
            <text x={X(t)} y={h - 8} textAnchor="middle" className="sd-axis">
              {pct(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const y = i * rh + rh / 2
          const tip = `${d.label}: F1 macro ${pct(d.mean, 2)} ± ${pct(d.std, 2)}`
          const on = d.label === highlight
          return (
            <g
              key={d.label}
              tabIndex={0}
              onPointerMove={(e) => show(e, tip)}
              onPointerLeave={hide}
              onFocus={(e) => show(e, tip)}
              onBlur={hide}
            >
              <rect x={0} y={y - rh / 2} width={width} height={rh} fill="transparent" />
              <text x={lw - 10} y={y + 4} textAnchor="end" className={`sd-label${on ? ' strong' : ''}`}>
                {d.label}
              </text>
              <line x1={X(d.mean - d.std)} x2={X(d.mean + d.std)} y1={y} y2={y} className="sd-whisker" />
              <circle cx={X(d.mean)} cy={y} r={on ? 7 : 5} className={on ? 'sd-dot' : 'sd-dot quiet'} />
            </g>
          )
        })}
      </svg>
      {node}
    </div>
  )
}
