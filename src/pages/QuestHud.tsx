import { Link } from 'react-router-dom'
import { DifficultySwitch } from '../components/DifficultySwitch'
import { maxXp, progress, rankFor, totalXp, useProgress } from '../core/progress'
import { useModule } from '../core/moduleContext'
import type { Level } from '../core/types'

export function QuestHud({ level, backToMap }: { level: Level; backToMap?: boolean }) {
  const { meta, quest } = useModule()
  const p = useProgress()
  const xp = totalXp(p.algorithms[meta.id])
  const { current, next } = rankFor(xp)
  const lo = current.min
  const hi = next?.min ?? maxXp(quest)
  const pct = Math.min(100, ((xp - lo) / Math.max(1, hi - lo)) * 100)
  return (
    <div className="hud">
      <div className="hud-left">
        {backToMap && (
          <Link to={`/${meta.id}/jogo`} className="hud-back">
            ← Mapa
          </Link>
        )}
        <div className="hud-rank">
          <span className="hud-xp">{xp} XP</span>
          <span className="hud-title">{current.title}</span>
          <span
            className="hud-bar"
            role="progressbar"
            aria-valuemin={lo}
            aria-valuemax={hi}
            aria-valuenow={xp}
            aria-label={next ? `Faltam ${next.min - xp} XP para ${next.title}` : 'Nível máximo'}
          >
            <i style={{ width: `${pct}%` }} />
          </span>
          <span className="hud-next">{next ? `${next.min - xp} XP para “${next.title}”` : 'Ranking máximo'}</span>
        </div>
      </div>
      <DifficultySwitch value={level} onChange={(l) => progress.setLevel(l)} compact />
    </div>
  )
}
