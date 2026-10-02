import type { ComponentType, LazyExoticComponent } from 'react'

/* ------------------------------------------------------------------ */
/* Níveis de dificuldade                                               */
/* ------------------------------------------------------------------ */

export type Level = 'easy' | 'medium' | 'hard'

export const LEVELS: readonly Level[] = ['easy', 'medium', 'hard']

export const LEVEL_INFO: Record<Level, { label: string; persona: string; blurb: string; xp: number }> = {
  easy: {
    label: 'Fácil',
    persona: 'Aprendiz',
    blurb: 'Intuição e analogias. Pouca matemática, muitos exemplos.',
    xp: 10,
  },
  medium: {
    label: 'Médio',
    persona: 'Engenheiro(a)',
    blurb: 'As fórmulas principais e contas pequenas feitas à mão.',
    xp: 20,
  },
  hard: {
    label: 'Difícil',
    persona: 'Pesquisador(a)',
    blurb: 'Derivações, notação matricial e detalhes de implementação.',
    xp: 30,
  },
}

/* ------------------------------------------------------------------ */
/* Blocos de conteúdo                                                  */
/* ------------------------------------------------------------------ */

/** Markdown com matemática: $inline$ e $$bloco$$ (KaTeX). */
export type Markdown = string

export type CalloutTone = 'tip' | 'warn' | 'example' | 'deep'

export type Block =
  | { type: 'md'; md: Markdown }
  | { type: 'callout'; tone: CalloutTone; title?: string; md: Markdown }
  | { type: 'reveal'; summary: string; md: Markdown }
  | { type: 'widget'; widget: string; props?: Record<string, unknown>; caption?: string }
  | { type: 'check'; challenge: Challenge }

/* ------------------------------------------------------------------ */
/* Desafios                                                            */
/* ------------------------------------------------------------------ */

export interface ChoiceOption {
  md: Markdown
  correct?: boolean
  feedback: Markdown
}

export type Challenge =
  | {
      id: string
      kind: 'choice'
      prompt: Markdown
      options: ChoiceOption[]
    }
  | {
      id: string
      kind: 'number'
      prompt: Markdown
      answer: number
      /** tolerância absoluta aceita */
      tolerance: number
      hint?: Markdown
      explanation: Markdown
    }
  | {
      id: string
      kind: 'mission'
      prompt: Markdown
      /** nome de um widget do módulo; ele chama onComplete quando a missão é cumprida */
      widget: string
      props?: Record<string, unknown>
    }

/* ------------------------------------------------------------------ */
/* Aula e jogo                                                         */
/* ------------------------------------------------------------------ */

export interface LessonSection {
  id: string
  title: string
  blocks: Block[]
}

export interface Lesson {
  /** frase de abertura da aula */
  intro: Markdown
  sections: LessonSection[]
}

export interface PhaseLevelContent {
  blocks: Block[]
  challenges: Challenge[]
}

export interface QuestPhase {
  id: string
  title: string
  tagline: string
  /** fase final: desafio prático */
  boss?: boolean
  levels: Record<Level, PhaseLevelContent>
}

export interface Quest {
  intro: Markdown
  phases: QuestPhase[]
}

/* ------------------------------------------------------------------ */
/* Módulo de algoritmo                                                 */
/* ------------------------------------------------------------------ */

export type AlgorithmFamily =
  | 'Redes neurais'
  | 'Modelos lineares'
  | 'Árvores e ensembles'
  | 'Agrupamento'
  | 'Redução de dimensionalidade'
  | 'Outros'

export interface AlgorithmMeta {
  /** usado na URL: /<id>/aula */
  id: string
  name: string
  shortName: string
  family: AlgorithmFamily
  task: 'Classificação' | 'Regressão' | 'Classificação e regressão' | 'Não supervisionado'
  summary: string
  /** exemplo central usado na aula */
  example: string
  prerequisites: string[]
}

/** Props que todo widget recebe. Widgets de missão chamam onComplete ao vencer. */
export interface WidgetProps {
  level?: Level
  onComplete?: () => void
}

// Cada widget declara suas próprias props; o registro aceita qualquer componente.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WidgetComponent = LazyExoticComponent<ComponentType<any>>

export interface AlgorithmModule {
  meta: AlgorithmMeta
  lesson: Lesson
  quest: Quest
  widgets: Record<string, WidgetComponent>
}

export interface AlgorithmEntry {
  meta: AlgorithmMeta
  load: () => Promise<AlgorithmModule>
}
