import { useEffect, useRef, useState } from 'react'
import { drawAxes, fmt, mix } from '../../../components/plot'
import type { WidgetProps } from '../../../core/types'
import { useCanvas } from '../../../hooks/useCanvas'
import { sigmoid } from '../engine/activations'
import { Select, Slider } from './Slider'

type Gate = 'and' | 'or' | 'nand' | 'xor'

const GATES: Record<Gate, { label: string; y: number[] }> = {
  and: { label: 'E (AND)', y: [0, 0, 0, 1] },
  or: { label: 'OU (OR)', y: [0, 1, 1, 1] },
  nand: { label: 'NÃO-E (NAND)', y: [1, 1, 1, 0] },
  xor: { label: 'OU exclusivo (XOR)', y: [0, 1, 1, 0] },
}
const INPUTS = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
]

interface Props extends WidgetProps {
  gate?: Gate
  /** fixa a porta (modo missão) */
  lockGate?: boolean
  start?: [number, number, number]
}

export default function NeuronPlayground({ gate = 'or', lockGate, start = [0.5, -0.5, 0], onComplete }: Props) {
  const [g, setG] = useState<Gate>(gate)
  const [[w1, w2, b], setW] = useState(start)
  const target = GATES[g].y
  const rows = INPUTS.map(([x1, x2], i) => {
    const z = w1 * x1 + w2 * x2 + b
    const out = sigmoid(z)
    return { x1, x2, z, out, y: target[i], ok: (out >= 0.5 ? 1 : 0) === target[i] }
  })
  const score = rows.filter((r) => r.ok).length
  const fired = useRef(false)
  useEffect(() => {
    if (score === 4 && !fired.current && onComplete) {
      fired.current = true
      onComplete()
    }
  }, [score, onComplete])

  const ref = useCanvas(
    (ctx, w, h, p) => {
      const side = Math.min(w, h)
      const ox = (w - side) / 2
      const pad = { l: ox + 30, r: ox + 8, t: 8, b: 26 }
      const f = drawAxes(ctx, w, h, p, {
        xr: [-0.5, 1.5],
        yr: [-0.5, 1.5],
        pad,
        xLabel: 'x₁',
        yLabel: 'x₂',
        xTicks: 4,
        yTicks: 4,
      })
      const n = 48
      const cw = (f.right - f.left) / n
      const ch = (f.bottom - f.top) / n
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          const x = -0.5 + ((i + 0.5) / n) * 2
          const y = 1.5 - ((j + 0.5) / n) * 2
          const out = sigmoid(w1 * x + w2 * y + b)
          ctx.fillStyle = mix(p.bg, out >= 0.5 ? p.pos : p.neg, Math.abs(out - 0.5) * 1.1)
          ctx.fillRect(f.left + i * cw, f.top + j * ch, cw + 0.5, ch + 0.5)
        }
      // reta z = 0
      ctx.save()
      ctx.beginPath()
      ctx.rect(f.left, f.top, f.right - f.left, f.bottom - f.top)
      ctx.clip()
      ctx.strokeStyle = p.ink
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      if (Math.abs(w2) > 1e-9) {
        ctx.moveTo(f.x(-0.5), f.y((-b - w1 * -0.5) / w2))
        ctx.lineTo(f.x(1.5), f.y((-b - w1 * 1.5) / w2))
      } else if (Math.abs(w1) > 1e-9) {
        ctx.moveTo(f.x(-b / w1), f.y(-0.5))
        ctx.lineTo(f.x(-b / w1), f.y(1.5))
      }
      ctx.stroke()
      ctx.restore()
      rows.forEach((r) => {
        ctx.beginPath()
        ctx.arc(f.x(r.x1), f.y(r.x2), 10, 0, 2 * Math.PI)
        ctx.fillStyle = r.y ? p.pos : p.surface
        ctx.fill()
        ctx.lineWidth = 3
        ctx.strokeStyle = r.y ? p.pos : p.neg
        ctx.stroke()
        if (!r.ok) {
          ctx.strokeStyle = p.bad
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(f.x(r.x1), f.y(r.x2), 15, 0, 2 * Math.PI)
          ctx.stroke()
        }
      })
    },
    [w1, w2, b, g],
    280,
  )

  return (
    <div className="w w-neuron">
      <div className="w-controls">
        {!lockGate && (
          <Select
            label="porta lógica"
            value={g}
            onChange={setG}
            options={(Object.keys(GATES) as Gate[]).map((k) => ({ value: k, label: GATES[k].label }))}
          />
        )}
        <Slider label="w₁" value={w1} min={-6} max={6} step={0.1} onChange={(v) => setW([v, w2, b])} />
        <Slider label="w₂" value={w2} min={-6} max={6} step={0.1} onChange={(v) => setW([w1, v, b])} />
        <Slider label="b" value={b} min={-6} max={6} step={0.1} onChange={(v) => setW([w1, w2, v])} />
      </div>
      <div className="w-split">
        <canvas ref={ref} aria-label="Plano x1 por x2 colorido pela saída do neurônio" />
        <div className="w-side">
          <p className={`w-score ${score === 4 ? 'ok' : ''}`}>
            {score} de 4 corretos {lockGate && `· alvo: ${GATES[g].label}`}
          </p>
          <div className="table-scroll">
            <table className="mini-table">
              <thead>
                <tr>
                  <th>x₁</th>
                  <th>x₂</th>
                  <th>z</th>
                  <th>σ(z)</th>
                  <th>alvo</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={r.ok ? '' : 'miss'}>
                    <td>{r.x1}</td>
                    <td>{r.x2}</td>
                    <td>{fmt(r.z, 2)}</td>
                    <td>{fmt(r.out, 2)}</td>
                    <td>{r.y}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="w-note">
            Ponto cheio = alvo 1, vazado = alvo 0. Anel vermelho = erro. A linha tracejada é onde z = 0.
          </p>
        </div>
      </div>
    </div>
  )
}
