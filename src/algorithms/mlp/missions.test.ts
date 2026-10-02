import { describe, expect, it } from 'vitest'
import { makeDataset, splitDataset, type DatasetName } from './engine/datasets'
import { accuracy, createNetwork, trainEpoch } from './engine/network'
import { createRng } from './engine/rng'
import type { ActivationName } from './engine/activations'

/** Garante que as missões do desafio final têm solução com os controles do laboratório. */
function bestTestAccuracy(name: DatasetName, layers: number[], act: ActivationName, lr: number, epochs: number) {
  const { train, test } = splitDataset(makeDataset(name, 300, 0.05), 0.3)
  const net = createNetwork([2, ...layers, 1], { hidden: act, seed: 3 })
  const rng = createRng(3)
  let best = 0
  for (let e = 0; e < epochs; e++) {
    trainEpoch(net, train, { lr, loss: 'bce', batchSize: 10, rng })
    if (e % 25 === 0) best = Math.max(best, accuracy(net, test))
  }
  return best
}

describe('missões do desafio final são possíveis', () => {
  it('fácil: quadrantes ≥ 95% com a configuração inicial', () => {
    expect(bestTestAccuracy('xor', [4], 'tanh', 0.1, 600)).toBeGreaterThanOrEqual(0.95)
  })
  it('médio: círculo ≥ 95% com 3 neurônios', () => {
    expect(bestTestAccuracy('circle', [3], 'tanh', 0.1, 600)).toBeGreaterThanOrEqual(0.95)
  })
  it('difícil: espiral ≥ 90% com duas camadas', () => {
    expect(bestTestAccuracy('spiral', [12, 12], 'tanh', 0.1, 2000)).toBeGreaterThanOrEqual(0.9)
  })
})
