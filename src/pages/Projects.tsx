import { Link } from 'react-router-dom'
import { PROJECTS } from '../config/projects'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function Projects() {
  useDocumentTitle('Projetos')
  return (
    <div className="home">
      <section className="hero">
        <p className="eyebrow">Trabalhos da pós-graduação</p>
        <h1>Projetos</h1>
        <p className="lede">
          Apresentações dos trabalhos da disciplina: sono e uso do celular nas etapas 1 e 2, consumo de data centers na
          etapa 3. Cada uma tem o modo <strong>Apresentar</strong>, que mostra uma seção por tela.
        </p>
      </section>
      <ul className="catalog" aria-label="Projetos">
        {PROJECTS.map((p) => (
          <li key={p.path} className="algo-card">
            <div className="algo-card-top">
              <span className="tag">{p.stage}</span>
              <span className="tag tag-quiet">{p.algorithm}</span>
              <span className="tag tag-quiet">{p.task}</span>
            </div>
            <h3>
              <Link to={p.path}>{p.title}</Link>
            </h3>
            <p>{p.summary}</p>
            <div className="algo-actions">
              <Link className="btn" to={p.path}>
                Abrir a apresentação
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
