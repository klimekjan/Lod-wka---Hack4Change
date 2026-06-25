import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { auth } from '../lib/api'
import { subskrybujPush, czySubskrybowany } from '../lib/push'

export default function Ustawienia() {
  const queryClient = useQueryClient()
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => auth.mnie().then(r => r.data),
  })

  const [miasto, setMiasto] = useState('')
  const [adres, setAdres] = useState('')
  const [notifyPush, setNotifyPush] = useState(true)
  const [notifyEmail, setNotifyEmail] = useState(true)
  const [dniPrzed, setDniPrzed] = useState(3)
  const [godzina, setGodzina] = useState(8)
  const [zapisano, setZapisano] = useState(false)
  const [pushStatus, setPushStatus] = useState<'unknown' | 'active' | 'error'>('unknown')
  const [pushLadowanie, setPushLadowanie] = useState(false)

  useEffect(() => {
    if (user) {
      setMiasto(user.miasto || '')
      setAdres(user.adres || '')
      setNotifyPush(user.notify_push)
      setNotifyEmail(user.notify_email)
      setDniPrzed(user.notify_days_before)
      setGodzina(user.notify_hour)
    }
  }, [user])

  useEffect(() => {
    czySubskrybowany().then(sub => {
      if (sub) setPushStatus('active')
    })
  }, [])

  const mutacja = useMutation({
    mutationFn: (dane: Record<string, unknown>) =>
      auth.ustawienia(dane as any).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
      setZapisano(true)
      setTimeout(() => setZapisano(false), 2000)
    },
  })

  function zapisz() {
    mutacja.mutate({
      miasto: miasto || undefined,
      adres: adres || undefined,
      notify_push: notifyPush,
      notify_email: notifyEmail,
      notify_days_before: dniPrzed,
      notify_hour: godzina,
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
      <h1 className="text-xl font-bold text-slate-900">Ustawienia</h1>

      <div className="karta space-y-4">
        <h2 className="font-semibold text-slate-800">Profil</h2>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <p className="text-sm text-slate-500">{user?.email}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Miasto</label>
          <input
            className="input"
            value={miasto}
            onChange={e => setMiasto(e.target.value)}
            placeholder="np. Gdańsk"
          />
          <p className="text-xs text-slate-400 mt-1">
            Wymagane do tablicy wymiany jedzenia
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Adres</label>
          <input
            className="input"
            value={adres}
            onChange={e => setAdres(e.target.value)}
            placeholder="np. Długi Targ 1, Gdańsk"
          />
          <p className="text-xs text-slate-400 mt-1">
            Pełny adres (ulica, numer, miasto). Po zapisaniu produkty które oddajesz pojawią się
            na mapie wymiany. Adres jest widoczny publicznie.
          </p>
          {user?.adres && user.lat == null && (
            <p className="text-xs text-bursztyn-600 mt-1">
              Nie udało się ustalić lokalizacji tego adresu na mapie — sprawdź pisownię.
            </p>
          )}
          {user?.adres && user.lat != null && (
            <p className="text-xs text-zielony-600 mt-1">
              Lokalizacja ustalona — produkty pojawią się na mapie.
            </p>
          )}
        </div>
      </div>

      <div className="karta space-y-4">
        <h2 className="font-semibold text-slate-800">Powiadomienia push</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">Web Push</p>
            <p className="text-xs text-slate-400">Powiadomienia w przeglądarce / na telefonie</p>
          </div>
          <button
            onClick={() => setNotifyPush(v => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              notifyPush ? 'bg-zielony-600' : 'bg-slate-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                notifyPush ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {pushStatus !== 'active' ? (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
            <p className="text-sm text-slate-600">
              Powiadomienia push nie są jeszcze aktywne w tej przeglądarce.
            </p>
            <button
              className="btn-secondary text-sm"
              onClick={wlaczPush}
              disabled={pushLadowanie}
            >
              {pushLadowanie ? 'Aktywuję...' : 'Aktywuj push w tej przeglądarce'}
            </button>
            {pushStatus === 'error' && (
              <p className="text-xs text-red-600">
                Nie udało się aktywować — sprawdź czy VAPID_PUBLIC_KEY jest ustawiony i czy
                przeglądarka ma uprawnienia do powiadomień.
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between bg-zielony-50 border border-zielony-200 rounded-lg px-3 py-2">
            <p className="text-sm text-zielony-700">Push aktywny w tej przeglądarce</p>
            <button className="btn-secondary text-xs py-1" onClick={testujPowiadomienia}>
              Testuj
            </button>
          </div>
        )}
      </div>

      <div className="karta space-y-4">
        <h2 className="font-semibold text-slate-800">Email</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">Podsumowania email</p>
            <p className="text-xs text-slate-400">Codzienne zestawienie produktów na wylocie</p>
          </div>
          <button
            onClick={() => setNotifyEmail(v => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              notifyEmail ? 'bg-zielony-600' : 'bg-slate-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                notifyEmail ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="karta space-y-4">
        <h2 className="font-semibold text-slate-800">Kiedy powiadamiać</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Dni przed terminem
            </label>
            <select
              className="input"
              value={dniPrzed}
              onChange={e => setDniPrzed(Number(e.target.value))}
            >
              {[1, 2, 3, 5, 7, 14].map(d => (
                <option key={d} value={d}>
                  {d} {d === 1 ? 'dzień' : 'dni'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Godzina wysyłki
            </label>
            <select
              className="input"
              value={godzina}
              onChange={e => setGodzina(Number(e.target.value))}
            >
              {Array.from({ length: 24 }, (_, i) => i).map(h => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={zapisz} disabled={mutacja.isPending}>
          {mutacja.isPending ? 'Zapisuję...' : 'Zapisz zmiany'}
        </button>
        {zapisano && <span className="text-sm text-zielony-600 font-medium">Zapisano</span>}
      </div>
    </div>
  )
}
