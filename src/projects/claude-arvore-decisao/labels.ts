/** Nomes em português das colunas, categorias e entradas one-hot, e formatação de horas. */
import { num } from '../sleep-debt/format'

export const SHORT: Record<string, string> = {
  age: 'idade',
  gender: 'gênero',
  occupation_type: 'ocupação',
  chronotype: 'cronotipo',
  bedtime_phone_minutes: 'celular antes de dormir (min)',
  primary_bedtime_app: 'app mais usado',
  screen_brightness_pct: 'brilho da tela (%)',
  blue_light_filter_active: 'filtro de luz azul',
  caffeine_post_5pm_mg: 'cafeína após 17h (mg)',
  physical_activity_min: 'atividade física (min)',
  sleep_latency_min: 'tempo para dormir (min)',
  total_sleep_hours: 'horas de sono',
  deep_sleep_pct: 'sono profundo (%)',
  rem_sleep_pct: 'sono REM (%)',
  morning_alarm_snoozes: 'despertador adiado',
  next_day_fatigue_score: 'cansaço no dia seguinte',
  sleep_debt_category: 'categoria de dívida de sono',
  user_id: 'user_id',
}

/** Tradução dos valores categóricos do dataset (o modelo continua recebendo o valor original). */
export const LEVEL_PT: Record<string, string> = {
  Female: 'Feminino',
  Male: 'Masculino',
  'Non-Binary': 'Não binário',
  'Corporate 9-to-5': 'Corporativo (horário comercial)',
  'Freelance / Creative': 'Freelancer / criativo',
  'Healthcare / Shift Worker': 'Saúde / turnos',
  'Remote Tech': 'Tecnologia remota',
  Student: 'Estudante',
  Intermediate: 'Intermediário',
  'Morning Lark': 'Matutino',
  'Night Owl': 'Noturno',
  'Messaging / Chat': 'Mensagens / chat',
  'News / Reading': 'Notícias / leitura',
}

/** Nomes ainda mais curtos, para caber nas caixas do diagrama da árvore. */
const COMPACT: Record<string, string> = {
  bedtime_phone_minutes: 'celular (min)',
  screen_brightness_pct: 'brilho (%)',
  caffeine_post_5pm_mg: 'cafeína (mg)',
  physical_activity_min: 'atividade (min)',
}

const CATEGORICAL = ['gender', 'occupation_type', 'chronotype', 'primary_bedtime_app']

/** Separa uma entrada one-hot ("chronotype_Night Owl") em coluna e categoria. */
export function splitFeature(f: string): { column: string; level?: string } {
  const column = CATEGORICAL.find((c) => f.startsWith(`${c}_`))
  return column ? { column, level: f.slice(column.length + 1) } : { column: f }
}

/** "chronotype_Night Owl" → "cronotipo: Noturno"; numéricas usam o nome curto. */
export function featureLabel(f: string): string {
  const { column, level } = splitFeature(f)
  return level ? `${SHORT[column]}: ${LEVEL_PT[level] ?? level}` : (SHORT[column] ?? column)
}

/**
 * A pergunta de um nó, escrita para quem lê: one-hot vira "é noturno?" em vez de "≤ 0,5".
 * `left`/`right` = a resposta que leva a cada filho (no scikit-learn, esquerda é x ≤ limiar).
 */
export function question(f: string, threshold: number): { text: string; left: string; right: string } {
  const { column, level } = splitFeature(f)
  if (level) return { text: `${SHORT[column]} é ${LEVEL_PT[level] ?? level}?`, left: 'não', right: 'sim' }
  if (column === 'blue_light_filter_active') return { text: 'filtro de luz azul ligado?', left: 'não', right: 'sim' }
  return {
    text: `${COMPACT[column] ?? SHORT[column]} ≤ ${num(threshold, 1).replace(',0', '')}?`,
    left: 'sim',
    right: 'não',
  }
}

export const hours = (v: number, d = 2) => `${num(v, d)} h`

/** 6,27 h → "6 h 16 min" */
export function hm(v: number): string {
  const total = Math.round(v * 60)
  const h = Math.floor(total / 60)
  const m = total % 60
  return m ? `${h} h ${String(m).padStart(2, '0')} min` : `${h} h`
}

export const minutes = (v: number) => `${Math.round(v * 60)} min`

/** Cor de um nó pela previsão: menos horas = mais escuro. Fixa nos dois temas, sempre com texto branco legível. */
export function hourShade(v: number) {
  const s = Math.max(0, Math.min(1, (v - 4) / 4.5))
  return `color-mix(in srgb, #0d366b ${Math.round((1 - s) * 100)}%, #2f7fdc)`
}
