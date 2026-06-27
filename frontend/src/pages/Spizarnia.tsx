import { useState, useRef, FormEvent, useCallback, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { spizarnia, paragony, wydarzenia as wydarzeniaApi, Produkt, SugestiaProduktu } from '../lib/api'
import BarcodeScanner from '../components/BarcodeScanner'
import ProductAutocomplete from '../components/ProductAutocomplete'
import { IconProdukt } from '../components/ikony'
import { useTheme } from '../lib/theme'

// Kolory tła kafelków gdy brak zdjęcia
const KOLOR_KATEGORII: Record<string, string> = {
  'nabiał': '#1e3a5f',
  'mięso surowe': '#4a1a1a',
  'ryby': '#0f3340',
  'warzywa twarde': '#14321e',
  'warzywa liściaste': '#14321e',
  'owoce': '#3d2000',
  'pieczywo': '#3d2a00',
  'jajka': '#3d3000',
  'napoje': '#0f2a3d',
  'przetwory': '#2e1a40',
}

// Shelf life per kategoria (dni) — źródło: tracker branch
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

// Szacowanie wagi per kategoria i jednostkę (dla podpowiedzi wagi przy akcji)
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

function szacujKg(quantity: number, unit: string, category: string): number {
  const u = unit.trim().toLowerCase()
  if (u === 'kg')    return quantity
  if (u === 'g')     return quantity * 0.001
  if (u === 'dag')   return quantity * 0.01
  if (u === 'l')     return quantity
  if (u === 'ml')    return quantity * 0.001
  if (u === 'szt.')  return quantity * (_WAGA_SZT[category] ?? 0.15)
  if (u === 'opak.') return quantity * (_WAGA_OPAK[category] ?? 0.30)
  return quantity * 0.15
}

const KATEGORIE = [
  'nabiał', 'mięso surowe', 'ryby', 'warzywa liściaste',
  'warzywa twarde', 'owoce', 'pieczywo', 'jajka', 'napoje', 'przetwory', 'inne',
]
const JEDNOSTKI = ['szt.', 'kg', 'g', 'l', 'ml', 'opak.']

function kolorDaty(dniDo?: number | null): string {
  if (dniDo === undefined || dniDo === null) return 'bg-grafit-700/80 text-grafit-100'
  if (dniDo < 0)   return 'bg-red-600/80 text-white'
  if (dniDo <= 2)  return 'bg-orange-500/80 text-white'
  if (dniDo <= 5)  return 'bg-bursztyn-500/80 text-white'
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
  onInfo,
  trybWyboru = false,
  zaznaczony = false,
  onToggle,
}: {
  produkt: Produkt
  onAkcja: (action: string, weightKg?: number) => void
  onInfo?: () => void
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

  const szacunek = szacujKg(produkt.quantity, produkt.unit, produkt.category)

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
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ background: KOLOR_KATEGORII[produkt.category] ?? '#26271f' }}
        >
          <IconProdukt className="w-10 h-10 opacity-30" />
        </div>
      )}

      {produkt.expires_at && (
        <span className={`absolute top-1.5 left-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md backdrop-blur-sm ${kolorDaty(produkt.days_left)}`}>
          {formatData(produkt.expires_at)}
        </span>
      )}

      {!trybWyboru && onInfo && (
        <button
          className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm"
          onClick={e => { e.stopPropagation(); onInfo() }}
        >
          <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
      )}

      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-2 pt-4 pb-1.5">
        <div className="flex items-end justify-between gap-1">
          <p className="text-white text-xs font-medium truncate leading-tight flex-1">{produkt.name}</p>
          <span className="text-[10px] text-white/70 shrink-0 leading-tight">{produkt.quantity}{produkt.unit}</span>
        </div>
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
              <p className="text-white/50 text-[10px] text-center">szacunek: ~{szacunek.toFixed(2)} kg</p>
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
              <button className="text-white/60 text-xs" onClick={pomin}>
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
  const { light } = useTheme()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const wydarzenieIdParam = searchParams.get('wydarzenie')
  const wydarzenieId = wydarzenieIdParam ? parseInt(wydarzenieIdParam, 10) : null

  const [formularzOtwarty, setFormularzOtwarty] = useState(false)
  const [formularzKrok, setFormularzKrok] = useState<'nazwa' | 'szczegoly'>('nazwa')
  const [klasyfikuje, setKlasyfikuje] = useState(false)
  const [skanerOtwarty, setSkanerOtwarty] = useState(false)
  const [wyborSkanera, setWyborSkanera] = useState(false)
  const [zamykanieSelektora, setZamykanieSelektora] = useState(false)
  const zamknijSelektor = useCallback(() => {
    setZamykanieSelektora(true)
    setTimeout(() => { setWyborSkanera(false); setZamykanieSelektora(false) }, 220)
  }, [])
  const [paragonLaduje, setParagonLaduje] = useState(false)
  const [paragonProdukty, setParagonProdukty] = useState<{ name: string; quantity: number; category: string; image_url?: string }[] | null>(null)
  const paragonCameraRef = useRef<HTMLInputElement>(null)
  const paragonGaleriaRef = useRef<HTMLInputElement>(null)
  const [produktInfo, setProduktInfo] = useState<Produkt | null>(null)
  const [trybEdycji, setTrybEdycji] = useState(false)
  const [formEdycji, setFormEdycji] = useState({ name: '', category: 'inne', quantity: '1', unit: 'szt.', expiresAt: '' })
  const [form, setForm] = useState<FormState>(defaultForm)
  const [skanBlad, setSkanBlad] = useState('')
  const [akcjaOk, setAkcjaOk] = useState('')
  const [brakAdresu, setBrakAdresu] = useState(false)
  const [zaznaczone, setZaznaczone] = useState<Set<number>>(new Set())

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

  const mutacjaDodaj = useMutation({
    mutationFn: (dane: Partial<Produkt>) => spizarnia.dodaj(dane).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spizarnia'] })
      setForm(defaultForm)
      setFormularzOtwarty(false)
    },
  })

  const mutacjaAkcja = useMutation({
    mutationFn: ({ id, action, weightKg }: { id: number; action: string; weightKg?: number }) =>
      spizarnia.akcja(id, action, undefined, weightKg).then(r => r.data),
    onSuccess: (_data, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['spizarnia'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
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

  const mutacjaPrzekazProdukty = useMutation({
    mutationFn: ({ id, ids }: { id: number; ids: number[] }) =>
      wydarzeniaApi.przekazProdukty(id, ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spizarnia'] })
      queryClient.invalidateQueries({ queryKey: ['wydarzenie', wydarzenieId] })
      navigate('/spolecznosc')
    },
  })

  const mutacjaEdytuj = useMutation({
    mutationFn: ({ id, dane }: { id: number; dane: Partial<Produkt> }) => spizarnia.aktualizuj(id, dane),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spizarnia'] })
      setProduktInfo(null)
      setTrybEdycji(false)
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
      setSkanerOtwarty(false)
      setFormularzOtwarty(true)
      setFormularzKrok('szczegoly')
    } catch {
      setSkanerOtwarty(false)
      setSkanBlad('Błąd połączenia.')
      setFormularzOtwarty(true)
    }
  }

  async function handleNazwaConfirm() {
    if (!form.name.trim()) return
    setKlasyfikuje(true)
    try {
      const res = await spizarnia.kategoria(form.name)
      const kat = res.data.pewnosc > 0.25 ? res.data.kategoria : form.category
      setForm(f => ({ ...f, category: kat, expiresAt: obliczDateWaznosci(kat, f.frozen) }))
    } catch { /* zostaw aktualną kategorię */ }
    setKlasyfikuje(false)
    setFormularzKrok('szczegoly')
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

  function selectSugestia(s: SugestiaProduktu) {
    setForm(f => {
      const cat = s.category || f.category
      return {
        ...f,
        name: s.name,
        category: cat,
        imageUrl: s.image_url || f.imageUrl,
        expiresAt: obliczDateWaznosci(cat, f.frozen),
      }
    })
  }

  async function handleParagonFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setWyborSkanera(false)
    setParagonLaduje(true)
    try {
      const ocrRes = await paragony.zaladuj(file)
      const ocrProdukty = ocrRes.data.products
      if (!ocrProdukty.length) {
        setSkanBlad('Nie wykryto produktów na paragonie.')
        return
      }
      const wzbRes = await spizarnia.wzbogac(ocrProdukty.map(p => p.name))
      const enriched = ocrProdukty.map((p, i) => ({
        name: p.name,
        quantity: p.quantity,
        category: wzbRes.data[i]?.category ?? 'inne',
        image_url: wzbRes.data[i]?.image_url,
      }))
      setParagonProdukty(enriched)
    } catch {
      setSkanBlad('Nie udało się odczytać paragonu. Spróbuj wyraźniejsze zdjęcie.')
    } finally {
      setParagonLaduje(false)
    }
  }

  async function dodajZParagonu() {
    if (!paragonProdukty) return
    try {
      await Promise.all(
        paragonProdukty.map(p =>
          spizarnia.dodaj({
            name: p.name,
            category: p.category,
            quantity: p.quantity,
            unit: 'szt.',
            image_url: p.image_url,
            expires_at: new Date(obliczDateWaznosci(p.category, false)).toISOString(),
          })
        )
      )
      queryClient.invalidateQueries({ queryKey: ['spizarnia'] })
      setAkcjaOk(`Dodano ${paragonProdukty.length} produktów z paragonu.`)
      setTimeout(() => setAkcjaOk(''), 4000)
      setParagonProdukty(null)
    } catch {
      setSkanBlad('Błąd dodawania produktów z paragonu.')
    }
  }

  function openProduktInfo(p: Produkt) {
    setProduktInfo(p)
    setTrybEdycji(true)
    setFormEdycji({
      name: p.name,
      category: p.category,
      quantity: String(p.quantity),
      unit: p.unit,
      expiresAt: p.expires_at ? p.expires_at.slice(0, 10) : '',
    })
  }

  function zapiszEdycje() {
    if (!produktInfo) return
    mutacjaEdytuj.mutate({
      id: produktInfo.id,
      dane: {
        name: formEdycji.name,
        category: formEdycji.category,
        quantity: parseFloat(formEdycji.quantity),
        unit: formEdycji.unit,
        expires_at: formEdycji.expiresAt ? new Date(formEdycji.expiresAt).toISOString() : undefined,
      },
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
      <input ref={paragonCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleParagonFile} />
      <input ref={paragonGaleriaRef} type="file" accept="image/*" className="hidden" onChange={handleParagonFile} />

      {wyborSkanera && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={zamknijSelektor}>
          <div className={`absolute inset-0 ${zamykanieSelektora ? 'animate-fade-in [animation-direction:reverse]' : 'animate-fade-in'} ${light ? 'bg-black/20' : 'bg-black/50'}`} />
          <div
            className={`relative w-full rounded-t-2xl overflow-hidden ${zamykanieSelektora ? 'animate-slide-up-out' : 'animate-slide-up'}`}
            style={light
              ? { background: '#ffffff', borderTop: '1px solid #d4d5c9' }
              : { background: '#26271f', borderTop: '1px solid #34362b' }
            }
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col divide-y divide-grafit-700">
              <button
                className="flex items-center gap-3.5 px-5 py-4 text-left active:bg-grafit-700 transition-colors animate-slide-row"
                style={{ animationDelay: '60ms' }}
                onClick={() => { zamknijSelektor(); setTimeout(() => setSkanerOtwarty(true), 220) }}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${light ? 'bg-grafit-300/40 border border-grafit-400/30' : 'bg-grafit-700 border border-grafit-600'}`}>
                  <svg className="w-4 h-4 text-grafit-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 9V6a1 1 0 0 1 1-1h3M21 9V6a1 1 0 0 1-1-1h-3M3 15v3a1 1 0 0 0 1 1h3M21 15v3a1 1 0 0 1-1 1h-3M7 8v8M10 8v8M13 8v8M16 8v8" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-grafit-100">Kod kreskowy</p>
                  <p className="text-xs text-grafit-400 mt-0.5">Wyszukaj produkt po kodzie EAN</p>
                </div>
              </button>
              <button
                className="flex items-center gap-3.5 px-5 py-4 text-left active:bg-grafit-700 transition-colors animate-slide-row"
                style={{ animationDelay: '120ms' }}
                onClick={() => { zamknijSelektor(); setTimeout(() => paragonCameraRef.current?.click(), 220) }}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${light ? 'bg-grafit-300/40 border border-grafit-400/30' : 'bg-grafit-700 border border-grafit-600'}`}>
                  <svg className="w-4 h-4 text-grafit-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-grafit-100">Zrób zdjęcie paragonu</p>
                  <p className="text-xs text-grafit-400 mt-0.5">Użyj aparatu</p>
                </div>
              </button>
              <button
                className="flex items-center gap-3.5 px-5 py-4 text-left active:bg-grafit-700 transition-colors animate-slide-row"
                style={{ animationDelay: '180ms' }}
                onClick={() => { zamknijSelektor(); setTimeout(() => paragonGaleriaRef.current?.click(), 220) }}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${light ? 'bg-grafit-300/40 border border-grafit-400/30' : 'bg-grafit-700 border border-grafit-600'}`}>
                  <svg className="w-4 h-4 text-grafit-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-grafit-100">Wybierz z galerii</p>
                  <p className="text-xs text-grafit-400 mt-0.5">Prześlij zdjęcie z urządzenia</p>
                </div>
              </button>
              <button
                className="px-5 py-4 text-sm text-grafit-400 font-medium text-center active:bg-grafit-700 transition-colors"
                onClick={zamknijSelektor}
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}

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
            <button className="btn-ghost text-sm py-1.5" onClick={() => navigate('/spolecznosc')}>
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
              onClick={() => { setSkanBlad(''); setWyborSkanera(true) }}
            >
              Skanuj
            </button>
            <button
              className="btn text-sm"
              onClick={() => { setForm(defaultForm); setSkanBlad(''); setFormularzKrok('nazwa'); setFormularzOtwarty(f => !f) }}
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
          <Link to="/ustawienia" className="btn text-xs py-1 px-3 shrink-0">Ustawienia</Link>
        </div>
      )}

      {paragonLaduje && (
        <div className="karta text-center py-6 space-y-2">
          <div className="inline-block w-6 h-6 border-2 border-grafit-600 border-t-limonka-400 rounded-full animate-spin" />
          <p className="text-sm text-grafit-400">Odczytuję paragon...</p>
        </div>
      )}

      {paragonProdukty && (
        <div className="karta space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-grafit-100">Produkty z paragonu</h2>
            <span className="text-xs text-grafit-400">{paragonProdukty.length} szt.</span>
          </div>
          <div className="space-y-1 max-h-72 overflow-y-auto -mx-1 px-1">
            {paragonProdukty.map((p, i) => (
              <div key={i} className="flex items-center gap-2.5 py-1.5 border-b border-grafit-700 last:border-0">
                <div
                  className="w-8 h-8 rounded-md shrink-0 overflow-hidden flex items-center justify-center"
                  style={{ background: KOLOR_KATEGORII[p.category] ?? '#26271f' }}
                >
                  {p.image_url
                    ? <img src={p.image_url} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    : <IconProdukt className="w-4 h-4 opacity-40" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-grafit-100 truncate leading-tight">{p.name}</p>
                  <p className="text-[10px] text-grafit-400 mt-0.5">{p.category}</p>
                </div>
                <span className="text-xs text-grafit-400 shrink-0">×{p.quantity}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="btn text-sm" onClick={dodajZParagonu}>
              Dodaj wszystkie
            </button>
            <button className="btn-ghost text-sm" onClick={() => setParagonProdukty(null)}>
              Anuluj
            </button>
          </div>
        </div>
      )}

      {!trybWyboru && formularzOtwarty && formularzKrok === 'nazwa' && (
        <div className="karta space-y-3">
          <h2 className="font-semibold text-grafit-100">Nowy produkt</h2>
          <div>
            <label className="block text-sm font-medium text-grafit-300 mb-1">Nazwa produktu</label>
            <ProductAutocomplete
              value={form.name}
              onChange={val => setField('name', val)}
              onSelect={s => { selectSugestia(s); setFormularzKrok('szczegoly') }}
              onEnter={handleNazwaConfirm}
              placeholder="np. Malina, Mleko 3,2%..."
              autoFocus
            />
            <p className="text-xs text-grafit-400 mt-1.5">
              Wybierz z listy lub wpisz i naciśnij <kbd className="bg-grafit-700 px-1 py-0.5 rounded text-[10px]">Enter</kbd>
            </p>
          </div>
          {klasyfikuje && (
            <p className="text-xs text-grafit-400 flex items-center gap-2">
              <span className="inline-block w-3 h-3 border-2 border-grafit-500 border-t-limonka-400 rounded-full animate-spin" />
              Klasyfikuję kategorię...
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-ghost text-sm"
              onClick={() => { setForm(defaultForm); setFormularzOtwarty(false) }}
            >
              Anuluj
            </button>
          </div>
        </div>
      )}

      {!trybWyboru && formularzOtwarty && formularzKrok === 'szczegoly' && (
        <form onSubmit={submit} className="karta space-y-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-grafit-400 hover:text-grafit-100 text-sm"
              onClick={() => setFormularzKrok('nazwa')}
            >
              ←
            </button>
            <div className="flex items-center gap-2 min-w-0">
              {form.imageUrl && (
                <img src={form.imageUrl} alt="" className="w-8 h-8 object-contain rounded-md border border-grafit-600 shrink-0" />
              )}
              <p className="font-semibold text-grafit-100 truncate">{form.name}</p>
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
                autoFocus
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
            <select className="input" value={form.category} onChange={e => setField('category', e.target.value)}>
              {KATEGORIE.map(k => <option key={k}>{k}</option>)}
            </select>
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
            <span className="text-sm text-grafit-300">W zamrażarce</span>
          </label>
          {mutacjaDodaj.error && (
            <p className="text-sm text-red-400">Błąd zapisu — spróbuj ponownie.</p>
          )}
          <div className="flex gap-2">
            <button type="submit" className="btn" disabled={mutacjaDodaj.isPending}>
              {mutacjaDodaj.isPending ? 'Zapisuję...' : 'Dodaj'}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => { setForm(defaultForm); setFormularzOtwarty(false); setFormularzKrok('nazwa') }}
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
          <p className="text-sm text-grafit-400 mt-1">Dodaj produkty ręcznie lub klikając "Skanuj"</p>
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
                onInfo={() => openProduktInfo(p)}
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
            Średniotrwale - 7-30 dni ({sredniotrwale.length})
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {sredniotrwale.map(p => (
              <KafelekProduktu
                key={p.id}
                produkt={p}
                onAkcja={(action, weightKg) => mutacjaAkcja.mutate({ id: p.id, action, weightKg })}
                onInfo={() => openProduktInfo(p)}
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
                onInfo={() => openProduktInfo(p)}
                trybWyboru={trybWyboru}
                zaznaczony={zaznaczone.has(p.id)}
                onToggle={() => toggleZaznaczenie(p.id)}
              />
            ))}
          </div>
        </section>
      )}

      {produktInfo && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => { setProduktInfo(null); setTrybEdycji(false) }}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full bg-grafit-800 border-t border-grafit-700 rounded-t-2xl overflow-hidden max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-grafit-700 shrink-0">
              <h2 className="font-display font-semibold text-grafit-100">
                {trybEdycji ? 'Edytuj produkt' : 'Informacje'}
              </h2>
              <button className="text-grafit-400 text-sm" onClick={() => { setProduktInfo(null); setTrybEdycji(false) }}>
                Zamknij
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {!trybEdycji ? (
                <>
                  <div className="flex gap-4">
                    <div
                      className="w-16 h-16 rounded-xl shrink-0 overflow-hidden flex items-center justify-center"
                      style={{ background: KOLOR_KATEGORII[produktInfo.category] ?? '#26271f' }}
                    >
                      {produktInfo.image_url
                        ? <img src={produktInfo.image_url} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        : <IconProdukt className="w-7 h-7 opacity-30" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-semibold text-grafit-100 text-lg leading-tight">{produktInfo.name}</p>
                      <p className="text-sm text-grafit-400 mt-0.5">{produktInfo.category}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {[
                      ['Ilość', `${produktInfo.quantity} ${produktInfo.unit}`],
                      ['Termin ważności', produktInfo.expires_at
                        ? `${formatData(produktInfo.expires_at)}${produktInfo.days_left !== undefined ? ` (${produktInfo.days_left >= 0 ? `${produktInfo.days_left} dni` : 'przeterminowany'})` : ''}`
                        : '—'],
                      ['Status', produktInfo.status],
                      ['Dodano', new Date(produktInfo.added_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })],
                      ...(produktInfo.barcode ? [['Kod kreskowy', produktInfo.barcode]] : []),
                      ...(produktInfo.risk_score !== undefined && produktInfo.risk_score !== null
                        ? [['Ryzyko zmarnowania', `${Math.round(produktInfo.risk_score * 100)}%`]]
                        : []),
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-start justify-between gap-4 py-2 border-b border-grafit-700 last:border-0">
                        <span className="text-sm text-grafit-400 shrink-0">{label}</span>
                        <span className={`text-sm font-medium text-right ${
                          label === 'Termin ważności' && produktInfo.days_left !== undefined
                            ? produktInfo.days_left < 0 ? 'text-red-400' : produktInfo.days_left <= 2 ? 'text-orange-400' : 'text-grafit-100'
                            : 'text-grafit-100'
                        }`}>{value}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    className="btn w-full text-sm"
                    onClick={() => setTrybEdycji(true)}
                  >
                    Edytuj
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-grafit-300 mb-1">Nazwa</label>
                    <input
                      className="input"
                      value={formEdycji.name}
                      onChange={e => setFormEdycji(f => ({ ...f, name: e.target.value }))}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-grafit-300 mb-1">Kategoria</label>
                    <select
                      className="input"
                      value={formEdycji.category}
                      onChange={e => setFormEdycji(f => ({ ...f, category: e.target.value }))}
                    >
                      {KATEGORIE.map(k => <option key={k}>{k}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-grafit-300 mb-1">Ilość</label>
                      <input
                        className="input"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={formEdycji.quantity}
                        onChange={e => setFormEdycji(f => ({ ...f, quantity: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-grafit-300 mb-1">Jednostka</label>
                      <select
                        className="input"
                        value={formEdycji.unit}
                        onChange={e => setFormEdycji(f => ({ ...f, unit: e.target.value }))}
                      >
                        {JEDNOSTKI.map(j => <option key={j}>{j}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-grafit-300 mb-1">Termin ważności</label>
                    <input
                      className="input"
                      type="date"
                      value={formEdycji.expiresAt}
                      onChange={e => setFormEdycji(f => ({ ...f, expiresAt: e.target.value }))}
                    />
                  </div>
                  {mutacjaEdytuj.error && (
                    <p className="text-sm text-red-400">Błąd zapisu — spróbuj ponownie.</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      className="btn flex-1 text-sm"
                      onClick={zapiszEdycje}
                      disabled={mutacjaEdytuj.isPending}
                    >
                      {mutacjaEdytuj.isPending ? 'Zapisuję...' : 'Zapisz'}
                    </button>
                    <button
                      className="btn-ghost flex-1 text-sm"
                      onClick={() => setTrybEdycji(false)}
                    >
                      Anuluj
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
