import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { powiadomienia, znajomi } from '../lib/api'
import { useTheme } from '../lib/theme'
import Logo from './Logo'

const linki = [
  { href: '/pulpit',      label: 'Pulpit'    },
  { href: '/spizarnia',   label: 'Spiżarnia' },
  { href: '/przepisy',    label: 'Przepisy'  },
  { href: '/tracker',     label: 'Tracker'   },
  { href: '/spolecznosc', label: 'Wymiana'   },
  { href: '/znajomi',     label: 'Znajomi'   },
  { href: '/ustawienia',  label: 'Ustawienia'},
]

export default function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const { data: licznikPowiadomien } = useQuery({
    queryKey: ['licznik-powiadomien'],
    queryFn: () => powiadomienia.licznik().then(r => r.data.count),
    refetchInterval: 60_000,
  })

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
      key={href}
      to={href}
      className={`px-2.5 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors relative ${
        pathname === href
          ? 'bg-grafit-700 text-limonka-400'
          : 'text-grafit-400 hover:text-grafit-100 hover:bg-grafit-700'
      }`}
    >
      {label}
      {href === '/ustawienia' && !!licznikPowiadomien && licznikPowiadomien > 0 && (
        <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
          {licznikPowiadomien}
        </span>
      )}
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
      {/* Górny pasek: logo + linki (desktop) + akcje */}
      <div className="w-full px-4 flex items-center h-14">
        <Link to="/pulpit" className="shrink-0">
          <Logo size={36} />
        </Link>

        {/* Linki — tylko na desktopie */}
        <div className="hidden md:flex flex-1 justify-center items-center gap-0.5">
          {linki.map(l => <NavLink key={l.href} {...l} />)}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <ThemeToggle />
          <button
            onClick={wyloguj}
            className="shrink-0 text-xs text-grafit-400 hover:text-grafit-300 transition-colors"
          >
            wyloguj
          </button>
        </div>
      </div>

      {/* Dolny pasek z linkami — tylko na mobile, scrollowalny */}
      <div className="md:hidden overflow-x-auto scrollbar-hide border-t border-grafit-800">
        <div className="flex px-2 py-1.5 gap-0.5 w-max">
          {linki.map(l => <NavLink key={l.href} {...l} />)}
        </div>
      </div>
    </nav>
  )
}
