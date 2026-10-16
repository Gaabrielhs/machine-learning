import { useState, type ReactNode } from 'react'
import { useTooltip, useWidth } from './chartHooks'
import { bandColor, hoursToBandIndex, int, num, pct } from './format'
import type { TreeNodeSummary } from './types'

/* ------------------------------------------------------------------ */
/* Barras horizontais (importância, atributos, cenários)               */
/* ------------------------------------------------------------------ */

export interface HBarDatum {
  label: string
  value: number
  color?: string
  note?: string
  tip?: ReactNode
  strong?: boolean
}

interface HBarProps {
  data: HBarDatum[]
  max: number
  format: (v: number) => string
  reference?: { value: number; label: string }
  labelWidth?: number
  rowHeight?: number
  ariaLabel: string
}

export function HBars({ data, max, format, reference, labelWidth = 190, rowHeight = 30, ariaLabel }: HBarProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const { show, hide, node } = useTooltip()
  const narrow = width < 520
  const lw = narrow ? Math.min(labelWidth, 125) : labelWidth
  const noteW = 108
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
/* Barras 100% empilhadas (proporção das faixas em treino e teste)     */
/* ------------------------------------------------------------------ */

export function StackedShare({ rows, bands }: { rows: { label: string; counts: number[] }[]; bands: string[] }) {
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
        aria-label="Proporção de cada faixa de sono no treino e no teste"
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
                const tip = `${r.label} · ${bands[k]}: ${int(c)} (${pct(c / total)})`
                return (
                  <rect
                    key={k}
                    x={x0 + 1}
                    y={i * rh + 4}
                    width={Math.max(0, w - 2)}
                    height={rh - 10}
                    rx={3}
                    fill={bandColor(k)}
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
/* Histograma contínuo (distribuição de horas de sono ou resíduos)     */
/* ------------------------------------------------------------------ */

export function ContinuousHistogram({
  bins,
  counts,
  unit,
  meanMarker,
  colorBySleepBand = false,
  ariaLabel,
}: {
  bins: number[]
  counts: number[]
  unit: string
  meanMarker?: { value: number; label: string }
  colorBySleepBand?: boolean
  ariaLabel: string
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const { show, hide, node } = useTooltip()
  const h = 190
  const pad = { l: 42, r: 16, t: 18, b: 32 }
  const plotW = Math.max(80, width - pad.l - pad.r)
  const plotH = h - pad.t - pad.b
  const nb = counts.length
  const bw = plotW / nb
  const mx = Math.max(1, ...counts)
  const xAt = (v: number) => pad.l + ((v - bins[0]) / (bins[nb] - bins[0])) * plotW

  const stepTicks = bins[nb] - bins[0] > 4 ? [3, 4, 5, 6, 7, 8, 9, 10] : [-1.5, -1.0, -0.5, 0, 0.5, 1.0, 1.5]

  return (
    <div className="sd-chart" ref={ref}>
      <svg width={width} height={h} role="img" aria-label={ariaLabel}>
        <line x1={pad.l} x2={pad.l + plotW} y1={pad.t + plotH} y2={pad.t + plotH} className="sd-grid" />
        {counts.map((n, i) => {
          const hh = (n / mx) * (plotH - 6)
          const mid = (bins[i] + bins[i + 1]) / 2
          const fill = colorBySleepBand ? bandColor(hoursToBandIndex(mid)) : 'var(--sd-series-strong)'
          const tip = `${int(n)} pessoas entre ${num(bins[i], 2)} ${unit} e ${num(bins[i + 1], 2)} ${unit}`
          return (
            <rect
              key={i}
              x={pad.l + i * bw + 1}
              y={pad.t + plotH - hh}
              width={Math.max(1, bw - 2)}
              height={hh}
              rx={2}
              fill={fill}
              tabIndex={n ? 0 : -1}
              onPointerMove={(e) => show(e, tip)}
              onPointerLeave={hide}
              onFocus={(e) => show(e, tip)}
              onBlur={hide}
            />
          )
        })}
        {meanMarker && (
          <g>
            <line
              x1={xAt(meanMarker.value)}
              x2={xAt(meanMarker.value)}
              y1={pad.t}
              y2={pad.t + plotH}
              className="sd-ref"
            />
            <text x={xAt(meanMarker.value)} y={12} textAnchor="middle" className="sd-label strong">
              {meanMarker.label}
            </text>
          </g>
        )}
        {stepTicks.map((v) => (
          <text key={v} x={xAt(v)} y={h - 8} textAnchor="middle" className="sd-axis">
            {num(v, v % 1 === 0 ? 0 : 1)} {unit}
          </text>
        ))}
      </svg>
      {node}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Curvas por profundidade (MSE treino x validação / R² validação)     */
/* ------------------------------------------------------------------ */

interface DepthLineProps {
  depths: number[]
  primary: number[]
  secondary?: number[]
  primaryLabel?: string
  secondaryLabel?: string
  yLabel: string
  format: (v: number) => string
  yDomain?: [number, number]
  marker?: { index: number; label: string }
  ariaLabel: string
}

export function DepthLineChart({
  depths,
  primary,
  secondary,
  primaryLabel,
  secondaryLabel,
  yLabel,
  format,
  yDomain,
  marker,
  ariaLabel,
}: DepthLineProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const h = 236
  const pad = { l: 52, r: 16, t: 22, b: 44 }
  const allVals = secondary ? [...primary, ...secondary] : primary
  const lo = yDomain?.[0] ?? Math.min(...allVals)
  const hi = yDomain?.[1] ?? Math.max(...allVals)
  const n = depths.length
  const X = (i: number) => pad.l + (i / Math.max(1, n - 1)) * (width - pad.l - pad.r)
  const Y = (v: number) => h - pad.b - ((v - lo) / (hi - lo || 1)) * (h - pad.t - pad.b)
  const ticks = Array.from({ length: 5 }, (_, k) => lo + ((hi - lo) * k) / 4)

  const path1 = primary.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('')
  const area1 = `${path1}L${X(n - 1).toFixed(1)},${h - pad.b}L${X(0).toFixed(1)},${h - pad.b}Z`
  const path2 = secondary
    ? secondary.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('')
    : null

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
        {depths.map((d, i) => (
          <text key={d} x={X(i)} y={h - pad.b + 16} textAnchor="middle" className="sd-axis">
            {d}
          </text>
        ))}
        <text x={pad.l + (width - pad.l - pad.r) / 2} y={h - 4} textAnchor="middle" className="sd-axis">
          profundidade máxima (max_depth)
        </text>
        <path d={area1} className="sd-area" />
        {path2 && <path d={path2} className="sd-line-dashed" />}
        <path d={path1} className="sd-line" />
        {marker && (
          <g>
            <line x1={X(marker.index)} x2={X(marker.index)} y1={pad.t} y2={h - pad.b} className="sd-ref" />
            <circle cx={X(marker.index)} cy={Y(primary[marker.index])} r={5} className="sd-dot" />
            <text
              x={X(marker.index) + (X(marker.index) > width - 160 ? -8 : 8)}
              y={pad.t + 12}
              textAnchor={X(marker.index) > width - 160 ? 'end' : 'start'}
              className="sd-label strong"
            >
              {marker.label}
            </text>
          </g>
        )}
        {hover !== null && (
          <g>
            <line x1={X(hover)} x2={X(hover)} y1={pad.t} y2={h - pad.b} className="sd-cross" />
            <circle cx={X(hover)} cy={Y(primary[hover])} r={5} className="sd-dot" />
            {secondary && <circle cx={X(hover)} cy={Y(secondary[hover])} r={4} className="sd-dot quiet" />}
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
        <div className="sd-tip" style={{ left: X(hover), top: Y(primary[hover]) }}>
          profundidade {depths[hover]}:{' '}
          <strong>
            {primaryLabel ? `${primaryLabel} ` : ''}
            {format(primary[hover])}
          </strong>
          {secondary && (
            <>
              {' · '}
              {secondaryLabel ? `${secondaryLabel} ` : ''}
              {format(secondary[hover])}
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Dispersão Real x Previsto (substitui a Matriz de Confusão)          */
/* ------------------------------------------------------------------ */

export function ScatterPlot({
  points,
}: {
  points: { true: number; pred: number; err: number }[]
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const { show, hide, node } = useTooltip()
  const size = Math.min(380, Math.max(260, width))
  const pad = { l: 48, r: 18, t: 18, b: 42 }
  const lo = 3.0
  const hi = 10.0
  const plotW = width - pad.l - pad.r
  const plotH = size - pad.t - pad.b
  const X = (v: number) => pad.l + ((v - lo) / (hi - lo)) * plotW
  const Y = (v: number) => size - pad.b - ((v - lo) / (hi - lo)) * plotH
  const ticks = [3, 4, 5, 6, 7, 8, 9, 10]

  return (
    <div className="sd-chart" ref={ref}>
      <svg width={width} height={size} role="img" aria-label="Dispersão entre horas reais e previstas no teste">
        <text x={pad.l} y={12} className="sd-axis">
          previsto pela árvore (h)
        </text>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={width - pad.r} y1={Y(t)} y2={Y(t)} className="sd-grid" />
            <text x={pad.l - 8} y={Y(t) + 4} textAnchor="end" className="sd-axis">
              {t}h
            </text>
            <text x={X(t)} y={size - pad.b + 16} textAnchor="middle" className="sd-axis">
              {t}h
            </text>
          </g>
        ))}
        <text x={pad.l + plotW / 2} y={size - 4} textAnchor="middle" className="sd-axis">
          horas de sono reais →
        </text>
        {/* Linha ideal y = y_hat */}
        <line x1={X(lo)} y1={Y(lo)} x2={X(hi)} y2={Y(hi)} className="sd-ref" />
        <text x={X(9.2)} y={Y(9.4)} textAnchor="end" className="sd-axis">
          acerto perfeito (y = ŷ)
        </text>
        {points.map((p, i) => {
          const tip = (
            <>
              Real: <strong>{num(p.true, 2)} h</strong> · Previsto: <strong>{num(p.pred, 2)} h</strong> (erro{' '}
              {p.err >= 0 ? '+' : ''}
              {num(p.err, 2)} h)
            </>
          )
          return (
            <circle
              key={i}
              cx={X(p.true)}
              cy={Y(p.pred)}
              r={4.2}
              fill={bandColor(hoursToBandIndex(p.true))}
              fillOpacity={0.78}
              stroke="var(--surface)"
              strokeWidth={1}
              tabIndex={0}
              onPointerMove={(e) => show(e, tip)}
              onPointerLeave={hide}
              onFocus={(e) => show(e, tip)}
              onBlur={hide}
            />
          )
        })}
      </svg>
      <p className="sd-chart-note">
        Amostra do conjunto de teste. Quanto mais próximos da linha tracejada diagonal, menor o erro da previsão.
      </p>
      {node}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Ponto com barra de erro (validação cruzada de hiperparâmetros)      */
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
  const lw = width < 520 ? 130 : 170
  const rh = 36
  const plotW = Math.max(80, width - lw - 24)
  const X = (v: number) => lw + ((v - domain[0]) / (domain[1] - domain[0])) * plotW
  const ticks = Array.from({ length: 5 }, (_, i) => domain[0] + ((domain[1] - domain[0]) * i) / 4)
  const h = data.length * rh + 30
  return (
    <div className="sd-chart" ref={ref}>
      <svg width={width} height={h} role="img" aria-label="R² na validação cruzada para cada configuração da árvore">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={X(t)} x2={X(t)} y1={0} y2={h - 24} className="sd-grid" />
            <text x={X(t)} y={h - 8} textAnchor="middle" className="sd-axis">
              {pct(t, 1)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const y = i * rh + rh / 2
          const tip = `${d.label}: R² = ${pct(d.mean, 2)} ± ${pct(d.std, 2)}`
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

/* ------------------------------------------------------------------ */
/* Diagrama visual dos 3 primeiros níveis da Árvore de Decisão         */
/* ------------------------------------------------------------------ */

const SHORT_FEATURE: Record<string, string> = {
  next_day_fatigue_score: 'cansaço ≤',
  morning_alarm_snoozes: 'sonecas ≤',
  bedtime_phone_minutes: 'celular ≤',
  caffeine_post_5pm_mg: 'cafeína ≤',
  sleep_latency_min: 'latência ≤',
  deep_sleep_pct: 'sono prof. ≤',
  'chronotype_Morning Lark': 'matutino?',
  'chronotype_Night Owl': 'noturno?',
  'occupation_type_Healthcare / Shift Worker': 'turno saúde?',
}

function formatRule(feature?: string, threshold?: number): string {
  if (!feature) return ''
  const label = SHORT_FEATURE[feature] ?? feature
  if (label.endsWith('?')) return `${label} (≤ 0,5)`
  return `${label} ${num(threshold ?? 0, 2)}`
}

export function DecisionTreeDiagram({ root }: { root: TreeNodeSummary }) {
  const [ref, width] = useWidth<HTMLDivElement>(680)
  const { show, hide, node } = useTooltip()
  const h = 290

  interface PositionedNode {
    id: string
    node: TreeNodeSummary
    depth: number
    x: number
    y: number
    parentX?: number
    parentY?: number
    edgeLabel?: string
  }

  const list: PositionedNode[] = []
  const padX = 36
  const usableW = Math.max(300, width - padX * 2)

  function traverse(n: TreeNodeSummary, depth: number, indexInLevel: number, parentX?: number, parentY?: number, edge?: string) {
    const countInLevel = Math.pow(2, depth)
    const x = padX + ((indexInLevel + 0.5) / countInLevel) * usableW
    const y = 34 + depth * 76
    list.push({ id: `${depth}-${indexInLevel}`, node: n, depth, x, y, parentX, parentY, edgeLabel: edge })
    if (!n.leaf && n.left && n.right && depth < 3) {
      traverse(n.left, depth + 1, indexInLevel * 2, x, y, 'Sim')
      traverse(n.right, depth + 1, indexInLevel * 2 + 1, x, y, 'Não')
    }
  }
  traverse(root, 0, 0)

  return (
    <div className="sd-chart" ref={ref}>
      <svg width={width} height={h} role="img" aria-label="Primeiros 3 níveis da Árvore de Decisão treinada">
        {list.map((item) =>
          item.parentX !== undefined && item.parentY !== undefined ? (
            <g key={`e-${item.id}`}>
              <line
                x1={item.parentX}
                y1={item.parentY + 18}
                x2={item.x}
                y2={item.y - 20}
                className="sd-tree-edge"
              />
              {item.depth <= 2 && (
                <text
                  x={(item.parentX + item.x) / 2 + (item.edgeLabel === 'Sim' ? -10 : 10)}
                  y={(item.parentY + item.y) / 2 + 2}
                  textAnchor="middle"
                  className="sd-axis"
                >
                  {item.edgeLabel}
                </text>
              )}
            </g>
          ) : null,
        )}
        {list.map((item) => {
          const isLeafLevel = item.depth === 3 || item.node.leaf
          const boxW = item.depth === 3 ? Math.min(72, usableW / 8 - 4) : item.depth === 2 ? Math.min(126, usableW / 4 - 6) : 148
          const boxH = item.depth === 3 ? 38 : 42
          const color = bandColor(hoursToBandIndex(item.node.value))
          const tip = (
            <>
              <strong>Média no nó: {num(item.node.value, 2)} h</strong> ({int(item.node.n)} amostras · MSE{' '}
              {num(item.node.mse, 3)})
              {!isLeafLevel && item.node.feature && (
                <>
                  <br />
                  Regra: <code>{formatRule(item.node.feature, item.node.threshold)}</code>
                </>
              )}
            </>
          )
          return (
            <g
              key={item.id}
              tabIndex={0}
              onPointerMove={(e) => show(e, tip)}
              onPointerLeave={hide}
              onFocus={(e) => show(e, tip)}
              onBlur={hide}
            >
              <rect
                x={item.x - boxW / 2}
                y={item.y - boxH / 2}
                width={boxW}
                height={boxH}
                rx={6}
                fill="var(--surface)"
                stroke={isLeafLevel ? color : 'var(--sd-line)'}
                strokeWidth={isLeafLevel ? 2 : 1.5}
              />
              {!isLeafLevel ? (
                <>
                  <text x={item.x} y={item.y - 4} textAnchor="middle" className="sd-tree-rule">
                    {formatRule(item.node.feature, item.node.threshold)}
                  </text>
                  <text x={item.x} y={item.y + 12} textAnchor="middle" className="sd-axis">
                    {num(item.node.value, 2)}h · n={int(item.node.n)}
                  </text>
                </>
              ) : (
                <>
                  <text x={item.x} y={item.y - 2} textAnchor="middle" className="sd-tree-leaf">
                    {num(item.node.value, 2)} h
                  </text>
                  <text x={item.x} y={item.y + 12} textAnchor="middle" className="sd-axis">
                    n={int(item.node.n)}
                  </text>
                </>
              )}
            </g>
          )
        })}
      </svg>
      {node}
    </div>
  )
}
