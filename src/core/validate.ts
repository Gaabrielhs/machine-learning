import { LEVELS, type AlgorithmModule, type Block, type Challenge } from './types'

/**
 * Confere a consistência de um módulo de algoritmo. Roda nos testes (CI)
 * para que conteúdo quebrado nunca chegue à produção.
 */
export function validateModule(mod: AlgorithmModule): string[] {
  const errors: string[] = []
  const where = (s: string) => `[${mod.meta.id}] ${s}`
  const widgetNames = new Set(Object.keys(mod.widgets))

  if (!/^[a-z0-9-]+$/.test(mod.meta.id)) errors.push(where('id deve usar só a-z, 0-9 e hífen'))

  const checkBlocks = (blocks: Block[], ctx: string) => {
    if (blocks.length === 0) errors.push(where(`${ctx}: sem conteúdo`))
    for (const b of blocks) {
      if (b.type === 'widget' && !widgetNames.has(b.widget))
        errors.push(where(`${ctx}: widget "${b.widget}" não registrado`))
      if ((b.type === 'md' || b.type === 'callout' || b.type === 'reveal') && !b.md.trim())
        errors.push(where(`${ctx}: bloco de texto vazio`))
      if (b.type === 'check') checkChallenge(b.challenge, ctx)
    }
  }

  const seenChallenge = new Set<string>()
  const checkChallenge = (c: Challenge, ctx: string) => {
    if (seenChallenge.has(c.id)) errors.push(where(`${ctx}: id de desafio repetido "${c.id}"`))
    seenChallenge.add(c.id)
    if (c.kind === 'choice') {
      const right = c.options.filter((o) => o.correct).length
      if (right !== 1) errors.push(where(`${ctx}/${c.id}: precisa de exatamente 1 opção correta (tem ${right})`))
      if (c.options.length < 2) errors.push(where(`${ctx}/${c.id}: precisa de 2+ opções`))
    }
    if (c.kind === 'number') {
      if (!Number.isFinite(c.answer)) errors.push(where(`${ctx}/${c.id}: resposta não é finita`))
      if (!(c.tolerance >= 0)) errors.push(where(`${ctx}/${c.id}: tolerância inválida`))
    }
    if (c.kind === 'mission' && !widgetNames.has(c.widget))
      errors.push(where(`${ctx}/${c.id}: widget de missão "${c.widget}" não registrado`))
  }

  const sectionIds = new Set<string>()
  for (const s of mod.lesson.sections) {
    if (sectionIds.has(s.id)) errors.push(where(`aula: seção repetida "${s.id}"`))
    sectionIds.add(s.id)
    checkBlocks(s.blocks, `aula/${s.id}`)
  }

  const phaseIds = new Set<string>()
  for (const p of mod.quest.phases) {
    if (phaseIds.has(p.id)) errors.push(where(`jogo: fase repetida "${p.id}"`))
    phaseIds.add(p.id)
    for (const level of LEVELS) {
      const content = p.levels[level]
      if (!content) {
        errors.push(where(`jogo/${p.id}: falta o nível ${level}`))
        continue
      }
      checkBlocks(content.blocks, `jogo/${p.id}/${level}`)
      if (content.challenges.length === 0) errors.push(where(`jogo/${p.id}/${level}: sem desafios`))
      content.challenges.forEach((c) => checkChallenge(c, `jogo/${p.id}/${level}`))
    }
  }
  return errors
}
