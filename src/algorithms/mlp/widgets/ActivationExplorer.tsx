import { useState } from 'react'
import { drawAxes, fmt, plotFunction } from '../../../components/plot'
import type { WidgetProps } from '../../../core/types'
import { useCanvas } from '../../../hooks/useCanvas'
import { ACTIVATIONS, type ActivationName } from '../engine/activations'
import { Select } from './Slider'

interface Props extends WidgetProps {
  options?: ActivationName[]
  showDerivative?: boolean
}

export default function ActivationExplorer({ options = ['sigmoid', 'tanh', 'relu'], showDerivative = true }: Props) {
  const [name, setName] = useState<ActivationName>(options[0])
  const [hover, setHover] = useState<number | null>(null)
  const act = ACTIVATIONS[name]
  const xr: [number, number] = [-5, 5]
  const ref = useCanvas(
    (ctx, w, h, p) => {
      let lo = 0
      let hi = 0
      for (let z = xr[0]; z <= xr[1]; z += 0.05) {
        const a = act.f(z)
        lo = Math.min(lo, a, showDerivative ? act.df(z, a) : a)
        hi = Math.max(hi, a, showDerivative ? act.df(z, a) : a)
      }
      const f = drawAxes(ctx, w, h, p, { xr, yr: [lo - 0.15, hi + 0.15], xLabel: 'z' })
      plotFunction(ctx, f, act.f, xr, p.accent)
      if (showDerivative) plotFunction(ctx, f, (z) => act.df(z, act.f(z)), xr, p.neg, { dash: [6, 4] })
      if (hover !== null) {
        ctx.fillStyle = p.ink
        ctx.beginPath()
        ctx.arc(f.x(hover), f.y(act.f(hover)), 4.5, 0, 2 * Math.PI)
        ctx.fill()
      }
    },
    [name, hover, showDerivative],
    240,
  )
  return (
    <div className="w">
      <div className="w-controls">
        <Select
          label="ativação"
          value={name}
          onChange={setName}
          options={options.map((o) => ({ value: o, label: ACTIVATIONS[o].label }))}
        />
        <span className="legend">
          <i className="sw sw-accent" /> g(z)
          {showDerivative && (
            <>
              <i className="sw sw-neg dashed" /> g′(z)
            </>
          )}
        </span>
      </div>
      <canvas
        ref={ref}
        aria-label={`Gráfico da função ${act.label}`}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          const z = xr[0] + ((e.clientX - r.left - 40) / (r.width - 52)) * (xr[1] - xr[0])
          setHover(z >= xr[0] && z <= xr[1] ? z : null)
        }}
        onPointerLeave={() => setHover(null)}
      />
      <p className="w-readout">
        {hover === null
          ? 'Passe o dedo ou o mouse sobre o gráfico.'
          : `z = ${fmt(hover, 2)}   g(z) = ${fmt(act.f(hover))}${showDerivative ? `   g′(z) = ${fmt(act.df(hover, act.f(hover)))}` : ''}`}
      </p>
    </div>
  )
}
