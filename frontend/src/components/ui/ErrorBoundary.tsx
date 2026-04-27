import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-[#0A0612] p-6">
          <div className="luxury-card p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-[rgba(212,175,55,0.12)] flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className="font-serif text-2xl font-semibold text-[#F0EAD6] mb-2">
              Что-то пошло не так
            </h2>
            <p className="text-[#8B7FA8] text-sm mb-6 leading-relaxed">
              Произошла непредвиденная ошибка. Попробуйте перезагрузить страницу.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="btn-ghost px-6 h-11 text-sm font-medium"
              >
                Попробовать снова
              </button>
              <button
                onClick={this.handleReload}
                className="btn-gold px-6 h-11 text-sm font-medium"
              >
                Перезагрузить
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}