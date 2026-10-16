import { describe, expect, it } from 'vitest'
import raw from './model.json'
import { encode, predict, type ExportedTree } from './model'

const model = raw as unknown as ExportedTree

describe('árvore exportada', () => {
  it('reproduz as previsões do scikit-learn (predict) nos casos de teste', () => {
    expect(model.parity.length).toBeGreaterThanOrEqual(40)
    for (const c of model.parity) expect(predict(model, c.input).hours).toBeCloseTo(c.pred, 3)
  })

  it('gera 23 entradas, com exatamente um 1 em cada grupo one-hot', () => {
    const v = encode(model, model.examples[0].input)
    expect(v).toHaveLength(model.features.length)
    expect(v.slice(model.numeric.length).reduce((a, b) => a + b, 0)).toBe(model.categorical.length)
  })

  it('o caminho até a folha tem no máximo a profundidade da árvore e termina numa folha', () => {
    const p = predict(model, model.examples[2].input)
    expect(p.path.length).toBeGreaterThan(0)
    expect(p.path.length).toBeLessThanOrEqual(6)
    expect(model.tree.left[p.leaf]).toBe(-1)
  })
})
