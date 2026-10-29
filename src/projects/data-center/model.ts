/**
 * Formato de model.json e a conta da seção "Teste o modelo".
 *
 * As variáveis externas entram no SARIMAX como regressão linear: y = β·x + erro SARIMA. O erro só depende do
 * passado até o fim do treino, então mudar uma variável nos 7 dias de teste desloca a previsão em β × mudança,
 * hora a hora. O teste automático confere essa conta com previsões refeitas pelo statsmodels (`parity`).
 */
export interface ExogInfo {
  name: string
  label: string
  unit: string
  min: number
  max: number
  step: number
  /** kW a mais de refrigeração por unidade a mais da variável */
  per_unit: number
  /** valor médio da variável nos 7 dias de teste */
  test_mean: number
}

export type Delta = Record<string, number>

export interface ExportedModel {
  dc: string
  /** primeira hora de teste, UTC */
  start: string
  hours: number
  exog: ExogInfo[]
  base: { real: number[]; pred: number[]; lo: number[]; hi: number[] }
  parity: { delta: Delta; first: number[]; sum: number }[]
}

export interface Scenario {
  pred: number[]
  lo: number[]
  hi: number[]
  /** energia prevista nos 7 dias (kWh): soma das potências horárias, com cada hora = 1 h */
  kwh: number
  /** diferença de energia em relação ao cenário-base (kWh) */
  deltaKwh: number
  /** deslocamento constante da previsão (kW) */
  shift: number
}

export const shiftOf = (model: ExportedModel, delta: Delta) =>
  model.exog.reduce((acc, e) => acc + e.per_unit * (delta[e.name] ?? 0), 0)

export function scenario(model: ExportedModel, delta: Delta): Scenario {
  const shift = shiftOf(model, delta)
  const pred = model.base.pred.map((v) => v + shift)
  const base = model.base.pred.reduce((a, b) => a + b, 0)
  const kwh = pred.reduce((a, b) => a + b, 0)
  return {
    pred,
    lo: model.base.lo.map((v) => v + shift),
    hi: model.base.hi.map((v) => v + shift),
    kwh,
    deltaKwh: kwh - base,
    shift,
  }
}
