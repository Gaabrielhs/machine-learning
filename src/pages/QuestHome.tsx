import { Link } from 'react-router-dom'
import { DifficultySwitch } from '../components/DifficultySwitch'
import { Markdown } from '../components/Markdown'
import { isLevelCleared, progress, useProgress } from '../core/progress'
import { useModule } from '../core/moduleContext'
import { LEVEL_INFO, LEVELS, type Level } from '../core/types'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { QuestHud } from './QuestHud'

export function QuestHome() {
  const { meta, quest } = useModule()
  useDocumentTitle(`Jogo · ${meta.shortName}`)
  const p = useProgress()
  if (!p.level) return <LevelPicker />
  const level = p.level
  const ap = p.algorithms[meta.id]
  const nextPhase = quest.phases.find((ph) => !isLevelCleared(quest, ap, ph.id, level)) ?? quest.phases[0]

  return (
    <div className="quest">
      <QuestHud level={level} />
      <div className="quest-intro">
        <h1>Mapa da trilha</h1>
        <Markdown md={quest.intro} />
        <Link className="btn btn-game btn-big" to={nextPhase.id}>
          {Object.keys(ap?.quest ?? {}).length ? 'Continuar' : 'Começar'}: {nextPhase.title}
        </Link>
      </div>
      <ol className="trail">
        {quest.phases.map((ph, i) => {
          const cleared = LEVELS.map((l) => isLevelCleared(quest, ap, ph.id, l))
          const here = ph.id === nextPhase.id
          return (
            <li
              key={ph.id}
              className={`trail-stop${ph.boss ? ' boss' : ''}${here ? ' here' : ''}${cleared[LEVELS.indexOf(level)] ? ' cleared' : ''}`}
            >
              <Link to={ph.id} className="trail-link">
                <span className="trail-node" aria-hidden="true">
                  {ph.boss ? '★' : i + 1}
                </span>
                <span className="trail-text">
                  <strong>{ph.title}</strong>
                  <span>{ph.tagline}</span>
                </span>
                <span className="trail-badges" aria-label="Níveis concluídos">
                  {LEVELS.map((l, k) => (
                    <span
                      key={l}
                      className={`badge lvl-${l}${cleared[k] ? ' on' : ''}`}
                      title={`${LEVEL_INFO[l].label}: ${cleared[k] ? 'concluído' : 'pendente'}`}
                    >
                      {LEVEL_INFO[l].label[0]}
                    </span>
                  ))}
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
      <ResetProgress />
    </div>
  )
}

function LevelPicker() {
  const { meta } = useModule()
  const choose = (l: Level) => progress.setLevel(l)
  return (
    <div className="picker">
      <p className="eyebrow pixel">Novo jogo</p>
      <h1>Escolha a dificuldade</h1>
      <p className="lede">
        O conteúdo de {meta.shortName} é o mesmo nos três níveis; muda a profundidade. Você pode trocar a qualquer
        momento, inclusive no meio de uma fase.
      </p>
      <div className="picker-cards">
        {LEVELS.map((l, i) => (
          <button key={l} type="button" className={`picker-card lvl-${l}`} onClick={() => choose(l)}>
            <span className="pips" aria-hidden="true">
              {LEVELS.map((x, k) => (
                <i key={x} className={k <= i ? 'on' : ''} />
              ))}
            </span>
            <span className="picker-label">{LEVEL_INFO[l].label}</span>
            <span className="picker-persona">{LEVEL_INFO[l].persona}</span>
            <span className="picker-blurb">{LEVEL_INFO[l].blurb}</span>
            <span className="picker-xp">{LEVEL_INFO[l].xp} XP por desafio</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function ResetProgress() {
  const { meta } = useModule()
  const p = useProgress()
  return (
    <details className="reset">
      <summary>Opções</summary>
      <div className="reset-body">
        <div>
          <span>Nível atual</span>
          <DifficultySwitch value={p.level ?? 'easy'} onChange={(l) => progress.setLevel(l)} />
        </div>
        <ConfirmReset onConfirm={() => progress.resetAlgorithm(meta.id)} />
      </div>
    </details>
  )
}

function ConfirmReset({ onConfirm }: { onConfirm: () => void }) {
  return (
    <details className="confirm">
      <summary className="btn btn-quiet">Apagar meu progresso neste jogo</summary>
      <p>Isso zera XP e fases concluídas deste algoritmo, só neste navegador.</p>
      <button type="button" className="btn btn-danger" onClick={onConfirm}>
        Sim, apagar
      </button>
    </details>
  )
}
