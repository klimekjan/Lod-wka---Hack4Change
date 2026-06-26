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

function kolorDaty(dniDo?: number | null): string {
  if (dniDo === undefined || dniDo === null) return 'bg-slate-800/50 text-white'
  if (dniDo < 0)  return 'bg-red-600/80 text-white'
  if (dniDo <= 2) return 'bg-orange-500/80 text-white'
  if (dniDo <= 5) return 'bg-bursztyn-500/80 text-white'
  if (dniDo <= 10) return 'bg-zielony-600/80 text-white'
  return 'bg-blue-500/80 text-white'
}

function formatData(expiresAt?: string | null): string {
  if (!expiresAt) return ''
  const d = new Date(expiresAt)
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
}

function KafelekProduktu({
  produkt,
  onAkcja,
}: {
  produkt: Produkt
  onAkcja: (action: string) => void
}) {
  const [otwarty, setOtwarty] = useState(false)

  return (
    <div
      className="relative aspect-square rounded-xl overflow-hidden cursor-pointer select-none bg-slate-100"
      onClick={() => setOtwarty(o => !o)}
    >
      {produkt.image_url ? (
        <img
          src={produkt.image_url}
          alt={produkt.name}
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-4xl text-slate-300">
          🥫
        </div>
      )}

      {/* Data ważności — góra lewa */}
      {produkt.expires_at && (
        <span className={`absolute top-1.5 left-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md backdrop-blur-sm ${kolorDaty(produkt.days_left)}`}>
          {formatData(produkt.expires_at)}
        </span>
      )}

      {/* Ilość — góra prawa */}
      <span className="absolute top-1.5 right-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-black/40 text-white backdrop-blur-sm">
        {produkt.quantity} {produkt.unit}
      </span>

      {/* Nazwa — dół */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-2 pt-4 pb-1.5">
        <p className="text-white text-xs font-medium truncate leading-tight">{produkt.name}</p>
      </div>

      {/* Akcje — overlay po tapnięciu */}
      {otwarty && (
        <div
          className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center gap-2 p-2"
          onClick={e => e.stopPropagation()}
        >
          <button
            className="w-full bg-zielony-600 text-white text-xs font-semibold py-1.5 rounded-lg active:bg-zielony-700"
            onClick={() => { onAkcja('eaten'); setOtwarty(false) }}
          >
            Zjedzone
          </button>
          <button
            className="w-full bg-white/20 text-white text-xs font-semibold py-1.5 rounded-lg active:bg-white/30"
            onClick={() => { onAkcja('wasted'); setOtwarty(false) }}
          >
            Wyrzucone
          </button>
          <button
            className="w-full bg-white/20 text-white text-xs font-semibold py-1.5 rounded-lg active:bg-white/30"
            onClick={() => { onAkcja('shared'); setOtwarty(false) }}
          >
            Oddaj
          </button>
          <button
            className="mt-1 text-white/60 text-xs"
            onClick={() => setOtwarty(false)}
          >
            ✕ zamknij
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
          <div className="grid grid-cols-3 gap-2">
            {przeterminowane.map(p => (
              <KafelekProduktu
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
          <div className="grid grid-cols-3 gap-2">
            {naWylocie.map(p => (
              <KafelekProduktu
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
          <div className="grid grid-cols-3 gap-2">
            {swieże.map(p => (
              <KafelekProduktu
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
