import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { auth } from '../lib/api'

export default function Rejestracja() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [haslo, setHaslo] = useState('')
  const [miasto, setMiasto] = useState('')
  const [blad, setBlad] = useState('')
  const [ladowanie, setLadowanie] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBlad('')
    if (haslo.length < 6) {
      setBlad('Hasło musi mieć co najmniej 6 znaków')
      return
    }
    setLadowanie(true)
    try {
      const res = await auth.rejestruj(email, haslo, miasto || undefined)
      localStorage.setItem('token', res.data.access_token)
      navigate('/')
    } catch (err: any) {
      setBlad(err.response?.data?.detail || 'Błąd rejestracji')
    } finally {
      setLadowanie(false)
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zielony-700">Eat Me App</h1>
          <p className="text-sm text-slate-500 mt-1">Utwórz nowe konto</p>
        </div>
        <form onSubmit={submit} className="karta space-y-4">
          {blad && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {blad}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="jan@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hasło</label>
            <input
              type="password"
              className="input"
              value={haslo}
              onChange={e => setHaslo(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="min. 6 znaków"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Miasto <span className="text-slate-400 font-normal">(opcjonalnie, do tablicy wymiany)</span>
            </label>
            <input
              type="text"
              className="input"
              value={miasto}
              onChange={e => setMiasto(e.target.value)}
              placeholder="np. Gdańsk"
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={ladowanie}>
            {ladowanie ? 'Tworzenie konta...' : 'Zarejestruj się'}
          </button>
        </form>
        <p className="text-sm text-center text-slate-500 mt-4">
          Masz już konto?{' '}
          <Link to="/logowanie" className="text-zielony-600 font-medium hover:underline">
            Zaloguj się
          </Link>
        </p>
      </div>
    </div>
  )
}
