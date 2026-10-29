/** Nomes em português das colunas e categorias, e formatação de datas, potências e ordens do modelo. */
import { int, num } from '../sleep-debt/format'

export const SHORT: Record<string, string> = {
  ambient_temperature_c: 'temperatura ambiente (°C)',
  gpu_utilization_percent: 'utilização de GPU (%)',
  cpu_utilization_percent: 'utilização de CPU (%)',
  active_servers: 'servidores ativos',
  memory_usage_percent: 'uso de memória (%)',
  network_utilization_percent: 'utilização da rede (%)',
  inlet_temperature_c: 'temperatura de entrada (°C)',
  it_power_kw: 'potência dos servidores (kW)',
  cooling_power_kw: 'potência da refrigeração (kW)',
  total_facility_power_kw: 'potência total (kW)',
  pue: 'PUE',
  facility_energy_kwh: 'energia (kWh)',
}

/** Nomes curtos para rótulos de gráfico e tabela. */
export const TINY: Record<string, string> = {
  ambient_temperature_c: 'temperatura ambiente',
  gpu_utilization_percent: 'utilização de GPU',
  cpu_utilization_percent: 'utilização de CPU',
  active_servers: 'servidores ativos',
  it_power_kw: 'potência dos servidores (carga)',
}

export const ARCH_PT: Record<string, string> = {
  'air-cooled, chilled-water CRAH': 'ar, com água gelada (CRAH)',
  'direct-to-chip liquid cooling with air-side assist': 'líquido direto no chip, com apoio do ar',
  'hybrid air cooling with economizer (free cooling)': 'ar híbrido com economizador (free cooling)',
}

export const CLIMATE_PT: Record<string, string> = {
  'cool-temperate continental (synthetic ambient profile)': 'continental temperado frio',
  'mild maritime (synthetic ambient profile)': 'marítimo ameno',
  'warm arid, mild winters (synthetic ambient profile)': 'árido quente, invernos amenos',
}

export const WORKLOAD_PT: Record<string, string> = {
  inference: 'inferência',
  training: 'treinamento',
  mixed: 'mista',
  maintenance: 'manutenção',
}

export const FLAG_PT: Record<string, string> = { ok: 'ok', missing_sensor: 'sensor sem leitura' }

export const arch = (s: string) => ARCH_PT[s] ?? s
export const climate = (s: string) => CLIMATE_PT[s] ?? s

export const kw = (v: number, d = 1) => `${num(v, d)} kW`
export const kwh = (v: number) => `${int(Math.round(v))} kWh`
export const signed = (v: number, d = 1) => `${v < 0 ? '−' : '+'}${num(Math.abs(v), d)}`

/** "(1, 0, 1)(0, 1, 1, 24)" */
export const orderText = (o: number[], s: number[]) => `(${o.join(', ')})(${s.join(', ')})`

/** Como ler o p-valor sem prometer nada: pequeno é "baixo", senão o valor. */
export const pvalue = (p: number) => (p < 0.001 ? '< 0,001' : num(p, 3))

/* ------------------------------------------------------------------ */
/* Datas: as séries começam em `start` (UTC, sem fuso) e andam de hora em hora */
/* ------------------------------------------------------------------ */
const HOUR = 3600e3
const t0 = (start: string) => new Date(`${start}Z`).getTime()

export function dayMonth(start: string, i: number): string {
  return new Date(t0(start) + i * HOUR).toLocaleDateString('pt-BR', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
  })
}

export function dayMonthHour(start: string, i: number): string {
  const d = new Date(t0(start) + i * HOUR)
  const date = d.toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' })
  return `${date}, ${String(d.getUTCHours()).padStart(2, '0')}h UTC`
}

export function isoDate(iso: string): string {
  return new Date(`${iso}Z`).toLocaleDateString('pt-BR', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/** Marcas no eixo x: uma por meia-noite UTC, de `every` em `every` dias. */
export function dayTicks(start: string, n: number, every = 1): { index: number; label: string }[] {
  const first = new Date(t0(start))
  const offset = (24 - first.getUTCHours()) % 24
  const out: { index: number; label: string }[] = []
  for (let i = offset, k = 0; i < n; i += 24, k++)
    if (k % every === 0) out.push({ index: i, label: dayMonth(start, i) })
  return out
}

export const WEEKDAYS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']

export const hourLabel = (h: number) => `${String(h).padStart(2, '0')}h`

/** Unidade de uma variável externa, no singular, para frases como "+0,6 kW por ponto percentual". */
export const UNIT: Record<string, string> = {
  ambient_temperature_c: '°C',
  gpu_utilization_percent: 'ponto percentual de GPU',
  cpu_utilization_percent: 'ponto percentual de CPU',
  active_servers: 'servidor ativo',
  it_power_kw: 'kW de servidores',
}

/** Início (UTC, sem fuso) da hora `i` de uma série que começa em `start`. */
export function addHours(start: string, i: number): string {
  return new Date(t0(start) + i * HOUR).toISOString().slice(0, 19)
}
