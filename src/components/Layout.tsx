import { Link, Outlet, ScrollRestoration } from 'react-router-dom'
import { SITE } from '../config/site'
import { ErrorBoundary } from './ErrorBoundary'
import { ThemeToggle } from './ThemeToggle'

export function Logo() {
  return (
    <svg className="logo-mark" viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M5 25 C 11 25, 11 7, 17 7 S 23 25, 27 25"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.4"
        strokeDasharray="3 3"
      />
      <circle cx="5" cy="25" r="3.2" fill="var(--accent)" />
      <circle cx="17" cy="7" r="3.2" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2" />
      <circle cx="27" cy="25" r="3.2" fill="var(--neg)" />
    </svg>
  )
}

export function Layout() {
  return (
    <div className="app">
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="site-header">
        <Link to="/" className="brand">
          <Logo />
          <span>{SITE.name}</span>
        </Link>
        <nav aria-label="Principal" className="site-nav">
          <Link to="/">Algoritmos</Link>
          <ThemeToggle />
        </nav>
      </header>
      <main id="conteudo" className="site-main">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <footer className="site-footer">
        <span>{SITE.name}: material aberto para estudar aprendizado de máquina.</span>
        <span>Seu progresso fica salvo só neste navegador.</span>
        {SITE.repoUrl && (
          <a href={SITE.repoUrl} target="_blank" rel="noopener noreferrer">
            Código-fonte
          </a>
        )}
      </footer>
      <ScrollRestoration />
    </div>
  )
}
