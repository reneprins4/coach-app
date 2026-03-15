import { useEffect, useState } from 'react'

export default function Toast({ message, action, onAction, onDismiss, duration = 4000 }) {
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setVisible(true))

    const timer = setTimeout(() => {
      handleDismiss()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onDismiss])

  function handleDismiss() {
    setExiting(true)
    setTimeout(() => {
      onDismiss?.()
    }, 300)
  }

  function handleAction() {
    onAction?.()
    handleDismiss()
  }

  return (
    <div
      className={`fixed bottom-28 left-4 right-4 z-50 mx-auto max-w-sm transition-all duration-300 ease-out ${
        visible && !exiting
          ? 'translate-y-0 opacity-100'
          : 'translate-y-4 opacity-0'
      }`}
    >
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-700 bg-gray-800 px-4 py-3 shadow-lg">
        <span className="text-sm text-white">{message}</span>
        {action && (
          <button
            onClick={handleAction}
            className="shrink-0 rounded-lg bg-cyan-500/20 px-3 py-1.5 text-sm font-semibold text-cyan-400 active:bg-cyan-500/30"
          >
            {action}
          </button>
        )}
      </div>
    </div>
  )
}
