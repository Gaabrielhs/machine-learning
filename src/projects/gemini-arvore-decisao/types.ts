/** Formato de data.json para a apresentação do Trabalho 2 (Regressão com Árvore de Decisão - Gemini). */
export interface TreeNodeSummary {
  leaf: boolean
  value: number
  n: number
  mse: number
  feature?: string
  threshold?: number
  left?: TreeNodeSummary
  right?: TreeNodeSummary
}

export interface GeminiTreeData {
  shape: [number, number]
  target: {
    name: string
    desc: string
    min: number
    max: number
    mean: number
    std: number
    train_mean: number
    baseline_rmse: number
    baseline_mae: number
  }
  columns: {
    name: string
    desc: string
    kind: 'id' | 'leakage' | 'target' | 'cat' | 'num'
    missing: number
    levels?: Record<string, number>
    min?: number
    max?: number
    mean?: number
    std?: number
  }[]
  bands: string[]
  band_counts: number[]
  sleep_hist: { bins: number[]; counts: number[] }
  solo: { name: string; r2: number; importance: number }[]
  split: {
    train: number
    test: number
    train_counts: number[]
    test_counts: number[]
    train_mean: number
    test_mean: number
  }
  scaler: { name: string; mean: number; std: number }[]
  onehot: { name: string; levels: string[] }[]
  features: string[]
  samples: {
    id: string
    raw: Record<string, string | number>
    vec_raw: number[]
    vec_z: number[]
  }[]
  model: {
    max_depth: number
    actual_depth: number
    min_samples_leaf: number
    n_nodes: number
    n_leaves: number
    invariance_r2_raw: number
    invariance_r2_zscore: number
    depths: number[]
    train_mse_curve: number[]
    val_mse_curve: number[]
    val_r2_curve: number[]
    leaves_curve: number[]
    top_tree: TreeNodeSummary
  }
  metrics: {
    train_r2: number
    test_r2: number
    train_mae: number
    test_mae: number
    train_rmse: number
    test_rmse: number
    per_band: { label: string; mae: number; rmse: number; bias: number; support: number }[]
    scatter: { true: number; pred: number; err: number }[]
    residuals: { bins: number[]; counts: number[] }
  }
  cv: { label: string; max_depth: number; min_leaf: number; mean: number; std: number }[]
  scenarios: {
    label: string
    dropped: string[]
    n_inputs: number
    r2: number
    mae: number
    rmse: number
  }[]
}
