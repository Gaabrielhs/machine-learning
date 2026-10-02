import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: (error: Error, retry: () => void) => ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error(error)
  }

  retry = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    if (this.props.fallback) return this.props.fallback(error, this.retry)
    return (
      <div className="panel error-panel" role="alert">
        <p>
          <strong>Esta parte da página não carregou.</strong> Verifique a conexão e tente de novo.
        </p>
        <button className="btn" onClick={this.retry}>
          Tentar de novo
        </button>
      </div>
    )
  }
}
