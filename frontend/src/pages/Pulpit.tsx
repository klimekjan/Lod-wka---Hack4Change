import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { auth, dashboard, spizarnia } from '../lib/api'
import { useTheme, cardStyle, infoCardStyle } from '../lib/theme'
import {
  IconSpizarnia, IconAI, IconTracker, IconMapa, IconZnajomi, IconUstawienia,
} from '../components/ikony'

const AKCJE = [
  { href: '/spizarnia',   label: 'Spiżarnia',  opis: 'Terminy ważności',          Icon: IconSpizarnia },
  { href: '/przepisy',    label: 'Przepisy',   opis: 'Gotuj z tego co masz',       Icon: IconAI        },
  { href: '/tracker',     label: 'Tracker',    opis: 'Twój wpływ na klimat',       Icon: IconTracker   },
  { href: '/spolecznosc', label: 'Wymiana',    opis: 'Oddaj lub odbierz jedzenie', Icon: IconMapa      },
  { href: '/znajomi',     label: 'Znajomi',    opis: 'Twoja sieć lokalna',         Icon: IconZnajomi   },
  { href: '/ustawienia',  label: 'Ustawienia', opis: 'Konto i powiadomienia',      Icon: IconUstawienia},
]

function formatDni(d: number) {
  if (d < 0) return 'przeterminowany'
  if (d === 0) return 'dziś'
  if (d === 1) return 'jutro'
  return `za ${d} dni`
}

export default function Pulpit() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => auth.mnie().then(r => r.data),
  })

  const { data: stats } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboard.stats().then(r => r.data),
  })

  const { data: produkty = [] } = useQuery({
    queryKey: ['spizarnia', 'active'],
    queryFn: () => spizarnia.lista().then(r => r.data),
  })

  const { light } = useTheme()
  const dzis = new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })
  const powitanie = user?.imie ? `Cześć, ${user.imie}` : 'Cześć'

  const naWylocie = produkty
    .filter(p => p.days_left !== null && p.days_left !== undefined && p.days_left <= 5)
    .sort((a, b) => (a.days_left ?? 0) - (b.days_left ?? 0))
    .slice(0, 4)

  const pokazBanner = naWylocie.length >= 2

  return (
    <div className="space-y-6 app-shell">
      {/* Header */}
      <div className="pt-1">
        <h1 className="font-display text-3xl font-semibold text-grafit-100">{powitanie}</h1>
        <p className="text-sm text-grafit-400 mt-0.5 capitalize">{dzis}</p>
      </div>

      {/* Stats strip */}
      {stats && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: stats.streak_dni, label: stats.streak_dni === 1 ? 'dzień' : 'dni', sub: 'bez marnowania', cls: 'text-limonka-400' },
            { value: `${stats.wskaznik_uratowania.toFixed(0)}%`, label: 'uratowania', sub: 'wskaźnik', cls: 'text-zielony-400' },
            { value: naWylocie.length, label: 'produktów', sub: 'na wylocie', cls: 'text-grafit-100' },
          ].map(({ value, label, sub, cls }) => (
            <div
              key={sub}
              className="text-center py-3 rounded-xl"
              style={infoCardStyle(light)}
            >
              <div className={`font-display text-2xl font-semibold ${cls}`}>{value}</div>
              <div className="text-xs text-grafit-400 mt-0.5 leading-tight">{label}<br />{sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Banner: przepisy */}
      {pokazBanner && (
        <Link
          to="/przepisy"
          className="flex items-center justify-between rounded-xl p-4 transition-colors"
          style={infoCardStyle(light)}
        >
          <div>
            <p className="text-sm font-medium text-grafit-100">
              {naWylocie.length} produktów wkrótce wygasa
            </p>
            <p className="text-xs text-grafit-400 mt-0.5">Wygeneruj przepis z tego co masz</p>
          </div>
          <span className="text-limonka-400 text-lg shrink-0 ml-3">→</span>
        </Link>
      )}

      {/* Na wylocie */}
      {naWylocie.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-grafit-100">Zbliżające się terminy</h2>
            <Link to="/spizarnia" className="text-xs text-limonka-400 hover:text-limonka-300">
              wszystkie
            </Link>
          </div>
          <div className="space-y-1.5">
            {naWylocie.map(p => (
              <div
                key={p.id}
                className="rounded-xl py-2.5 px-4 flex items-center justify-between gap-3"
                style={infoCardStyle(light)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt=""
                      className="w-9 h-9 rounded-lg object-cover shrink-0 bg-grafit-700"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-lg shrink-0 bg-grafit-600 flex items-center justify-center text-base">
                      🥫
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-grafit-100 truncate">{p.name}</p>
                    <p className="text-xs text-grafit-400">{p.quantity} {p.unit} · {p.category}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium shrink-0 ${
                  (p.days_left ?? 0) < 0 ? 'text-red-400' :
                  (p.days_left ?? 0) <= 1 ? 'text-bursztyn-400' :
                  'text-grafit-400'
                }`}>
                  {formatDni(p.days_left ?? 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {naWylocie.length === 0 && produkty.length > 0 && (
        <div
          className="py-5 text-center rounded-xl"
          style={infoCardStyle(light)}
        >
          <p className="text-sm font-medium text-grafit-100">Wszystko świeże</p>
          <p className="text-xs text-grafit-400 mt-0.5">Brak produktów na wylocie — dobra robota</p>
        </div>
      )}

      {produkty.length === 0 && (
        <div
          className="py-5 text-center rounded-xl"
          style={infoCardStyle(light)}
        >
          <p className="text-sm font-medium text-grafit-100">Spiżarnia jest pusta</p>
          <Link to="/spizarnia" className="text-xs text-limonka-400 hover:underline mt-1 inline-block">
            Dodaj pierwszy produkt
          </Link>
        </div>
      )}

      {/* Szybkie akcje */}
      <div className="space-y-2">
        <h2 className="font-display text-base font-semibold text-grafit-100">Przejdź do</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {AKCJE.map(({ href, label, opis, Icon }) => (
            <Link
              key={href}
              to={href}
              className="flex items-start gap-3 rounded-xl p-4 transition-all active:scale-[0.97]"
              style={cardStyle(light)}
            >
              <div className="mt-0.5 text-limonka-400 shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-grafit-100 font-display">{label}</p>
                <p className="text-xs text-grafit-400 mt-0.5 leading-snug">{opis}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
