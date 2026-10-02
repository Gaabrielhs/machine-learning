import { useSyncExternalStore } from 'react'
import { LEVEL_INFO, LEVELS, type Level, type Quest } from './types'

/**
 * Progresso do visitante, salvo só no navegador dele (localStorage).
 * O formato é versionado: ao mudar a estrutura, incremente VERSION e
 * escreva a migração em `migrate`.
 */
const KEY = 'trilha-ml:progress'
const VERSION = 1

export interface ChallengeRecord {
  xp: number
  at: number
}

export interface AlgorithmProgress {
  lesson: Record<string, true>
  /** quest[phaseId][level][challengeId] */
  quest: Record<string, Partial<Record<Level, Record<string, ChallengeRecord>>>>
}

export interface ProgressState {
  version: number
  /** nível escolhido no jogo; null até a primeira escolha */
  level: Level | null
  algorithms: Record<string, AlgorithmProgress>
}

const empty = (): ProgressState => ({ version: VERSION, level: null, algorithms: {} })

function migrate(raw: unknown): ProgressState {
  if (!raw || typeof raw !== 'object') return empty()
  const r = raw as Partial<ProgressState>
  if (r.version !== VERSION) return empty()
  return {
    version: VERSION,
    level: r.level && LEVELS.includes(r.level) ? r.level : null,
    algorithms: r.algorithms && typeof r.algorithms === 'object' ? r.algorithms : {},
  }
}

function load(): ProgressState {
  try {
    const s = globalThis.localStorage?.getItem(KEY)
    return s ? migrate(JSON.parse(s)) : empty()
  } catch {
    return empty()
  }
}

let state: ProgressState = load()
const listeners = new Set<() => void>()

function commit(next: ProgressState) {
  state = next
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(state))
  } catch {
    /* modo privado ou armazenamento bloqueado: segue só em memória */
  }
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useProgress(): ProgressState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  )
}

function algo(s: ProgressState, id: string): AlgorithmProgress {
  return s.algorithms[id] ?? { lesson: {}, quest: {} }
}

export const progress = {
  setLevel(level: Level) {
    commit({ ...state, level })
  },
  markSection(algorithmId: string, sectionId: string, done: boolean) {
    const a = algo(state, algorithmId)
    const lesson = { ...a.lesson }
    if (done) lesson[sectionId] = true
    else delete lesson[sectionId]
    commit({ ...state, algorithms: { ...state.algorithms, [algorithmId]: { ...a, lesson } } })
  },
  /** Registra um desafio vencido. Não sobrescreve um registro anterior. */
  completeChallenge(algorithmId: string, phaseId: string, level: Level, challengeId: string, xp: number) {
    const a = algo(state, algorithmId)
    const phase = a.quest[phaseId] ?? {}
    const lv = phase[level] ?? {}
    if (lv[challengeId]) return
    const next: AlgorithmProgress = {
      ...a,
      quest: { ...a.quest, [phaseId]: { ...phase, [level]: { ...lv, [challengeId]: { xp, at: Date.now() } } } },
    }
    commit({ ...state, algorithms: { ...state.algorithms, [algorithmId]: next } })
  },
  resetAlgorithm(algorithmId: string) {
    const algorithms = { ...state.algorithms }
    delete algorithms[algorithmId]
    commit({ ...state, algorithms })
  },
  /** só para testes */
  resetAll() {
    commit(empty())
  },
}

/* ------------------------------------------------------------------ */
/* Pontuação                                                           */
/* ------------------------------------------------------------------ */

export const MISSION_MULTIPLIER = 2

export function challengeXp(level: Level, kind: 'choice' | 'number' | 'mission', attempts: number): number {
  const base = LEVEL_INFO[level].xp * (kind === 'mission' ? MISSION_MULTIPLIER : 1)
  return attempts <= 1 ? base : Math.round(base / 2)
}

export function totalXp(p: AlgorithmProgress | undefined): number {
  if (!p) return 0
  let xp = 0
  for (const phase of Object.values(p.quest))
    for (const lv of Object.values(phase)) for (const rec of Object.values(lv ?? {})) xp += rec.xp
  return xp
}

export function maxXp(quest: Quest): number {
  let xp = 0
  for (const p of quest.phases)
    for (const level of LEVELS) for (const c of p.levels[level].challenges) xp += challengeXp(level, c.kind, 1)
  return xp
}

export function isLevelCleared(quest: Quest, p: AlgorithmProgress | undefined, phaseId: string, level: Level) {
  const phase = quest.phases.find((x) => x.id === phaseId)
  if (!phase) return false
  const done = p?.quest[phaseId]?.[level] ?? {}
  return phase.levels[level].challenges.every((c) => done[c.id])
}

export const RANKS = [
  { min: 0, title: 'Neurônio recém-criado' },
  { min: 60, title: 'Perceptron curioso' },
  { min: 200, title: 'Camada oculta' },
  { min: 450, title: 'Rede profunda' },
  { min: 800, title: 'Mestre do gradiente' },
] as const

export function rankFor(xp: number) {
  let current: (typeof RANKS)[number] = RANKS[0]
  for (const r of RANKS) if (xp >= r.min) current = r
  const next = RANKS.find((r) => r.min > xp)
  return { current, next }
}
