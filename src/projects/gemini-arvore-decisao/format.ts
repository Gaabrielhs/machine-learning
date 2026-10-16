/** Formatação em pt-BR e cores das faixas de sono usadas nos gráficos. */
export const pct = (v: number, d = 1) => `${(v * 100).toFixed(d).replace('.', ',')}%`
export const num = (v: number, d = 2) => v.toFixed(d).replace('.', ',').replace('-', '−')
export const int = (v: number) => v.toLocaleString('pt-BR')

export function hoursToHm(h: number): string {
  const totalMin = Math.round(h * 60)
  const hrs = Math.floor(totalMin / 60)
  const mins = totalMin % 60
  return `${hrs}h ${String(mins).padStart(2, '0')}min`
}

const BAND_VARS = ['var(--sd-c4)', 'var(--sd-c3)', 'var(--sd-c2)', 'var(--sd-c1)']
export const bandColor = (k: number) => BAND_VARS[k] ?? 'var(--sd-c2)'

export function hoursToBandIndex(h: number): number {
  if (h < 5.0) return 0
  if (h < 6.5) return 1
  if (h < 7.5) return 2
  return 3
}
