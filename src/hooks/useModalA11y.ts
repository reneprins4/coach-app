import { useEffect, useRef } from 'react'

export function useModalA11y(isOpen: boolean, onClose: () => void) {
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    previousFocus.current = document.activeElement as HTMLElement

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)

    // Focus first focusable element in the modal
    const timer = setTimeout(() => {
      const focusable = document.querySelector<HTMLElement>(
        '[role="dialog"] [autofocus], [role="dialog"] button, [role="dialog"] input, [role="dialog"] [tabindex]:not([tabindex="-1"])'
      )
      focusable?.focus()
    }, 50)

    return () => {
      document.removeEventListener('keydown', handler)
      clearTimeout(timer)
      previousFocus.current?.focus()
    }
  }, [isOpen, onClose])
}
