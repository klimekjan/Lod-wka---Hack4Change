import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { auth } from '../lib/api'
import { subskrybujPush, czySubskrybowany } from '../lib/push'

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        on ? 'bg-limonka-500' : 'bg-grafit-600'
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
        on ? 'translate-x-6' : 'translate-x-1'
      }`} />
    </button>
  )
}

export default function Ustawienia() {
  const queryClient = useQueryClient()
  const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => auth.mnie().then(r => r.data) })

  const [imie, setImie] = useState('')
  const [nazwisko, setNazwisko] = useState('')
  const [nick, setNick] = useState('')
  const [miasto, setMiasto] = useState('')
  const [adres, setAdres] = useState('')
  const [notifyPush, setNotifyPush] = useState(true)
  const [notifyEmail, setNotifyEmail] = useState(true)
  const [dniPrzed, setDniPrzed] = useState(3)
  const [godzina, setGodzina] = useState(8)
  const [zapisano, setZapisano] = useState(false)
  const [bladNick, setBladNick] = useState('')
  const [pushStatus, setPushStatus] = useState<'unknown' | 'active' | 'error'>('unknown')
  const [pushLadowanie, setPushLadowanie] = useState(false)

  useEffect(() => {
    if (user) {
      setImie(user.imie || '')
      setNazwisko(user.nazwisko || '')
      setNick(user.nick || '')
      setMiasto(user.miasto || '')
      setAdres(user.adres || '')
      setNotifyPush(user.notify_push)
      setNotifyEmail(user.notify_email)
      setDniPrzed(user.notify_days_before)
      setGodzina(user.notify_hour)
    }
  }, [user])

  useEffect(() => {
    czySubskrybowany().then(sub => { if (sub) setPushStatus('active') })
  }, [])

  const mutacja = useMutation({
    mutationFn: (dane: Record<string, unknown>) => auth.ustawienia(dane).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
      setBladNick('')
      setZapisano(true)
      setTimeout(() => setZapisano(false), 2000)
    },
    onError: (err: any) => {
      if (err.response?.status === 400 && err.response?.data?.detail?.includes('nick')) {
        setBladNick('Ten nick jest już zajęty')
      }
    },
  })

  function zapisz() {
    setBladNick('')
    mutacja.mutate({
      imie: imie || undefined, nazwisko: nazwisko || undefined,
      nick: nick || undefined, miasto: miasto || undefined,
      adres: adres || undefined, notify_push: notifyPush,
      notify_email: notifyEmail, notify_days_before: dniPrzed, notify_hour: godzina,
    })
  }

  async function wlaczPush() {
    setPushLadowanie(true)
    try {
      const ok = await subskrybujPush()
      setPushStatus(ok ? 'active' : 'error')
    } finally {
      setPushLadowanie(false)
    }
  }

  async function testujPowiadomienia() {
    await fetch('/api/push/test', {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold text-grafit-100">Ustawienia</h1>

      <div className="karta space-y-4">
        <h2 className="font-semibold text-grafit-100">Profil</h2>
        <div>
          <label className="block text-sm font-medium text-grafit-300 mb-1">Email</label>
          <p className="text-sm text-grafit-400">{user?.email}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-grafit-300 mb-1">Imię</label>
            <input className="input" value={imie} onChange={e => setImie(e.target.value)} placeholder="Jan" />
          </div>
          <div>
            <label className="block text-sm font-medium text-grafit-300 mb-1">Nazwisko</label>
            <input className="input" value={nazwisko} onChange={e => setNazwisko(e.target.value)} placeholder="Kowalski" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-grafit-300 mb-1">Nick</label>
          <input className="input" value={nick} onChange={e => setNick(e.target.value)} placeholder="np. janek_gda" />
          {bladNick && <p className="text-xs text-red-400 mt-1">{bladNick}</p>}
          <p className="text-xs text-grafit-400 mt-1">Wyświetlany na mapie obok imienia i nazwiska.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-grafit-300 mb-1">Miasto</label>
          <input className="input" value={miasto} onChange={e => setMiasto(e.target.value)} placeholder="np. Gdańsk" />
        </div>
        <div>
          <label className="block text-sm font-medium text-grafit-300 mb-1">Adres</label>
          <input className="input" value={adres} onChange={e => setAdres(e.target.value)} placeholder="np. Długi Targ 1, Gdańsk" />
          <p className="text-xs text-grafit-400 mt-1">
            Pełny adres (ulica, numer, miasto). Po zapisaniu produkty które oddajesz pojawią się na mapie wymiany. Adres jest widoczny publicznie.
          </p>
          {user?.adres && user.lat == null && (
            <p className="text-xs text-bursztyn-400 mt-1">
              Nie udało się ustalić lokalizacji tego adresu na mapie -- sprawdź pisownię.
            </p>
          )}
          {user?.adres && user.lat != null && (
            <p className="text-xs text-zielony-400 mt-1">
              Lokalizacja ustalona -- produkty pojawią się na mapie.
            </p>
          )}
        </div>
      </div>

      <div className="karta space-y-4">
        <h2 className="font-semibold text-grafit-100">Powiadomienia push</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-grafit-300">Web Push</p>
            <p className="text-xs text-grafit-400">Powiadomienia w przeglądarce / na telefonie</p>
          </div>
          <Toggle on={notifyPush} onToggle={() => setNotifyPush(v => !v)} />
        </div>
        {pushStatus !== 'active' ? (
          <div className="bg-grafit-800 border border-grafit-600 rounded-lg p-3 space-y-2">
            <p className="text-sm text-grafit-400">Powiadomienia push nie są jeszcze aktywne w tej przeglądarce.</p>
            <button className="btn-ghost text-sm" onClick={wlaczPush} disabled={pushLadowanie}>
              {pushLadowanie ? 'Aktywuję...' : 'Aktywuj push w tej przeglądarce'}
            </button>
            {pushStatus === 'error' && (
              <p className="text-xs text-red-400">
                Nie udało się aktywować -- sprawdź czy VAPID_PUBLIC_KEY jest ustawiony i czy przeglądarka ma uprawnienia do powiadomień.
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between bg-zielony-500/10 border border-zielony-500/30 rounded-lg px-3 py-2">
            <p className="text-sm text-zielony-400">Push aktywny w tej przeglądarce</p>
            <button className="btn-ghost text-xs py-1" onClick={testujPowiadomienia}>Testuj</button>
          </div>
        )}
      </div>

      <div className="karta space-y-4">
        <h2 className="font-semibold text-grafit-100">Email</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-grafit-300">Podsumowania email</p>
            <p className="text-xs text-grafit-400">Codzienne zestawienie produktów na wylocie</p>
          </div>
          <Toggle on={notifyEmail} onToggle={() => setNotifyEmail(v => !v)} />
        </div>
      </div>

      <div className="karta space-y-4">
        <h2 className="font-semibold text-grafit-100">Kiedy powiadamiać</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-grafit-300 mb-1">Dni przed terminem</label>
            <select className="input" value={dniPrzed} onChange={e => setDniPrzed(Number(e.target.value))}>
              {[1, 2, 3, 5, 7, 14].map(d => (
                <option key={d} value={d}>{d} {d === 1 ? 'dzień' : 'dni'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-grafit-300 mb-1">Godzina wysyłki</label>
            <select className="input" value={godzina} onChange={e => setGodzina(Number(e.target.value))}>
              {Array.from({ length: 24 }, (_, i) => i).map(h => (
                <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="btn" onClick={zapisz} disabled={mutacja.isPending}>
          {mutacja.isPending ? 'Zapisuję...' : 'Zapisz zmiany'}
        </button>
        {zapisano && <span className="text-sm text-limonka-400 font-medium">Zapisano</span>}
      </div>
    </div>
  )
}
