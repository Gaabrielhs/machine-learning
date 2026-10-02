import { Link } from 'react-router-dom'
import { SITE } from '../config/site'
import { totalXp, useProgress } from '../core/progress'
import { ALGORITHMS } from '../core/registry'
import { LEVEL_INFO, LEVELS } from '../core/types'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function Home() {
  useDocumentTitle()
  const p = useProgress()
  return (
    <div className="home">
      <section className="hero">
        <p className="eyebrow">Aprendizado de máquina, por dentro</p>
        <h1>{SITE.tagline}</h1>
        <p className="lede">
          Cada algoritmo tem uma <strong>aula</strong> com um exemplo pequeno que você manipula, e um{' '}
          <strong>jogo</strong> em fases, com três níveis de profundidade que você troca a qualquer momento.
        </p>
      </section>

      <section aria-labelledby="catalogo">
        <h2 id="catalogo" className="section-title">
          Algoritmos
        </h2>
        <ul className="catalog">
          {ALGORITHMS.map(({ meta }) => {
            const xp = totalXp(p.algorithms[meta.id])
            return (
              <li key={meta.id} className="algo-card">
                <div className="algo-card-top">
                  <span className="tag">{meta.family}</span>
                  <span className="tag tag-quiet">{meta.task}</span>
                </div>
                <h3>
                  <Link to={`/${meta.id}`}>{meta.name}</Link>
                </h3>
                <p>{meta.summary}</p>
                <p className="algo-example">
                  <span>Exemplo da aula</span> {meta.example}
                </p>
                <div className="algo-actions">
                  <Link className="btn" to={`/${meta.id}/aula`}>
                    Abrir a aula
                  </Link>
                  <Link className="btn btn-game" to={`/${meta.id}/jogo`}>
                    Jogar {xp > 0 && <span className="xp-inline">{xp} XP</span>}
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
        <p className="catalog-note">
          Novos algoritmos entram como módulos independentes. Veja o guia de contribuição no repositório.
        </p>
      </section>

      <section aria-labelledby="niveis" className="levels-explainer">
        <h2 id="niveis" className="section-title">
          Três níveis, mesmo conteúdo
        </h2>
        <div className="level-cards">
          {LEVELS.map((l) => (
            <div key={l} className={`level-card lvl-${l}`}>
              <span className="level-name">{LEVEL_INFO[l].label}</span>
              <span className="level-persona">{LEVEL_INFO[l].persona}</span>
              <p>{LEVEL_INFO[l].blurb}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
