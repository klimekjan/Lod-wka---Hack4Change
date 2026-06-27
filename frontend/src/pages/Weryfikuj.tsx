import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { auth } from '../lib/api'

export default function Weryfikuj() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [stan, setStan] = useState<'czeka' | 'ok' | 'blad'>('czeka')
  const [komunikat, setKomunikat] = useState('')

  useEffect(() => {
    if (!token) {
      setStan('blad')
      setKomunikat('Brak tokenu weryfikacyjnego w linku.')
      return
    }
    auth.weryfikujEmail(token)
      .then(() => setStan('ok'))
      .catch(err => {
        setStan('blad')
        setKomunikat(err?.response?.data?.detail ?? 'Nieprawidłowy lub wygasły link weryfikacyjny.')
      })
  }, [token])

  return (
    <div className="min-h-screen bg-grafit-850 flex items-center justify-center px-4">
      <div className="bg-grafit-700 rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
        {stan === 'czeka' && (
          <>
            <div className="w-10 h-10 border-2 border-limonka-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-grafit-400 text-sm">Weryfikacja adresu email...</p>
          </>
        )}
        {stan === 'ok' && (
          <>
            <div className="text-4xl">✓</div>
            <h1 className="font-display text-xl font-semibold text-grafit-100">Email zweryfikowany!</h1>
            <p className="text-grafit-400 text-sm">Twój adres email został potwierdzony.</p>
            <Link to="/pulpit" className="btn inline-block">Przejdź do aplikacji</Link>
          </>
        )}
        {stan === 'blad' && (
          <>
            <div className="text-4xl">✗</div>
            <h1 className="font-display text-xl font-semibold text-grafit-100">Błąd weryfikacji</h1>
            <p className="text-grafit-400 text-sm">{komunikat}</p>
            <Link to="/pulpit" className="btn-ghost inline-block">Wróć do aplikacji</Link>
          </>
        )}
      </div>
    </div>
  )
}
