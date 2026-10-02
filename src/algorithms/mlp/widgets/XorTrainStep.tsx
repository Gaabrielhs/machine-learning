import { useMemo, useState } from 'react'
import { fmt } from '../../../components/plot'
import { Segmented } from '../../../components/Segmented'
import { XOR_TABLE } from '../engine/datasets'
import { xorExampleNetwork } from '../engine/examples'
import { applyGradients, backward, cloneNetwork, forward, sampleLoss, type Network } from '../engine/network'
import { Slider } from './Slider'

/** Um passo de backpropagation com todos os números à vista. */
export default function XorTrainStep() {
  const [net, setNet] = useState<Network>(xorExampleNetwork)
  const [sample, setSample] = useState(1)
  const [lr, setLr] = useState(1)
  const [count, setCount] = useState(0)
  const x = XOR_TABLE.X[sample]
  const y = XOR_TABLE.Y[sample]
  const { cache, grads } = useMemo(() => {
    const fwd = forward(net, x)
    return { cache: fwd, grads: backward(net, fwd, y, 'mse') }
  }, [net, x, y])
  const yhat = cache.as[2][0]
  const h = cache.as[1]
  const dOut = grads.deltas[1][0]

  const params = [
    ...[0, 1].flatMap((i) =>
      [0, 1].map((j) => ({
        name: `w${i + 1}${j + 1}`,
        desc: `x${i + 1} → h${j + 1}`,
        v: net.layers[0].W[i][j],
        g: grads.dW[0][i][j],
      })),
    ),
    ...[0, 1].map((j) => ({ name: `b${j + 1}`, desc: `viés de h${j + 1}`, v: net.layers[0].b[j], g: grads.db[0][j] })),
    ...[0, 1].map((j) => ({
      name: `v${j + 1}`,
      desc: `h${j + 1} → saída`,
      v: net.layers[1].W[j][0],
      g: grads.dW[1][j][0],
    })),
    { name: 'c', desc: 'viés da saída', v: net.layers[1].b[0], g: grads.db[1][0] },
  ]

  const apply = () => {
    const next = cloneNetwork(net)
    applyGradients(next, grads, lr)
    setNet(next)
    setCount((c) => c + 1)
  }
  const after = (() => {
    const next = cloneNetwork(net)
    applyGradients(next, grads, lr)
    return forward(next, x).as[2][0]
  })()

  return (
    <div className="w w-step">
      <div className="w-controls">
        <Segmented
          label="Exemplo de treino"
          value={sample}
          onChange={setSample}
          options={XOR_TABLE.X.map((xi, i) => ({ value: i, label: `(${xi.join(', ')}) → ${XOR_TABLE.Y[i][0]}` }))}
        />
        <Slider label="taxa η" value={lr} min={0.1} max={3} step={0.1} onChange={setLr} />
      </div>
      <ol className="calc">
        <li>
          <span>1. forward</span>
          <code>
            h₁ = {fmt(h[0])}, h₂ = {fmt(h[1])}, ŷ = {fmt(yhat)}, alvo y = {y[0]}
          </code>
          <code>E = ½(ŷ − y)² = {fmt(sampleLoss([yhat], y, 'mse'), 4)}</code>
        </li>
        <li>
          <span>2. delta da saída</span>
          <code>
            δₒ = (ŷ − y)·ŷ(1 − ŷ) = ({fmt(yhat)} − {y[0]})·{fmt(yhat)}·{fmt(1 - yhat)} = {fmt(dOut, 4)}
          </code>
        </li>
        <li>
          <span>3. deltas ocultos</span>
          {[0, 1].map((j) => (
            <code key={j}>
              δ{j === 0 ? '₁' : '₂'} = δₒ·v{j === 0 ? '₁' : '₂'}·h{j === 0 ? '₁' : '₂'}(1 − h{j === 0 ? '₁' : '₂'}) ={' '}
              {fmt(dOut, 4)}·{fmt(net.layers[1].W[j][0])}·{fmt(h[j] * (1 - h[j]))} = {fmt(grads.deltas[0][j], 4)}
            </code>
          ))}
        </li>
        <li>
          <span>4. gradientes e novos pesos</span>
          <div className="table-scroll">
            <table className="mini-table">
              <thead>
                <tr>
                  <th>peso</th>
                  <th>liga</th>
                  <th>valor</th>
                  <th>∂E/∂peso</th>
                  <th>novo = valor − η·∂E</th>
                </tr>
              </thead>
              <tbody>
                {params.map((p) => (
                  <tr key={p.name}>
                    <td>{p.name}</td>
                    <td>{p.desc}</td>
                    <td>{fmt(p.v)}</td>
                    <td>{fmt(p.g, 4)}</td>
                    <td>{fmt(p.v - lr * p.g)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </li>
      </ol>
      <div className="w-controls">
        <button type="button" className="btn" onClick={apply}>
          Aplicar o passo
        </button>
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => {
            setNet(xorExampleNetwork())
            setCount(0)
          }}
        >
          Voltar aos pesos iniciais
        </button>
        <span className="w-readout">
          passos aplicados: {count} · com o passo, ŷ para ({x.join(', ')}) vai de {fmt(yhat)} para {fmt(after)}
        </span>
      </div>
    </div>
  )
}
