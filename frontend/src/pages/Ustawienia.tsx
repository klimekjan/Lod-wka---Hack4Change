import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { auth, User } from '../lib/api'

export default function Ustawienia() {
  const queryClient = useQueryClient()
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => auth.mnie().then(r => r.data),
  })

  const [miasto, setMiasto] = useState('')
  const [notifyPush, setNotifyPush] = useState(true)
  const [notifyEmail, setNotifyEmail] = useState(true)
  const [dniPrzed, setDniPrzed] = useState(3)
  const [godzina, setGodzina] = useState(8)
  const [zapisano, setZapisano] = useState(false)

  useEffect(() => {
    if (user) {
      setMiasto(user.miasto || '')
      setNotifyPush(user.notify_push)
      setNotifyEmail(user.notify_email)
      setDniPrzed(user.notify_days_before)
      setGodzina(user.notify_hour)
    }
  }, [user])

  const mutacja = useMutation({
    mutationFn: (dane: Partial<User>) => auth.ustawienia(dane).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
      setZapisano(true)
      setTimeout(() => setZapisano(false), 2000)
    },
  })

  function zapisz() {
    mutacja.mutate({
      miasto: miasto || undefined,
      notify_push: notifyPush,
      notify_email: notifyEmail,
      notify_days_before: dniPrzed,
      notify_hour: godzina,
    } as any)
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
          <p className="text-xs text-slate-400 mt-1">Wymagane do tablicy wymiany jedzenia</p>
        </div>
      </div>

      <div className="karta space-y-4">
        <h2 className="font-semibold text-slate-800">Powiadomienia</h2>
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
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${notifyPush ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">Email</p>
            <p className="text-xs text-slate-400">Codzienne podsumowanie na email</p>
          </div>
          <button
            onClick={() => setNotifyEmail(v => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              notifyEmail ? 'bg-zielony-600' : 'bg-slate-200'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${notifyEmail ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Dni przed terminem</label>
            <select className="input" value={dniPrzed} onChange={e => setDniPrzed(Number(e.target.value))}>
              {[1, 2, 3, 5, 7, 14].map(d => <option key={d} value={d}>{d} {d === 1 ? 'dzień' : 'dni'}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Godzina powiadomień</label>
            <select className="input" value={godzina} onChange={e => setGodzina(Number(e.target.value))}>
              {Array.from({ length: 24 }, (_, i) => i).map(h => (
                <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={zapisz} disabled={mutacja.isPending}>
          {mutacja.isPending ? 'Zapisuję...' : 'Zapisz zmiany'}
        </button>
        {zapisano && <span className="text-sm text-zielony-600">Zapisano</span>}
      </div>
    </div>
  )
}
