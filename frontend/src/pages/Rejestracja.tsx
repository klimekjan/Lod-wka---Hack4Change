import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { auth } from '../lib/api'
import Logo from '../components/Logo'

export default function Rejestracja() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [haslo, setHaslo] = useState('')
  const [imie, setImie] = useState('')
  const [nazwisko, setNazwisko] = useState('')
  const [adres, setAdres] = useState('')
  const [nick, setNick] = useState('')
  const [blad, setBlad] = useState('')
  const [ladowanie, setLadowanie] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBlad('')
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
    if (!emailRegex.test(email)) {
      setBlad('Podaj prawidłowy adres email (np. jan@example.com)')
      return
    }
    if (haslo.length < 6) {
      setBlad('Hasło musi mieć co najmniej 6 znaków')
      return
    }
    if (adres && !nick) {
      setBlad('Nick jest wymagany gdy podajesz adres')
      return
    }
    setLadowanie(true)
    try {
      const res = await auth.rejestruj(
        email,
        haslo,
        imie,
        nazwisko,
        adres || undefined,
        nick || undefined,
      )
      localStorage.setItem('token', res.data.access_token)
      navigate('/')
    } catch (err: any) {
      const detail = err.response?.data?.detail
      const msg = Array.isArray(detail)
        ? (detail[0]?.msg || 'Nieprawidłowe dane rejestracji')
        : (detail || 'Błąd rejestracji')
      setBlad(msg)
    } finally {
      setLadowanie(false)
    }
  }

  return (
    <div className="min-h-screen bg-grafit-900 app-shell flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size={48} withText={false} />
          </div>
          <h1 className="font-display text-2xl font-semibold text-grafit-100">Eat Me</h1>
          <p className="text-sm text-grafit-400 mt-1">Utwórz nowe konto</p>
        </div>
        <form onSubmit={submit} className="karta space-y-4">
          {blad && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2 rounded-lg">
              {blad}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-grafit-300 mb-1">Imię</label>
              <input
                type="text"
                className="input"
                value={imie}
                onChange={e => setImie(e.target.value)}
                required
                placeholder="Jan"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-grafit-300 mb-1">Nazwisko</label>
              <input
                type="text"
                className="input"
                value={nazwisko}
                onChange={e => setNazwisko(e.target.value)}
                required
                placeholder="Kowalski"
              />
            </div>
          </div>
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
              autoComplete="new-password"
              placeholder="min. 6 znaków"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-grafit-300 mb-1">
              Adres{' '}
              <span className="text-grafit-400 font-normal">(opcjonalnie -- pojawi się na mapie wymiany)</span>
            </label>
            <input
              type="text"
              className="input"
              value={adres}
              onChange={e => setAdres(e.target.value)}
              placeholder="np. Długi Targ 1, Gdańsk"
            />
            <p className="text-xs text-grafit-400 mt-1">Adres będzie widoczny publicznie na mapie.</p>
          </div>
          {adres && (
            <div>
              <label className="block text-sm font-medium text-grafit-300 mb-1">
                Nick <span className="text-red-400">*</span>
                <span className="text-grafit-400 font-normal ml-1">(wymagany przy podaniu adresu)</span>
              </label>
              <input
                type="text"
                className="input"
                value={nick}
                onChange={e => setNick(e.target.value)}
                placeholder="np. janek_gda"
              />
            </div>
          )}
          <button type="submit" className="btn w-full" disabled={ladowanie}>
            {ladowanie ? 'Tworzenie konta...' : 'Zarejestruj się'}
          </button>
        </form>
        <p className="text-sm text-center text-grafit-400 mt-4">
          Masz już konto?{' '}
          <Link to="/logowanie" className="text-limonka-400 font-medium hover:text-limonka-300">
            Zaloguj się
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
