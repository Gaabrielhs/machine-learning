import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Blocks } from '../components/Blocks'
import { Markdown } from '../components/Markdown'
import { progress, useProgress } from '../core/progress'
import { useModule } from '../core/moduleContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function LessonPage() {
  const { meta, lesson } = useModule()
  useDocumentTitle(`Aula · ${meta.shortName}`)
  const p = useProgress()
  const read = p.algorithms[meta.id]?.lesson ?? {}
  const readCount = lesson.sections.filter((s) => read[s.id]).length
  const [current, setCurrent] = useState(lesson.sections[0]?.id)

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setCurrent(e.target.id)),
      { rootMargin: '-25% 0px -65% 0px' },
    )
    lesson.sections.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [lesson.sections])

  return (
    <div className="lesson">
      <nav className="toc" aria-label="Seções da aula">
        <p className="toc-progress">
          {readCount} de {lesson.sections.length} lidas
        </p>
        <ol>
          {lesson.sections.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className={`${current === s.id ? 'here ' : ''}${read[s.id] ? 'read' : ''}`}>
                <span className="toc-n">{i + 1}</span>
                <span>{s.title}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <article className="lesson-body">
        <header className="lesson-head">
          <p className="eyebrow">Aula</p>
          <h1>{meta.name}</h1>
          <Markdown md={lesson.intro} className="lede" />
        </header>
        {lesson.sections.map((s, i) => (
          <section key={s.id} id={s.id} className="lesson-section">
            <p className="section-n">Seção {i + 1}</p>
            <h2>{s.title}</h2>
            <Blocks blocks={s.blocks} />
            <label className="read-toggle">
              <input
                type="checkbox"
                checked={!!read[s.id]}
                onChange={(e) => progress.markSection(meta.id, s.id, e.target.checked)}
              />
              Marcar como lida
            </label>
          </section>
        ))}
        <section className="lesson-next">
          <h2>E agora?</h2>
          <p>Teste o que aprendeu no jogo. Ele tem as mesmas ideias em três níveis de profundidade.</p>
          <Link className="btn btn-game" to={`/${meta.id}/jogo`}>
            Ir para o jogo
          </Link>
        </section>
      </article>
    </div>
  )
}
