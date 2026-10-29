/** Formato de data.json, gerado por trabalho-sarimax-datacenter/gerar_dados_apresentacao.py. */
export type Role = 'id' | 'time' | 'group' | 'exog' | 'target' | 'leak' | 'effect' | 'unused' | 'covered' | 'meta'

export interface Errors {
  mae: number
  rmse: number
  mape: number
}

export interface Center {
  id: string
  architecture: string
  climate: string
  utc_offset: number
  servers: number
  idle_kw: number
  max_kw: number
  setpoint_c: number
  rows: number
}

export interface DataCenterData {
  /** true quando os números vêm de dados de teste: a página mostra um aviso */
  source: { file: string; placeholder: boolean }
  dc: string
  target: string
  config: {
    freq: string
    period: number
    test_hours: number
    fast: boolean
    mask_flagged: boolean
    rolling_windows: number
  }
  dataset: {
    rows: number
    columns: number
    per_dc: Record<string, number>
    start: string
    end: string
    step_min: number
    origins: string[]
    workloads: Record<string, number>
  }
  columns: { name: string; desc: string; role: Role; kind: 'cat' | 'num' }[]
  quality: {
    rows: number
    step_min: number
    duplicates: number
    gaps: number
    nan_cells: number
    nan_by_col: Record<string, number>
    flags: Record<string, number>
    hours: number
    dc: string
  }
  centers: Center[]
  /** série horária do data center escolhido; `start` é UTC, sem fuso, de hora em hora */
  series: { start: string; step_h: number; target: number[] } & Record<string, number[] | string | number>
  profile: { hour_mean: number[]; hour_std: number[]; weekday_mean: number[]; ambient_hour_mean: number[] }
  corr: { name: string; r: number }[]
  stl: { trend: number[]; seasonal: number[]; resid: number[]; strength_seasonal: number; strength_trend: number }
  stationarity: { label: string; adf_p: number; kpss_p: number; adf_ok: boolean; kpss_ok: boolean }[]
  acf: { lags: number; acf: number[]; pacf: number[]; ci: number }
  split: {
    train_h: number
    test_h: number
    train_start: string
    train_end: string
    test_start: string
    test_end: string
    exog: string[]
    exog_dropped: string[]
    exog_mean: Record<string, number>
    exog_std: Record<string, number>
    train_mean: number
    train_std: number
    test_mean: number
    test_std: number
  }
  grid: {
    rows: { order: number[]; seasonal: number[]; aic: number; bic: number; seconds: number }[]
    best: { order: number[]; seasonal: number[]; aic: number; bic: number }
  }
  model: {
    order: number[]
    seasonal: number[]
    aic: number
    bic: number
    sigma2: number
    coef: {
      name: string
      coef_std: number
      std_err: number
      p: number
      low: number
      high: number
      sd: number
      per_unit: number
    }[]
    dynamics: { name: string; coef: number; p: number }[]
  }
  diagnostics: {
    ljung: { lag: number; stat: number; p: number }[]
    resid_acf: number[]
    ci: number
    resid_mean: number
    resid_std: number
    hist: { bins: number[]; counts: number[] }
  }
  forecast: {
    start: string
    hours: number
    real: number[]
    pred: number[]
    lo: number[]
    hi: number[]
    sarima: number[]
    naive: number[]
    profile: number[]
  }
  metrics: {
    sarimax: Errors
    sarima: Errors
    naive: Errors
    profile: Errors
    within_ci: number
    within_5pct: number
    bias: number
  }
  cooling: {
    per_dc: {
      id: string
      pue_mean: number
      pue_std: number
      overhead: number
      cooling_mean: number
      it_mean: number
      temp_mean: number
      temp_p5: number
      temp_p95: number
      r2_load: number
      r2_load_temp: number
      kw_per_c: number
    }[]
    by_temp: {
      edges: string[]
      load_range: number[]
      min_n: number
      cooling: Record<string, (number | null)[]>
      n: Record<string, number[]>
    }
    overhead_by_hour: Record<string, number[]>
  }
  err_by_hour: { sarimax: number[]; profile: number[] }
  ablation: ({ label: string; exog: string[] } & Errors)[]
  rolling: { start: string; end: string; train_h: number; sarimax: Errors; profile: Errors }[]
  centers_results: {
    id: string
    mean_kw: number
    mae: number
    rmse: number
    mape: number
    profile_mae: number
    per_unit: Record<string, number>
    hours: number
  }[]
}
