/** Formatação em pt-BR e cores das classes usadas nos gráficos. */
export const pct = (v: number, d = 1) => `${(v * 100).toFixed(d).replace('.', ',')}%`
export const num = (v: number, d = 2) => v.toFixed(d).replace('.', ',').replace('-', '−')
export const int = (v: number) => v.toLocaleString('pt-BR')

const CLASS_VARS = ['var(--sd-c1)', 'var(--sd-c2)', 'var(--sd-c3)', 'var(--sd-c4)']
export const classColor = (k: number) => CLASS_VARS[k]
