import { describe, expect, it } from 'vitest'
import raw from './model.json'
import { createTreePredictor, encodeTreeInput, type ExportedTreeModel } from './treeModel'

const model = raw as unknown as ExportedTreeModel
const predict = createTreePredictor(model)

describe('Árvore de Decisão exportada (Gemini)', () => {
  it('reproduz exatamente as previsões do modelo Python nos 40 casos de teste', () => {
    expect(model.parity.length).toBeGreaterThanOrEqual(40)
    for (const c of model.parity) {
      const { predicted, path } = predict(c.input)
      expect(predicted).toBeCloseTo(c.pred, 5)
      expect(path.length).toBeGreaterThan(0)
      expect(path.length).toBeLessThanOrEqual(6)
    }
  })

  it('gera 28 entradas (11 numéricas + 17 one-hot), com exatamente um 1 em cada grupo categórico', () => {
    const v = encodeTreeInput(model, model.examples[0].input)
    expect(v).toHaveLength(28)
    expect(v.slice(11).reduce((a, b) => a + b, 0)).toBe(model.categorical.length)
  })
})
