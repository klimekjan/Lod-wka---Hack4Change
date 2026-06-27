import { useState, useRef, useEffect, useCallback } from 'react'
import api, { SugestiaProduktu } from '../lib/api'
import { useTheme } from '../lib/theme'
import { IconProdukt } from './ikony'

const KOLOR_KATEGORII: Record<string, { bg: string; text: string }> = {
  'nabiał':            { bg: '#1e3a5f', text: '#93c5fd' },
  'mięso surowe':      { bg: '#4a1a1a', text: '#fca5a5' },
  'ryby':              { bg: '#0f3340', text: '#67e8f9' },
  'warzywa twarde':    { bg: '#14321e', text: '#86efac' },
  'warzywa liściaste': { bg: '#14321e', text: '#86efac' },
  'owoce':             { bg: '#3d2000', text: '#fdba74' },
  'pieczywo':          { bg: '#3d2a00', text: '#fcd34d' },
  'jajka':             { bg: '#3d3000', text: '#fde68a' },
  'napoje':            { bg: '#0f2a3d', text: '#7dd3fc' },
  'przetwory':         { bg: '#2e1a40', text: '#c4b5fd' },
}

function ikonaTlo(kategoria: string) {
  return KOLOR_KATEGORII[kategoria] ?? { bg: '#26271f', text: '#9a9b8c' }
}

interface Props {
  value: string
  onChange: (val: string) => void
  onSelect: (s: SugestiaProduktu) => void
  placeholder?: string
  autoFocus?: boolean
}

export default function ProductAutocomplete({ value, onChange, onSelect, placeholder, autoFocus }: Props) {
  const { light } = useTheme()
  const [sugestie, setSugestie] = useState<SugestiaProduktu[]>([])
  const [aktywny, setAktywny] = useState(-1)
  const [ladowanie, setLadowanie] = useState(false)
  const [otwarty, setOtwarty] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchSugestie = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSugestie([])
      setOtwarty(false)
      return
    }
    setLadowanie(true)
    try {
      const res = await api.get<SugestiaProduktu[]>('/produkty/sugestie', { params: { q } })
      setSugestie(res.data)
      setOtwarty(res.data.length > 0)
      setAktywny(-1)
    } catch {
      setSugestie([])
      setOtwarty(false)
    } finally {
      setLadowanie(false)
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    onChange(val)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => fetchSugestie(val), 350)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!otwarty || sugestie.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAktywny(i => Math.min(i + 1, sugestie.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAktywny(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && aktywny >= 0) {
      e.preventDefault()
      wybierz(sugestie[aktywny])
    } else if (e.key === 'Escape') {
      setOtwarty(false)
      setAktywny(-1)
    }
  }

  function wybierz(s: SugestiaProduktu) {
    onSelect(s)
    onChange(s.name)
    setSugestie([])
    setOtwarty(false)
    setAktywny(-1)
    inputRef.current?.blur()
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOtwarty(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Cleanup timer on unmount
  useEffect(() => () => clearTimeout(timerRef.current), [])

  const dropdownBg = light ? '#ffffff' : '#1f201a'
  const dropdownBorder = light ? '#c8c9bb' : '#34362b'
  const hoverBg = light ? '#f2f3ee' : '#26271f'
  const activeBg = light ? '#eeeee8' : '#34362b'

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          className="input pr-8"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (sugestie.length > 0) setOtwarty(true) }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
        />
        {ladowanie && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <div className="w-4 h-4 border-2 border-grafit-500 border-t-limonka-400 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {otwarty && sugestie.length > 0 && (
        <ul
          className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden shadow-2xl border"
          style={{ background: dropdownBg, borderColor: dropdownBorder }}
        >
          {sugestie.map((s, i) => (
            <li
              key={`${s.name}-${i}`}
              className="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors"
              style={{ background: i === aktywny ? activeBg : undefined }}
              onMouseDown={(e) => { e.preventDefault(); wybierz(s) }}
              onMouseEnter={() => setAktywny(i)}
              onMouseLeave={() => setAktywny(-1)}
            >
              {s.image_url ? (
                <img
                  src={s.image_url}
                  alt=""
                  className="w-9 h-9 rounded-lg object-cover shrink-0 bg-grafit-700"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center"
                  style={{ background: ikonaTlo(s.category).bg, color: ikonaTlo(s.category).text }}
                >
                  <IconProdukt className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-grafit-100 truncate">{s.name}</p>
                <p className="text-xs text-grafit-400">{s.category}</p>
              </div>
              {s.default_shelf_days && (
                <span className="text-[10px] text-grafit-400 shrink-0 whitespace-nowrap">
                  {s.default_shelf_days} dni
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
