import { useRef, useEffect, useState, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { powiadomienia, znajomi, Powiadomienie } from '../lib/api'
import { useTheme, cardStyle } from '../lib/theme'
import Logo from './Logo'
import PrzegladTinder from './PrzegladTinder'

const linki = [
  { href: '/pulpit',      label: 'Pulpit'    },
  { href: '/spizarnia',   label: 'Spiżarnia' },
  { href: '/przepisy',    label: 'Przepisy'  },
  { href: '/tracker',     label: 'Tracker'   },
  { href: '/spolecznosc', label: 'Wymiana'   },
  { href: '/znajomi',     label: 'Znajomi'   },
  { href: '/ustawienia',  label: 'Ustawienia'},
]

function czasTemu(iso: string): string {
  const sek = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (sek < 60)   return 'przed chwilą'
  if (sek < 3600) return `${Math.floor(sek / 60)} min temu`
  if (sek < 86400) return `${Math.floor(sek / 3600)} godz. temu`
  return `${Math.floor(sek / 86400)} dni temu`
}

function TypBadge({ type }: { type: string }) {
  const label = type === 'expiry' ? 'termin' : type === 'friend' ? 'znajomi' : type
  const gradient =
    type === 'expiry' ? 'linear-gradient(90deg, #fb923c, #ef4444)' :
    type === 'friend' ? 'linear-gradient(90deg, #aee63a, #22d3ee)' :
    'linear-gradient(90deg, #9a9b8c, #6b7280)'
  const bg =
    type === 'expiry' ? 'rgba(249,115,22,0.12)' :
    type === 'friend' ? 'rgba(174,230,58,0.12)' :
    'rgba(154,155,140,0.12)'
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
      style={{ background: bg }}
    >
      <span style={{
        background: gradient,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>
        {label}
      </span>
    </span>
  )
}

function NotificationCenter() {
  const [otwarty, setOtwarty] = useState(false)
  const [zamykaniePopupu, setZamykaniePopupu] = useState(false)
  const [przegladOtwarty, setPrzegladOtwarty] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const zamknijPopup = useCallback((poZamknieciu?: () => void) => {
    setZamykaniePopupu(true)
    setTimeout(() => {
      setOtwarty(false)
      setZamykaniePopupu(false)
      poZamknieciu?.()
    }, 180)
  }, [])
  const qc = useQueryClient()
  const { light } = useTheme()

  const { data: licznik = 0 } = useQuery({
    queryKey: ['licznik-powiadomien'],
    queryFn: () => powiadomienia.licznik().then(r => r.data.count),
    refetchInterval: 60_000,
  })

  const { data: lista = [], isLoading } = useQuery({
    queryKey: ['powiadomienia-lista'],
    queryFn: () => powiadomienia.lista().then(r => r.data),
    enabled: otwarty,
    staleTime: 30_000,
  })

  const mutPrzeczytaj = useMutation({
    mutationFn: (id: number) => powiadomienia.przeczytaj(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['licznik-powiadomien'] })
      qc.invalidateQueries({ queryKey: ['powiadomienia-lista'] })
    },
  })

  const mutWszystkie = useMutation({
    mutationFn: () => powiadomienia.przeczytajWszystkie(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['licznik-powiadomien'] })
      qc.invalidateQueries({ queryKey: ['powiadomienia-lista'] })
    },
  })

  const mutTest = useMutation({
    mutationFn: () => powiadomienia.test(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['licznik-powiadomien'] })
      await qc.refetchQueries({ queryKey: ['powiadomienia-lista'] })
      zamknijPopup(() => setPrzegladOtwarty(true))
    },
  })

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) zamknijPopup()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const nieprzeczytane = lista.filter((n: Powiadomienie) => !n.read)
  const doPrzegladu = lista.filter((n: Powiadomienie) => n.produkt?.status === 'active')

  return (
    <div ref={ref} className="relative">
      {przegladOtwarty && (
        <PrzegladTinder
          powiadomieniaDoOceny={doPrzegladu}
          onClose={() => setPrzegladOtwarty(false)}
        />
      )}
      <button
        onClick={() => otwarty ? zamknijPopup() : setOtwarty(true)}
        className="relative shrink-0 p-1.5 rounded-md text-grafit-400 hover:text-grafit-100 hover:bg-grafit-700 transition-colors"
        title="Powiadomienia"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {licznik > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
            {licznik > 99 ? '99+' : licznik}
          </span>
        )}
      </button>

      {otwarty && (
        <div
          className={`fixed left-1/2 -translate-x-1/2 top-[108px] w-[calc(100vw-1.5rem)] max-w-80 rounded-xl shadow-2xl z-50 overflow-hidden md:absolute md:left-auto md:translate-x-0 md:right-0 md:top-full md:mt-2 md:w-80 ${zamykaniePopupu ? 'animate-slide-down-out' : 'animate-slide-down'}`}
          style={{
            background: light
              ? 'radial-gradient(ellipse at top right, rgba(239,68,68,0.09) 0%, transparent 55%), radial-gradient(ellipse at bottom left, rgba(239,68,68,0.04) 0%, transparent 50%), #f5f5f3'
              : 'radial-gradient(ellipse at top right, rgba(239,68,68,0.14) 0%, transparent 55%), radial-gradient(ellipse at bottom left, rgba(239,68,68,0.06) 0%, transparent 50%), #252620',
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-grafit-700">
            <span className="font-semibold text-grafit-100 text-sm">Powiadomienia</span>
            <div className="flex items-center gap-3">
              {doPrzegladu.length > 0 && (
                <button
                  className="text-xs font-semibold text-limonka-400 hover:text-limonka-300 transition-colors"
                  onClick={() => zamknijPopup(() => setPrzegladOtwarty(true))}
                >
                  Przejrzyj ({doPrzegladu.length})
                </button>
              )}
              {nieprzeczytane.length > 0 && (
                <button
                  className="text-xs text-grafit-500 hover:text-grafit-400 transition-colors"
                  onClick={() => mutWszystkie.mutate()}
                  disabled={mutWszystkie.isPending}
                >
                  Przeczytaj wszystkie
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading && (
              <p className="text-xs text-grafit-400 text-center py-6">Ładowanie...</p>
            )}
            {!isLoading && lista.length === 0 && (
              <p className="text-xs text-grafit-400 text-center py-8">Brak powiadomień</p>
            )}
            {lista.map((n: Powiadomienie, i: number) => (
              <div key={n.id} className="animate-slide-row-up" style={{ animationDelay: `${i * 55}ms` }}>
                {i > 0 && <div className="mx-3 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.15) 40%, rgba(239,68,68,0.15) 60%, transparent)' }} />}
              <div
                className={`px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors rounded-lg mx-1 my-0.5 ${!n.read ? 'bg-white/5' : ''}`}
                onClick={() => { if (!n.read) mutPrzeczytaj.mutate(n.id) }}
              >
                <div className="flex items-start gap-2">
                  {!n.read && (
                    <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-limonka-400" />
                  )}
                  <div className={`flex-1 min-w-0 ${n.read ? 'pl-3.5' : ''}`}>
                    <p className="text-sm text-grafit-100 leading-snug">{n.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <TypBadge type={n.type} />
                      <span className="text-[10px] text-grafit-500">{czasTemu(n.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-2 border-t border-grafit-800">
            <button
              className="w-full text-[10px] text-grafit-600 hover:text-grafit-500 transition-colors py-1 disabled:opacity-40"
              onClick={() => mutTest.mutate()}
              disabled={mutTest.isPending}
            >
              {mutTest.isPending ? 'Tworzę...' : '+ testowe powiadomienie'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const { data: licznikZaproszen } = useQuery({
    queryKey: ['licznik-zaproszen'],
    queryFn: () => znajomi.licznikZaproszen().then(r => r.data.count),
    refetchInterval: 60_000,
  })

  const { light, toggle } = useTheme()

  function wyloguj() {
    localStorage.removeItem('token')
    navigate('/logowanie')
  }

  const NavLink = ({ href, label }: { href: string; label: string }) => (
    <Link
      to={href}
      className={`px-2.5 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors relative ${
        pathname === href
          ? 'nav-aktywna bg-grafit-700 text-limonka-400'
          : 'text-grafit-400 hover:text-grafit-100 hover:bg-grafit-700'
      }`}
    >
      {label}
      {href === '/znajomi' && !!licznikZaproszen && licznikZaproszen > 0 && (
        <span className="ml-1 bg-bursztyn-500 text-white text-xs rounded-full px-1.5 py-0.5">
          {licznikZaproszen}
        </span>
      )}
    </Link>
  )

  const ThemeToggle = () => (
    <button
      onClick={toggle}
      className="shrink-0 p-1.5 rounded-md text-grafit-400 hover:text-grafit-100 hover:bg-grafit-700 transition-colors"
      title={light ? 'Tryb ciemny' : 'Tryb jasny'}
    >
      {light ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
        </svg>
      )}
    </button>
  )

  return (
    <nav className="bg-grafit-900 border-b border-grafit-600 sticky top-0 z-50">
      <div className="w-full px-4 flex items-center h-14">
        <Link to="/pulpit" className="shrink-0">
          <Logo size={36} />
        </Link>

        <div className="hidden md:flex flex-1 justify-center items-center gap-0.5">
          {linki.map(l => <NavLink key={l.href} {...l} />)}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <NotificationCenter />
          <ThemeToggle />
          <button
            onClick={wyloguj}
            className="shrink-0 text-xs text-grafit-400 hover:text-grafit-300 transition-colors"
          >
            wyloguj
          </button>
        </div>
      </div>

      <div className="md:hidden overflow-x-auto scrollbar-hide border-t border-grafit-800">
        <div className="flex px-2 py-1.5 gap-0.5 w-max">
          {linki.map(l => <NavLink key={l.href} {...l} />)}
        </div>
      </div>
    </nav>
  )
}
