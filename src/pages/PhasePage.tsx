import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Blocks } from '../components/Blocks'
import { ChallengeView } from '../components/ChallengeView'
import { challengeXp, isLevelCleared, progress, useProgress } from '../core/progress'
import { useModule } from '../core/moduleContext'
import { LEVEL_INFO, LEVELS, type Level } from '../core/types'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { NotFound } from './NotFound'
import { QuestHud } from './QuestHud'

export function PhasePage() {
  const { phaseId } = useParams()
  const { meta, quest } = useModule()
  const p = useProgress()
  const index = quest.phases.findIndex((ph) => ph.id === phaseId)
  const phase = quest.phases[index]
  useDocumentTitle(phase ? `${phase.title} · Jogo ${meta.shortName}` : undefined)
  const level: Level = p.level ?? 'easy'
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number>(0)
  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  if (!phase) return <NotFound />
  const content = phase.levels[level]
  const deeper = LEVELS[LEVELS.indexOf(level) + 1]
  const done = p.algorithms[meta.id]?.quest[phase.id]?.[level] ?? {}
  const cleared = isLevelCleared(quest, p.algorithms[meta.id], phase.id, level)
  const prev = quest.phases[index - 1]
  const next = quest.phases[index + 1]

  const showToast = (msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }

  return (
    <div className="quest phase">
      <QuestHud level={level} backToMap />
      <header className="phase-head">
        <p className="eyebrow pixel">
          {phase.boss ? 'Fase final' : `Fase ${index + 1} de ${quest.phases.length}`} · {LEVEL_INFO[level].label}
        </p>
        <h1>{phase.title}</h1>
        <p className="lede">{phase.tagline}</p>
      </header>

      <div className="phase-explain" key={`explain-${level}`}>
        <Blocks blocks={content.blocks} level={level} />
        {deeper && <Deeper level={deeper} phaseId={phase.id} />}
      </div>

      <section className="phase-challenges" aria-labelledby="desafios">
        <h2 id="desafios" className="pixel-title">
          Desafios
        </h2>
        {content.challenges.map((c) => (
          <ChallengeView
            key={`${level}-${c.id}`}
            challenge={c}
            level={level}
            solved={!!done[c.id]}
            xp={challengeXp(level, c.kind, 1)}
            onSolved={(attempts) => {
              if (done[c.id]) return
              const xp = challengeXp(level, c.kind, attempts)
              progress.completeChallenge(meta.id, phase.id, level, c.id, xp)
              showToast(`+${xp} XP`)
            }}
          />
        ))}
        {cleared && (
          <div className="cleared-banner" role="status">
            <strong>Fase concluída no nível {LEVEL_INFO[level].label}.</strong>
            {deeper
              ? ` Quer repetir no ${LEVEL_INFO[deeper].label}? Os desafios mudam e valem mais XP.`
              : ' Você fechou o nível mais alto.'}
          </div>
        )}
      </section>

      <nav className="phase-nav" aria-label="Fases">
        {prev ? (
          <Link to={`../${prev.id}`} relative="path" className="btn btn-quiet">
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link to={`../${next.id}`} relative="path" className="btn btn-game">
            {next.title} →
          </Link>
        ) : (
          <Link to={`/${meta.id}/jogo`} className="btn btn-game">
            Voltar ao mapa
          </Link>
        )}
      </nav>

      {toast && (
        <div className="toast pixel" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}

function Deeper({ level, phaseId }: { level: Level; phaseId: string }) {
  const { quest } = useModule()
  const [open, setOpen] = useState(false)
  const phase = quest.phases.find((p) => p.id === phaseId)!
  return (
    <div className="deeper">
      <button type="button" className="btn btn-quiet" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? 'Fechar' : `Aprofundar: ver a explicação do nível ${LEVEL_INFO[level].label}`}
      </button>
      {open && (
        <div className={`deeper-body lvl-${level}`}>
          <p className="deeper-note">
            Prévia do nível {LEVEL_INFO[level].label}. Os desafios dele aparecem quando você troca de nível.
            <button type="button" className="link-btn" onClick={() => progress.setLevel(level)}>
              Trocar para {LEVEL_INFO[level].label}
            </button>
          </p>
          <Blocks blocks={phase.levels[level].blocks} level={level} />
        </div>
      )}
    </div>
  )
}
