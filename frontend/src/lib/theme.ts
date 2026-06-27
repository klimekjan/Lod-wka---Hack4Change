import { createContext, useContext, useState, useEffect, createElement, ReactNode } from 'react'

interface ThemeCtx { light: boolean; toggle: () => void }

const ThemeContext = createContext<ThemeCtx>({ light: false, toggle: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [light, setLight] = useState(() => localStorage.getItem('theme') === 'light')

  useEffect(() => {
    const root = document.documentElement
    root.classList.add('theme-transitioning')
    root.classList.toggle('light', light)
    localStorage.setItem('theme', light ? 'light' : 'dark')
    const t = setTimeout(() => root.classList.remove('theme-transitioning'), 350)
    return () => clearTimeout(t)
  }, [light])

  return createElement(
    ThemeContext.Provider,
    { value: { light, toggle: () => setLight(v => !v) } },
    children,
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

/* helpers — call inside component */
export function cardStyle(light: boolean, accentRgb = '194,240,79', corner = 'top left'): React.CSSProperties {
  return light
    ? {
        background: `radial-gradient(ellipse at ${corner}, rgba(${accentRgb},0.07) 0%, transparent 65%), #ffffff`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        transition: 'background 0.3s ease, box-shadow 0.3s ease',
      }
    : {
        background: `radial-gradient(ellipse at ${corner}, rgba(${accentRgb},0.11) 0%, transparent 65%), #1f201a`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
        transition: 'background 0.3s ease, box-shadow 0.3s ease',
      }
}

export function infoCardStyle(light: boolean): React.CSSProperties {
  return light
    ? {
        background: 'radial-gradient(ellipse at bottom right, rgba(0,0,0,0.04) 0%, transparent 60%), #ffffff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        transition: 'background 0.3s ease, box-shadow 0.3s ease',
      }
    : {
        background: 'radial-gradient(ellipse at bottom right, rgba(255,255,255,0.06) 0%, transparent 60%), #26271f',
        boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
        transition: 'background 0.3s ease, box-shadow 0.3s ease',
      }
}
