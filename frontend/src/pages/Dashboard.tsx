import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts'
import { dashboard } from '../lib/api'
import { useTheme, cardStyle, infoCardStyle } from '../lib/theme'

function StreakBadge({ dni }: { dni: number }) {
  const { light } = useTheme()
  return (
    <div className="rounded-xl p-4 flex items-center gap-4" style={infoCardStyle(light)}>
      <div className="font-display text-4xl font-semibold text-limonka-400">{dni}</div>
      <div>
        <p className="font-semibold text-grafit-100">{dni === 1 ? 'dzień' : 'dni'}</p>
        <p className="text-sm text-grafit-400">passy bez wyrzucania</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboard.stats().then(r => r.data),
  })

  const { light } = useTheme()
  if (isLoading) return <p className="text-sm text-grafit-400 text-center py-10">Ładowanie...</p>
  if (error) return <p className="text-sm text-red-400 text-center py-10">Błąd ładowania danych</p>
  if (!data) return null

  const puste = data.kg_uratowane === 0 && data.kg_zmarnowane === 0
  const wskaznik = data.wskaznik_uratowania
  const wskaznikKolor = wskaznik >= 70 ? '#aee63a' : wskaznik >= 40 ? '#d97706' : '#f87171'
  const kgZjedzone = data.kg_uratowane - data.kg_oddane

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-semibold text-grafit-100">Tracker</h1>

      {puste ? (
        <div className="karta text-center py-12">
          <p className="font-medium text-grafit-100">Brak danych</p>
          <p className="text-sm text-grafit-400 mt-1">
            Oznaczaj produkty jako zjedzone, oddane lub wyrzucone — tutaj pojawią się statystyki.
          </p>
        </div>
      ) : (
        <>
          {/* Wskaźnik uratowania */}
          <div className="karta text-center py-6 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-grafit-400">Wskaźnik uratowania</p>
            <p className="font-display text-6xl font-semibold" style={{ color: wskaznikKolor }}>
              {wskaznik.toLocaleString('pl-PL', { maximumFractionDigits: 1 })}%
            </p>
            <p className="text-sm text-grafit-400">jedzenia uratowanego z kosza</p>
            <div className="w-full h-2 rounded-full bg-grafit-700 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${wskaznik}%`, background: wskaznikKolor }}
              />
            </div>
            <p className="text-xs text-grafit-500">
              {data.kg_uratowane.toFixed(1)} kg uratowane · {data.kg_zmarnowane.toFixed(1)} kg wyrzucone
            </p>
          </div>

          <StreakBadge dni={data.streak_dni} />

          {/* Uratowane na styk */}
          {data.liczba_uratowan > 0 && (
            <div className="rounded-xl p-4" style={cardStyle(light, '174,230,58')}>
              <p className="text-xs font-semibold uppercase tracking-wide text-limonka-400 mb-1">
                Uratowane na styk
              </p>
              <p className="font-display text-2xl font-semibold text-grafit-100">
                {data.liczba_uratowan} {data.liczba_uratowan === 1 ? 'produkt' : 'produktów'}
              </p>
              <p className="text-sm text-grafit-400 mt-0.5">
                {data.kg_na_styk.toFixed(1)} kg złapanych przy ≤2 dniach do końca
              </p>
            </div>
          )}

          {/* Rozbicie kg */}
          <div className="grid grid-cols-3 gap-3">
            <div className="karta text-center">
              <p className="text-xs font-semibold text-grafit-400 uppercase tracking-wide mb-1">Zjedzone</p>
              <p className="font-display text-2xl font-semibold text-zielony-400">
                {kgZjedzone.toLocaleString('pl-PL', { maximumFractionDigits: 1 })}
              </p>
              <p className="text-xs text-grafit-400 mt-0.5">kg</p>
            </div>
            <div className="karta text-center">
              <p className="text-xs font-semibold text-grafit-400 uppercase tracking-wide mb-1">Oddane</p>
              <p className="font-display text-2xl font-semibold text-limonka-400">
                {data.kg_oddane.toLocaleString('pl-PL', { maximumFractionDigits: 1 })}
              </p>
              <p className="text-xs text-grafit-400 mt-0.5">kg</p>
            </div>
            <div className="karta text-center">
              <p className="text-xs font-semibold text-grafit-400 uppercase tracking-wide mb-1">Wyrzucone</p>
              <p className="font-display text-2xl font-semibold text-red-400">
                {data.kg_zmarnowane.toLocaleString('pl-PL', { maximumFractionDigits: 1 })}
              </p>
              <p className="text-xs text-grafit-400 mt-0.5">kg</p>
            </div>
          </div>

          {/* Zaoszczędzone CO₂ */}
          <div className="grid grid-cols-1">
            <div className="karta text-center">
              <p className="text-xs font-semibold text-grafit-400 uppercase tracking-wide mb-1">CO₂ uniknięte</p>
              <p className="font-display text-2xl font-semibold text-grafit-100">
                {data.co2_unikniete.toLocaleString('pl-PL', { maximumFractionDigits: 1 })}
              </p>
              <p className="text-xs text-grafit-400 mt-0.5">kg ekw.</p>
            </div>
          </div>

          {/* Wykres tygodniowy */}
          <div className="karta">
            <h2 className="font-semibold text-grafit-100 mb-4">Ostatnie 7 dni (kg)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.tygodniowe} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#34362b" />
                <XAxis dataKey="dzien" tick={{ fontSize: 11, fill: '#9a9b8c' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9a9b8c' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #34362b',
                    background: '#26271f',
                    color: '#f1ede2',
                    fontSize: '12px',
                  }}
                  formatter={(val: number, name: string) => [
                    `${val.toFixed(2)} kg`,
                    name === 'uratowane' ? 'Uratowane' : 'Zmarnowane',
                  ]}
                />
                <Legend formatter={(val) => (val === 'uratowane' ? 'Uratowane (zjedzone + oddane)' : 'Zmarnowane')}
                  wrapperStyle={{ fontSize: '12px', color: '#9a9b8c' }} />
                <Bar dataKey="uratowane" fill="#aee63a" radius={[3, 3, 0, 0]} />
                <Bar dataKey="zmarnowane" fill="#f87171" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="karta">
            <p className="text-xs font-semibold uppercase tracking-wide text-grafit-400 mb-2">Dla porównania</p>
            <p className="text-sm text-grafit-300">
              Przeciętne polskie gospodarstwo domowe marnuje ok.{' '}
              <span className="text-grafit-100 font-semibold">247 kg</span> jedzenia rocznie
              (ok. <span className="text-grafit-100 font-semibold">800-1000 zł</span>).
            </p>
            <p className="text-xs text-grafit-500 mt-2">
              Źródło: Krajowy Plan Gospodarki Odpadami 2022-2028
            </p>
          </div>
        </>
      )}
    </div>
  )
}
