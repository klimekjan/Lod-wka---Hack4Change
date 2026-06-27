import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { spizarnia } from '../lib/api'
import api from '../lib/api'

interface Przepis {
  tytul: string
  opis: string
  czas_min: number
  porcje: number
  trudnosc?: string
  skladniki_spizarni: string[]
  skladniki_dodatkowe: string[]
  kroki: string[]
  uratowane_produkty: number
}

function KartaPrzepisu({ przepis, onUgotowane }: { przepis: Przepis; onUgotowane: () => void }) {
  const [rozwiniety, setRozwiniety] = useState(false)
  const [ugotowany, setUgotowany] = useState(false)

  function handleUgotowane() {
    setUgotowany(true)
    onUgotowane()
  }

  return (
    <div className="karta space-y-3">
      <div>
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display font-semibold text-grafit-100 text-lg">{przepis.tytul}</h2>
          {przepis.uratowane_produkty > 0 && (
            <span className="badge-wylot shrink-0">ratuje {przepis.uratowane_produkty} prod.</span>
          )}
        </div>
        <p className="text-sm text-grafit-400 mt-1">{przepis.opis}</p>
        <div className="flex gap-3 mt-2 text-xs text-grafit-400">
          <span>{przepis.czas_min} min</span>
          <span>{przepis.porcje} porcje</span>
          {przepis.trudnosc && <span>{przepis.trudnosc}</span>}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-grafit-400 uppercase tracking-wide mb-1">Ze spiżarni</p>
        <div className="flex flex-wrap gap-1.5">
          {przepis.skladniki_spizarni.map(s => (
            <span key={s} className="badge-swiezy">{s}</span>
          ))}
        </div>
        {przepis.skladniki_dodatkowe.length > 0 && (
          <p className="text-xs text-grafit-400 mt-1.5">
            + {przepis.skladniki_dodatkowe.join(', ')}
          </p>
        )}
      </div>

      <button
        className="text-sm text-limonka-400 font-medium hover:text-limonka-300"
        onClick={() => setRozwiniety(r => !r)}
      >
        {rozwiniety ? 'Ukryj kroki' : 'Pokaż kroki'}
      </button>

      {rozwiniety && (
        <ol className="space-y-2 text-sm text-grafit-300 border-t border-grafit-600 pt-3">
          {przepis.kroki.map((krok, i) => (
            <li key={i} className="flex gap-2">
              <span className="shrink-0 w-5 h-5 bg-limonka-400/20 text-limonka-400 rounded-full text-xs flex items-center justify-center font-semibold">
                {i + 1}
              </span>
              <span>{krok}</span>
            </li>
          ))}
        </ol>
      )}

      {!ugotowany ? (
        <button className="btn text-sm w-full" onClick={handleUgotowane}>
          Ugotowane -- oznacz składniki jako zjedzone
        </button>
      ) : (
        <p className="text-sm text-zielony-400 text-center font-medium">Zapisano!</p>
      )}
    </div>
  )
}

export default function Przepisy() {
  const queryClient = useQueryClient()
  const [przepisy, setPrzepisy] = useState<Przepis[]>([])
  const [blad, setBlad] = useState('')

  const mutacjaGeneruj = useMutation({
    mutationFn: () => api.get<{ przepisy: Przepis[]; info?: string }>('/przepisy/generuj').then(r => r.data),
    onSuccess: (data) => {
      setPrzepisy(data.przepisy)
      setBlad('')
      if (data.info) setBlad(data.info)
    },
    onError: (err: any) => {
      setBlad(err.response?.data?.detail ?? 'Błąd generowania przepisów')
    },
  })

  function oznaczSkladnikiJakoZjedzone(przepis: Przepis) {
    queryClient.fetchQuery({
      queryKey: ['spizarnia'],
      queryFn: () => spizarnia.lista().then(r => r.data),
    }).then(produkty => {
      const uzyteNazwy = przepis.skladniki_spizarni.map(n => n.toLowerCase())
      const dopasowane = produkty.filter(p =>
        uzyteNazwy.some(nazwa => p.name.toLowerCase().includes(nazwa))
      )
      dopasowane.forEach(p => {
        spizarnia.akcja(p.id, 'eaten').then(() =>
          queryClient.invalidateQueries({ queryKey: ['spizarnia'] })
        )
      })
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-grafit-100">Przepisy</h1>
        <button
          className="btn text-sm"
          onClick={() => mutacjaGeneruj.mutate()}
          disabled={mutacjaGeneruj.isPending}
        >
          {mutacjaGeneruj.isPending ? 'Generuję...' : przepisy.length ? 'Nowe przepisy' : 'Generuj'}
        </button>
      </div>

      {blad && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2 rounded-lg">
          {blad}
        </div>
      )}

      {!przepisy.length && !mutacjaGeneruj.isPending && !blad && (
        <div className="karta text-center py-12">
          <p className="font-medium text-grafit-100">Brak wygenerowanych przepisów</p>
          <p className="text-sm text-grafit-400 mt-1">
            Kliknij "Generuj" -- Claude zaproponuje dania priorytetyzując produkty na wylocie.
          </p>
          <p className="text-xs text-grafit-500 mt-3">Wymaga ustawionego ANTHROPIC_API_KEY</p>
        </div>
      )}

      {mutacjaGeneruj.isPending && (
        <div className="karta text-center py-10 text-grafit-400">
          <p className="text-sm">Claude analizuje spiżarnię...</p>
        </div>
      )}

      {przepisy.map((p, i) => (
        <KartaPrzepisu
          key={i}
          przepis={p}
          onUgotowane={() => oznaczSkladnikiJakoZjedzone(p)}
        />
      ))}
    </div>
  )
}
