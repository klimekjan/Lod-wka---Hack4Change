import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { powiadomienia, znajomi } from '../lib/api'
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

  function wyloguj() {
    localStorage.removeItem('token')
    navigate('/logowanie')
  }

  return (
    <nav className="bg-grafit-900 border-b border-grafit-600 sticky top-0 z-50">
      <div className="max-w-2xl mx-auto px-4 flex items-center justify-between h-14">
        <Link to="/pulpit">
          <Logo size={36} />
        </Link>
        <div className="flex items-center gap-0.5 overflow-x-auto">
          {linki.map(({ href, label }) => (
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
          ))}
          <button
            onClick={wyloguj}
            className="ml-2 text-xs text-grafit-400 hover:text-grafit-300 transition-colors"
          >
            wyloguj
          </button>
        </div>
      </div>
    </nav>
  )
}
