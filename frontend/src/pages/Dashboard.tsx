import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts'
import { dashboard } from '../lib/api'

function KartaStat({
  label,
  value,
  unit,
  kolor,
}: {
  label: string
  value: number
  unit: string
  kolor: string
}) {
  return (
    <div className="karta text-center">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${kolor}`}>
        {value.toLocaleString('pl-PL', { maximumFractionDigits: 1 })}
      </p>
      <p className="text-xs text-slate-500 mt-0.5">{unit}</p>
    </div>
  )
}

function StreakBadge({ dni }: { dni: number }) {
  return (
    <div className="karta flex items-center gap-4 bg-zielony-50 border-zielony-200">
      <div className="text-4xl font-black text-zielony-700">{dni}</div>
      <div>
        <p className="font-semibold text-zielony-800">
          {dni === 1 ? 'dzień' : dni < 5 ? 'dni' : 'dni'}
        </p>
        <p className="text-sm text-zielony-600">bez wyrzucania jedzenia</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboard.stats().then(r => r.data),
  })

  if (isLoading) return <p className="text-sm text-slate-500 text-center py-10">Ładowanie...</p>
  if (error) return <p className="text-sm text-red-600 text-center py-10">Błąd ładowania danych</p>
  if (!data) return null

  const puste = data.kg_uratowane === 0 && data.kg_zmarnowane === 0

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-900">Dashboard wpływu</h1>

      {puste ? (
        <div className="karta text-center py-12">
          <p className="font-medium text-slate-700">Brak danych</p>
          <p className="text-sm text-slate-400 mt-1">
            Zaznaczaj produkty jako zjedzone lub wyrzucone — tutaj pojawią się statystyki.
          </p>
        </div>
      ) : (
        <>
          <StreakBadge dni={data.streak_dni} />

          <div className="grid grid-cols-3 gap-3">
            <KartaStat
              label="Uratowane"
              value={data.kg_uratowane}
              unit="kg jedzenia"
              kolor="text-zielony-700"
            />
            <KartaStat
              label="Zaoszczędzone"
              value={data.zl_zaoszczedzone}
              unit="zł"
              kolor="text-blue-700"
            />
            <KartaStat
              label="CO₂ uniknięte"
              value={data.co2_unikniete}
              unit="kg ekw."
              kolor="text-emerald-700"
            />
          </div>

          {data.kg_zmarnowane > 0 && (
            <div className="karta border-red-200 bg-red-50">
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">Zmarnowane</p>
              <p className="text-xl font-bold text-red-700 mt-0.5">
                {data.kg_zmarnowane.toLocaleString('pl-PL', { maximumFractionDigits: 1 })} kg
              </p>
            </div>
          )}

          <div className="karta">
            <h2 className="font-semibold text-slate-800 mb-4">Ostatnie 7 dni (kg)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.tygodniowe} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="dzien"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                  formatter={(val: number, name: string) => [
                    `${val.toFixed(2)} kg`,
                    name === 'uratowane' ? 'Uratowane' : 'Zmarnowane',
                  ]}
                />
                <Legend
                  formatter={(val) => (val === 'uratowane' ? 'Uratowane' : 'Zmarnowane')}
                  wrapperStyle={{ fontSize: '12px' }}
                />
                <Bar dataKey="uratowane" fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="zmarnowane" fill="#f87171" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="karta bg-slate-800 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
              Dla porównania
            </p>
            <p className="text-sm text-slate-200">
              Przeciętne polskie gospodarstwo domowe marnuje ok.{' '}
              <span className="text-white font-semibold">247 kg</span> jedzenia rocznie
              (ok. <span className="text-white font-semibold">800–1000 zł</span>).
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Źródło: Krajowy Plan Gospodarki Odpadami 2022–2028
            </p>
          </div>
        </>
      )}
    </div>
  )
}
