import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { spolecznosc, auth, Ogloszenie } from '../lib/api'
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

function KartaOgloszenia({ og, czyMoje, userId, onZarezerwuj, onOdebrane, onUsun }: {
  og: Ogloszenie; czyMoje: boolean; userId?: number
  onZarezerwuj: () => void; onOdebrane: () => void; onUsun: () => void
}) {
  const [rozwiniety, setRozwiniety] = useState(false)
  const isMineReservation = og.reserved_by === userId

  return (
    <div className="karta space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-grafit-100">{og.item_name}</span>
            <span className={statusKlasa(og.status)}>{statusLabel(og.status)}</span>
          </div>
          <p className="text-sm text-grafit-400 mt-0.5">
            {og.quantity} {og.unit} · {og.city}
          </p>
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

interface FormState {
  item_name: string; quantity: string; unit: string; city: string; expires_at: string
}
const defaultForm: FormState = { item_name: '', quantity: '1', unit: 'szt.', city: '', expires_at: '' }

export default function Spolecznosc() {
  const queryClient = useQueryClient()
  const [filtrMiasto, setFiltrMiasto] = useState('')
  const [formularzOtwarty, setFormularzOtwarty] = useState(false)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [zakładka, setZakładka] = useState<'dostepne' | 'moje'>('dostepne')
  const [widok, setWidok] = useState<'lista' | 'mapa'>('lista')

  const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => auth.mnie().then(r => r.data) })
  const { data: ogłoszenia = [], isLoading } = useQuery({
    queryKey: ['spolecznosc', filtrMiasto],
    queryFn: () => spolecznosc.lista(filtrMiasto || undefined).then(r => r.data),
  })
  const { data: mojeOgłoszenia = [] } = useQuery({
    queryKey: ['spolecznosc-moje'],
    queryFn: () => spolecznosc.moje().then(r => r.data),
  })

  const invaliduj = () => {
    queryClient.invalidateQueries({ queryKey: ['spolecznosc'] })
    queryClient.invalidateQueries({ queryKey: ['spolecznosc-moje'] })
  }

  const mutacjaDodaj = useMutation({
    mutationFn: (d: Parameters<typeof spolecznosc.dodaj>[0]) => spolecznosc.dodaj(d).then(r => r.data),
    onSuccess: () => { invaliduj(); setForm(defaultForm); setFormularzOtwarty(false) },
  })
  const mutacjaRezerwuj = useMutation({ mutationFn: (id: number) => spolecznosc.zarezerwuj(id).then(r => r.data), onSuccess: invaliduj })
  const mutacjaOdebrane = useMutation({ mutationFn: (id: number) => spolecznosc.odebrane(id).then(r => r.data), onSuccess: invaliduj })
  const mutacjaUsun = useMutation({ mutationFn: (id: number) => spolecznosc.usun(id), onSuccess: invaliduj })

  function submit(e: FormEvent) {
    e.preventDefault()
    mutacjaDodaj.mutate({
      item_name: form.item_name,
      quantity: parseFloat(form.quantity),
      unit: form.unit,
      city: form.city || user?.miasto || '',
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : undefined,
    })
  }

  function setField<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-grafit-100">Wymiana jedzenia</h1>
        <button className="btn text-sm" onClick={() => { setForm({ ...defaultForm, city: user?.miasto || '' }); setFormularzOtwarty(f => !f) }}>
          {formularzOtwarty ? 'Anuluj' : '+ Oddaj'}
        </button>
      </div>

      {formularzOtwarty && !user?.adres && (
        <div className="karta space-y-2">
          <h2 className="font-semibold text-grafit-100">Najpierw ustaw adres</h2>
          <p className="text-sm text-grafit-400">Żeby wystawić produkt na mapie, musisz mieć zapisany adres w profilu.</p>
          <Link to="/ustawienia" className="btn text-sm inline-block">Przejdź do Ustawień</Link>
        </div>
      )}

      {formularzOtwarty && user?.adres && (
        <form onSubmit={submit} className="karta space-y-3">
          <h2 className="font-semibold text-grafit-100">Nowe ogłoszenie</h2>
          <p className="text-xs text-grafit-400">Produkt pojawi się na mapie pod adresem: {user.adres}</p>
          <div>
            <label className="block text-sm font-medium text-grafit-300 mb-1">Produkt</label>
            <input className="input" value={form.item_name} onChange={e => setField('item_name', e.target.value)} required placeholder="np. Jabłka z ogrodu" autoFocus />
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

      <div className="flex border-b border-grafit-600">
        {(['dostepne', 'moje'] as const).map(z => (
          <button
            key={z}
            onClick={() => setZakładka(z)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              zakładka === z ? 'border-limonka-400 text-limonka-400' : 'border-transparent text-grafit-400 hover:text-grafit-100'
            }`}
          >
            {z === 'dostepne' ? 'Dostępne' : 'Moje ogłoszenia'}
            {z === 'moje' && mojeOgłoszenia.length > 0 && (
              <span className="ml-1.5 bg-grafit-600 text-grafit-400 text-xs rounded-full px-1.5">{mojeOgłoszenia.length}</span>
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

          <div className="inline-flex rounded-full border border-grafit-600 p-0.5 bg-grafit-800">
            {(['lista', 'mapa'] as const).map(w => (
              <button
                key={w}
                onClick={() => setWidok(w)}
                className={`px-4 py-1 rounded-full text-sm font-medium transition-colors ${
                  widok === w ? 'bg-grafit-700 text-limonka-400' : 'text-grafit-400 hover:text-grafit-100'
                }`}
              >
                {w === 'lista' ? 'Lista' : 'Mapa'}
              </button>
            ))}
          </div>

          {widok === 'mapa' && (
            <MapaWymiany ogloszenia={ogłoszenia} userId={user?.id} onZarezerwuj={(id) => mutacjaRezerwuj.mutate(id)} />
          )}

          {!filtrMiasto && user?.miasto && (
            <button className="text-sm text-limonka-400 hover:underline" onClick={() => setFiltrMiasto(user.miasto!)}>
              Pokaż tylko {user.miasto}
            </button>
          )}

          {widok === 'lista' && isLoading && <p className="text-sm text-grafit-400 text-center py-8">Ładowanie...</p>}

          {widok === 'lista' && !isLoading && ogłoszenia.length === 0 && (
            <div className="karta text-center py-10">
              <p className="font-medium text-grafit-100">Brak ogłoszeń</p>
              <p className="text-sm text-grafit-400 mt-1">
                {filtrMiasto ? `Brak dostępnych produktów w: ${filtrMiasto}` : 'Nikt jeszcze nic nie wystawił. Bądź pierwszy!'}
              </p>
            </div>
          )}

          {widok === 'lista' && ogłoszenia.map(og => (
            <KartaOgloszenia key={og.id} og={og} czyMoje={og.user_id === user?.id} userId={user?.id}
              onZarezerwuj={() => mutacjaRezerwuj.mutate(og.id)}
              onOdebrane={() => mutacjaOdebrane.mutate(og.id)}
              onUsun={() => mutacjaUsun.mutate(og.id)} />
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
    </div>
  )
}
