import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { auth } from '../lib/api'
import Logo from '../components/Logo'

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
    <div className="min-h-screen bg-grafit-850 app-shell flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size={48} withText={false} />
          </div>
          <h1 className="font-display text-2xl font-semibold text-grafit-100">Eat Me</h1>
          <p className="text-sm text-grafit-400 mt-1">Zaloguj się do swojego konta</p>
        </div>
        <form onSubmit={submit} className="karta space-y-4">
          {blad && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2 rounded-lg">
              {blad}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-grafit-300 mb-1">Email</label>
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
            <label className="block text-sm font-medium text-grafit-300 mb-1">Hasło</label>
            <input
              type="password"
              className="input"
              value={haslo}
              onChange={e => setHaslo(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn w-full" disabled={ladowanie}>
            {ladowanie ? 'Logowanie...' : 'Zaloguj się'}
          </button>
        </form>
        <p className="text-sm text-center text-grafit-400 mt-4">
          Nie masz konta?{' '}
          <Link to="/rejestracja" className="text-limonka-400 font-medium hover:text-limonka-300">
            Zarejestruj się
          </Link>
        </p>
        <p className="text-center mt-2">
          <Link to="/" className="text-grafit-400 hover:text-grafit-300 transition-colors text-xs">
            Wróć do strony głównej
          </Link>
        </p>
      </div>
    </div>
  )
}
