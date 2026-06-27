import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { spolecznosc, wydarzenia as wydarzeniaApi, auth, Ogloszenie, Wydarzenie, WydarzenieSzczegoly } from '../lib/api'
import MapaWymiany from '../components/MapaWymiany'

const JEDNOSTKI = ['szt.', 'kg', 'g', 'l', 'ml', 'opak.']

function statusLabel(s: string) {
  if (s === 'available') return 'dostępne'
  if (s === 'reserved') return 'zarezerwowane'
  if (s === 'picked_up') return 'odebrane'
  return s
}

function statusKlasa(s: string) {
  if (s === 'available') return 'badge-swiezy'
  if (s === 'reserved') return 'badge-wylot'
  return 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-grafit-600 text-grafit-400'
}

function etykietaWlasciciela(imie?: string, nazwisko?: string, nick?: string): string {
  const inicjal = imie ? imie[0].toUpperCase() + '.' : null
  const czesc = [inicjal, nazwisko].filter(Boolean).join(' ')
  if (czesc && nick) return `${czesc} (${nick})`
  if (czesc) return czesc
  if (nick) return `@${nick}`
  return 'Anonim'
}

function formatDataGodzina(iso: string): string {
  return new Date(iso).toLocaleString('pl-PL', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function KartaOgloszenia({ og, czyMoje, userId, onZarezerwuj, onOdebrane, onUsun }: {
  og: Ogloszenie; czyMoje: boolean; userId?: number
  onZarezerwuj: () => void; onOdebrane: () => void; onUsun: () => void
}) {
  const [rozwiniety, setRozwiniety] = useState(false)
  const isMineReservation = og.reserved_by === userId
  const wlasciciel = etykietaWlasciciela(og.wlasciciel_imie, og.wlasciciel_nazwisko, og.wlasciciel_nick)

  return (
    <div className="karta space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-grafit-100">{og.item_name}</span>
            <span className={statusKlasa(og.status)}>{statusLabel(og.status)}</span>
            {og.wlasciciel_znajomy && (
              <span className="text-xs font-medium" style={{ color: '#d97706' }}>znajomy</span>
            )}
          </div>
          <p className="text-sm text-grafit-400 mt-0.5">
            {og.quantity} {og.unit}
          </p>
          <p className="text-xs text-grafit-400">
            {og.address ?? og.city}
          </p>
          <p className="text-xs text-grafit-500">{wlasciciel}</p>
          {og.expires_at && (
            <p className="text-xs text-grafit-400">
              ważne do: {new Date(og.expires_at).toLocaleDateString('pl-PL')}
            </p>
          )}
        </div>
        <button
          onClick={() => setRozwiniety(r => !r)}
          className="text-grafit-400 hover:text-grafit-300 font-bold text-lg px-1 shrink-0"
        >
          {rozwiniety ? '−' : '···'}
        </button>
      </div>

      {rozwiniety && (
        <div className="pt-2 border-t border-grafit-600 space-y-2">
          {og.status === 'reserved' && og.kontakt_email && (
            <div className="bg-zielony-500/10 border border-zielony-500/30 rounded-lg px-3 py-2">
              <p className="text-xs font-semibold text-zielony-400">Kontakt do wystawiającego</p>
              <a href={`mailto:${og.kontakt_email}`} className="text-sm text-zielony-400 hover:underline">
                {og.kontakt_email}
              </a>
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            {!czyMoje && og.status === 'available' && (
              <button className="btn text-sm py-1.5" onClick={onZarezerwuj}>Zarezerwuj</button>
            )}
            {(czyMoje || isMineReservation) && og.status === 'reserved' && (
              <button className="btn-ghost text-sm py-1.5" onClick={onOdebrane}>Oznacz jako odebrane</button>
            )}
            {czyMoje && og.status === 'available' && (
              <button className="btn-danger text-sm py-1.5" onClick={onUsun}>Usuń</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function KartaWydarzenia({
  w,
  userId,
  onZapiszSie,
  onWypisz,
  onDodajProdukty,
  onUsun,
}: {
  w: Wydarzenie
  userId?: number
  onZapiszSie: () => void
  onWypisz: () => void
  onDodajProdukty: () => void
  onUsun: () => void
}) {
  const [rozwiniety, setRozwiniety] = useState(false)
  const { data: szczegoly } = useQuery<WydarzenieSzczegoly>({
    queryKey: ['wydarzenie', w.id],
    queryFn: () => wydarzeniaApi.szczegoly(w.id).then(r => r.data),
    enabled: rozwiniety,
  })

  return (
    <div className="karta space-y-2" style={{ borderLeft: '3px solid #9333ea' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-grafit-100">{w.name}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: '#9333ea22', color: '#a855f7' }}>
              wydarzenie
            </span>
          </div>
          <p className="text-sm text-grafit-400 mt-0.5">{formatDataGodzina(w.event_at)}</p>
          <p className="text-xs text-grafit-400">{w.address}</p>
          <p className="text-xs text-grafit-500 mt-0.5">Uczestników: {w.liczba_uczestnikow}</p>
        </div>
        <button
          onClick={() => setRozwiniety(r => !r)}
          className="text-grafit-400 hover:text-grafit-300 font-bold text-lg px-1 shrink-0"
        >
          {rozwiniety ? '−' : '···'}
        </button>
      </div>

      {rozwiniety && (
        <div className="pt-2 border-t border-grafit-600 space-y-3">
          {w.description && <p className="text-sm text-grafit-300">{w.description}</p>}

          {szczegoly && szczegoly.uczestnicy.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-grafit-400 uppercase tracking-wide">Uczestnicy i wkład</p>
              {szczegoly.uczestnicy.map(u => (
                <div key={u.user_id} className="text-xs text-grafit-300">
                  <span className="font-medium">
                    {u.nick ? `@${u.nick}` : [u.imie, u.nazwisko].filter(Boolean).join(' ') || 'Użytkownik'}
                    {u.user_id === userId && ' (Ty)'}
                  </span>
                  {u.produkty.length > 0 && (
                    <span className="text-grafit-500 ml-1">
                      — {u.produkty.map(p => `${p.item_name} (${p.quantity} ${p.unit})`).join(', ')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {!w.czy_moje && !w.czy_uczestnicze && (
              <button className="btn text-sm py-1.5" style={{ background: '#9333ea' }} onClick={onZapiszSie}>
                Zapisz się
              </button>
            )}
            {w.czy_uczestnicze && !w.czy_moje && (
              <>
                <button className="btn text-sm py-1.5" style={{ background: '#9333ea' }} onClick={onDodajProdukty}>
                  Dodaj produkty
                </button>
                <button className="btn-ghost text-sm py-1.5" onClick={onWypisz}>Wypisz się</button>
              </>
            )}
            {w.czy_moje && (
              <>
                <button className="btn text-sm py-1.5" style={{ background: '#9333ea' }} onClick={onDodajProdukty}>
                  Dodaj produkty
                </button>
                <button className="btn-danger text-sm py-1.5" onClick={onUsun}>Usuń</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface FormOgloszenieState {
  item_name: string; quantity: string; unit: string; city: string; expires_at: string
}
interface FormWydarzenieState {
  name: string; description: string; address: string; data: string; godzina: string
}
const defaultFormOgloszenie: FormOgloszenieState = { item_name: '', quantity: '1', unit: 'szt.', city: '', expires_at: '' }
const defaultFormWydarzenie: FormWydarzenieState = { name: '', description: '', address: '', data: '', godzina: '12:00' }

export default function Spolecznosc() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [filtrMiasto, setFiltrMiasto] = useState('')
  const [formularzOtwarty, setFormularzOtwarty] = useState(false)
  const [formularzWydarzenieOtwarty, setFormularzWydarzenieOtwarty] = useState(false)
  const [form, setForm] = useState<FormOgloszenieState>(defaultFormOgloszenie)
  const [formW, setFormW] = useState<FormWydarzenieState>(defaultFormWydarzenie)
  const [zakładka, setZakładka] = useState<'dostepne' | 'moje' | 'wydarzenia' | 'mapa'>('dostepne')
  const [bladWydarzenie, setBladWydarzenie] = useState('')

  const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => auth.mnie().then(r => r.data) })
  const { data: mojaSpizarnia = [] } = useQuery({
    queryKey: ['spizarnia'],
    queryFn: () => spizarnia.lista().then(r => r.data),
    enabled: formularzOtwarty,
  })
  const { data: ogłoszenia = [], isLoading } = useQuery({
    queryKey: ['spolecznosc', filtrMiasto],
    queryFn: () => spolecznosc.lista(filtrMiasto || undefined).then(r => r.data),
  })
  const { data: mojeOgłoszenia = [] } = useQuery({
    queryKey: ['spolecznosc-moje'],
    queryFn: () => spolecznosc.moje().then(r => r.data),
  })
  const { data: wydarzeniaLista = [] } = useQuery({
    queryKey: ['wydarzenia'],
    queryFn: () => wydarzeniaApi.lista().then(r => r.data),
  })

  const invaliduj = () => {
    queryClient.invalidateQueries({ queryKey: ['spolecznosc'] })
    queryClient.invalidateQueries({ queryKey: ['spolecznosc-moje'] })
  }
  const invalidujWydarzenia = () => {
    queryClient.invalidateQueries({ queryKey: ['wydarzenia'] })
  }

  const mutacjaDodaj = useMutation({
    mutationFn: (d: Parameters<typeof spolecznosc.dodaj>[0]) => spolecznosc.dodaj(d).then(r => r.data),
    onSuccess: () => { invaliduj(); setForm(defaultFormOgloszenie); setFormularzOtwarty(false) },
  })
  const mutacjaRezerwuj = useMutation({ mutationFn: (id: number) => spolecznosc.zarezerwuj(id).then(r => r.data), onSuccess: invaliduj })
  const mutacjaOdebrane = useMutation({ mutationFn: (id: number) => spolecznosc.odebrane(id).then(r => r.data), onSuccess: invaliduj })
  const mutacjaUsun = useMutation({ mutationFn: (id: number) => spolecznosc.usun(id), onSuccess: invaliduj })

  const mutacjaDodajWydarzenie = useMutation({
    mutationFn: (d: Parameters<typeof wydarzeniaApi.dodaj>[0]) => wydarzeniaApi.dodaj(d).then(r => r.data),
    onSuccess: (nowe) => {
      invalidujWydarzenia()
      setFormW(defaultFormWydarzenie)
      setFormularzWydarzenieOtwarty(false)
      setBladWydarzenie('')
      navigate(`/spizarnia?wydarzenie=${nowe.id}`)
    },
    onError: (err: any) => {
      setBladWydarzenie(err?.response?.data?.detail ?? 'Błąd tworzenia wydarzenia')
    },
  })
  const mutacjaZapiszSie = useMutation({
    mutationFn: (id: number) => wydarzeniaApi.dolacz(id).then(r => r.data),
    onSuccess: (_data, id) => {
      invalidujWydarzenia()
      queryClient.invalidateQueries({ queryKey: ['wydarzenie', id] })
    },
  })
  const mutacjaWypisz = useMutation({
    mutationFn: (id: number) => wydarzeniaApi.wypisz(id),
    onSuccess: (_data, id) => {
      invalidujWydarzenia()
      queryClient.invalidateQueries({ queryKey: ['wydarzenie', id] })
    },
  })
  const mutacjaUsunWydarzenie = useMutation({
    mutationFn: (id: number) => wydarzeniaApi.usun(id),
    onSuccess: () => invalidujWydarzenia(),
  })

  function submitOgloszenie(e: FormEvent) {
    e.preventDefault()
    mutacjaDodaj.mutate({
      item_name: form.item_name,
      quantity: parseFloat(form.quantity),
      unit: form.unit,
      city: form.city || user?.miasto || '',
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : undefined,
    })
  }

  function submitWydarzenie(e: FormEvent) {
    e.preventDefault()
    setBladWydarzenie('')
    if (!formW.data || !formW.godzina) {
      setBladWydarzenie('Podaj datę i godzinę wydarzenia')
      return
    }
    const event_at = new Date(`${formW.data}T${formW.godzina}`).toISOString()
    mutacjaDodajWydarzenie.mutate({
      name: formW.name,
      description: formW.description || undefined,
      address: formW.address,
      event_at,
    })
  }

  function setField<K extends keyof FormOgloszenieState>(key: K, val: FormOgloszenieState[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }
  function setFieldW<K extends keyof FormWydarzenieState>(key: K, val: FormWydarzenieState[K]) {
    setFormW(f => ({ ...f, [key]: val }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="font-display text-2xl font-semibold text-grafit-100">Wymiana jedzenia</h1>
        <div className="flex gap-2">
          <button
            className="btn-ghost text-sm"
            onClick={() => {
              setFormularzOtwarty(false)
              setFormularzWydarzenieOtwarty(f => !f)
            }}
          >
            {formularzWydarzenieOtwarty ? 'Anuluj' : '+ Wydarzenie'}
          </button>
          <button
            className="btn text-sm"
            onClick={() => {
              setFormularzWydarzenieOtwarty(false)
              setForm({ ...defaultFormOgloszenie, city: user?.miasto || '' })
              setFormularzOtwarty(f => !f)
            }}
          >
            {formularzOtwarty ? 'Anuluj' : '+ Oddaj'}
          </button>
        </div>
      </div>

      {formularzWydarzenieOtwarty && (
        <form onSubmit={submitWydarzenie} className="karta space-y-3" style={{ borderLeft: '3px solid #9333ea' }}>
          <h2 className="font-semibold text-grafit-100">Nowe wydarzenie</h2>
          <p className="text-xs text-grafit-400">
            Wydarzenie pojawi się na mapie jako fioletowa pinezka. Po utworzeniu wybierzesz produkty ze spiżarni.
          </p>
          <div>
            <label className="block text-sm font-medium text-grafit-300 mb-1">Nazwa</label>
            <input className="input" value={formW.name} onChange={e => setFieldW('name', e.target.value)} required placeholder="np. Sąsiedzka zbiórka żywności" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-grafit-300 mb-1">Adres imprezy</label>
            <input className="input" value={formW.address} onChange={e => setFieldW('address', e.target.value)} required placeholder="np. Długi Targ 1, Gdańsk" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-grafit-300 mb-1">Data</label>
              <input className="input" type="date" value={formW.data} onChange={e => setFieldW('data', e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-grafit-300 mb-1">Godzina</label>
              <input className="input" type="time" value={formW.godzina} onChange={e => setFieldW('godzina', e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-grafit-300 mb-1">
              Opis <span className="text-grafit-400 font-normal">(opcjonalnie)</span>
            </label>
            <input className="input" value={formW.description} onChange={e => setFieldW('description', e.target.value)} placeholder="np. Przynieś co możesz, weź ile potrzebujesz" />
          </div>
          {bladWydarzenie && <p className="text-sm text-red-400">{bladWydarzenie}</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn" disabled={mutacjaDodajWydarzenie.isPending}
              style={{ background: mutacjaDodajWydarzenie.isPending ? undefined : '#9333ea' }}>
              {mutacjaDodajWydarzenie.isPending ? 'Tworzę...' : 'Utwórz wydarzenie'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setFormularzWydarzenieOtwarty(false)}>Anuluj</button>
          </div>
        </form>
      )}

      {formularzOtwarty && !user?.adres && (
        <div className="karta space-y-2">
          <h2 className="font-semibold text-grafit-100">Najpierw ustaw adres</h2>
          <p className="text-sm text-grafit-400">Żeby wystawić produkt na mapie, musisz mieć zapisany adres w profilu.</p>
          <Link to="/ustawienia" className="btn text-sm inline-block">Przejdź do Ustawień</Link>
        </div>
      )}

      {formularzOtwarty && user?.adres && (
        <form onSubmit={submitOgloszenie} className="karta space-y-3">
          <h2 className="font-semibold text-grafit-100">Nowe ogłoszenie</h2>
          <p className="text-xs text-grafit-400">Produkt pojawi się na mapie pod adresem: {user.adres}</p>
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-grafit-300">Produkt</label>
              {mojaSpizarnia.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPopupSpizarnia(v => !v)}
                  className="text-xs text-limonka-400 hover:text-limonka-300 font-medium"
                >
                  Ze spiżarni {popupSpizarnia ? '▲' : '▼'}
                </button>
              )}
            </div>
            <input
              className="input"
              value={form.item_name}
              onChange={e => setField('item_name', e.target.value)}
              required
              placeholder="np. Jabłka z ogrodu"
              autoFocus
            />
            {popupSpizarnia && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-grafit-600 bg-grafit-850 shadow-xl max-h-52 overflow-y-auto">
                {mojaSpizarnia.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setForm(f => ({ ...f, item_name: p.name, quantity: String(p.quantity), unit: p.unit }))
                      setPopupSpizarnia(false)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-grafit-700 transition-colors text-left"
                  >
                    {p.image_url ? (
                      <img src={p.image_url} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0 bg-grafit-700" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg shrink-0 bg-grafit-600 flex items-center justify-center text-sm">🥫</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-grafit-100 truncate">{p.name}</p>
                      <p className="text-xs text-grafit-400">{p.quantity} {p.unit} · {p.category}</p>
                    </div>
                    {p.days_left !== null && p.days_left !== undefined && p.days_left <= 5 && (
                      <span className="text-xs text-bursztyn-400 shrink-0">za {p.days_left}d</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-grafit-300 mb-1">Ilość</label>
              <input className="input" type="number" min="0.01" step="0.01" value={form.quantity} onChange={e => setField('quantity', e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-grafit-300 mb-1">Jednostka</label>
              <select className="input" value={form.unit} onChange={e => setField('unit', e.target.value)}>
                {JEDNOSTKI.map(j => <option key={j}>{j}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-grafit-300 mb-1">Miasto</label>
            <input className="input" value={form.city} onChange={e => setField('city', e.target.value)} placeholder="np. Gdańsk" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-grafit-300 mb-1">
              Ważne do <span className="text-grafit-400 font-normal">(opcjonalnie)</span>
            </label>
            <input className="input" type="date" value={form.expires_at} onChange={e => setField('expires_at', e.target.value)} />
          </div>
          {mutacjaDodaj.error && <p className="text-sm text-red-400">Błąd zapisu. Sprawdź czy masz podane miasto.</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn" disabled={mutacjaDodaj.isPending}>{mutacjaDodaj.isPending ? 'Dodaję...' : 'Wystaw'}</button>
            <button type="button" className="btn-ghost" onClick={() => setFormularzOtwarty(false)}>Anuluj</button>
          </div>
        </form>
      )}

      <div className="flex border-b border-grafit-600 overflow-x-auto">
        {(['dostepne', 'moje', 'wydarzenia', 'mapa'] as const).map(z => (
          <button
            key={z}
            onClick={() => setZakładka(z)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              zakładka === z ? 'border-limonka-400 text-limonka-400' : 'border-transparent text-grafit-400 hover:text-grafit-100'
            }`}
          >
            {z === 'dostepne' ? 'Dostępne' : z === 'moje' ? 'Moje' : z === 'wydarzenia' ? 'Wydarzenia' : 'Mapa'}
            {z === 'moje' && mojeOgłoszenia.length > 0 && (
              <span className="ml-1.5 bg-grafit-600 text-grafit-400 text-xs rounded-full px-1.5">{mojeOgłoszenia.length}</span>
            )}
            {z === 'wydarzenia' && wydarzeniaLista.length > 0 && (
              <span className="ml-1.5 text-xs rounded-full px-1.5" style={{ background: '#9333ea33', color: '#a855f7' }}>{wydarzeniaLista.length}</span>
            )}
          </button>
        ))}
      </div>

      {zakładka === 'dostepne' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input className="input flex-1" placeholder="Filtruj po mieście..." value={filtrMiasto} onChange={e => setFiltrMiasto(e.target.value)} />
            {filtrMiasto && <button className="btn-ghost text-sm" onClick={() => setFiltrMiasto('')}>Wyczyść</button>}
          </div>

          {!filtrMiasto && user?.miasto && (
            <button className="text-sm text-limonka-400 hover:underline" onClick={() => setFiltrMiasto(user.miasto!)}>
              Pokaż tylko {user.miasto}
            </button>
          )}

          {isLoading && <p className="text-sm text-grafit-400 text-center py-8">Ładowanie...</p>}

          {!isLoading && ogłoszenia.filter(o => o.user_id !== user?.id).length === 0 && (
            <div className="karta text-center py-10">
              <p className="font-medium text-grafit-100">Brak ogłoszeń</p>
              <p className="text-sm text-grafit-400 mt-1">
                {filtrMiasto ? `Brak dostępnych produktów w: ${filtrMiasto}` : 'Nikt jeszcze nic nie wystawił. Bądź pierwszy!'}
              </p>
            </div>
          )}

          {ogłoszenia.filter(o => o.user_id !== user?.id).map(og => (
            <KartaOgloszenia key={og.id} og={og} czyMoje={false} userId={user?.id}
              onZarezerwuj={() => mutacjaRezerwuj.mutate(og.id)}
              onOdebrane={() => mutacjaOdebrane.mutate(og.id)}
              onUsun={() => {}} />
          ))}
        </div>
      )}

      {zakładka === 'moje' && (
        <div className="space-y-2">
          {mojeOgłoszenia.length === 0 && (
            <div className="karta text-center py-10">
              <p className="font-medium text-grafit-100">Nie masz żadnych ogłoszeń</p>
              <p className="text-sm text-grafit-400 mt-1">Kliknij "+ Oddaj" żeby wystawić nadmiar jedzenia</p>
            </div>
          )}
          {mojeOgłoszenia.map(og => (
            <KartaOgloszenia key={og.id} og={og} czyMoje userId={user?.id}
              onZarezerwuj={() => {}}
              onOdebrane={() => mutacjaOdebrane.mutate(og.id)}
              onUsun={() => mutacjaUsun.mutate(og.id)} />
          ))}
        </div>
      )}

      {zakładka === 'mapa' && (
        <MapaWymiany
          ogloszenia={ogłoszenia}
          userId={user?.id}
          onZarezerwuj={(id) => mutacjaRezerwuj.mutate(id)}
          wydarzenia={wydarzeniaLista}
          onZapiszSie={(id) => mutacjaZapiszSie.mutate(id)}
          onDodajProdukty={(id) => navigate(`/spizarnia?wydarzenie=${id}`)}
        />
      )}

      {zakładka === 'wydarzenia' && (
        <div className="space-y-2">
          {wydarzeniaLista.length === 0 && (
            <div className="karta text-center py-10">
              <p className="font-medium text-grafit-100">Brak aktywnych wydarzeń</p>
              <p className="text-sm text-grafit-400 mt-1">Kliknij "+ Wydarzenie" żeby zorganizować zbiórkę żywności</p>
            </div>
          )}
          {wydarzeniaLista.map(w => (
            <KartaWydarzenia
              key={w.id}
              w={w}
              userId={user?.id}
              onZapiszSie={() => mutacjaZapiszSie.mutate(w.id)}
              onWypisz={() => mutacjaWypisz.mutate(w.id)}
              onDodajProdukty={() => navigate(`/spizarnia?wydarzenie=${w.id}`)}
              onUsun={() => mutacjaUsunWydarzenie.mutate(w.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
