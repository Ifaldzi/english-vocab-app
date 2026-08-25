import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const STORAGE_KEY = 'worddeck-theme'

export function getTheme(): 'dark' | 'light' {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

function readStoredTheme(): 'dark' | 'light' {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'light'
      ? 'light'
      : 'dark'
  } catch {
    return 'dark'
  }
}

function applyTheme(theme: 'dark' | 'light') {
  document.documentElement.dataset.theme = theme
  try {
    window.localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // ignore quota / privacy-mode errors
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    setTheme(readStoredTheme())
    applyTheme(readStoredTheme())
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
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
      {isLight ? <Moon size={14} /> : <Sun size={14} />}
      <span>{label}</span>
    </button>
  )
}
