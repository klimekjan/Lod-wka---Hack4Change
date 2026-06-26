import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { auth } from '../lib/api'

interface Widget {
  href: string
  title: string
  opis: string
  kolor: string
}

const WIDGETY: Widget[] = [
  {
    href: '/spizarnia',
    title: 'Spiżarnia',
    opis: 'Zarządzaj produktami i datami ważności.',
    kolor: 'bg-zielony-50 border-zielony-200 text-zielony-700',
  },
  {
    href: '/przepisy',
    title: 'Przepisy',
    opis: 'Propozycje dań na podstawie tego co masz.',
    kolor: 'bg-bursztyn-50 border-bursztyn-200 text-bursztyn-700',
  },
  {
    href: '/tracker',
    title: 'Tracker',
    opis: 'Śledź ile jedzenia oszczędzasz i nie marnujesz.',
    kolor: 'bg-slate-50 border-slate-200 text-slate-700',
  },
  {
    href: '/spolecznosc',
    title: 'Wymiana',
    opis: 'Oddaj lub weź produkty od innych użytkowników.',
    kolor: 'bg-zielony-50 border-zielony-200 text-zielony-700',
  },
  {
    href: '/znajomi',
    title: 'Znajomi',
    opis: 'Wyszukuj znajomych i zarządzaj siecią kontaktów.',
    kolor: 'bg-bursztyn-50 border-bursztyn-200 text-bursztyn-700',
  },
  {
    href: '/ustawienia',
    title: 'Ustawienia',
    opis: 'Powiadomienia, konto i preferencje.',
    kolor: 'bg-slate-50 border-slate-200 text-slate-700',
  },
]

export default function Pulpit() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => auth.mnie().then(r => r.data),
  })

  const powitanie = user?.imie ? `Witaj, ${user.imie}!` : 'Witaj!'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{powitanie}</h1>
        <p className="text-sm text-slate-500 mt-1">Co chcesz dzisiaj zrobić?</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {WIDGETY.map((w) => (
          <Link
            key={w.href}
            to={w.href}
            className="karta flex flex-col gap-2 hover:border-zielony-300 hover:shadow-md transition-all active:scale-95"
          >
            <div className={`self-start text-xs font-semibold px-2 py-0.5 rounded-full border ${w.kolor}`}>
              {w.title}
            </div>
            <p className="text-xs text-slate-500 leading-snug">{w.opis}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
