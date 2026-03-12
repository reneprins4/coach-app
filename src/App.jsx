import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <h1 className="text-2xl font-bold tracking-tight">
          🏋️ Coach App
        </h1>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="rounded-2xl bg-gray-900 p-8 text-center">
          <h2 className="mb-4 text-3xl font-semibold">
            Welcome to Coach
          </h2>
          <p className="text-lg text-gray-400">
            Your AI-powered workout companion. Track sets, log workouts,
            and get intelligent coaching feedback.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <span className="rounded-full bg-blue-600/20 px-4 py-2 text-sm text-blue-400">
              React 18
            </span>
            <span className="rounded-full bg-emerald-600/20 px-4 py-2 text-sm text-emerald-400">
              Supabase
            </span>
            <span className="rounded-full bg-purple-600/20 px-4 py-2 text-sm text-purple-400">
              Claude AI
            </span>
            <span className="rounded-full bg-cyan-600/20 px-4 py-2 text-sm text-cyan-400">
              Tailwind CSS
            </span>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
