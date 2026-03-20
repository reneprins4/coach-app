import { Component } from 'react'
import type { ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Er ging iets mis</h1>
          <p className="text-gray-400 mb-6">De app heeft een onverwachte fout aangetroffen.</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-cyan-600 px-6 py-3 font-semibold text-white"
          >
            Herstart app
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
