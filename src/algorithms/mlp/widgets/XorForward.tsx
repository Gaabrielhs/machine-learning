import { useState } from 'react'
import { NetDiagram } from '../../../components/NetDiagram'
import { fmt } from '../../../components/plot'
import type { WidgetProps } from '../../../core/types'
import { XOR_EXAMPLE_LAYERS, XOR_HANDMADE_LAYERS, xorExampleNetwork, xorHandmadeNetwork } from '../engine/examples'
import { forward } from '../engine/network'
import { Select } from './Slider'

type Preset = 'example' | 'handmade'

const PRESETS: Record<Preset, { label: string; make: typeof xorExampleNetwork; layers: typeof XOR_EXAMPLE_LAYERS }> = {
  example: { label: 'pesos iniciais (rede ainda não treinada)', make: xorExampleNetwork, layers: XOR_EXAMPLE_LAYERS },
  handmade: { label: 'pesos escolhidos à mão (resolve o XOR)', make: xorHandmadeNetwork, layers: XOR_HANDMADE_LAYERS },
}

interface Props extends WidgetProps {
  preset?: Preset
}

/** Forward pass da rede 2-2-1 do exemplo da luz da escada, com todas as contas. */
export default function XorForward({ preset = 'example' }: Props) {
  const [which, setWhich] = useState<Preset>(preset)
  const [x, setX] = useState<[number, number]>([1, 0])
  const net = PRESETS[which].make()
  const { zs, as } = forward(net, x)
  const [h1, h2] = as[1]
  const yhat = as[2][0]
  const target = x[0] !== x[1] ? 1 : 0
  const L = PRESETS[which].layers
  const W1 = L[0].W
  const b1 = L[0].b
  const W2 = L[1].W
  const b2 = L[1].b

  return (
    <div className="w w-forward">
      <div className="w-controls">
        <fieldset className="switches">
          <legend className="sr-only">Interruptores</legend>
          {[0, 1].map((k) => (
            <button
              key={k}
              type="button"
              className={`switch ${x[k] ? 'on' : ''}`}
              aria-pressed={!!x[k]}
              onClick={() => setX(k === 0 ? [1 - x[0], x[1]] : [x[0], 1 - x[1]])}
            >
              <span className="switch-knob" aria-hidden="true" />x{k === 0 ? '₁' : '₂'} = {x[k]}
            </button>
          ))}
        </fieldset>
        <Select
          label="pesos"
          value={which}
          onChange={setWhich}
          options={(Object.keys(PRESETS) as Preset[]).map((k) => ({ value: k, label: PRESETS[k].label }))}
        />
      </div>
      <div className="w-split">
        <NetDiagram
          sizes={[2, 2, 1]}
          weights={[W1, W2]}
          values={[x, [h1, h2], [yhat]]}
          labels={{ inputs: ['x₁', 'x₂'], outputs: ['ŷ'] }}
          height={200}
        />
        <div className="lamp-box">
          <div className="lamp" style={{ ['--glow' as string]: yhat.toFixed(3) }} aria-hidden="true" />
          <p>
            Rede diz <strong>{fmt(yhat, 3)}</strong>
            <br />
            Gabarito: luz {target ? 'acesa (1)' : 'apagada (0)'}
          </p>
        </div>
      </div>
      <ol className="calc">
        <li>
          <span>neurônio oculto 1</span>
          <code>
            z = {fmt(W1[0][0], 1)}·{x[0]} + ({fmt(W1[1][0], 1)})·{x[1]} + ({fmt(b1[0], 1)}) = {fmt(zs[0][0])}
          </code>
          <code>
            h₁ = σ({fmt(zs[0][0])}) = {fmt(h1)}
          </code>
        </li>
        <li>
          <span>neurônio oculto 2</span>
          <code>
            z = {fmt(W1[0][1], 1)}·{x[0]} + ({fmt(W1[1][1], 1)})·{x[1]} + ({fmt(b1[1], 1)}) = {fmt(zs[0][1])}
          </code>
          <code>
            h₂ = σ({fmt(zs[0][1])}) = {fmt(h2)}
          </code>
        </li>
        <li>
          <span>saída</span>
          <code>
            z = {fmt(W2[0][0], 1)}·{fmt(h1)} + ({fmt(W2[1][0], 1)})·{fmt(h2)} + ({fmt(b2[0], 1)}) = {fmt(zs[1][0])}
          </code>
          <code>
            ŷ = σ({fmt(zs[1][0])}) = {fmt(yhat)}
          </code>
        </li>
        <li>
          <span>erro</span>
          <code>
            E = ½·(ŷ − y)² = ½·({fmt(yhat)} − {target})² = {fmt(0.5 * (yhat - target) ** 2, 4)}
          </code>
        </li>
      </ol>
    </div>
  )
}
