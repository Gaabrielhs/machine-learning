import { useState } from 'react'
import { useTooltip, useWidth } from '../sleep-debt/chartHooks'
import { int, num } from '../sleep-debt/format'
import { hourShade, hours, question } from './labels'
import { isLeaf, type ExportedTree } from './model'

/* ------------------------------------------------------------------ */
/* Histograma de uma série (alvo, erros)                               */
/* ------------------------------------------------------------------ */

interface HistProps {
  bins: number[]
  counts: number[]
  xLabel: string
  /** rótulo de cada faixa no tooltip */
  binLabel: (lo: number, hi: number) => string
  ticks: number[]
  tickFormat: (v: number) => string
  marker?: { value: number; label: string }
  ariaLabel: string
}

export function Histogram({ bins, counts, xLabel, binLabel, ticks, tickFormat, marker, ariaLabel }: HistProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const { show, hide, node } = useTooltip()
  const h = 220
  const pad = { l: 12, r: 12, t: 22, b: 40 }
  const nb = counts.length
  const plotW = width - pad.l - pad.r
  const X = (v: number) => pad.l + ((v - bins[0]) / (bins[nb] - bins[0])) * plotW
  const mx = Math.max(...counts)
  const Y = (c: number) => h - pad.b - (c / mx) * (h - pad.t - pad.b)
  return (
    <div className="sd-chart" ref={ref}>
      <svg width={width} height={h} role="img" aria-label={ariaLabel}>
        <line x1={pad.l} x2={width - pad.r} y1={h - pad.b} y2={h - pad.b} className="sd-grid" />
        {counts.map((c, i) => {
          const x0 = X(bins[i])
          const w = X(bins[i + 1]) - x0
          const tip = `${binLabel(bins[i], bins[i + 1])}: ${int(c)} pessoas`
          return (
            <rect
              key={i}
              x={x0 + 0.5}
              y={Y(c)}
              width={Math.max(1, w - 1)}
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
/* Previsto × real                                                     */
/* ------------------------------------------------------------------ */

export function Scatter({ real, pred }: { real: number[]; pred: number[] }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const size = Math.min(width, 420)
  const pad = { l: 44, r: 10, t: 10, b: 40 }
  const lo = 3
  const hi = 10
  const S = (v: number) => (v - lo) / (hi - lo)
  const X = (v: number) => pad.l + S(v) * (size - pad.l - pad.r)
  const Y = (v: number) => size - pad.b - S(v) * (size - pad.t - pad.b)
  const ticks = [3, 4, 5, 6, 7, 8, 9, 10]
  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - box.left + pad.l
    const py = e.clientY - box.top + pad.t
    let best = -1
    let bd = 144
    for (let i = 0; i < real.length; i++) {
      const d = (X(real[i]) - px) ** 2 + (Y(pred[i]) - py) ** 2
      if (d < bd) {
        bd = d
        best = i
      }
    }
    setHover(best < 0 ? null : best)
  }
  return (
    <div className="sd-chart" ref={ref}>
      <svg
        width={size}
        height={size}
        role="img"
        aria-label="Horas previstas pela árvore contra horas reais, no conjunto de teste"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={X(t)} x2={X(t)} y1={pad.t} y2={size - pad.b} className="sd-grid" />
            <line x1={pad.l} x2={size - pad.r} y1={Y(t)} y2={Y(t)} className="sd-grid" />
            <text x={X(t)} y={size - pad.b + 16} textAnchor="middle" className="sd-axis">
              {t}
            </text>
            <text x={pad.l - 8} y={Y(t) + 4} textAnchor="end" className="sd-axis">
              {t}
            </text>
          </g>
        ))}
        <text x={pad.l + (size - pad.l - pad.r) / 2} y={size - 4} textAnchor="middle" className="sd-axis">
          horas reais
        </text>
        <text
          x={12}
          y={pad.t + (size - pad.t - pad.b) / 2}
          textAnchor="middle"
          className="sd-axis"
          transform={`rotate(-90 12 ${pad.t + (size - pad.t - pad.b) / 2})`}
        >
          horas previstas
        </text>
        <line x1={X(lo)} y1={Y(lo)} x2={X(hi)} y2={Y(hi)} className="sd-ref" />
        <g className="ct-points">
          {real.map((r, i) => (
            <circle key={i} cx={X(r)} cy={Y(pred[i])} r={2.4} />
          ))}
        </g>
        {hover !== null && <circle cx={X(real[hover])} cy={Y(pred[hover])} r={6} className="sd-dot" />}
        <rect
          x={pad.l}
          y={pad.t}
          width={size - pad.l - pad.r}
          height={size - pad.t - pad.b}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {hover !== null && (
        <div className="sd-tip" style={{ left: X(real[hover]), top: Y(pred[hover]) }}>
          real {hours(real[hover])} · previsto {hours(pred[hover])}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Mapa de calor da busca em grade                                     */
/* ------------------------------------------------------------------ */

export function GridHeatmap({
  rows,
  cols,
  values,
  best,
}: {
  rows: string[]
  cols: number[]
  values: number[][]
  best: [number, number]
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const { show, hide, node } = useTooltip()
  const lw = 64
  const top = 40
  const cw = Math.min(76, (width - lw - 4) / cols.length)
  const ch = 22
  const all = values.flat()
  const lo = Math.min(...all)
  const hi = Math.max(...all)
  return (
    <div className="sd-chart" ref={ref}>
      <svg
        width={width}
        height={top + rows.length * ch + 4}
        role="img"
        aria-label="R² médio na validação cruzada para cada combinação de profundidade e mínimo por folha"
      >
        <text x={lw + (cw * cols.length) / 2} y={12} textAnchor="middle" className="sd-axis">
          min_samples_leaf →
        </text>
        <text x={lw - 8} y={32} textAnchor="end" className="sd-axis">
          max_depth ↓
        </text>
        {cols.map((c, j) => (
          <text key={c} x={lw + j * cw + cw / 2} y={32} textAnchor="middle" className="sd-label small">
            {c}
          </text>
        ))}
        {rows.map((r, i) => (
          <g key={r}>
            <text x={lw - 8} y={top + i * ch + ch / 2 + 4} textAnchor="end" className="sd-label small">
              {r}
            </text>
            {values[i].map((v, j) => {
              const share = (v - lo) / (hi - lo || 1)
              const isBest = i === best[0] && j === best[1]
              const tip = `profundidade ${r}, mínimo ${cols[j]} por folha: R² ${num(v, 3)}`
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
                    x={lw + j * cw + 1}
                    y={top + i * ch + 1}
                    width={cw - 2}
                    height={ch - 2}
                    rx={3}
                    fill="var(--sd-heat)"
                    fillOpacity={0.06 + 0.94 * share ** 2}
                    className={isBest ? 'ct-best' : undefined}
                  />
                  <text
                    x={lw + j * cw + cw / 2}
                    y={top + i * ch + ch / 2 + 4}
                    textAnchor="middle"
                    className={`ct-heat-v${share ** 2 > 0.55 ? ' on-dark' : ''}${isBest ? ' strong' : ''}`}
                  >
                    {num(v, 3)}
                  </text>
                </g>
              )
            })}
          </g>
        ))}
      </svg>
      {node}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Curva de complexidade: treino × validação por profundidade          */
/* ------------------------------------------------------------------ */

export function ComplexityCurve({
  labels,
  train,
  val,
  best,
}: {
  labels: string[]
  train: number[]
  val: number[]
  best: number
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const h = 260
  const pad = { l: 46, r: 16, t: 16, b: 44 }
  const n = labels.length
  const X = (i: number) => pad.l + (i / (n - 1)) * (width - pad.l - pad.r)
  const Y = (v: number) => h - pad.b - ((v - 0.2) / 0.8) * (h - pad.t - pad.b)
  const line = (vs: number[]) => vs.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('')
  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    setHover(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - box.left) / box.width) * (n - 1)))))
  }
  return (
    <div className="sd-chart" ref={ref}>
      <svg width={width} height={h} role="img" aria-label="R² no treino e na validação para cada profundidade máxima">
        {[0.2, 0.4, 0.6, 0.8, 1].map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={width - pad.r} y1={Y(t)} y2={Y(t)} className="sd-grid" />
            <text x={pad.l - 8} y={Y(t) + 4} textAnchor="end" className="sd-axis">
              {num(t, 1)}
            </text>
          </g>
        ))}
        {labels.map((l, i) => (
          <text key={l} x={X(i)} y={h - pad.b + 16} textAnchor="middle" className="sd-axis">
            {l}
          </text>
        ))}
        <text x={pad.l + (width - pad.l - pad.r) / 2} y={h - 4} textAnchor="middle" className="sd-axis">
          profundidade máxima (max_depth)
        </text>
        <rect
          x={X(best) - 10}
          y={pad.t}
          width={20}
          height={h - pad.t - pad.b}
          rx={4}
          className="ct-band"
          aria-hidden="true"
        />
        <path d={line(train)} className="ct-line-train" />
        <path d={line(val)} className="sd-line" />
        {val.map((v, i) => (
          <circle key={i} cx={X(i)} cy={Y(v)} r={i === best ? 5 : 3} className="sd-dot" />
        ))}
        <text x={X(n - 1) - 4} y={Y(train[n - 1]) + 16} textAnchor="end" className="sd-label small">
          treino
        </text>
        <text x={X(n - 1) - 4} y={Y(val[n - 1]) + 18} textAnchor="end" className="sd-label small strong">
          validação
        </text>
        {hover !== null && <line x1={X(hover)} x2={X(hover)} y1={pad.t} y2={h - pad.b} className="sd-cross" />}
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
        <div className="sd-tip" style={{ left: X(hover), top: Y(Math.max(train[hover], val[hover])) }}>
          profundidade {labels[hover]}: treino {num(train[hover], 3)} · validação <strong>{num(val[hover], 3)}</strong>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Topo da árvore em diagrama                                          */
/* ------------------------------------------------------------------ */

/**
 * Desenha os `levels` primeiros níveis da árvore. Nós cortados mostram só a média de horas.
 * `path` destaca os nós de um caminho (ids do scikit-learn).
 */
export function TopTree({ model, levels = 3, path = [] }: { model: ExportedTree; levels?: number; path?: number[] }) {
  const { left, right, feature, threshold, value, n } = model.tree
  const cols = 2 ** levels
  const width = Math.max(760, cols * 130)
  const boxW = Math.min(196, (width / 2 ** (levels - 1)) * 0.86)
  const rowH = 96
  const h = (levels + 1) * rowH - 20
  const nodes: { id: number; depth: number; x: number }[] = []
  const walk = (id: number, depth: number, lo: number, hi: number) => {
    nodes.push({ id, depth, x: (lo + hi) / 2 })
    if (depth === levels || isLeaf(model, id)) return
    const mid = (lo + hi) / 2
    walk(left[id], depth + 1, lo, mid)
    walk(right[id], depth + 1, mid, hi)
  }
  walk(0, 0, 0, width)
  const pos = new Map(nodes.map((d) => [d.id, d]))
  const on = new Set(path)
  return (
    <div className="table-scroll ct-tree-scroll">
      <svg
        width={width}
        height={h}
        viewBox={`0 0 ${width} ${h}`}
        role="img"
        aria-label={`Os ${levels} primeiros níveis da árvore de decisão`}
        className="ct-tree"
      >
        {nodes.map((d) => {
          if (d.depth === levels || isLeaf(model, d.id)) return null
          const q = question(model.features[feature[d.id]], threshold[d.id])
          return [left[d.id], right[d.id]].map((c, k) => {
            const p = pos.get(c)!
            const hot = on.has(d.id) && on.has(c)
            const y1 = d.depth * rowH + 52
            const y2 = p.depth * rowH + 4
            return (
              <g key={c}>
                <path
                  d={`M${d.x},${y1} C${d.x},${(y1 + y2) / 2} ${p.x},${(y1 + y2) / 2} ${p.x},${y2}`}
                  className={`ct-edge${hot ? ' hot' : ''}`}
                />
                <text
                  x={(d.x + p.x) / 2 + (k ? 8 : -8)}
                  y={(y1 + y2) / 2 + 2}
                  textAnchor={k ? 'start' : 'end'}
                  className="ct-edge-label"
                >
                  {k ? q.right : q.left}
                </text>
              </g>
            )
          })
        })}
        {nodes.map((d) => {
          const y = d.depth * rowH + 4
          const hot = on.has(d.id)
          const cut = d.depth === levels && !isLeaf(model, d.id)
          const leaf = isLeaf(model, d.id)
          if (cut || leaf)
            return (
              <g key={d.id} className={`ct-node small${hot ? ' hot' : ''}`}>
                <rect x={d.x - 44} y={y} width={88} height={40} rx={8} fill={hourShade(value[d.id])} />
                <text x={d.x} y={y + 18} textAnchor="middle" className="ct-node-v">
                  {hours(value[d.id], 1)}
                </text>
                <text x={d.x} y={y + 32} textAnchor="middle" className="ct-node-n">
                  {cut ? `${int(n[d.id])} · continua` : `${int(n[d.id])} · folha`}
                </text>
              </g>
            )
          const q = question(model.features[feature[d.id]], threshold[d.id])
          return (
            <g key={d.id} className={`ct-node${hot ? ' hot' : ''}`}>
              <rect x={d.x - boxW / 2} y={y} width={boxW} height={48} rx={8} />
              <text x={d.x} y={y + 19} textAnchor="middle" className="ct-node-q">
                {q.text}
              </text>
              <text x={d.x} y={y + 37} textAnchor="middle" className="ct-node-n">
                {int(n[d.id])} pessoas · média {hours(value[d.id], 1)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
