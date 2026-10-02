import { Link } from 'react-router-dom'
import { Markdown } from '../components/Markdown'
import { useModule } from '../core/moduleContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function AlgorithmOverview() {
  const { meta, lesson, quest } = useModule()
  useDocumentTitle(meta.name)
  return (
    <div className="overview">
      <h1>{meta.name}</h1>
      <p className="lede">{meta.summary}</p>
      <div className="mode-cards">
        <Link to="aula" className="mode-card">
          <span className="mode-kicker">Aula · {lesson.sections.length} seções</span>
          <strong>Entenda com um exemplo</strong>
          <Markdown md={lesson.intro} />
        </Link>
        <Link to="jogo" className="mode-card mode-card-game">
          <span className="mode-kicker">Jogo · {quest.phases.length} fases · 3 níveis</span>
          <strong>Teste o que aprendeu</strong>
          <Markdown md={quest.intro} />
        </Link>
      </div>
      {meta.prerequisites.length > 0 && (
        <p className="prereq">
          <span>Ajuda saber antes:</span> {meta.prerequisites.join(' · ')}
        </p>
      )}
    </div>
  )
}
