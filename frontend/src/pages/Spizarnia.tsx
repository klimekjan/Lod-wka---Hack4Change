import { useState, FormEvent, useCallback, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { spizarnia, wydarzenia as wydarzeniaApi, Produkt } from '../lib/api'
import BarcodeScanner from '../components/BarcodeScanner'

const KATEGORIE = [
  'nabiał', 'mięso surowe', 'ryby', 'warzywa liściaste',
  'warzywa twarde', 'owoce', 'pieczywo', 'jajka', 'napoje', 'przetwory', 'inne',
]
const JEDNOSTKI = ['szt.', 'kg', 'g', 'l', 'ml', 'opak.']

const SHELF_LIFE: Record<string, { lodowka: number; zamrazarka: number }> = {
  'nabiał':            { lodowka: 10,  zamrazarka: 180 },
  'mięso surowe':      { lodowka: 3,   zamrazarka: 120 },
  'ryby':              { lodowka: 3,   zamrazarka: 90  },
  'warzywa liściaste': { lodowka: 5,   zamrazarka: 12  },
  'warzywa twarde':    { lodowka: 12,  zamrazarka: 90  },
  'owoce':             { lodowka: 10,  zamrazarka: 180 },
  'pieczywo':          { lodowka: 5,   zamrazarka: 60  },
  'jajka':             { lodowka: 28,  zamrazarka: 180 },
  'napoje':            { lodowka: 5,   zamrazarka: 180 },
  'przetwory':         { lodowka: 30,  zamrazarka: 365 },
  'inne':              { lodowka: 7,   zamrazarka: 90  },
}

function obliczDateWaznosci(kategoria: string, frozen: boolean): string {
  const sl = SHELF_LIFE[kategoria] ?? SHELF_LIFE['inne']
  const dni = frozen ? sl.zamrazarka : sl.lodowka
  const d = new Date()
  d.setDate(d.getDate() + dni)
  return d.toISOString().slice(0, 10)
}

const _WAGA_SZT: Record<string, number> = {
  'nabiał': 0.15, 'mięso surowe': 0.20, 'ryby': 0.15, 'warzywa liściaste': 0.12,
  'warzywa twarde': 0.15, 'owoce': 0.15, 'pieczywo': 0.08, 'jajka': 0.06,
  'napoje': 0.33, 'przetwory': 0.35, 'inne': 0.15,
}
const _WAGA_OPAK: Record<string, number> = {
  'nabiał': 0.50, 'mięso surowe': 0.35, 'ryby': 0.25, 'warzywa liściaste': 0.20,
  'warzywa twarde': 0.40, 'owoce': 0.50, 'pieczywo': 0.45, 'jajka': 0.60,
  'napoje': 0.75, 'przetwory': 0.40, 'inne': 0.30,
}

function szacujKgFrontend(quantity: number, unit: string, category: string): number {
  const u = unit.trim().toLowerCase()
  if (u === 'kg')   return quantity
  if (u === 'g')    return quantity * 0.001
  if (u === 'dag')  return quantity * 0.01
  if (u === 'l')    return quantity
  if (u === 'ml')   return quantity * 0.001
  if (u === 'szt.') return quantity * (_WAGA_SZT[category] ?? 0.15)
  if (u === 'opak.') return quantity * (_WAGA_OPAK[category] ?? 0.30)
  return quantity * 0.15
}

function kolorDaty(dniDo?: number | null): string {
  if (dniDo === undefined || dniDo === null) return 'bg-grafit-700/80 text-grafit-100'
  if (dniDo < 0)  return 'bg-red-600/80 text-white'
  if (dniDo <= 2) return 'bg-orange-500/80 text-white'
  if (dniDo <= 5) return 'bg-bursztyn-500/80 text-white'
  if (dniDo <= 10) return 'bg-zielony-600/80 text-white'
  return 'bg-grafit-500/80 text-grafit-100'
}

function formatData(expiresAt?: string | null): string {
  if (!expiresAt) return ''
  const d = new Date(expiresAt)
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
}

function KafelekProduktu({
  produkt,
  onAkcja,
  trybWyboru = false,
  zaznaczony = false,
  onToggle,
}: {
  produkt: Produkt
  onAkcja: (action: string, weightKg?: number) => void
  trybWyboru?: boolean
  zaznaczony?: boolean
  onToggle?: () => void
}) {
  const [otwarty, setOtwarty] = useState(false)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [weightInput, setWeightInput] = useState('')

  function wybierzAkcje(action: string) {
    setPendingAction(action)
    setWeightInput('')
  }

  function potwierdz() {
    if (!pendingAction) return
    const kg = parseFloat(weightInput)
    onAkcja(pendingAction, isNaN(kg) || kg <= 0 ? undefined : kg)
    setPendingAction(null)
    setOtwarty(false)
  }

  function pomin() {
    if (!pendingAction) return
    onAkcja(pendingAction)
    setPendingAction(null)
    setOtwarty(false)
  }

  const szacunek = szacujKgFrontend(produkt.quantity, produkt.unit, produkt.category)

  function handleClick() {
    if (trybWyboru) {
      onToggle?.()
    } else {
      setOtwarty(o => !o)
    }
  }

  return (
    <div
      className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer select-none bg-grafit-700 transition-all ${
        trybWyboru && zaznaczony ? 'ring-2 ring-limonka-400' : ''
      } ${trybWyboru && !zaznaczony ? 'opacity-60' : ''}`}
      onClick={handleClick}
    >
      {produkt.image_url ? (
        <img
          src={produkt.image_url}
          alt={produkt.name}
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      ) : (
        <div className="w-full h-full bg-grafit-700" />
      )}

      {produkt.expires_at && (
        <span className={`absolute top-1.5 left-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md backdrop-blur-sm ${kolorDaty(produkt.days_left)}`}>
          {formatData(produkt.expires_at)}
        </span>
      )}

      <span className="absolute top-1.5 right-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-black/40 text-white backdrop-blur-sm">
        {produkt.quantity} {produkt.unit}
      </span>

      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-2 pt-4 pb-1.5">
        <p className="text-white text-xs font-medium truncate leading-tight">{produkt.name}</p>
        {!trybWyboru && produkt.event_name && (
          <p className="text-[9px] font-medium truncate" style={{ color: '#c084fc' }}>
            → {produkt.event_name}
          </p>
        )}
      </div>

      {trybWyboru && zaznaczony && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 rounded-full bg-limonka-400 flex items-center justify-center shadow-lg">
            <span className="text-grafit-900 font-bold text-lg leading-none">✓</span>
          </div>
        </div>
      )}

      {!trybWyboru && otwarty && (
        <div
          className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center gap-2 p-2"
          onClick={e => e.stopPropagation()}
        >
          {pendingAction === null ? (
            <>
              <button
                className="w-full bg-limonka-400 text-grafit-900 text-xs font-semibold py-1.5 rounded-full active:bg-limonka-500"
                onClick={() => wybierzAkcje('eaten')}
              >
                Zjedzone
              </button>
              <button
                className="w-full bg-white/20 text-white text-xs font-semibold py-1.5 rounded-full active:bg-white/30"
                onClick={() => wybierzAkcje('wasted')}
              >
                Wyrzucone
              </button>
              <button
                className="w-full bg-white/20 text-white text-xs font-semibold py-1.5 rounded-full active:bg-white/30"
                onClick={() => wybierzAkcje('shared')}
              >
                Oddaj
              </button>
              <button
                className="mt-1 text-white/60 text-xs"
                onClick={() => setOtwarty(false)}
              >
                zamknij
              </button>
            </>
          ) : (
            <>
              <p className="text-white text-xs font-semibold text-center">Podaj wagę (opcjonalnie)</p>
              <p className="text-white/50 text-[10px] text-center">
                szacunek: ~{szacunek.toFixed(2)} kg
              </p>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder={`np. ${szacunek.toFixed(2)}`}
                value={weightInput}
                onChange={e => setWeightInput(e.target.value)}
                onClick={e => e.stopPropagation()}
                className="w-full text-center bg-white/15 text-white text-sm rounded-lg py-1.5 outline-none placeholder-white/40"
                autoFocus
              />
              <p className="text-white/40 text-[9px] text-center -mt-1">
                Dokładna waga poprawia statystyki Trackera
              </p>
              <button
                className="w-full bg-limonka-400 text-grafit-900 text-xs font-semibold py-1.5 rounded-full"
                onClick={potwierdz}
              >
                Potwierdź
              </button>
              <button
                className="text-white/60 text-xs"
                onClick={pomin}
              >
                Pomiń wagę
              </button>
            </>
          )}
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
  frozen: boolean
}

const defaultForm: FormState = {
  name: '',
  category: 'inne',
  quantity: '1',
  unit: 'szt.',
  expiresAt: obliczDateWaznosci('inne', false),
  imageUrl: '',
  frozen: false,
}

export default function Spizarnia() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const wydarzenieIdParam = searchParams.get('wydarzenie')
  const wydarzenieId = wydarzenieIdParam ? parseInt(wydarzenieIdParam, 10) : null

  const [formularzOtwarty, setFormularzOtwarty] = useState(false)
  const [skanerOtwarty, setSkanerOtwarty] = useState(false)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [skanBlad, setSkanBlad] = useState('')
  const [akcjaOk, setAkcjaOk] = useState('')
  const [brakAdresu, setBrakAdresu] = useState(false)
  const [zaznaczone, setZaznaczone] = useState<Set<number>>(new Set())
  const [kategoriaRecznie, setKategoriaRecznie] = useState(false)
  const [nazwaZeSkanu, setNazwaZeSkanu] = useState(false)
  const [kategoriaAutoUstawiona, setKategoriaAutoUstawiona] = useState(false)

  const { data: produkty = [], isLoading, error } = useQuery({
    queryKey: ['spizarnia', 'active'],
    queryFn: () => spizarnia.lista().then(r => r.data),
  })

  const { data: wydarzenieSzczegoly } = useQuery({
    queryKey: ['wydarzenie', wydarzenieId],
    queryFn: () => wydarzeniaApi.szczegoly(wydarzenieId!).then(r => r.data),
    enabled: wydarzenieId !== null,
  })

  useEffect(() => {
    if (wydarzenieId !== null && produkty.length > 0) {
      setZaznaczone(new Set(produkty.filter(p => p.event_id === wydarzenieId).map(p => p.id)))
    }
  }, [wydarzenieId, produkty])

  useEffect(() => {
    if (form.name.length < 3 || kategoriaRecznie || nazwaZeSkanu) return
    const timer = setTimeout(async () => {
      try {
        const res = await spizarnia.kategoria(form.name)
        const kat = res.data.kategoria
        if (kat !== 'inne') {
          setField('category', kat)
          setKategoriaAutoUstawiona(true)
        }
      } catch {/* ignore */}
    }, 500)
    return () => clearTimeout(timer)
  }, [form.name, kategoriaRecznie, nazwaZeSkanu])

  const mutacjaDodaj = useMutation({
    mutationFn: (dane: Partial<Produkt>) => spizarnia.dodaj(dane).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spizarnia'] })
      setForm(defaultForm)
      setFormularzOtwarty(false)
      setKategoriaRecznie(false)
      setNazwaZeSkanu(false)
      setKategoriaAutoUstawiona(false)
    },
  })

  const mutacjaAkcja = useMutation({
    mutationFn: ({ id, action, weightKg }: { id: number; action: string; weightKg?: number }) =>
      spizarnia.akcja(id, action, undefined, weightKg).then(r => r.data),
    onSuccess: (_data, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['spizarnia'] })
      setBrakAdresu(false)
      if (action === 'shared') {
        setAkcjaOk('Wystawiono na wymianę -- produkt jest już na mapie.')
        setTimeout(() => setAkcjaOk(''), 4000)
      }
    },
    onError: (err: AxiosError<{ detail?: string }>, { action }) => {
      if (action === 'shared' && err.response?.status === 400) {
        setBrakAdresu(true)
      }
    },
  })

  const mutacjaPrzekazProdukty = useMutation({
    mutationFn: ({ id, ids }: { id: number; ids: number[] }) =>
      wydarzeniaApi.przekazProdukty(id, ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spizarnia'] })
      queryClient.invalidateQueries({ queryKey: ['wydarzenie', wydarzenieId] })
      navigate('/spolecznosc')
    },
  })

  async function _wypełnijFormularz(pobierz: () => ReturnType<typeof spizarnia.skanuj>, etykieta: string) {
    setSkanBlad('')
    try {
      const res = await pobierz()
      const d = res.data
      if (!d.found || !d.name) {
        setSkanerOtwarty(false)
        setSkanBlad(`${etykieta} nie znaleziony w bazie.`)
        setFormularzOtwarty(true)
        setForm(f => ({ ...f, name: '' }))
        return
      }
      const cat = d.category || 'inne'
      setForm(prev => ({
        name: d.name ?? '',
        category: cat,
        quantity: '1',
        unit: 'szt.',
        expiresAt: obliczDateWaznosci(cat, prev.frozen),
        imageUrl: d.image_url || '',
        frozen: prev.frozen,
      }))
      setNazwaZeSkanu(true)
      setKategoriaRecznie(false)
      setKategoriaAutoUstawiona(false)
      setSkanerOtwarty(false)
      setFormularzOtwarty(true)
    } catch {
      setSkanerOtwarty(false)
      setSkanBlad('Błąd połączenia.')
      setFormularzOtwarty(true)
    }
  }

  const handleScan = useCallback((barcode: string) => {
    _wypełnijFormularz(() => spizarnia.skanuj(barcode), `Kod ${barcode}`)
  }, [])

  const handleSearch = useCallback((query: string) => {
    _wypełnijFormularz(() => spizarnia.szukaj(query), `"${query}"`)
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
    setForm(f => {
      const next = { ...f, [key]: val }
      if (key === 'category' || key === 'frozen') {
        next.expiresAt = obliczDateWaznosci(
          key === 'category' ? (val as string) : next.category,
          key === 'frozen' ? (val as boolean) : next.frozen,
        )
      }
      return next
    })
  }

  function toggleZaznaczenie(id: number) {
    setZaznaczone(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function zatwierdzWybor() {
    if (wydarzenieId === null) return
    mutacjaPrzekazProdukty.mutate({ id: wydarzenieId, ids: [...zaznaczone] })
  }

  const krotkoterminowe = produkty.filter(p => p.days_left !== undefined && p.days_left !== null && p.days_left < 7)
  const sredniotrwale = produkty.filter(p => p.days_left !== undefined && p.days_left !== null && p.days_left >= 7 && p.days_left < 30)
  const dlugoterminowe = produkty.filter(p => p.days_left === undefined || p.days_left === null || p.days_left >= 30)

  const trybWyboru = wydarzenieId !== null
  const nazwaNazwy = wydarzenieSzczegoly?.name ?? `wydarzenie #${wydarzenieId}`

  return (
    <div className="space-y-4">
      {skanerOtwarty && (
        <BarcodeScanner onScan={handleScan} onSearch={handleSearch} onClose={() => setSkanerOtwarty(false)} />
      )}

      {trybWyboru && (
        <div className="rounded-xl px-4 py-3 space-y-2" style={{ background: '#9333ea22', border: '1px solid #9333ea55' }}>
          <p className="font-semibold" style={{ color: '#c084fc' }}>
            Wybierz produkty na: {nazwaNazwy}
          </p>
          <p className="text-xs text-grafit-400">
            Kliknij kafelki żeby zaznaczyć/odznaczyć. Zaznaczono: {zaznaczone.size}.
          </p>
          <div className="flex gap-2">
            <button
              className="btn text-sm py-1.5"
              style={{ background: '#9333ea' }}
              onClick={zatwierdzWybor}
              disabled={mutacjaPrzekazProdukty.isPending}
            >
              {mutacjaPrzekazProdukty.isPending ? 'Zapisuję...' : `Zatwierdź (${zaznaczone.size})`}
            </button>
            <button
              className="btn-ghost text-sm py-1.5"
              onClick={() => navigate('/spolecznosc')}
            >
              Anuluj
            </button>
          </div>
        </div>
      )}

      {!trybWyboru && (
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold text-grafit-100">Spiżarnia</h1>
          <div className="flex gap-2">
            <button
              className="btn-ghost text-sm"
              onClick={() => { setSkanBlad(''); setSkanerOtwarty(true) }}
            >
              Skanuj
            </button>
            <button
              className="btn text-sm"
              onClick={() => { setForm(defaultForm); setSkanBlad(''); setFormularzOtwarty(f => !f) }}
            >
              {formularzOtwarty ? 'Anuluj' : '+ Dodaj'}
            </button>
          </div>
        </div>
      )}

      {trybWyboru && (
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold text-grafit-100">Spiżarnia</h1>
        </div>
      )}

      {skanBlad && (
        <div className="bg-bursztyn-500/10 border border-bursztyn-500/40 text-bursztyn-400 text-sm px-3 py-2 rounded-lg">
          {skanBlad}
        </div>
      )}

      {akcjaOk && (
        <div className="bg-zielony-500/10 border border-zielony-500/30 text-zielony-400 text-sm px-3 py-2 rounded-lg">
          {akcjaOk}
        </div>
      )}

      {brakAdresu && (
        <div className="bg-bursztyn-500/10 border border-bursztyn-500/40 text-bursztyn-400 text-sm px-3 py-2 rounded-lg flex items-center justify-between gap-3">
          <span>Żeby oddać produkt na mapie, najpierw ustaw adres w profilu.</span>
          <Link to="/ustawienia" className="btn text-xs py-1 px-3 shrink-0">
            Ustawienia
          </Link>
        </div>
      )}

      {!trybWyboru && formularzOtwarty && (
        <form onSubmit={submit} className="karta space-y-3">
          {!form.imageUrl && (
            <h2 className="font-semibold text-grafit-100">Nowy produkt</h2>
          )}
          <div className="flex items-start gap-3">
            {form.imageUrl && (
              <img
                src={form.imageUrl}
                alt={form.name}
                className="w-14 h-14 object-contain rounded-lg border border-grafit-600 shrink-0 mt-5"
              />
            )}
            <div className="flex-1">
              <label className="block text-sm font-medium text-grafit-300 mb-1">Nazwa</label>
              <input
                className="input"
                value={form.name}
                onChange={e => { if (nazwaZeSkanu) setNazwaZeSkanu(false); setField('name', e.target.value) }}
                required
                placeholder="np. Mleko 3,2%"
                autoFocus
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-grafit-300 mb-1">Ilość</label>
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
              <label className="block text-sm font-medium text-grafit-300 mb-1">Jednostka</label>
              <select className="input" value={form.unit} onChange={e => setField('unit', e.target.value)}>
                {JEDNOSTKI.map(j => <option key={j}>{j}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-grafit-300 mb-1">Kategoria</label>
            <select className="input" value={form.category} onChange={e => { setKategoriaRecznie(true); setKategoriaAutoUstawiona(false); setField('category', e.target.value) }}>
              {KATEGORIE.map(k => <option key={k}>{k}</option>)}
            </select>
            {kategoriaAutoUstawiona && (
              <p className="text-xs text-zielony-400 mt-1">dobrana automatycznie</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-grafit-300 mb-1">
              Termin ważności
              <span className="text-grafit-400 font-normal ml-1">(auto z kategorii)</span>
            </label>
            <input
              className="input"
              type="date"
              value={form.expiresAt}
              onChange={e => setField('expiresAt', e.target.value)}
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              className={`w-10 h-5 rounded-full transition-colors relative ${form.frozen ? 'bg-blue-500' : 'bg-grafit-600'}`}
              onClick={() => setField('frozen', !form.frozen)}
            >
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.frozen ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
            <span className="text-sm text-grafit-300">
              W zamrażarce
            </span>
          </label>
          {mutacjaDodaj.error && (
            <p className="text-sm text-red-400">Błąd zapisu -- spróbuj ponownie.</p>
          )}
          <div className="flex gap-2">
            <button type="submit" className="btn" disabled={mutacjaDodaj.isPending}>
              {mutacjaDodaj.isPending ? 'Zapisuję...' : 'Dodaj'}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => { setForm(defaultForm); setFormularzOtwarty(false); setKategoriaRecznie(false); setNazwaZeSkanu(false); setKategoriaAutoUstawiona(false) }}
            >
              Anuluj
            </button>
          </div>
        </form>
      )}

      {isLoading && <p className="text-sm text-grafit-400 text-center py-10">Ładowanie...</p>}
      {error && <p className="text-sm text-red-400 text-center py-10">Błąd ładowania spiżarni</p>}

      {!isLoading && produkty.length === 0 && (
        <div className="karta text-center py-12">
          <p className="font-medium text-grafit-100">Spiżarnia jest pusta</p>
          <p className="text-sm text-grafit-400 mt-1">
            Dodaj produkty ręcznie lub klikając "Skanuj"
          </p>
        </div>
      )}

      {krotkoterminowe.length > 0 && (
        <section>
          <h2 className="font-display text-sm font-semibold text-bursztyn-400 mb-2">
            Krótkoterminowe - do 7 dni ({krotkoterminowe.length})
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {krotkoterminowe.map(p => (
              <KafelekProduktu
                key={p.id}
                produkt={p}
                onAkcja={(action, weightKg) => mutacjaAkcja.mutate({ id: p.id, action, weightKg })}
                trybWyboru={trybWyboru}
                zaznaczony={zaznaczone.has(p.id)}
                onToggle={() => toggleZaznaczenie(p.id)}
              />
            ))}
          </div>
        </section>
      )}

      {sredniotrwale.length > 0 && (
        <section>
          <h2 className="font-display text-sm font-semibold text-grafit-400 mb-2">
            Średniotrwałe - 7–30 dni ({sredniotrwale.length})
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {sredniotrwale.map(p => (
              <KafelekProduktu
                key={p.id}
                produkt={p}
                onAkcja={(action, weightKg) => mutacjaAkcja.mutate({ id: p.id, action, weightKg })}
                trybWyboru={trybWyboru}
                zaznaczony={zaznaczone.has(p.id)}
                onToggle={() => toggleZaznaczenie(p.id)}
              />
            ))}
          </div>
        </section>
      )}

      {dlugoterminowe.length > 0 && (
        <section>
          <h2 className="font-display text-sm font-semibold text-zielony-400 mb-2">
            Długoterminowe - ponad 30 dni ({dlugoterminowe.length})
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {dlugoterminowe.map(p => (
              <KafelekProduktu
                key={p.id}
                produkt={p}
                onAkcja={(action, weightKg) => mutacjaAkcja.mutate({ id: p.id, action, weightKg })}
                trybWyboru={trybWyboru}
                zaznaczony={zaznaczone.has(p.id)}
                onToggle={() => toggleZaznaczenie(p.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
