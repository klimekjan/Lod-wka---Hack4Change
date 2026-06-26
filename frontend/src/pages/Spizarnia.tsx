import { useState, FormEvent, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { spizarnia, Produkt } from '../lib/api'
import BarcodeScanner from '../components/BarcodeScanner'

const KATEGORIE = [
  'nabiał', 'mięso surowe', 'ryby', 'warzywa liściaste',
  'warzywa twarde', 'owoce', 'pieczywo', 'jajka', 'napoje', 'przetwory', 'inne',
]
const JEDNOSTKI = ['szt.', 'kg', 'g', 'l', 'ml', 'opak.']

function StatusBadge({ dniDo }: { dniDo?: number | null }) {
  if (dniDo === undefined || dniDo === null) return null
  if (dniDo < 0) return <span className="badge-przeterminowany">przeterminowany</span>
  if (dniDo === 0) return <span className="badge-wylot">dziś</span>
  if (dniDo <= 3) return <span className="badge-wylot">{dniDo} {dniDo === 1 ? 'dzień' : 'dni'}</span>
  return <span className="badge-swiezy">{dniDo} dni</span>
}

function borderKolor(dniDo?: number | null) {
  if (dniDo === undefined || dniDo === null) return 'border-slate-200'
  if (dniDo < 0) return 'border-red-400'
  if (dniDo <= 3) return 'border-bursztyn-400'
  return 'border-zielony-400'
}

function KartaProduktu({
  produkt,
  onAkcja,
}: {
  produkt: Produkt
  onAkcja: (action: string) => void
}) {
  const [otwarty, setOtwarty] = useState(false)

  return (
    <div className={`karta border-l-4 ${borderKolor(produkt.days_left)}`}>
      <div className="flex items-start justify-between gap-3">
        {produkt.image_url && (
          <img
            src={produkt.image_url}
            alt={produkt.name}
            className="w-10 h-10 object-contain rounded shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-slate-900 truncate">{produkt.name}</span>
            <StatusBadge dniDo={produkt.days_left} />
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {produkt.quantity} {produkt.unit}
            {produkt.category !== 'inne' && ` · ${produkt.category}`}
          </p>
        </div>
        <button
          onClick={() => setOtwarty(o => !o)}
          className="shrink-0 text-slate-400 hover:text-slate-700 font-bold text-lg leading-none px-1"
          aria-label="Opcje"
        >
          {otwarty ? '−' : '···'}
        </button>
      </div>
      {otwarty && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2 flex-wrap">
          <button className="btn-primary text-sm py-1.5 px-3" onClick={() => onAkcja('eaten')}>
            Zjedzone
          </button>
          <button className="btn-secondary text-sm py-1.5 px-3" onClick={() => onAkcja('wasted')}>
            Wyrzucone
          </button>
          <button className="btn-secondary text-sm py-1.5 px-3" onClick={() => onAkcja('shared')}>
            Oddaj
          </button>
        </div>
      )}
    </div>
  )
}

interface FormState {
  name: string
  category: string
  quantity: string
  unit: string
  expiresAt: string
  imageUrl: string
}

const defaultForm: FormState = {
  name: '',
  category: 'inne',
  quantity: '1',
  unit: 'szt.',
  expiresAt: '',
  imageUrl: '',
}

export default function Spizarnia() {
  const queryClient = useQueryClient()
  const [formularzOtwarty, setFormularzOtwarty] = useState(false)
  const [skanerOtwarty, setSkanerOtwarty] = useState(false)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [skanBlad, setSkanBlad] = useState('')
  const [akcjaOk, setAkcjaOk] = useState('')
  const [brakAdresu, setBrakAdresu] = useState(false)

  const { data: produkty = [], isLoading, error } = useQuery({
    queryKey: ['spizarnia'],
    queryFn: () => spizarnia.lista().then(r => r.data),
  })

  const mutacjaDodaj = useMutation({
    mutationFn: (dane: Partial<Produkt>) => spizarnia.dodaj(dane).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spizarnia'] })
      setForm(defaultForm)
      setFormularzOtwarty(false)
    },
  })

  const mutacjaAkcja = useMutation({
    mutationFn: ({ id, action }: { id: number; action: string }) =>
      spizarnia.akcja(id, action).then(r => r.data),
    onSuccess: (_data, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['spizarnia'] })
      setBrakAdresu(false)
      if (action === 'shared') {
        setAkcjaOk('Wystawiono na wymianę — produkt jest już na mapie.')
        setTimeout(() => setAkcjaOk(''), 4000)
      }
    },
    onError: (err: AxiosError<{ detail?: string }>, { action }) => {
      if (action === 'shared' && err.response?.status === 400) {
        setBrakAdresu(true)
      }
    },
  })

  const handleScan = useCallback(async (barcode: string) => {
    setSkanBlad('')
    try {
      const res = await spizarnia.skanuj(barcode)
      const d = res.data
      if (!d.found || !d.name) {
        setSkanerOtwarty(false)
        setSkanBlad(`Kod ${barcode} nie znaleziony w bazie. Wpisz ręcznie.`)
        setFormularzOtwarty(true)
        setForm(f => ({ ...f, name: '' }))
        return
      }
      const expiresAt = d.default_shelf_days
        ? new Date(Date.now() + d.default_shelf_days * 86400_000).toISOString().slice(0, 10)
        : ''
      setForm({
        name: d.name,
        category: d.category || 'inne',
        quantity: '1',
        unit: 'szt.',
        expiresAt,
        imageUrl: d.image_url || '',
      })
      setSkanerOtwarty(false)
      setFormularzOtwarty(true)
    } catch {
      setSkanerOtwarty(false)
      setSkanBlad('Błąd połączenia podczas skanowania.')
      setFormularzOtwarty(true)
    }
  }, [])

  function submit(e: FormEvent) {
    e.preventDefault()
    mutacjaDodaj.mutate({
      name: form.name,
      category: form.category,
      quantity: parseFloat(form.quantity),
      unit: form.unit,
      expires_at: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      image_url: form.imageUrl || undefined,
    })
  }

  function setField<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  const przeterminowane = produkty.filter(p => p.days_left !== undefined && p.days_left !== null && p.days_left < 0)
  const naWylocie = produkty.filter(p => p.days_left !== undefined && p.days_left !== null && p.days_left >= 0 && p.days_left <= 3)
  const swieże = produkty.filter(p => p.days_left === undefined || p.days_left === null || p.days_left > 3)

  return (
    <div className="space-y-4">
      {skanerOtwarty && (
        <BarcodeScanner onScan={handleScan} onClose={() => setSkanerOtwarty(false)} />
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Spiżarnia</h1>
        <div className="flex gap-2">
          <button
            className="btn-secondary text-sm"
            onClick={() => { setSkanBlad(''); setSkanerOtwarty(true) }}
          >
            Skanuj
          </button>
          <button
            className="btn-primary text-sm"
            onClick={() => { setForm(defaultForm); setSkanBlad(''); setFormularzOtwarty(f => !f) }}
          >
            {formularzOtwarty ? 'Anuluj' : '+ Dodaj'}
          </button>
        </div>
      </div>

      {skanBlad && (
        <div className="bg-bursztyn-50 border border-bursztyn-400 text-bursztyn-600 text-sm px-3 py-2 rounded-lg">
          {skanBlad}
        </div>
      )}

      {akcjaOk && (
        <div className="bg-zielony-50 border border-zielony-200 text-zielony-700 text-sm px-3 py-2 rounded-lg">
          {akcjaOk}
        </div>
      )}

      {brakAdresu && (
        <div className="bg-bursztyn-50 border border-bursztyn-400 text-bursztyn-600 text-sm px-3 py-2 rounded-lg flex items-center justify-between gap-3">
          <span>Żeby oddać produkt na mapie, najpierw ustaw adres w profilu.</span>
          <Link to="/ustawienia" className="btn-primary text-xs py-1 px-3 shrink-0">
            Ustawienia
          </Link>
        </div>
      )}

      {formularzOtwarty && (
        <form onSubmit={submit} className="karta space-y-3">
          {!form.imageUrl && (
            <h2 className="font-semibold text-slate-800">Nowy produkt</h2>
          )}
          <div className="flex items-start gap-3">
            {form.imageUrl && (
              <img
                src={form.imageUrl}
                alt={form.name}
                className="w-14 h-14 object-contain rounded-lg border border-slate-100 shrink-0 mt-5"
              />
            )}
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nazwa</label>
              <input
                className="input"
                value={form.name}
                onChange={e => setField('name', e.target.value)}
                required
                placeholder="np. Mleko 3,2%"
                autoFocus
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ilość</label>
              <input
                className="input"
                type="number"
                min="0.01"
                step="0.01"
                value={form.quantity}
                onChange={e => setField('quantity', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Jednostka</label>
              <select className="input" value={form.unit} onChange={e => setField('unit', e.target.value)}>
                {JEDNOSTKI.map(j => <option key={j}>{j}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Kategoria</label>
            <select className="input" value={form.category} onChange={e => setField('category', e.target.value)}>
              {KATEGORIE.map(k => <option key={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Termin ważności
              <span className="text-slate-400 font-normal ml-1">(opcjonalnie)</span>
            </label>
            <input
              className="input"
              type="date"
              value={form.expiresAt}
              onChange={e => setField('expiresAt', e.target.value)}
            />
          </div>
          {mutacjaDodaj.error && (
            <p className="text-sm text-red-600">Błąd zapisu — spróbuj ponownie.</p>
          )}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={mutacjaDodaj.isPending}>
              {mutacjaDodaj.isPending ? 'Zapisuję...' : 'Dodaj'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { setForm(defaultForm); setFormularzOtwarty(false) }}
            >
              Anuluj
            </button>
          </div>
        </form>
      )}

      {isLoading && <p className="text-sm text-slate-500 text-center py-10">Ładowanie...</p>}
      {error && <p className="text-sm text-red-600 text-center py-10">Błąd ładowania spiżarni</p>}

      {!isLoading && produkty.length === 0 && (
        <div className="karta text-center py-12">
          <p className="font-medium text-slate-700">Spiżarnia jest pusta</p>
          <p className="text-sm text-slate-400 mt-1">
            Dodaj produkty ręcznie lub klikając "Skanuj"
          </p>
        </div>
      )}

      {przeterminowane.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-red-600 uppercase tracking-widest mb-2">
            Przeterminowane ({przeterminowane.length})
          </h2>
          <div className="space-y-2">
            {przeterminowane.map(p => (
              <KartaProduktu
                key={p.id}
                produkt={p}
                onAkcja={action => mutacjaAkcja.mutate({ id: p.id, action })}
              />
            ))}
          </div>
        </section>
      )}

      {naWylocie.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-bursztyn-600 uppercase tracking-widest mb-2">
            Na wylocie ({naWylocie.length})
          </h2>
          <div className="space-y-2">
            {naWylocie.map(p => (
              <KartaProduktu
                key={p.id}
                produkt={p}
                onAkcja={action => mutacjaAkcja.mutate({ id: p.id, action })}
              />
            ))}
          </div>
        </section>
      )}

      {swieże.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
            Świeże ({swieże.length})
          </h2>
          <div className="space-y-2">
            {swieże.map(p => (
              <KartaProduktu
                key={p.id}
                produkt={p}
                onAkcja={action => mutacjaAkcja.mutate({ id: p.id, action })}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
