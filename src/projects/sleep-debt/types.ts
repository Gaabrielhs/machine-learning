/** Formato de data.json, gerado a partir do notebook do trabalho. */
export interface SleepDebtData {
  shape: [number, number]
  columns: {
    name: string
    desc: string
    kind: 'id' | 'target' | 'cat' | 'num'
    missing: number
    levels?: Record<string, number>
    min?: number
    max?: number
    mean?: number
    std?: number
  }[]
  classes: string[]
  class_counts: number[]
  sleep_hist: { bins: number[]; counts: number[][] }
  solo: { name: string; acc: number }[]
  baseline_majority: number
  split: { train: number; test: number; train_counts: number[]; test_counts: number[] }
  scaler: { name: string; mean: number; std: number }[]
  onehot: { name: string; levels: string[] }[]
  features: string[]
  samples: { id: string; raw: Record<string, string | number>; vec: number[] }[]
  model: {
    layers: number[]
    params: number
    n_iter: number
    loss_curve: number[]
    val_scores: number[]
    best_val: number
  }
  metrics: {
    train_acc: number
    test_acc: number
    f1_macro: number
    per_class: { precision: number; recall: number; f1: number; support: number }[]
    confusion: number[][]
  }
  cv: { layers: number[]; mean: number; std: number }[]
  scenarios: { label: string; dropped: string[]; n_inputs: number; acc: number; f1: number }[]
}
