import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts'
import { dashboard } from '../lib/api'

function KartaStat({ label, value, unit, kolor }: {
  label: string; value: number; unit: string; kolor: string
}) {
  return (
    <div className="karta text-center">
      <p className="text-xs font-semibold text-grafit-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`font-display text-2xl font-semibold ${kolor}`}>
        {value.toLocaleString('pl-PL', { maximumFractionDigits: 1 })}
      </p>
      <p className="text-xs text-grafit-400 mt-0.5">{unit}</p>
    </div>
  )
}

function StreakBadge({ dni }: { dni: number }) {
  return (
    <div className="karta flex items-center gap-4 bg-limonka-400/10 border-limonka-400/30">
      <div className="font-display text-4xl font-semibold text-limonka-400">{dni}</div>
      <div>
        <p className="font-semibold text-grafit-100">{dni === 1 ? 'dzień' : 'dni'}</p>
        <p className="text-sm text-grafit-400">bez wyrzucania jedzenia</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboard.stats().then(r => r.data),
  })

  if (isLoading) return <p className="text-sm text-grafit-400 text-center py-10">Ładowanie...</p>
  if (error) return <p className="text-sm text-red-400 text-center py-10">Błąd ładowania danych</p>
  if (!data) return null

  const puste = data.kg_uratowane === 0 && data.kg_zmarnowane === 0

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-semibold text-grafit-100">Dashboard wpływu</h1>

      {puste ? (
        <div className="karta text-center py-12">
          <p className="font-medium text-grafit-100">Brak danych</p>
          <p className="text-sm text-grafit-400 mt-1">
            Zaznaczaj produkty jako zjedzone lub wyrzucone -- tutaj pojawią się statystyki.
          </p>
        </div>
      ) : (
        <>
          <StreakBadge dni={data.streak_dni} />

          <div className="grid grid-cols-3 gap-3">
            <KartaStat label="Uratowane" value={data.kg_uratowane} unit="kg jedzenia" kolor="text-zielony-400" />
            <KartaStat label="Zaoszczędzone" value={data.zl_zaoszczedzone} unit="zł" kolor="text-limonka-400" />
            <KartaStat label="CO₂ uniknięte" value={data.co2_unikniete} unit="kg ekw." kolor="text-grafit-100" />
          </div>

          {data.kg_zmarnowane > 0 && (
            <div className="karta bg-red-500/10 border-red-500/30">
              <p className="text-xs font-semibold text-red-400 uppercase tracking-wide">Zmarnowane</p>
              <p className="font-display text-xl font-semibold text-red-400 mt-0.5">
                {data.kg_zmarnowane.toLocaleString('pl-PL', { maximumFractionDigits: 1 })} kg
              </p>
            </div>
          )}

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
                <Legend formatter={(val) => (val === 'uratowane' ? 'Uratowane' : 'Zmarnowane')}
                  wrapperStyle={{ fontSize: '12px', color: '#9a9b8c' }} />
                <Bar dataKey="uratowane" fill="#aee63a" radius={[3, 3, 0, 0]} />
                <Bar dataKey="zmarnowane" fill="#f87171" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="karta bg-grafit-800 border-grafit-600">
            <p className="text-xs font-semibold uppercase tracking-wide text-grafit-400 mb-2">Dla porównania</p>
            <p className="text-sm text-grafit-300">
              Przeciętne polskie gospodarstwo domowe marnuje ok.{' '}
              <span className="text-grafit-100 font-semibold">247 kg</span> jedzenia rocznie
              (ok. <span className="text-grafit-100 font-semibold">800-1000 zł</span>).
            </p>
            <p className="text-xs text-grafit-500 mt-2">
              Źródło: Krajowy Plan Gospodarki Odpadami 2022--2028
            </p>
          </div>
        </>
      )}
    </div>
  )
}
