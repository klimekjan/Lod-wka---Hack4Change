import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { powiadomienia } from '../lib/api'

const linki = [
  { href: '/',            label: 'Spiżarnia' },
  { href: '/przepisy',    label: 'Przepisy'  },
  { href: '/dashboard',   label: 'Dashboard' },
  { href: '/spolecznosc', label: 'Wymiana'   },
  { href: '/ustawienia',  label: 'Ustawienia'},
]

export default function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const { data: licznik } = useQuery({
    queryKey: ['licznik-powiadomien'],
    queryFn: () => powiadomienia.licznik().then(r => r.data.count),
    refetchInterval: 60_000,
  })

  function wyloguj() {
    localStorage.removeItem('token')
    navigate('/logowanie')
  }

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-2xl mx-auto px-4 flex items-center justify-between h-14">
        <span className="font-bold text-zielony-700 text-lg tracking-tight">Lodówka</span>
        <div className="flex items-center gap-1 overflow-x-auto">
          {linki.map(({ href, label }) => (
            <Link
              key={href}
              to={href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                pathname === href
                  ? 'bg-zielony-50 text-zielony-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {label}
              {href === '/ustawienia' && !!licznik && licznik > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {licznik}
                </span>
              )}
            </Link>
          ))}
          <button
            onClick={wyloguj}
            className="ml-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            wyloguj
          </button>
        </div>
      </div>
    </nav>
  )
}
