/** Formato de data.json, gerado por trabalho-arvore-sono/gerar_dados_apresentacao.py. */
export type Role = 'id' | 'leak' | 'night' | 'morning' | 'target' | 'input'

export interface Metrics {
  r2: number
  mae: number
  rmse: number
}

export interface TreeData {
  shape: [number, number]
  columns: {
    name: string
    desc: string
    role: Role
    kind: 'cat' | 'num'
    levels?: Record<string, number>
    min?: number
    max?: number
    mean?: number
  }[]
  target: { mean: number; std: number; min: number; max: number; median: number; bins: number[]; counts: number[] }
  corr: { name: string; r: number }[]
  cat_means: { name: string; levels: { level: string; mean: number; n: number }[] }[]
  split: { train: number; test: number; train_mean: number; train_std: number; test_mean: number; test_std: number }
  numeric: string[]
  onehot: { name: string; levels: string[] }[]
  features: string[]
  scale_check: { max_diff: number; phone_mean: number; phone_std: number }
  grid: {
    /** profundidades testadas; "none" = sem limite */
    depths: string[]
    leaves: number[]
    /** R² médio na validação: linhas = profundidade, colunas = mínimo por folha */
    test: number[][]
    best: { max_depth: number | null; min_samples_leaf: number; score: number }
    curves: Record<string, { train: number[]; val: number[]; val_std: number[] }>
  }
  tree_stats: { depth: number; leaves: number; nodes: number }
  first_split: {
    feature: string
    threshold: number
    root: { n: number; mean: number; var: number }
    left: { n: number; mean: number; var: number }
    right: { n: number; mean: number; var: number }
    gain: number
  }
  metrics: {
    train: Metrics
    test: Metrics
    baseline: Metrics
    within_30: number
    within_60: number
    distinct_predictions: number
  }
  scatter: { real: number[]; pred: number[] }
  residuals: { bins: number[]; counts: number[] }
  importance: { name: string; value: number }[]
  scenarios: ({
    label: string
    n_inputs: number
    best: { max_depth: number | null; min_samples_leaf: number }
  } & Metrics)[]
}
