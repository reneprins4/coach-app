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

  handleRestart = () => {
    window.location.reload()
  }

  handleClearAndRestart = () => {
    try { localStorage.clear() } catch { /* ignore */ }
    try { sessionStorage.clear() } catch { /* ignore */ }
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Er ging iets mis</h1>
          <p className="text-gray-400 mb-2">De app heeft een onverwachte fout aangetroffen.</p>
          {this.state.error?.message && (
            <p className="text-gray-600 text-xs mb-6 max-w-sm break-words font-mono">
              {this.state.error.message}
            </p>
          )}
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={this.handleRestart}
              className="rounded-xl bg-cyan-600 px-6 py-3 font-semibold text-white"
            >
              Herstart app
            </button>
            <button
              onClick={this.handleClearAndRestart}
              className="rounded-xl bg-white/[0.06] border border-white/[0.1] px-6 py-3 font-semibold text-gray-400"
            >
              Wis data en herstart
            </button>
          </div>
          <p className="mt-6 text-xs text-gray-700 max-w-xs">
            Als het probleem aanhoudt, probeer &quot;Wis data en herstart&quot;. Dit verwijdert lokale instellingen maar lost de meeste problemen op.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
