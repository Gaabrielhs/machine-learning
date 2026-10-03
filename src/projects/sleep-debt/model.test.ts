import { describe, expect, it } from 'vitest'
import raw from './model.json'
import { createPredictor, encode, type ExportedModel } from './model'

const model = raw as unknown as ExportedModel
const predict = createPredictor(model)

describe('MLP exportada', () => {
  it('reproduz as probabilidades do scikit-learn (predict_proba) nos casos de teste', () => {
    expect(model.parity.length).toBeGreaterThanOrEqual(40)
    for (const c of model.parity) {
      const { probabilities } = predict(c.input)
      probabilities.forEach((p, k) => expect(p).toBeCloseTo(c.proba[k], 8))
    }
  })

  it('gera 29 entradas, com exatamente um 1 em cada grupo one-hot', () => {
    const v = encode(model, model.examples[0].input)
    expect(v).toHaveLength(29)
    expect(v.slice(12).reduce((a, b) => a + b, 0)).toBe(model.categorical.length)
  })

  it('acerta os exemplos marcados como acerto', () => {
    const hits = model.examples.slice(0, 8)
    for (const e of hits) expect(predict(e.input).predicted).toBe(e.true)
  })
})
