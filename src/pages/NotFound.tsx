import { Link } from 'react-router-dom'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function NotFound() {
  useDocumentTitle('Página não encontrada')
  return (
    <div className="narrow">
      <h1>Página não encontrada</h1>
      <p>O endereço não corresponde a nenhuma aula ou fase.</p>
      <Link className="btn" to="/">
        Ver os algoritmos
      </Link>
    </div>
  )
}
