import { useState, FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { spizarnia, Produkt } from '../lib/api'

const KATEGORIE = ['nabiał', 'mięso surowe', 'ryby', 'warzywa liściaste', 'warzywa twarde', 'owoce', 'pieczywo', 'jajka', 'napoje', 'przetwory', 'inne']
const JEDNOSTKI = ['szt.', 'kg', 'g', 'l', 'ml', 'opak.']

function badgeStatus(dniDo?: number) {
  if (dniDo === undefined || dniDo === null) return null
  if (dniDo < 0) return <span className="badge-przeterminowany">przeterminowany</span>
  if (dniDo <= 3) return <span className="badge-wylot">{dniDo === 0 ? 'dziś' : `${dniDo} dni`}</span>
  return <span className="badge-swiezy">{dniDo} dni</span>
}

function KartaProduktu({ produkt, onAkcja }: { produkt: Produkt; onAkcja: (action: string) => void }) {
  const [rozwiniety, setRozwiniety] = useState(false)

  return (
    <div className={`karta border-l-4 ${
      produkt.days_left === undefined || produkt.days_left === null
        ? 'border-slate-200'
        : produkt.days_left < 0
          ? 'border-red-400'
          : produkt.days_left <= 3
            ? 'border-bursztyn-400'
            : 'border-zielony-400'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-slate-900 truncate">{produkt.name}</span>
            {badgeStatus(produkt.days_left)}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {produkt.quantity} {produkt.unit} · {produkt.category}
          </p>
        </div>
        <button
          onClick={() => setRozwiniety(r => !r)}
          className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1 shrink-0"
        >
          {rozwiniety ? '−' : '···'}
        </button>
      </div>
      {rozwiniety && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2 flex-wrap">
          <button className="btn-primary text-sm py-1" onClick={() => onAkcja('eaten')}>Zjedzone</button>
          <button className="btn-secondary text-sm py-1" onClick={() => onAkcja('wasted')}>Wyrzucone</button>
          <button className="btn-secondary text-sm py-1" onClick={() => onAkcja('shared')}>Oddaj</button>
        </div>
      )}
    </div>
  )
}

export default function Spizarnia() {
  const queryClient = useQueryClient()
  const [formularzOtwarty, setFormularzOtwarty] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('inne')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState('szt.')
  const [expiresAt, setExpiresAt] = useState('')

  const { data: produkty = [], isLoading, error } = useQuery({
    queryKey: ['spizarnia'],
    queryFn: () => spizarnia.lista().then(r => r.data),
  })

  const mutacjaDodaj = useMutation({
    mutationFn: (dane: Partial<Produkt>) => spizarnia.dodaj(dane).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spizarnia'] })
      resetFormularz()
    },
  })

  const mutacjaAkcja = useMutation({
    mutationFn: ({ id, action }: { id: number; action: string }) =>
      spizarnia.akcja(id, action).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['spizarnia'] }),
  })

  function resetFormularz() {
    setName('')
    setCategory('inne')
    setQuantity('1')
    setUnit('szt.')
    setExpiresAt('')
    setFormularzOtwarty(false)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    mutacjaDodaj.mutate({
      name,
      category,
      quantity: parseFloat(quantity),
      unit,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    })
  }

  const przeterminowane = produkty.filter(p => p.days_left !== undefined && p.days_left !== null && p.days_left < 0)
  const naWylocie = produkty.filter(p => p.days_left !== undefined && p.days_left !== null && p.days_left >= 0 && p.days_left <= 3)
  const swieże = produkty.filter(p => p.days_left === undefined || p.days_left === null || p.days_left > 3)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Spiżarnia</h1>
        <button
          className="btn-primary text-sm"
          onClick={() => setFormularzOtwarty(f => !f)}
        >
          {formularzOtwarty ? 'Anuluj' : '+ Dodaj produkt'}
        </button>
      </div>

      {formularzOtwarty && (
        <form onSubmit={submit} className="karta space-y-3">
          <h2 className="font-medium text-slate-800">Nowy produkt</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nazwa</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} required placeholder="np. Mleko 3,2%" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ilość</label>
              <input className="input" type="number" min="0.01" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Jednostka</label>
              <select className="input" value={unit} onChange={e => setUnit(e.target.value)}>
                {JEDNOSTKI.map(j => <option key={j}>{j}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Kategoria</label>
            <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
              {KATEGORIE.map(k => <option key={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Termin ważności <span className="text-slate-400 font-normal">(opcjonalnie)</span>
            </label>
            <input className="input" type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
          </div>
          {mutacjaDodaj.error && (
            <p className="text-sm text-red-600">Błąd zapisu. Spróbuj ponownie.</p>
          )}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={mutacjaDodaj.isPending}>
              {mutacjaDodaj.isPending ? 'Zapisuję...' : 'Dodaj'}
            </button>
            <button type="button" className="btn-secondary" onClick={resetFormularz}>Anuluj</button>
          </div>
        </form>
      )}

      {isLoading && <p className="text-sm text-slate-500 text-center py-8">Ładowanie...</p>}
      {error && <p className="text-sm text-red-600 text-center py-8">Błąd ładowania spiżarni</p>}

      {!isLoading && produkty.length === 0 && (
        <div className="karta text-center py-10 text-slate-500">
          <p className="font-medium">Spiżarnia jest pusta</p>
          <p className="text-sm mt-1">Dodaj pierwsze produkty klikając przycisk powyżej</p>
        </div>
      )}

      {przeterminowane.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-red-600 uppercase tracking-wide mb-2">Przeterminowane</h2>
          <div className="space-y-2">
            {przeterminowane.map(p => (
              <KartaProduktu key={p.id} produkt={p} onAkcja={action => mutacjaAkcja.mutate({ id: p.id, action })} />
            ))}
          </div>
        </section>
      )}

      {naWylocie.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-bursztyn-600 uppercase tracking-wide mb-2">Na wylocie</h2>
          <div className="space-y-2">
            {naWylocie.map(p => (
              <KartaProduktu key={p.id} produkt={p} onAkcja={action => mutacjaAkcja.mutate({ id: p.id, action })} />
            ))}
          </div>
        </section>
      )}

      {swieże.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Świeże</h2>
          <div className="space-y-2">
            {swieże.map(p => (
              <KartaProduktu key={p.id} produkt={p} onAkcja={action => mutacjaAkcja.mutate({ id: p.id, action })} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
