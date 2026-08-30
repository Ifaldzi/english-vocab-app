import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const STORAGE_KEY = 'worddeck-theme'

export function getTheme(): 'dark' | 'light' {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

/** Only a stored value counts as an explicit user choice. */
function readStoredTheme(): 'dark' | 'light' | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

function systemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'
}

/** Follow the user's saved choice; otherwise fall back to the system theme. */
export function resolveTheme(): 'dark' | 'light' {
  return readStoredTheme() ?? systemTheme()
}

function applyTheme(theme: 'dark' | 'light', persist: boolean) {
  document.documentElement.dataset.theme = theme
  if (persist) {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // ignore quota / privacy-mode errors
    }
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    setTheme(resolveTheme())
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next, true)
  }

  const isLight = theme === 'light'
  const label = isLight ? 'Dark mode' : 'Light mode'

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={`Switch to ${label.toLowerCase()}`}
      title={label}
    >
      {isLight ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  )
}
