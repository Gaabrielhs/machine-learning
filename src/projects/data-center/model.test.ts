import { describe, expect, it } from 'vitest'
import raw from './model.json'
import { scenario, shiftOf, type ExportedModel } from './model'

const model = raw as unknown as ExportedModel

describe('modelo exportado', () => {
  it('reproduz as previsões de cenário refeitas pelo statsmodels', () => {
    expect(model.parity.length).toBeGreaterThanOrEqual(3)
    for (const c of model.parity) {
      const s = scenario(model, c.delta)
      c.first.forEach((v, i) => expect(s.pred[i]).toBeCloseTo(v, 2))
      expect(s.kwh).toBeCloseTo(c.sum, 0)
    }
  })

  it('sem mudança nenhuma, o cenário é a própria previsão-base', () => {
    const s = scenario(model, {})
    expect(s.shift).toBe(0)
    expect(s.deltaKwh).toBeCloseTo(0, 6)
    expect(s.pred).toEqual(model.base.pred)
  })

  it('o deslocamento é a soma de coeficiente × mudança', () => {
    const e = model.exog[0]
    expect(shiftOf(model, { [e.name]: 2 })).toBeCloseTo(2 * e.per_unit, 9)
  })

  it('tem uma previsão por hora de teste, com intervalo ao redor', () => {
    const { pred, lo, hi, real } = model.base
    expect(pred).toHaveLength(model.hours)
    expect(real).toHaveLength(model.hours)
    pred.forEach((v, i) => {
      expect(lo[i]).toBeLessThan(v)
      expect(hi[i]).toBeGreaterThan(v)
    })
  })
})
