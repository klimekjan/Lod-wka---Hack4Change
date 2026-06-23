import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { auth } from '../lib/api'

export default function Logowanie() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [haslo, setHaslo] = useState('')
  const [blad, setBlad] = useState('')
  const [ladowanie, setLadowanie] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBlad('')
    setLadowanie(true)
    try {
      const res = await auth.login(email, haslo)
      localStorage.setItem('token', res.data.access_token)
      navigate('/')
    } catch (err: any) {
      setBlad(err.response?.data?.detail || 'Błąd logowania')
    } finally {
      setLadowanie(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zielony-700">Lodówka</h1>
          <p className="text-sm text-slate-500 mt-1">Zaloguj się do swojego konta</p>
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
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={ladowanie}>
            {ladowanie ? 'Logowanie...' : 'Zaloguj się'}
          </button>
        </form>
        <p className="text-sm text-center text-slate-500 mt-4">
          Nie masz konta?{' '}
          <Link to="/rejestracja" className="text-zielony-600 font-medium hover:underline">
            Zarejestruj się
          </Link>
        </p>
      </div>
    </div>
  )
}
