import { describe, expect, it } from 'vitest'
import type { ActivationName } from './activations'
import { XOR_TABLE, makeDataset, splitDataset } from './datasets'
import {
  accuracy,
  backward,
  createNetwork,
  datasetLoss,
  forward,
  parameterCount,
  predict,
  sampleLoss,
  trainEpoch,
  type LossName,
  type Network,
} from './network'
import { XOR_EXAMPLE_LR, xorExampleNetwork } from './examples'
import { createRng } from './rng'

/** Derivada numérica por diferença centrada, comparada com o backprop. */
function maxRelativeError(net: Network, x: number[], y: number[], loss: LossName): number {
  const g = backward(net, forward(net, x), y, loss)
  const h = 1e-6
  let worst = 0
  net.layers.forEach((layer, l) => {
    const check = (get: () => number, set: (v: number) => void, analytic: number) => {
      const v = get()
      set(v + h)
      const up = sampleLoss(predict(net, x), y, loss)
      set(v - h)
      const down = sampleLoss(predict(net, x), y, loss)
      set(v)
      const numeric = (up - down) / (2 * h)
      const err = Math.abs(numeric - analytic) / Math.max(1e-8, Math.abs(numeric) + Math.abs(analytic))
      worst = Math.max(worst, err)
    }
    layer.W.forEach((row, i) =>
      row.forEach((_, j) =>
        check(
          () => row[j],
          (v) => (row[j] = v),
          g.dW[l][i][j],
        ),
      ),
    )
    layer.b.forEach((_, j) =>
      check(
        () => layer.b[j],
        (v) => (layer.b[j] = v),
        g.db[l][j],
      ),
    )
  })
  return worst
}

describe('backpropagation', () => {
  const hidden: ActivationName[] = ['sigmoid', 'tanh', 'relu']
  const losses: LossName[] = ['mse', 'bce']
  for (const h of hidden)
    for (const loss of losses)
      it(`bate com a derivada numérica (oculta ${h}, perda ${loss})`, () => {
        const net = createNetwork([3, 4, 3, 1], { hidden: h, seed: 42 })
        expect(maxRelativeError(net, [0.3, -0.7, 0.5], [1], loss)).toBeLessThan(1e-5)
        expect(maxRelativeError(net, [-0.2, 0.9, 0.1], [0], loss)).toBeLessThan(1e-5)
      })

  it('funciona com várias saídas', () => {
    const net = createNetwork([2, 5, 3], { hidden: 'tanh', seed: 9 })
    expect(maxRelativeError(net, [0.4, -0.1], [0, 1, 0], 'mse')).toBeLessThan(1e-5)
  })
})

describe('treinamento', () => {
  it('o exemplo do XOR aprende a tabela-verdade', () => {
    const net = xorExampleNetwork()
    const rng = createRng(1)
    for (let e = 0; e < 1500; e++) trainEpoch(net, XOR_TABLE, { lr: XOR_EXAMPLE_LR, loss: 'mse', batchSize: 1, rng })
    expect(accuracy(net, XOR_TABLE)).toBe(1)
    expect(datasetLoss(net, XOR_TABLE, 'mse')).toBeLessThan(0.01)
  })

  it('a perda cai no conjunto do círculo', () => {
    const { train, test } = splitDataset(makeDataset('circle', 200, 0.05), 0.3)
    const net = createNetwork([2, 4, 1], { hidden: 'tanh', seed: 3 })
    const before = datasetLoss(net, train, 'bce')
    const rng = createRng(2)
    for (let e = 0; e < 300; e++) trainEpoch(net, train, { lr: 0.1, loss: 'bce', batchSize: 10, rng })
    expect(datasetLoss(net, train, 'bce')).toBeLessThan(before / 3)
    expect(accuracy(net, test)).toBeGreaterThan(0.9)
  })
})

describe('utilidades', () => {
  it('conta parâmetros', () => {
    expect(parameterCount([2, 2, 1])).toBe(9)
    expect(parameterCount([29, 32, 16, 4])).toBe(1556)
  })

  it('gera conjuntos determinísticos e balanceados', () => {
    const a = makeDataset('spiral', 100, 0.02, 4)
    const b = makeDataset('spiral', 100, 0.02, 4)
    expect(a).toEqual(b)
    expect(a.Y.filter((y) => y[0] === 1)).toHaveLength(50)
    const s = splitDataset(a, 0.3)
    expect(s.train.X).toHaveLength(70)
    expect(s.test.X).toHaveLength(30)
  })
})
